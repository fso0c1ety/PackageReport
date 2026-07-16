"use client";
import React from "react";
import { Box, Button, Chip, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import type { Column, Row } from "../../../types";

const centers: Record<string, [number, number]> = { XK:[42.6675,21.1662],DE:[51.1657,10.4515],TR:[38.9637,35.2433],IT:[41.8719,12.5674],ES:[40.4637,-3.7492],FR:[46.2276,2.2137],AL:[41.1533,20.1683],MK:[41.6086,21.7453],RS:[44.0165,21.0059],ME:[42.7087,19.3744] };
function hashPoint(label: unknown): [number,number] { let h=0; for(const c of String(label||"")) h=((h<<5)-h+c.charCodeAt(0))|0; return [((Math.abs(h)%12000)/100)-60,((Math.abs(h*31)%34000)/100)-170]; }
function point(value: unknown): [number,number] | null { if(!value)return null; if(typeof value==='object'){const v=value as Record<string,unknown>;const lat=Number(v.latitude??v.lat),lng=Number(v.longitude??v.lng??v.lon);if(Number.isFinite(lat)&&Number.isFinite(lng))return[lat,lng];const code=String(v.countryCode||'').toUpperCase();return centers[code]||hashPoint(v.label||v.address||v.city);}const code=String(value).toUpperCase();return centers[code]||hashPoint(value); }
const xy=([lat,lng]:[number,number])=>({left:`${((lng+180)/360)*100}%`,top:`${((90-lat)/180)*100}%`});

export default function MapBoardView({rows,columns,onOpenRow}:{rows:Row[];columns:Column[];onOpenRow:(row:Row)=>void}){
 const locationColumns=columns.filter(c=>c.type==='Location'||c.type==='Country');
 const [source,setSource]=React.useState(locationColumns[0]?.id||'');
 const [selected,setSelected]=React.useState<Row[]>([]);
 React.useEffect(()=>{if(!locationColumns.some(c=>c.id===source))setSource(locationColumns[0]?.id||'')},[columns,source]);
 const markers=React.useMemo(()=>{const grouped=new Map<string,{p:[number,number],rows:Row[]}>();for(const row of rows){const p=point(row.values?.[source]);if(!p)continue;const key=`${p[0].toFixed(1)}:${p[1].toFixed(1)}`;const g=grouped.get(key)||{p,rows:[]};g.rows.push(row);grouped.set(key,g)}return[...grouped.values()]},[rows,source]);
 if(!locationColumns.length)return <Paper sx={{mt:4,p:5,textAlign:'center',borderRadius:4}}><Typography variant="h5" fontWeight={900}>Map View</Typography><Typography color="text.secondary">Add a Location or Country column to place rows on the map.</Typography></Paper>;
 return <Box sx={{mt:3,display:'grid',gridTemplateColumns:{xs:'1fr',lg:selected.length?'1fr 320px':'1fr'},gap:2}}>
  <Paper sx={{p:2,borderRadius:4,overflow:'hidden'}}><Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" alignItems={{sm:'center'}} gap={1} mb={2}><Box><Typography variant="h5" fontWeight={900}>Map View</Typography><Typography color="text.secondary" fontSize={13}>{markers.length} marker clusters · {rows.length} rows</Typography></Box><TextField select size="small" label="Location source" value={source} onChange={e=>setSource(e.target.value)} sx={{minWidth:220}}>{locationColumns.map(c=><MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</TextField></Stack>
  <Box sx={{height:{xs:420,md:560},position:'relative',overflow:'hidden',borderRadius:3,bgcolor:'#dbeafe',backgroundImage:'linear-gradient(30deg,rgba(255,255,255,.45) 12%,transparent 12.5%,transparent 87%,rgba(255,255,255,.45) 87.5%),linear-gradient(150deg,rgba(255,255,255,.45) 12%,transparent 12.5%,transparent 87%,rgba(255,255,255,.45) 87.5%)',backgroundSize:'90px 150px'}}>
   {markers.map((m,i)=>{const pos=xy(m.p);return <Button key={i} onClick={()=>setSelected(m.rows)} aria-label={`${m.rows.length} rows at marker`} sx={{position:'absolute',...pos,transform:'translate(-50%,-50%)',minWidth:36,width:m.rows.length>9?48:38,height:m.rows.length>9?48:38,borderRadius:'50%',bgcolor:'#5b5df0',color:'#fff',fontWeight:900,boxShadow:'0 6px 18px #312e8180','&:hover':{bgcolor:'#4338ca',transform:'translate(-50%,-50%) scale(1.08)'}}}>{m.rows.length}</Button>})}
  </Box></Paper>
  {selected.length>0&&<Paper sx={{p:2,borderRadius:4,maxHeight:620,overflow:'auto'}}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography fontWeight={900}>{selected.length} matching rows</Typography><Button size="small" onClick={()=>setSelected([])}>Close</Button></Stack><Stack gap={1.2} mt={2}>{selected.map(row=><Paper variant="outlined" key={row.id} onClick={()=>onOpenRow(row)} sx={{p:1.5,cursor:'pointer',borderRadius:2,'&:hover':{borderColor:'primary.main'}}}><Typography fontWeight={800}>{String(row.values?.[columns[0]?.id]||'Untitled row')}</Typography><Stack direction="row" gap={0.5} mt={0.5}>{columns.filter(c=>c.type==='Status').slice(0,1).map(c=><Chip key={c.id} size="small" label={String(row.values?.[c.id]||'No status')}/>)}</Stack></Paper>)}</Stack></Paper>}
 </Box>;
}
