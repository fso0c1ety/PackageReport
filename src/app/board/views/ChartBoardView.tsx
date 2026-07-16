"use client";
import React from 'react';
import { Box, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Typography } from '@mui/material';
import type { Column, Row } from '../../../types';

const numberOf = (value: any) => { const parsed = Number(String(value?.amount ?? value ?? '').replace(/[^0-9.-]/g, '')); return Number.isFinite(parsed) ? parsed : 0; };

export default function ChartBoardView({ rows, columns }: { rows: Row[]; columns: Column[] }) {
  const groupColumns = columns.filter((column) => ['Status', 'Dropdown', 'Country', 'People', 'Tags'].includes(column.type));
  const measureColumns = columns.filter((column) => ['Numbers', 'Money', 'Formula', 'Progress', 'Rating'].includes(column.type));
  const [groupId, setGroupId] = React.useState(groupColumns[0]?.id || '');
  const [measureId, setMeasureId] = React.useState(measureColumns[0]?.id || '');
  const [aggregation, setAggregation] = React.useState<'count'|'sum'|'average'>('count');
  const series = React.useMemo(() => {
    const groups = new Map<string,{count:number,total:number}>();
    rows.forEach((row) => { const raw:any = groupId ? row.values?.[groupId] : 'All rows'; const label = Array.isArray(raw) ? raw.map((v:any)=>v?.name||v).join(', ') : String(raw?.label ?? raw ?? 'Unassigned'); const item=groups.get(label)||{count:0,total:0}; item.count++; item.total+=numberOf(row.values?.[measureId]); groups.set(label,item); });
    return [...groups].map(([label,item])=>({label,value:aggregation==='sum'?item.total:aggregation==='average'?(item.total/item.count):item.count})).sort((a,b)=>b.value-a.value);
  },[rows,groupId,measureId,aggregation]);
  const max = Math.max(1,...series.map((item)=>item.value));
  return <Paper sx={{mt:4,p:{xs:2,md:4},borderRadius:4,border:'1px solid',borderColor:'divider'}}>
    <Stack direction={{xs:'column',md:'row'}} justifyContent="space-between" gap={2} mb={4}><Box><Typography variant="h5" fontWeight={900}>Chart View</Typography><Typography color="text.secondary">Live summary of {rows.length} rows</Typography></Box><Stack direction={{xs:'column',sm:'row'}} gap={1.5}>
      <FormControl size="small" sx={{minWidth:150}}><InputLabel>Group by</InputLabel><Select label="Group by" value={groupId} onChange={(e)=>setGroupId(e.target.value)}>{groupColumns.map((c)=><MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</Select></FormControl>
      <FormControl size="small" sx={{minWidth:140}}><InputLabel>Aggregation</InputLabel><Select label="Aggregation" value={aggregation} onChange={(e)=>setAggregation(e.target.value as any)}><MenuItem value="count">Count</MenuItem><MenuItem value="sum">Sum</MenuItem><MenuItem value="average">Average</MenuItem></Select></FormControl>
      {aggregation!=='count'&&<FormControl size="small" sx={{minWidth:150}}><InputLabel>Measure</InputLabel><Select label="Measure" value={measureId} onChange={(e)=>setMeasureId(e.target.value)}>{measureColumns.map((c)=><MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</Select></FormControl>}
    </Stack></Stack>
    <Stack gap={2}>{series.length?series.map((item)=><Box key={item.label}><Stack direction="row" justifyContent="space-between"><Typography fontWeight={800}>{item.label||'Unassigned'}</Typography><Typography fontWeight={900}>{Number(item.value.toFixed(2)).toLocaleString()}</Typography></Stack><Box sx={{height:18,bgcolor:'action.hover',borderRadius:9,overflow:'hidden',mt:.75}}><Box sx={{height:'100%',width:`${Math.max(3,item.value/max*100)}%`,background:'linear-gradient(90deg,#5b5df0,#8b5cf6)',borderRadius:9,transition:'width .3s'}}/></Box></Box>):<Typography color="text.secondary">Add a status or dropdown column to build a chart.</Typography>}</Stack>
  </Paper>;
}
