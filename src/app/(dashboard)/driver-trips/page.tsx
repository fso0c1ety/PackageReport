"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, Box, Button, Card, CardActions, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Tab, Tabs, Typography } from "@mui/material";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import NavigationRoundedIcon from "@mui/icons-material/NavigationRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { authenticatedFetch, getApiUrl } from "../../apiUrl";

type Trip = { id:string;tripNumber:string;name:string;status:string;pickupAddress:string;deliveryAddress:string;pickupDate?:string;deliveryDate?:string;truck?:string;trailer?:string;cargo?:string;contactPerson?:string;contactPhone?:string;distance?:number;instructions?:string;activity?:Array<{text:string;time:string}> };
const completed=(trip:Trip)=>trip.status==="Delivered";
const destination=(trip:Trip)=>["Loaded","In Transit","At Delivery","Delivered"].includes(trip.status)?trip.deliveryAddress:trip.pickupAddress;
const mapsUrl=(trip:Trip,route=false)=>route?`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(trip.pickupAddress)}&destination=${encodeURIComponent(trip.deliveryAddress)}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination(trip))}`;

export default function DriverTripsPage(){
  const workspaceId=useSearchParams().get("id")||"";
  const [trips,setTrips]=useState<Trip[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[tab,setTab]=useState(0),[selected,setSelected]=useState<Trip|null>(null);
  const load=async()=>{if(!workspaceId)return;const response=await authenticatedFetch(getApiUrl(`logistics/driver/trips?workspaceId=${encodeURIComponent(workspaceId)}`));const data=await response.json();response.ok?(setTrips(data.trips||[]),setError("")):(setTrips([]),setError(data.error||"Unable to load trips"));setLoading(false)};
  useEffect(()=>{void load();const timer=window.setInterval(load,15000);return()=>window.clearInterval(timer)},[workspaceId]);
  const visible=useMemo(()=>trips.filter(trip=>tab===3?completed(trip):tab===0?!completed(trip):tab===1?Boolean(trip.pickupDate&&new Date(trip.pickupDate).toDateString()===new Date().toDateString()):!completed(trip)),[trips,tab]);
  const updateStatus=async(trip:Trip,status:string)=>{const confirmed=!["Loaded","Delivered"].includes(status)||window.confirm(`Confirm status: ${status}?`);if(!confirmed)return;const response=await authenticatedFetch(getApiUrl("logistics/driver/trips"),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({workspaceId,tripId:trip.id,status,confirmed})});const data=await response.json();if(response.ok){setTrips(items=>items.map(item=>item.id===trip.id?data.trip:item));setSelected(data.trip)}else setError(data.error||"Status could not be saved")};
  if(loading)return <Box sx={{display:"grid",placeItems:"center",minHeight:"60vh"}}><CircularProgress/></Box>;
  return <Box sx={{maxWidth:1100,mx:"auto",p:{xs:2,md:4},pb:{xs:12,md:4}}}>
    <Typography variant="h4" fontWeight={900}>My Trips</Typography>
    <Typography color="text.secondary" sx={{mb:2}}>Only trips assigned to your account are shown.</Typography>
    {error&&<Alert severity="error" sx={{mb:2}}>{error}</Alert>}
    <Tabs value={tab} onChange={(_,value)=>setTab(value)} variant="scrollable" sx={{mb:2}}><Tab label="Current Trip"/><Tab label="Today"/><Tab label="Upcoming"/><Tab label="Completed"/></Tabs>
    <Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",md:"repeat(2,1fr)"},gap:2}}>
      {visible.map(trip=><Card key={trip.id} variant="outlined" sx={{borderRadius:4}}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" gap={1}><Typography variant="h6" fontWeight={900}>{trip.tripNumber}</Typography><Chip label={trip.status} color={completed(trip)?"success":"primary"} size="small"/></Stack>
          <Divider sx={{my:2}}/><Typography variant="overline" color="text.secondary">Pickup</Typography><Typography fontWeight={700}>{trip.pickupAddress||"Address missing"}</Typography>
          <Typography variant="overline" color="text.secondary" sx={{display:"block",mt:1.5}}>Delivery</Typography><Typography fontWeight={700}>{trip.deliveryAddress||"Address missing"}</Typography>
          <Stack spacing={0.6} sx={{mt:2}}><Typography><b>Date:</b> {trip.pickupDate?new Date(trip.pickupDate).toLocaleString():"—"}</Typography><Typography><b>Truck:</b> {trip.truck||"—"}{trip.trailer?` · ${trip.trailer}`:""}</Typography><Typography><b>Cargo:</b> {trip.cargo||"—"}</Typography>{trip.distance&&<Typography><b>Distance:</b> {trip.distance} km</Typography>}</Stack>
        </CardContent>
        <CardActions sx={{flexWrap:"wrap",p:2,pt:0}}><Button onClick={()=>setSelected(trip)}>View Trip</Button><Button startIcon={<MapRoundedIcon/>} href={mapsUrl(trip,true)} target="_blank">Open Map</Button><Button variant="contained" startIcon={<NavigationRoundedIcon/>} href={mapsUrl(trip)} target="_blank">Start Navigation</Button></CardActions>
      </Card>)}
    </Box>
    {!visible.length&&!error&&<Alert severity="info">No trips in this section.</Alert>}
    <Dialog open={Boolean(selected)} onClose={()=>setSelected(null)} fullScreen={typeof window!=="undefined"&&window.innerWidth<600} fullWidth maxWidth="md">
      {selected&&<><DialogTitle><Stack direction="row" justifyContent="space-between"><span>{selected.tripNumber}</span><Chip label={selected.status}/></Stack></DialogTitle><DialogContent dividers><Stack spacing={2}>
        <section><Typography variant="h6" fontWeight={800}>Trip Summary</Typography><Typography>{selected.cargo||"No cargo description"}</Typography></section><Divider/>
        <section><Typography variant="h6" fontWeight={800}>Route Map</Typography><Alert severity={selected.pickupAddress&&selected.deliveryAddress?"info":"warning"}>{selected.pickupAddress} → {selected.deliveryAddress}</Alert><Button sx={{mt:1}} href={mapsUrl(selected,true)} target="_blank" startIcon={<MapRoundedIcon/>}>Open route in Google Maps</Button></section>
        <section><Typography variant="h6" fontWeight={800}>Pickup Information</Typography><Typography>{selected.pickupAddress}</Typography><Typography>{selected.pickupDate?new Date(selected.pickupDate).toLocaleString():"—"}</Typography></section>
        <section><Typography variant="h6" fontWeight={800}>Delivery Information</Typography><Typography>{selected.deliveryAddress}</Typography><Typography>{selected.deliveryDate?new Date(selected.deliveryDate).toLocaleString():"—"}</Typography></section>
        <section><Typography variant="h6" fontWeight={800}>Assigned Vehicle</Typography><Typography>{selected.truck||"—"} {selected.trailer||""}</Typography></section>
        <section><Typography variant="h6" fontWeight={800}>Contacts</Typography><Typography>{selected.contactPerson||"—"}</Typography>{selected.contactPhone&&<Button href={`tel:${selected.contactPhone}`} startIcon={<PhoneRoundedIcon/>}>Call {selected.contactPhone}</Button>}</section>
        <section><Typography variant="h6" fontWeight={800}>Instructions</Typography><Typography>{selected.instructions||"No special instructions"}</Typography></section>
        <section><Typography variant="h6" fontWeight={800}>Update Status</Typography><Stack direction="row" flexWrap="wrap" gap={1} sx={{mt:1}}>{["Accepted","Going to Pickup","At Pickup","Loaded","In Transit","At Delivery","Delivered","Problem Reported"].map(status=><Button key={status} size="small" color={status==="Problem Reported"?"error":"primary"} variant={selected.status===status?"contained":"outlined"} startIcon={status==="Problem Reported"?<WarningAmberRoundedIcon/>:undefined} onClick={()=>updateStatus(selected,status)}>{status}</Button>)}</Stack></section>
        <section><Typography variant="h6" fontWeight={800}>Status Timeline</Typography>{selected.activity?.map((entry,index)=><Typography key={index} variant="body2" sx={{mt:1}}>{entry.text} · {new Date(entry.time).toLocaleString()}</Typography>)}</section>
      </Stack></DialogContent><DialogActions><Button onClick={()=>setSelected(null)}>Close</Button></DialogActions></>}
    </Dialog>
  </Box>;
}
