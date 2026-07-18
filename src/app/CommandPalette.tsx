"use client";
import { useEffect, useMemo, useState } from "react";
import { Box, CircularProgress, Dialog, DialogContent, Divider, InputAdornment, List, ListItemButton, ListItemText, TextField, Typography } from "@mui/material";
import SearchRounded from "@mui/icons-material/SearchRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import GroupAddRounded from "@mui/icons-material/GroupAddRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import DarkModeRounded from "@mui/icons-material/DarkModeRounded";
import WorkRounded from "@mui/icons-material/WorkRounded";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import SwapHorizRounded from "@mui/icons-material/SwapHorizRounded";
import { authenticatedFetch, getApiUrl, navigateToAppRoute } from "./apiUrl";
import { useThemeContext } from "./ThemeContext";

type SearchResult={type:string;id:string;title:string;subtitle:string;workspace_id?:string;table_id?:string};

export default function CommandPalette(){
  const [open,setOpen]=useState(false),[query,setQuery]=useState(""),[results,setResults]=useState<SearchResult[]>([]),[loading,setLoading]=useState(false);
  const {toggleTheme}=useThemeContext();
  useEffect(()=>{const handler=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setOpen(value=>!value)}};window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler)},[]);
  useEffect(()=>{if(!open||query.trim().length<2){setResults([]);return}const controller=new AbortController();const timer=window.setTimeout(async()=>{setLoading(true);try{const response=await authenticatedFetch(getApiUrl(`search?q=${encodeURIComponent(query.trim())}`),{signal:controller.signal});if(response.ok)setResults((await response.json()).results||[])}finally{setLoading(false)}},250);return()=>{window.clearTimeout(timer);controller.abort()}},[open,query]);
  const commands=useMemo(()=>[
    {label:"Create workspace",icon:<AddRounded/>,run:()=>navigateToAppRoute("/home/?createWorkspace=1")},
    {label:"My Work",icon:<WorkRounded/>,run:()=>navigateToAppRoute("/my-work/")},
    {label:"Open dashboard",icon:<DashboardRounded/>,run:()=>navigateToAppRoute("/dashboard/")},
    {label:"Open recent board",icon:<DashboardRounded/>,run:()=>{const recent=Object.keys(localStorage).find(key=>key.startsWith("lastWorkspace_"));const value=recent?localStorage.getItem(recent):null;try{const workspace=value?JSON.parse(value):null;navigateToAppRoute(workspace?.id?`/workspace/?id=${workspace.id}`:"/home/")}catch{navigateToAppRoute("/home/")}}},
    {label:"Invite member",icon:<GroupAddRounded/>,run:()=>navigateToAppRoute("/settings/?tab=team")},
    {label:"Upload or import file",icon:<UploadFileRounded/>,run:()=>navigateToAppRoute("/workspace/?import=1")},
    {label:"Switch workspace",icon:<SwapHorizRounded/>,run:()=>navigateToAppRoute("/home/#workspaces")},
    {label:"Run automation",icon:<AutoAwesomeRounded/>,run:()=>navigateToAppRoute("/workspace/")},
    {label:"Change theme",icon:<DarkModeRounded/>,run:toggleTheme},
  ],[toggleTheme]);
  const go=(item:SearchResult)=>{if(item.type==="workspace")navigateToAppRoute(`/workspace/?id=${item.workspace_id||item.id}`);else if(item.table_id)navigateToAppRoute(`/workspace/?id=${item.workspace_id}&tableId=${item.table_id}${item.type==="row"?`&taskId=${item.id}`:""}`);setOpen(false)};
  return <Dialog open={open} onClose={()=>setOpen(false)} fullWidth maxWidth="sm" PaperProps={{sx:{position:"fixed",top:{xs:12,sm:70},m:0,borderRadius:3,overflow:"hidden"}}}>
    <DialogContent sx={{p:0}}><TextField autoFocus fullWidth placeholder="Search workspaces, boards, rows, files and people…" value={query} onChange={e=>setQuery(e.target.value)} InputProps={{startAdornment:<InputAdornment position="start"><SearchRounded/></InputAdornment>,endAdornment:loading?<CircularProgress size={18}/>:<Typography variant="caption">ESC</Typography>}} sx={{"& fieldset":{border:0}}}/><Divider/>
      <Box sx={{maxHeight:"min(65vh,520px)",overflowY:"auto",p:1}}>{query.trim().length<2?<><Typography variant="overline" sx={{px:1.5,color:"text.secondary"}}>Quick commands</Typography><List>{commands.map(command=><ListItemButton key={command.label} onClick={()=>{command.run();setOpen(false)}} sx={{borderRadius:2}}>{command.icon}<ListItemText primary={command.label} sx={{ml:1.5}}/></ListItemButton>)}</List></>:results.length?<List>{results.map(item=><ListItemButton key={`${item.type}-${item.id}`} onClick={()=>go(item)} sx={{borderRadius:2}}><ListItemText primary={item.title} secondary={`${item.type} · ${item.subtitle||"Smart Manage"}`}/></ListItemButton>)}</List>:!loading&&<Typography sx={{p:3,textAlign:"center",color:"text.secondary"}}>No results found</Typography>}</Box>
      <Divider/><Typography variant="caption" sx={{display:"block",p:1.2,px:2,color:"text.secondary"}}>Ctrl/Cmd + K · Fast navigation</Typography></DialogContent>
  </Dialog>
}
