"use client";


import React, { useEffect, useState } from "react";
import { Box, Typography, Card, CardContent, Grid, Avatar, Divider, Button, TextField, MenuItem, Select, InputLabel, FormControl } from "@mui/material";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const STATUS_COLORS = {
  "Working on it": "#F9B233",
  Done: "#00CA72",
  Stuck: "#FF4C4C",
  "In progress": "#6161FF",
};
const cardBg = "#18192b";
const border = "#35365a";
function getStatusColor(status) {
  return STATUS_COLORS[status] || "#6161FF";
}

export default function DashboardPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch("http://192.168.0.28:4000/api/workspaces")
      .then((res) => res.json())
      .then(setWorkspaces);
    fetch("http://192.168.0.28:4000/api/tables")
      .then((res) => res.json())
      .then(setTables);
  }, []);


  // Helper to get the status value for a task using its table's columns
  function getStatusValue(task, table) {
    if (!task || !table) return 'Unknown';
    // Find the status column id (type === 'Status')
    const statusCol = (table.columns || []).find(col => col.type === 'Status');
    if (statusCol && task.values && task.values[statusCol.id]) {
      return task.values[statusCol.id];
    }
    // Fallbacks
    return task.values?.status || task.values?.['83dabc09-ba5a-4e4b-84f4-e3892536aa8d'] || task.values?.['Statusi'] || 'Unknown';
  }

  // Filter tables and tasks by workspace and person
  const filteredTables = selectedWorkspace
    ? tables.filter(t => t.workspaceId === selectedWorkspace)
    : tables;
  let allTasks = filteredTables.flatMap(t => t.tasks?.map(task => ({ ...task, _table: t })) || []);
  if (selectedPerson) {
    allTasks = allTasks.filter(task => {
      const peopleCol = Object.keys(task.values || {}).find(key => Array.isArray(task.values[key]) && task.values[key][0]?.email);
      if (peopleCol) {
        return task.values[peopleCol].some(p => p.name === selectedPerson || p.email === selectedPerson);
      }
      return false;
    });
  }
  if (search) {
    allTasks = allTasks.filter(task => {
      const taskName = task.values?.task || Object.values(task.values || {})[0] || '';
      return taskName.toLowerCase().includes(search.toLowerCase());
    });
  }

  // Status and people for graphs
  const statusCounts = allTasks.reduce((acc, t) => {
    const status = getStatusValue(t, t._table);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusCounts).map(([status, count]) => ({ name: status, value: count }));
  // People for filter
  const allPeople = Array.from(new Set(
    allTasks.flatMap(task => {
      const peopleCol = Object.keys(task.values || {}).find(key => Array.isArray(task.values[key]) && task.values[key][0]?.email);
      if (peopleCol) {
        return task.values[peopleCol].map(p => p.name || p.email);
      }
      return [];
    })
  ));
  // Bar chart for people
  const peopleCounts = allTasks.reduce((acc, t) => {
    const peopleCol = Object.keys(t.values || {}).find(key => Array.isArray(t.values[key]) && t.values[key][0]?.email);
    if (peopleCol) {
      t.values[peopleCol].forEach(p => {
        const name = p.name || p.email;
        acc[name] = (acc[name] || 0) + 1;
      });
    }
    return acc;
  }, {});
  const barData = Object.entries(peopleCounts).map(([name, count]) => ({ name, count }));

  return (
    <Box sx={{ bgcolor: '#23243a', minHeight: '100vh', color: '#fff', p: 0 }}>
      <Box sx={{ px: 4, py: 2, borderBottom: '1px solid #35365a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography fontWeight={700} fontSize={28}>Dashboard and Reporting</Typography>
      </Box>
      <Box sx={{ px: 4, py: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 180 }} size="small">
          <InputLabel sx={{ color: '#fff' }}>Workspace</InputLabel>
          <Select
            value={selectedWorkspace}
            label="Workspace"
            onChange={e => setSelectedWorkspace(e.target.value)}
            sx={{ color: '#fff', borderColor: '#35365a', '.MuiOutlinedInput-notchedOutline': { borderColor: '#35365a' } }}
          >
            <MenuItem value="">All Workspaces</MenuItem>
            {workspaces.map(ws => (
              <MenuItem key={ws.id} value={ws.id}>{ws.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 180 }} size="small">
          <InputLabel sx={{ color: '#fff' }}>People</InputLabel>
          <Select
            value={selectedPerson}
            label="People"
            onChange={e => setSelectedPerson(e.target.value)}
            sx={{ color: '#fff', borderColor: '#35365a', '.MuiOutlinedInput-notchedOutline': { borderColor: '#35365a' } }}
          >
            <MenuItem value="">All People</MenuItem>
            {allPeople.map(name => (
              <MenuItem key={name} value={name}>{name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          placeholder="Search tasks"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ input: { color: "#fff" }, '& fieldset': { borderColor: '#35365a' }, minWidth: 180 }}
        />
      </Box>
      <Grid container spacing={2} px={4} pt={2}>
        <Grid item xs={12}>
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <Box display="flex" flexDirection="row" gap={4} minWidth={1400}>
              <Card sx={{ minWidth: 600, bgcolor: cardBg, border: `1px solid ${border}`, borderRadius: 2, boxShadow: "none", minHeight: 400 }}>
                <CardContent>
                  <Typography fontWeight={600} fontSize={18} mb={2}>Task Status Overview</Typography>
                  <ResponsiveContainer width={550} height={360}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={180}
                        label={({ name, value }) => `${name}: ${value}`}
                        stroke="#fff"
                        strokeWidth={3}
                      >
                        {pieData.map((entry, idx) => (
                          <Cell key={idx} fill={getStatusColor(entry.name)} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card sx={{ minWidth: 800, bgcolor: cardBg, border: `1px solid ${border}`, borderRadius: 2, boxShadow: "none", minHeight: 400 }}>
                <CardContent>
                  <Typography fontWeight={600} fontSize={18} mb={2}>Tasks per Person</Typography>
                  <ResponsiveContainer width={750} height={360}>
                    <BarChart data={barData}>
                      <XAxis stroke="#9ca3af" dataKey="name" fontSize={18} tickLine={false} axisLine={{ stroke: '#4f51c0', strokeWidth: 2 }} />
                      <YAxis stroke="#9ca3af" fontSize={18} tickLine={false} axisLine={{ stroke: '#4f51c0', strokeWidth: 2 }} />
                      <Tooltip wrapperStyle={{ fontSize: 18, background: '#23243a', color: '#fff', border: '2px solid #4f51c0', borderRadius: 8 }} />
                      <Bar dataKey="count" fill="#5B8DEF" radius={[12, 12, 0, 0]} stroke="#23243a" strokeWidth={2} label={{ position: 'top', fontSize: 18, fill: '#fff', fontWeight: 700 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Grid>
      </Grid>
      <Box px={4} py={4}>
        <Card sx={{ bgcolor: cardBg, border: `1px solid ${border}`, borderRadius: 2, boxShadow: "none", width: '100%' }}>
          <CardContent>
            <Typography fontWeight={600} fontSize={18} mb={2}>Tasks Table</Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
                <thead>
                  <tr style={{ background: '#35365a' }}>
                    <th style={{ padding: 8, border: '1px solid #23243a' }}>Task</th>
                    <th style={{ padding: 8, border: '1px solid #23243a' }}>Status</th>
                    <th style={{ padding: 8, border: '1px solid #23243a' }}>People</th>
                  </tr>
                </thead>
                <tbody>
                  {allTasks.map((task, idx) => {
                    const peopleCol = Object.keys(task.values || {}).find(key => Array.isArray(task.values[key]) && task.values[key][0]?.email);
                    return (
                      <tr key={task.id || idx} style={{ background: idx % 2 === 0 ? '#23243a' : '#18192b' }}>
                        <td style={{ padding: 8, border: '1px solid #23243a' }}>{task.values?.task || Object.values(task.values || {})[0] || 'Untitled Task'}</td>
                        <td style={{ padding: 8, border: '1px solid #23243a' }}>{getStatusValue(task, task._table)}</td>
                        <td style={{ padding: 8, border: '1px solid #23243a' }}>
                          {peopleCol && Array.isArray(task.values[peopleCol]) && task.values[peopleCol].length > 0
                            ? task.values[peopleCol].map((p, i) => (
                                <span key={i}>{p.name || p.email}{i < task.values[peopleCol].length - 1 ? ', ' : ''}</span>
                              ))
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
