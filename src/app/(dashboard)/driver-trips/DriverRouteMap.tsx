"use client";
import React from "react";
import { Alert, Box, Button, Stack } from "@mui/material";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import type { Map as LeafletMap, Layer } from "leaflet";
import "leaflet/dist/leaflet.css";

type Point=[number,number];
type Props={pickup?:Point|null;delivery?:Point|null;pickupAddress?:string;deliveryAddress?:string;focus?:"pickup"|"delivery"|null;onLocation?:(point:Point)=>void};

function geocodeCandidates(address:string):string[]{
  const cleaned=address.replace(/\s+/g," ").replace(/\s*-\s*/g,", ").trim();
  const spanishStreet=cleaned
    .replace(/^(\d+)\s+St\.?\s*([^,]+)/i,"Calle $2 $1")
    .replace(/\bI\.?\s*A\.?\b/gi,"")
    .replace(/\s+,/g,",")
    .replace(/,\s*,+/g,",")
    .replace(/\s+/g," ")
    .trim();
  const turkishStreet=cleaned
    .replace(/\bMah\.(?=\s|,)/gi,"Mahallesi")
    .replace(/\b(\d+)\.\s*Sok\b/gi,"$1. Sokak")
    .replace(/\bNo\s*:\s*(\d+)\s*\/\s*([A-Z])\b/gi,"No $1 $2")
    .replace(/\bNo\s*:\s*/gi,"No ")
    .replace(/\s+Kat\s*:\s*\d+\b/gi,"")
    .replace(/Beylikdüzü\s*\/\s*İstanbul/gi,"Beylikdüzü, İstanbul")
    .replace(/\s+,/g,",")
    .replace(/,\s*,+/g,",")
    .replace(/\s+/g," ")
    .trim();
  const turkishStreetWithoutBuilding=turkishStreet
    .replace(/,?\s*No\s+\d+\s*[A-Z]?\b/gi,"")
    .replace(/\s+,/g,",")
    .trim();
  return [...new Set([spanishStreet,turkishStreet,turkishStreetWithoutBuilding,cleaned].filter(Boolean))];
}

async function geocode(address?:string):Promise<Point|null>{
  if(!address)return null;
  for(const query of geocodeCandidates(address)){
    const params=new URLSearchParams({format:"jsonv2",limit:"1",q:query});
    if(/spain|españa/i.test(query))params.set("countrycodes","es");
    else if(/türkiye|turkey/i.test(query))params.set("countrycodes","tr");
    const response=await fetch(`https://nominatim.openstreetmap.org/search?${params}`,{headers:{"Accept-Language":"en"}});
    if(!response.ok)continue;
    const item=(await response.json())?.[0];
    const lat=Number(item?.lat),lon=Number(item?.lon);
    if(Number.isFinite(lat)&&Number.isFinite(lon))return [lat,lon];
  }
  return null;
}

async function route(from:Point,to:Point):Promise<Point[]>{
  const response=await fetch(`https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`);
  if(!response.ok)return [];
  const coordinates=(await response.json())?.routes?.[0]?.geometry?.coordinates||[];
  return coordinates.map((point:number[])=>[point[1],point[0]] as Point);
}

export default function DriverRouteMap({pickup,delivery,pickupAddress,deliveryAddress,focus,onLocation}:Props){
  const elementRef=React.useRef<HTMLDivElement|null>(null),mapRef=React.useRef<LeafletMap|null>(null),layersRef=React.useRef<Layer[]>([]),watchRef=React.useRef<number|null>(null),lastSentRef=React.useRef(0);
  const [resolvedPickup,setResolvedPickup]=React.useState<Point|null>(pickup||null),[resolvedDelivery,setResolvedDelivery]=React.useState<Point|null>(delivery||null),[current,setCurrent]=React.useState<Point|null>(null),[locating,setLocating]=React.useState(false),[message,setMessage]=React.useState("");
  React.useEffect(()=>{setResolvedPickup(pickup||null);setResolvedDelivery(delivery||null);setMessage("");let cancelled=false;void Promise.all([pickup?Promise.resolve(pickup):geocode(pickupAddress),delivery?Promise.resolve(delivery):geocode(deliveryAddress)]).then(([p,d])=>{if(!cancelled){setResolvedPickup(p);setResolvedDelivery(d);if(!p&&pickupAddress)setMessage("Pickup address could not be located. Check the street, postal code, city and country.");else if(!d&&deliveryAddress)setMessage("Destination address could not be located. Check the street, postal code, city and country.")}}).catch(()=>!cancelled&&setMessage("The route addresses could not be located."));return()=>{cancelled=true}},[pickup,delivery,pickupAddress,deliveryAddress]);
  const startLocation=React.useCallback(()=>{if(watchRef.current!==null)return;if(!navigator.geolocation){setMessage("Live location is not supported on this device.");return}localStorage.setItem("smartmanage-live-location","enabled");setLocating(true);setMessage("Allow location access to start live navigation.");watchRef.current=navigator.geolocation.watchPosition((position)=>{const point:Point=[position.coords.latitude,position.coords.longitude];setCurrent(point);setMessage("Live location is active and will resume automatically.");const now=Date.now();if(now-lastSentRef.current>=10000){lastSentRef.current=now;onLocation?.(point)}},(error)=>{setLocating(false);watchRef.current=null;if(error.code===1)localStorage.removeItem("smartmanage-live-location");setMessage(error.code===1?"Location permission was denied. Enable it once in phone browser settings, then tap Enable Live Location.":"Live location is currently unavailable.")},{enableHighAccuracy:true,maximumAge:5000,timeout:15000})},[onLocation]);
  const stopLocation=()=>{if(watchRef.current!==null)navigator.geolocation.clearWatch(watchRef.current);watchRef.current=null;localStorage.removeItem("smartmanage-live-location");setLocating(false);setCurrent(null);setMessage("Live location is turned off.")};
  React.useEffect(()=>{if(localStorage.getItem("smartmanage-live-location")==="enabled")startLocation()},[startLocation]);
  React.useEffect(()=>()=>{if(watchRef.current!==null)navigator.geolocation.clearWatch(watchRef.current)},[]);
  React.useEffect(()=>{let cancelled=false;void import("leaflet").then(async leaflet=>{if(cancelled||!elementRef.current)return;if(!mapRef.current){mapRef.current=leaflet.map(elementRef.current,{zoomControl:true}).setView([42.3,20.8],6);leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:19}).addTo(mapRef.current)}layersRef.current.forEach(layer=>layer.remove());layersRef.current=[];const icon=(label:string,color:string)=>leaflet.divIcon({className:"driver-route-marker",html:`<span style="background:${color}">${label}</span>`,iconSize:[38,38],iconAnchor:[19,19]});if(resolvedPickup)layersRef.current.push(leaflet.marker(resolvedPickup,{icon:icon("P","#16a34a")}).addTo(mapRef.current).bindPopup(`Pickup<br>${pickupAddress||""}`));if(resolvedDelivery)layersRef.current.push(leaflet.marker(resolvedDelivery,{icon:icon("D","#4f46e5")}).addTo(mapRef.current).bindPopup(`Destination<br>${deliveryAddress||""}`));if(current)layersRef.current.push(leaflet.marker(current,{icon:icon("YOU","#ef4444")}).addTo(mapRef.current).bindPopup("Your live location"));const target=focus==="delivery"?resolvedDelivery:focus==="pickup"?resolvedPickup:null;const from=current&&target?current:resolvedPickup;const to=target||(resolvedPickup&&resolvedDelivery?resolvedDelivery:null);let points:Point[]=[];if(from&&to&&from!==to){try{points=await route(from,to)}catch{points=[]}}if(cancelled)return;if(points.length)layersRef.current.push(leaflet.polyline(points,{color:"#4f46e5",weight:6,opacity:.9}).addTo(mapRef.current));else if(from&&to)layersRef.current.push(leaflet.polyline([from,to],{color:"#4f46e5",weight:4,dashArray:"9 7"}).addTo(mapRef.current));const bounds=[current,resolvedPickup,resolvedDelivery].filter(Boolean) as Point[];if(bounds.length>1)mapRef.current.fitBounds(leaflet.latLngBounds(bounds),{padding:[40,40]});else if(bounds[0])mapRef.current.setView(bounds[0],13);window.setTimeout(()=>mapRef.current?.invalidateSize(),0)});return()=>{cancelled=true}},[resolvedPickup,resolvedDelivery,current,focus,pickupAddress,deliveryAddress]);
  React.useEffect(()=>()=>{layersRef.current=[];mapRef.current?.remove();mapRef.current=null},[]);
  return <Box><Box ref={elementRef} sx={{height:{xs:420,md:600},width:"100%",bgcolor:"#dbeafe","& .driver-route-marker":{bgcolor:"transparent",border:0},"& .driver-route-marker span":{minWidth:38,height:38,px:.5,display:"grid",placeItems:"center",borderRadius:"50%",color:"white",fontSize:11,fontWeight:900,border:"3px solid white",boxShadow:"0 5px 15px rgba(15,23,42,.35)"}}}/><Stack direction={{xs:"column",sm:"row"}} spacing={1} sx={{p:2}}><Button variant="contained" color={locating?"success":"primary"} startIcon={<MyLocationRoundedIcon/>} onClick={locating?stopLocation:startLocation}>{locating?"Stop Live Location":"Enable Live Location"}</Button>{current&&<Button onClick={()=>mapRef.current?.setView(current,15)}>Center on Me</Button>}</Stack>{message&&<Alert severity={current?"success":"info"} sx={{mx:2,mb:2}}>{message}</Alert>}</Box>;
}
