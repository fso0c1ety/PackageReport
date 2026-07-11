"use client";

import { Box, Chip, Stack, Typography } from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";

const rows = [
  ["Monthly logistics report", "AGS Logistics", "Completed"],
  ["Package inventory", "Aximo Studio", "Processing"],
  ["Customs documentation", "Balkan Distribution", "Draft"],
];

export default function ProductDashboardPreview() {
  return (
    <Box sx={{ width: "100%", minWidth: 720, border: "1px solid #dfe4ec", borderRadius: 3, bgcolor: "#fff", overflow: "hidden", boxShadow: "0 30px 80px rgba(15,23,42,.18)", transform: "perspective(1400px) rotateY(-5deg) rotateX(2deg)", transformOrigin: "center" }}>
      <Box sx={{ display: "grid", gridTemplateColumns: "150px 1fr", minHeight: 480 }}>
        <Box sx={{ bgcolor: "#0f172a", color: "#fff", p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}><Box component="img" src="/icon.png" alt="Smart Manage" sx={{ width: 30, height: 30, borderRadius: 1.5 }} /><Typography sx={{ fontSize: 12, fontWeight: 800 }}>Smart Manage</Typography></Stack>
          <Stack spacing={.7}>{[[<DashboardRoundedIcon key="d" />,"Dashboard"],[<DescriptionRoundedIcon key="r" />,"Reports"],[<CalendarMonthRoundedIcon key="c" />,"Calendar"],[<TaskAltRoundedIcon key="t" />,"Tasks"],[<FolderRoundedIcon key="f" />,"Files"]].map(([icon,label], i) => <Stack key={String(label)} direction="row" spacing={1} alignItems="center" sx={{ px: 1.1, py: .85, borderRadius: 1.5, bgcolor: i === 0 ? "#2563eb" : "transparent", color: i === 0 ? "#fff" : "#94a3b8", "& svg": { fontSize: 15 } }}><>{icon}</><Typography sx={{ fontSize: 10, fontWeight: 700 }}>{label}</Typography></Stack>)}</Stack>
        </Box>
        <Box sx={{ bgcolor: "#f8fafc" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, height: 58, bgcolor: "#fff", borderBottom: "1px solid #e2e8f0" }}><Box sx={{ width: 210, bgcolor: "#f1f5f9", borderRadius: 2, px: 1.4, py: .8, display: "flex", gap: 1, color: "#64748b" }}><SearchRoundedIcon sx={{ fontSize: 16 }} /><Typography sx={{ fontSize: 9 }}>Search reports, tasks and files...</Typography></Box><Stack direction="row" spacing={1.4} alignItems="center"><NotificationsNoneRoundedIcon sx={{ fontSize: 18, color: "#64748b" }} /><Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "#4f46e5", color: "#fff", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 800 }}>AP</Box></Stack></Stack>
          <Box sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}><Box><Typography sx={{ fontSize: 18, fontWeight: 800 }}>Good morning, Argjend</Typography><Typography sx={{ color: "#64748b", fontSize: 9 }}>Manage reports, files and team activity.</Typography></Box><Stack direction="row" spacing={1}><Chip label="Import Excel" size="small" sx={{ bgcolor: "#dcfce7", color: "#166534", fontSize: 9 }} /><Chip label="+ New Report" size="small" sx={{ bgcolor: "#2563eb", color: "#fff", fontSize: 9 }} /></Stack></Stack>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1.2, mb: 1.5 }}>{[["Total Reports","128","+12%"],["Excel Files","42","Updated"],["Pending Tasks","16","Review"],["Completed","86","67%"]].map(([title,value,note],i) => <Box key={title} sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: 2, p: 1.4 }}><Typography sx={{ fontSize: 8, color: "#64748b", fontWeight: 700 }}>{title}</Typography><Typography sx={{ fontSize: 20, fontWeight: 800, my: .3 }}>{value}</Typography><Typography sx={{ fontSize: 7.5, color: i === 2 ? "#d97706" : "#16a34a", fontWeight: 700 }}>{note}</Typography></Box>)}</Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "1.7fr .8fr", gap: 1.5 }}>
              <Box sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden" }}><Stack direction="row" justifyContent="space-between" sx={{ p: 1.3, borderBottom: "1px solid #e2e8f0" }}><Typography sx={{ fontSize: 10, fontWeight: 800 }}>Recent reports</Typography><MoreHorizRoundedIcon sx={{ fontSize: 16 }} /></Stack>{rows.map(([name,client,status]) => <Box key={name} sx={{ display: "grid", gridTemplateColumns: "1.5fr 1fr .8fr", gap: 1, p: 1.15, borderBottom: "1px solid #f1f5f9", alignItems: "center" }}><Stack direction="row" spacing={.7} alignItems="center"><DescriptionRoundedIcon sx={{ color: "#2563eb", fontSize: 14 }} /><Typography noWrap sx={{ fontSize: 8.5, fontWeight: 700 }}>{name}</Typography></Stack><Typography noWrap sx={{ fontSize: 8, color: "#64748b" }}>{client}</Typography><Chip label={status} size="small" sx={{ height: 19, fontSize: 7, bgcolor: status === "Completed" ? "#dcfce7" : status === "Processing" ? "#dbeafe" : "#f1f5f9", color: status === "Completed" ? "#166534" : status === "Processing" ? "#1d4ed8" : "#475569" }} /></Box>)}</Box>
              <Stack spacing={1.5}><Box sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: 2, p: 1.3 }}><Typography sx={{ fontSize: 10, fontWeight: 800, mb: 1 }}>Report activity</Typography><Stack direction="row" alignItems="end" spacing={.55} sx={{ height: 72 }}>{[35,52,42,68,48,78,62,88].map((h,i)=><Box key={i} sx={{ flex:1,height:h+"%",bgcolor:i===7?"#2563eb":"#bfdbfe",borderRadius:"3px 3px 0 0" }}/>)}</Stack></Box><Box sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: 2, p: 1.3 }}><Typography sx={{ fontSize: 10, fontWeight: 800, mb: .7 }}>Upcoming</Typography>{["Customs deadline","Team meeting","Send client report"].map((x,i)=><Stack key={x} direction="row" spacing={.8} alignItems="center" sx={{ py:.45 }}><Box sx={{width:6,height:6,borderRadius:"50%",bgcolor:["#f59e0b","#8b5cf6","#2563eb"][i]}}/><Typography sx={{fontSize:8}}>{x}</Typography></Stack>)}</Box></Stack>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
