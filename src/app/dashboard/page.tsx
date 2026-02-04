"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Divider,
  Button,
  TextField,
  Avatar,
  IconButton,
} from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import FilterListIcon from '@mui/icons-material/FilterList';

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
  // Real-time data from backend
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    async function fetchTasks() {
      const res = await fetch('http://localhost:4000/api/tables');
      const tables = await res.json();
      // Flatten all tasks from all tables
      const allTasks = tables.flatMap(table =>
        (table.tasks || []).map(task => {
          // Try to get status and owner from values
          const status = task.values?.status || task.values?.['83dabc09-ba5a-4e4b-84f4-e3892536aa8d'] || task.values?.['status'] || task.values?.['Statusi'] || 'Unknown';
          // Try to get owner from people column or fallback
          let owner = 'Unknown';
          const peopleCol = Object.keys(task.values || {}).find(key => Array.isArray(task.values[key]) && task.values[key][0]?.email);
          if (peopleCol) {
            owner = (task.values[peopleCol][0]?.name || task.values[peopleCol][0]?.email || 'Unknown');
          }
          return { status, owner };
        })
      );
      setTasks(allTasks);
    }
    fetchTasks();
    const interval = setInterval(fetchTasks, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Calculate status counts
  const statusCounts = tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  // Calculate owner counts
  const ownerCounts = tasks.reduce((acc, t) => {
    acc[t.owner] = (acc[t.owner] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    value: count,
  }));

  const barData = Object.entries(ownerCounts).map(([owner, count]) => ({
    name: owner,
    count,
  }));

  const Widget = ({ title, value, filter }) => (
    <Card
      sx={{
        bgcolor: cardBg,
        border: `1px solid ${border}`,
        borderRadius: 2,
        boxShadow: "none",
        minHeight: 120,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {title}
          </Typography>
          {filter && (
            <IconButton size="small" sx={{ color: '#4f51c0' }}>
              <FilterListIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
        <Typography variant="h4" fontWeight={600} mt={1}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ bgcolor: '#23243a', minHeight: '100vh', color: '#fff', p: 0 }}>
      {/* HEADER */}
      <Box
        sx={{
          px: 4,
          py: 2,
          borderBottom: `1px solid ${border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography fontWeight={700} fontSize={24}>
          Dashboard and reporting ☆
        </Typography>
        <Box display="flex" gap={1}>
          <Button variant="outlined" size="small" sx={{ color: "#fff", borderColor: border }}>
            Export
          </Button>
          <Button variant="outlined" size="small" sx={{ color: "#fff", borderColor: border }}>
            Invite
          </Button>
        </Box>
      </Box>
      {/* FILTER BAR */}
      <Box sx={{ px: 4, py: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button variant="contained" sx={{ bgcolor: '#4f51c0', color: '#fff', borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
          + Add widget
        </Button>
        <Button variant="outlined" sx={{ color: '#fff', borderColor: border, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
          1 connected board
        </Button>
        <TextField
          size="small"
          placeholder="Type to filter"
          sx={{
            input: { color: "#fff" },
            '& fieldset': { borderColor: border },
            minWidth: 180,
          }}
        />
        <Button variant="outlined" sx={{ color: '#fff', borderColor: border, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
          People
        </Button>
        <Button variant="outlined" sx={{ color: '#fff', borderColor: border, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
          Filter
        </Button>
      </Box>
      {/* STATS CARDS */}
      <Grid container spacing={2} px={4} pt={2}>
        <Grid item xs={3}>
          <Widget title="All Tasks" value={tasks.length} filter />
        </Grid>
        <Grid item xs={3}>
          <Widget title="In progress" value={statusCounts["In progress"] || 0} filter />
        </Grid>
        <Grid item xs={3}>
          <Widget title="Stuck" value={statusCounts["Stuck"] || 0} filter />
        </Grid>
        <Grid item xs={3}>
          <Widget title="Done" value={statusCounts["Done"] || 0} filter />
        </Grid>
      </Grid>
      {/* CHARTS */}
      <Box px={4} py={2} sx={{ width: '100%', display: 'flex', justifyContent: { xs: 'center', md: 'flex-start' } }}>
        <Card
          sx={{
            bgcolor: cardBg,
            border: `1px solid ${border}`,
            borderRadius: 2,
            boxShadow: "none",
            width: '100%',
            maxWidth: 1400,
            minHeight: 600,
            marginLeft: { xs: 'auto', md: 0 },
            marginRight: { xs: 'auto', md: 'auto' },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-start',
            p: 4,
          }}
        >
          <Box sx={{ display: 'flex', gap: 4, width: '100%', justifyContent: 'flex-start', alignItems: 'flex-start', flexDirection: { xs: 'column', md: 'row' } }}>
            <Box sx={{ width: { xs: '100%', md: '100%' }, maxWidth: { xs: '100%', md: 1200 }, height: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(79,81,192,0.15)', borderRadius: 4, bgcolor: '#23243a', border: '2px solid #4f51c0', position: 'relative', mb: { xs: 4, md: 0 } }}>
              <Box sx={{ flexGrow: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width={600} height={400}>
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
              </Box>
              <Divider sx={{ bgcolor: border, my: 2, width: '100%' }} />
              <Box sx={{ width: '100%', position: 'absolute', left: 0, bottom: 16, px: 3 }}>
                {pieData.map((entry) => (
                  <Box key={entry.name} display="flex" alignItems="center" gap={1} mb={1}>
                    <Box
                      sx={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        bgcolor: getStatusColor(entry.name),
                      }}
                    />
                    <Typography variant="body2" fontSize={20} sx={{ color: '#fff' }}>
                      {entry.name}: {((entry.value / (tasks.length || 1)) * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <Box sx={{ width: { xs: '100%', md: '100%' }, maxWidth: { xs: '100%', md: 1200 }, height: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(79,81,192,0.15)', borderRadius: 4, bgcolor: '#23243a', border: '2px solid #4f51c0', position: 'relative' }}>
              <Box sx={{ flexGrow: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width={600} height={400}>
                  <BarChart data={barData}>
                    <XAxis stroke="#9ca3af" dataKey="name" fontSize={18} tickLine={false} axisLine={{ stroke: '#4f51c0', strokeWidth: 2 }} />
                    <YAxis stroke="#9ca3af" fontSize={18} tickLine={false} axisLine={{ stroke: '#4f51c0', strokeWidth: 2 }} />
                    <Tooltip wrapperStyle={{ fontSize: 18, background: '#23243a', color: '#fff', border: '2px solid #4f51c0', borderRadius: 8 }} />
                    <Bar dataKey="count" fill="#5B8DEF" radius={[12, 12, 0, 0]} stroke="#23243a" strokeWidth={2} label={{ position: 'top', fontSize: 20, fill: '#fff', fontWeight: 700 }} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              <Divider sx={{ bgcolor: border, my: 2, width: '100%' }} />
              <Box sx={{ width: '100%', position: 'absolute', left: 0, bottom: 16, px: 3 }}>
                {barData.map((owner) => (
                  <Box key={owner.name} display="flex" alignItems="center" gap={1} mb={1}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: "#5B8DEF" }}>
                      {owner.name?.[0]?.toUpperCase()}
                    </Avatar>
                    <Typography variant="body2" fontSize={20} sx={{ color: '#fff' }}>
                      {owner.name}: {owner.count}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Card>
      </Box>
      {/* HELP BUTTON */}
      <Box sx={{ position: 'fixed', bottom: 24, right: 24 }}>
        <Button variant="contained" sx={{ bgcolor: '#4f51c0', color: '#fff', borderRadius: 2, fontWeight: 600 }}>
          Help
        </Button>
      </Box>
    </Box>
  );
}
