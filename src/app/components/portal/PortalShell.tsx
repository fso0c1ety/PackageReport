"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardActionArea, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, LinearProgress, Link, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { authenticatedFetch, getApiUrl } from "../../apiUrl";
import type { PortalConfig, PortalMembershipContext } from "../../../portal-engine/types";
import { portalWriteActionOptions } from "../../../portal-engine/writeActions";

type Props = { membership: PortalMembershipContext & { workspaceName?: string }; config?: PortalConfig | null };

const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const dateFormatter = new Intl.DateTimeFormat(undefined, { day:"2-digit", month:"short", year:"numeric" });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });

function PortalFieldValue({ field, value }: { field:string; value:any }) {
  if (!value || value.kind === "empty") return <Typography color="text.secondary">—</Typography>;
  if (value.kind === "chips") return <Stack direction="row" gap={.75} flexWrap="wrap">{(value.items || []).map((item:string) => <Chip key={item} label={item} size="small" variant="outlined" />)}</Stack>;
  if (value.kind === "files") return <Stack direction="row" gap={1} flexWrap="wrap">{(value.files || []).map((file:any, index:number) => file.url ? <Link key={`${file.name}-${index}`} href={file.url} target="_blank" rel="noreferrer" underline="hover" fontWeight={750}>{file.name}</Link> : <Chip key={`${file.name}-${index}`} label={file.name} size="small" />)}</Stack>;
  if (value.kind === "date" || value.kind === "datetime") {
    const date = new Date(Number(value.timestamp));
    return <Typography fontWeight={750}>{Number.isFinite(date.getTime()) ? (value.kind === "datetime" ? dateTimeFormatter : dateFormatter).format(date) : "—"}</Typography>;
  }
  if (value.kind === "currency") return <Typography fontWeight={800}>{new Intl.NumberFormat(undefined,{style:"currency",currency:value.currency || "EUR"}).format(Number(value.amount) || 0)}</Typography>;
  if (value.kind === "number") return <Typography fontWeight={750}>{new Intl.NumberFormat().format(Number(value.number) || 0)}</Typography>;
  const display = String(value.display ?? "—");
  if (/status|priority|visibility|present \/ absent|payment status/i.test(field)) return <Chip label={display} size="small" color={/completed|paid|active|present|confirmed|delivered|shared|valid/i.test(display) ? "success" : "default"} />;
  return <Typography fontWeight={750} sx={{overflowWrap:"anywhere"}}>{display}</Typography>;
}

export default function PortalShell({ membership, config }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [activeAction, setActiveAction] = useState<any>(null);
  const [targetId, setTargetId] = useState("");
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [writeMessage, setWriteMessage] = useState("");
  const navigation = config?.navigation || (membership.navigation || []).map((id) => ({ id, label: label(id), route: `${membership.landingRoute || "/dashboard"}?section=${id}` }));
  const availableActions = data?.config?.writeActions || (config?.portalType ? portalWriteActionOptions(config.portalType) : []);
  useEffect(() => {
    if (!config || config.portalType === "driver" || !membership.workspaceId) return;
    const query = new URLSearchParams({ workspaceId: membership.workspaceId, portalType: config.portalType });
    authenticatedFetch(getApiUrl(`professional-portal?${query.toString()}`), { suppressNativeErrorAlert: true })
      .then(async (response) => { const body = await response.json().catch(() => null); if (!response.ok) throw new Error(body?.error || "Unable to load portal data"); return body; })
      .then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load portal data"));
  }, [config, membership.workspaceId, reload]);
  const actionTargets = useMemo(() => {
    if (!activeAction || !data?.entities) return [];
    const entityName = activeAction.mode === "create" ? activeAction.subjectEntity : activeAction.entity;
    return data.entities.find((entity:any) => entity.entity === entityName)?.records || [];
  }, [activeAction, data?.entities]);
  const openAction = (action:any) => { setActiveAction(action); setTargetId(""); setFormValues({}); setSelectedFile(null); setWriteMessage(""); };
  const submitAction = async () => {
    if (!activeAction || !targetId) return;
    setSaving(true); setWriteMessage("");
    try {
      const target = actionTargets.find((record:any) => record.id === targetId);
      const nextValues = {...formValues};
      if (activeAction.fileField) {
        if (!selectedFile) throw new Error("Choose a file to upload");
        const upload = new FormData();
        upload.set("file", selectedFile);
        upload.set("workspaceId", membership.workspaceId);
        upload.set("rowId", targetId);
        upload.set("portalType", String(config?.portalType || ""));
        upload.set("portalAction", activeAction.id);
        upload.set("writeToken", String(target?.writeToken || ""));
        const uploadResponse = await authenticatedFetch(getApiUrl("upload"), {method:"POST",body:upload,suppressNativeErrorAlert:true});
        const uploaded = await uploadResponse.json().catch(() => null);
        if (!uploadResponse.ok) throw new Error(uploaded?.error || "File upload failed");
        nextValues[activeAction.fileField] = [{id:uploaded.id,url:uploaded.url,name:uploaded.name,type:uploaded.type,size:uploaded.size}];
      }
      const response = await authenticatedFetch(getApiUrl("professional-portal"), { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ workspaceId:membership.workspaceId, portalType:config?.portalType, action:activeAction.id, writeToken:target?.writeToken, ...(activeAction.mode === "create" ? {subjectId:targetId} : {recordId:targetId}), values:nextValues }), suppressNativeErrorAlert:true });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "Unable to save this action");
      setWriteMessage("Saved successfully. The workspace has been updated.");
      setReload((value) => value + 1);
    } catch (reason) { setWriteMessage(reason instanceof Error ? reason.message : "Unable to save this action"); }
    finally { setSaving(false); }
  };
  const section = searchParams.get("section") || "home";
  const displayedEntities = useMemo(() => {
    const all = data?.entities || [];
    if (section === "home") return (config?.widgets || []).map((widget) => all.find((entity: any) => entity.entity === widget.entity)).filter(Boolean);
    const target = section.replaceAll("_", "").replace(/^my/, "").toLowerCase();
    return all.filter((entity: any) => String(entity.entity).replaceAll(" ", "").replace(/^my/i, "").toLowerCase().includes(target) || target.includes(String(entity.entity).replaceAll(" ", "").toLowerCase()));
  }, [config?.widgets, data?.entities, section]);
  return <Stack spacing={{xs:2,md:3}} sx={{ width: "100%", maxWidth: 1440, mx: "auto", px: { xs: 2, sm:3, lg:4 }, pb: { xs: 12, md: 5 } }}>
    <Box>
      <Typography variant="overline" color="primary" fontWeight={900}>{config?.name || `${label(membership.portalType || "standard")} Portal`}</Typography>
      <Typography variant="h4" fontWeight={900}>{membership.workspaceName}</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
        {(membership.jobRoles || []).map((role) => <Chip key={role} label={label(role)} size="small" color={role === membership.primaryJobRole ? "primary" : "default"} />)}
      </Stack>
    </Box>
    {!config && <Alert severity="info">This portal is using the compatibility layout until its industry configuration is activated.</Alert>}
    {config && config.portalType !== "driver" && error && <Alert severity="error">{error}</Alert>}
    {config && config.portalType !== "driver" && !data && !error && <Box sx={{ minHeight: 120, display:"grid", placeItems:"center" }}><CircularProgress size={28} /></Box>}
    {data && <Box sx={{ display:"grid",gridTemplateColumns:{xs:"1fr",md:section === "home" ? "repeat(2,minmax(0,1fr))" : "1fr",xl:section === "home" ? "repeat(3,minmax(0,1fr))" : "1fr"},gap:{xs:1.5,md:2.5} }}>
      {displayedEntities.map((entity:any) => { const widget = config?.widgets.find((item) => item.entity === entity.entity); const records = entity?.records || []; return <Card key={entity.entity} variant="outlined" sx={{borderRadius:4,minWidth:0,boxShadow:"0 12px 34px rgba(15,23,42,.055)"}}><CardContent sx={{p:{xs:2,md:2.5},"&:last-child":{pb:{xs:2,md:2.5}}}}><Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}><Box><Typography fontWeight={900} variant="h6">{widget?.title || entity.name}</Typography><Typography variant="body2" color="text.secondary">Authorized {String(entity.name || entity.entity).toLowerCase()} records</Typography></Box><Chip size="small" label={records.length} color="primary" variant="outlined" /></Stack><Divider sx={{my:2}} />{records.length === 0 ? <Typography variant="body2" color="text.secondary">No authorized records available.</Typography> : <Box sx={{display:"grid",gridTemplateColumns:section === "home" ? "1fr" : {xs:"1fr",md:"repeat(2,minmax(0,1fr))"},gap:1.5}}>{records.slice(0,section === "home" ? 5 : 50).map((record:any) => <Box key={record.id} sx={{p:{xs:1.5,md:2},borderRadius:3,bgcolor:"action.hover",border:"1px solid",borderColor:"divider",minWidth:0}}><Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",sm:section === "home" ? "1fr" : "repeat(2,minmax(0,1fr))",lg:section === "home" ? "repeat(2,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))"},gap:{xs:1.25,md:1.75}}}>{Object.entries(record.fields).slice(0,section === "home" ? 6 : 16).map(([key,value]) => <Box key={key} sx={{minWidth:0}}><Typography variant="caption" color="text.secondary" fontWeight={700} sx={{display:"block",mb:.35,textTransform:"uppercase",letterSpacing:0.35}}>{key}</Typography><PortalFieldValue field={key} value={value} /></Box>)}</Box></Box>)}</Box>}</CardContent></Card> })}
      {displayedEntities.length === 0 && <Alert severity="info">This section has no authorized records for your account.</Alert>}
    </Box>}
    {config?.portalType === "parent" && !!data?.timeline?.length && <Card variant="outlined" sx={{borderRadius:3}}><CardContent><Typography fontWeight={900} variant="h6">Child Daily Timeline</Typography><Stack spacing={0} sx={{mt:2}}>{data.timeline.map((event:any) => <Box key={event.id} sx={{display:"grid",gridTemplateColumns:"72px 14px 1fr",gap:1.25,minHeight:70}}><Typography variant="caption" color="text.secondary">{event.at ? new Date(event.at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : "—"}</Typography><Box sx={{width:10,height:10,borderRadius:"50%",bgcolor:"primary.main",mt:.5,boxShadow:"0 18px 0 -4px #d9dcff"}} /><Box><Typography fontWeight={800}>{event.type}</Typography><Typography variant="body2" color="text.secondary">{event.description}</Typography></Box></Box>)}</Stack></CardContent></Card>}
    {!!availableActions.length && <Card variant="outlined" sx={{borderRadius:3}}><CardContent><Typography fontWeight={900}>Quick actions</Typography><Typography variant="body2" color="text.secondary" sx={{mb:2}}>Updates are saved directly to the authorized workspace and notify the responsible team.</Typography><Stack direction="row" gap={1} flexWrap="wrap">{availableActions.map((action:any) => <Button key={action.id} variant="contained" onClick={() => openAction(action)}>{label(action.id.replace(":", " "))}</Button>)}</Stack></CardContent></Card>}
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", lg: "repeat(3,1fr)" }, gap: 2 }}>
      {navigation.map((item) => {
        const separator = item.route.includes("?") ? "&" : "?";
        const route = membership.workspaceId ? `${item.route}${separator}id=${encodeURIComponent(membership.workspaceId)}` : item.route;
        return <Card key={item.id} variant="outlined" sx={{ borderRadius: 3 }}>
          <CardActionArea onClick={() => router.push(route)} sx={{ height: "100%" }}>
            <CardContent><Typography fontWeight={850}>{item.label}</Typography><Typography variant="body2" color="text.secondary">Open authorized {item.label.toLowerCase()}</Typography></CardContent>
          </CardActionArea>
        </Card>;
      })}
    </Box>
    <Dialog open={!!activeAction} onClose={() => !saving && setActiveAction(null)} fullWidth maxWidth="sm">
      <DialogTitle>{activeAction ? label(activeAction.id.replace(":", " ")) : "Portal action"}</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{pt:1}}>
        <TextField select required label={activeAction?.mode === "create" ? activeAction?.subjectEntity : activeAction?.entity} value={targetId} onChange={(event) => setTargetId(event.target.value)}>
          {actionTargets.map((record:any, index:number) => <MenuItem key={record.id} value={record.id}>{Object.values(record.fields || {}).map((value:any) => value?.display || value?.items?.[0]).find(Boolean) || `${activeAction?.entity} ${index + 1}`}</MenuItem>)}
        </TextField>
        {(activeAction?.fields || []).filter((field:string) => field !== activeAction?.fileField).map((field:string) => <TextField key={field} label={label(field)} value={formValues[field] || ""} multiline={/message|note|text|instruction/i.test(field)} minRows={/message|note|text|instruction/i.test(field) ? 3 : undefined} onChange={(event) => setFormValues((values) => ({...values,[field]:event.target.value}))} />)}
        {activeAction?.fileField && <Button component="label" variant="outlined" size="large">{selectedFile ? selectedFile.name : "Choose file"}<input hidden type="file" accept={activeAction.fileAccept || undefined} onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} /></Button>}
        {saving && activeAction?.fileField && <LinearProgress aria-label="Upload progress" />}
        {writeMessage && <Alert severity={writeMessage.startsWith("Saved") ? "success" : "error"}>{writeMessage}</Alert>}
      </Stack></DialogContent>
      <DialogActions><Button onClick={() => setActiveAction(null)} disabled={saving}>Close</Button><Button variant="contained" onClick={submitAction} disabled={saving || !targetId}>{saving ? "Saving..." : "Save"}</Button></DialogActions>
    </Dialog>
  </Stack>;
}
