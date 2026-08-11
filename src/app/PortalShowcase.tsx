"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";

const portals = [
  { id:"driver", label:"Driver", title:"Driver Portal", description:"Assigned trips, live trip status, documents, expenses and fuel in a focused mobile workflow.", features:["Assigned trips only","Delivery status updates","Trip documents"], image:"/marketing/portals/driver-desktop.webp", mobile:"/marketing/portals/driver-mobile.webp" },
  { id:"teacher", label:"Teacher", title:"Teacher Portal", description:"Authorized children, attendance, meals, observations, activities, sleep tracking and photos.", features:["Daily classroom records","Sleep start and end","Parent-safe updates"], image:"/marketing/portals/teacher-desktop.webp", mobile:"/marketing/portals/teacher-mobile.webp" },
  { id:"parent", label:"Parent", title:"Parent Portal", description:"A private timeline for each linked child, including attendance, meals, activities and shared documents.", features:["Linked children only","Daily timeline","Shared documents"], image:"/marketing/portals/parent-desktop.webp", mobile:"/marketing/portals/parent-mobile.webp" },
  { id:"doctor", label:"Doctor", title:"Doctor Portal", description:"Assigned patients, appointments, treatments, clinical updates, lab requests and follow-up work.", features:["Assigned patients","Clinical workflows","Lab request updates"], image:"/marketing/portals/doctor-desktop.webp", mobile:"/marketing/portals/doctor-mobile.webp" },
  { id:"patient", label:"Patient", title:"Patient Portal", description:"Appointments, treatment progress, shared care documents and lab results without internal clinical fields.", features:["Patient-safe records","Document acknowledgement","Private messaging"], image:"/marketing/portals/patient-desktop.webp", mobile:"/marketing/portals/patient-mobile.webp" },
  { id:"client", label:"Client", title:"Client Portal", description:"Shipment visibility, client documents, invoices and update requests for the linked company only.", features:["Company-isolated loads","Secure document upload","Shipment requests"], image:"/marketing/portals/client-desktop.webp", mobile:"/marketing/portals/client-mobile.webp" },
] as const;

export default function PortalShowcase() {
  const [active, setActive] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const portal = portals[active];
  const move = (next:number) => { const index=(next+portals.length)%portals.length; setActive(index); tabs.current[index]?.focus(); };
  const onKeyDown = (event:KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowRight") { event.preventDefault(); move(active + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); move(active - 1); }
    if (event.key === "Home") { event.preventDefault(); move(0); }
    if (event.key === "End") { event.preventDefault(); move(portals.length - 1); }
  };
  return <Box sx={{ p:{xs:3,md:5}, borderRadius:5, bgcolor:"#F8FAFC", border:"1px solid #E7EAF0" }}>
    <Typography sx={{ color:"#6366f1", fontWeight:900, letterSpacing:".16em", fontSize:12 }}>VERIFIED ROLE PORTALS</Typography>
    <Typography component="h2" sx={{ fontSize:{xs:30,md:44}, fontWeight:900, mt:1 }}>Full control for managers. Focused work for every role.</Typography>
    <Typography sx={{ color:"#64748b", lineHeight:1.8, mt:2, maxWidth:900 }}>Each portal below is a real Smart Manage experience tested with authenticated role isolation, write actions and responsive layouts.</Typography>
    <Stack role="tablist" aria-label="Verified Smart Manage portals" direction="row" gap={1} sx={{ mt:3, overflowX:"auto", pb:1, scrollbarWidth:"thin" }}>
      {portals.map((item,index)=><Box component="button" key={item.id} ref={(node:HTMLButtonElement|null)=>{tabs.current[index]=node;}} role="tab" id={`portal-tab-${item.id}`} aria-controls={`portal-panel-${item.id}`} aria-selected={active===index} tabIndex={active===index?0:-1} onClick={()=>setActive(index)} onKeyDown={onKeyDown} sx={{ flex:"0 0 auto", border:active===index?"1px solid #6366f1":"1px solid #DDE2EA", borderRadius:99, bgcolor:active===index?"#6366f1":"#fff", color:active===index?"#fff":"#334155", px:2.2, py:1.1, font:"inherit", fontWeight:800, cursor:"pointer" }}>{item.label}</Box>)}
    </Stack>
    <Box role="tabpanel" id={`portal-panel-${portal.id}`} aria-labelledby={`portal-tab-${portal.id}`} sx={{ display:"grid", gridTemplateColumns:{xs:"1fr",md:"minmax(0,1.35fr) minmax(280px,.65fr)"}, gap:{xs:2.5,md:4}, mt:2, alignItems:"center" }}>
      <Box component="picture" sx={{ display:"block", minWidth:0 }}>
        <source media="(max-width: 599px)" srcSet={portal.mobile} />
        <Box component="img" key={portal.id} loading="lazy" src={portal.image} alt={`Real ${portal.title} interface in Smart Manage`} sx={{ display:"block", width:"100%", maxHeight:{xs:560,md:620}, objectFit:"contain", objectPosition:"top left", borderRadius:3, border:"1px solid #E2E8F0", bgcolor:"#fff", boxShadow:"0 18px 50px rgba(15,23,42,.10)" }} />
      </Box>
      <Box>
        <Chip label="Acceptance verified" color="success" size="small" />
        <Typography fontSize={{xs:26,md:30}} fontWeight={900} mt={2}>{portal.title}</Typography>
        <Typography sx={{ color:"#64748b", lineHeight:1.8, mt:1 }}>{portal.description}</Typography>
        <Stack gap={1.1} mt={2.5}>{portal.features.map((feature)=><Stack key={feature} direction="row" gap={1} alignItems="center"><Box aria-hidden sx={{width:8,height:8,borderRadius:"50%",bgcolor:"#6366f1",flex:"0 0 auto"}}/><Typography fontWeight={750} color="#334155">{feature}</Typography></Stack>)}</Stack>
      </Box>
    </Box>
  </Box>;
}
