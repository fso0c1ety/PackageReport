"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Alert, Box, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";

export default function PublicBoardPage() {
  const { token } = useParams<{token:string}>();
  const [board,setBoard] = useState<any>(null);
  const [error,setError] = useState("");
  useEffect(()=>{ fetch(`/api/public/boards/${encodeURIComponent(token)}`).then(async r=>{if(!r.ok) throw new Error("This shared link is unavailable or has been disabled."); setBoard(await r.json());}).catch(e=>setError(e.message)); },[token]);
  if(error) return <Box sx={{p:4,maxWidth:700,mx:"auto"}}><Alert severity="error">{error}</Alert></Box>;
  if(!board) return <Box sx={{display:"grid",placeItems:"center",minHeight:"100vh"}}><CircularProgress/></Box>;
  const columns = Array.isArray(board.columns) ? board.columns : [];
  return <Box sx={{p:{xs:2,md:5},minHeight:"100vh",bgcolor:"background.default"}}>
    <Box sx={{maxWidth:1500,mx:"auto"}}><Typography variant="overline" color="primary" fontWeight={800}>Smart Manage · View only</Typography><Typography variant="h3" fontWeight={900} sx={{mb:3}}>{board.name}</Typography>
    <TableContainer component={Paper} sx={{borderRadius:3}}><Table><TableHead><TableRow>{columns.map((c:any)=><TableCell key={c.id} sx={{fontWeight:800}}>{c.name}</TableCell>)}</TableRow></TableHead><TableBody>{board.rows.map((r:any)=><TableRow key={r.id}>{columns.map((c:any)=><TableCell key={c.id}>{typeof r.values?.[c.id]==="object" ? JSON.stringify(r.values[c.id]) : String(r.values?.[c.id] ?? "")}</TableCell>)}</TableRow>)}</TableBody></Table></TableContainer></Box>
  </Box>;
}
