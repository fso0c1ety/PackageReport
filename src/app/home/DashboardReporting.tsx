"use client";
import React, { useEffect, useState } from "react";
import { Box, Typography, Card, CardContent, Grid, Button, Avatar, Divider } from "@mui/material";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const STATUS_COLORS = {
  "Working on it": "#F9B233",
  "Done": "#00CA72",
  "Stuck": "#FF4C4C",
  "In progress": "#6161FF",
  "Bllokuar": "#FF4C4C",
  "Arritur": "#00CA72",
};

function getStatusColor(status) {
  return STATUS_COLORS[status] || "#6161FF";
}

export default function DashboardReporting() {
  const [tasks, setTasks] = useState([]);
  const [owners, setOwners] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});

  useEffect(() => {
    fetch("/api/transporti")
      .then((res) => res.json())
      .then((data) => {
        if (!data) return;
        // Simulate multiple tasks for demo, replace with real fetch
        let allTasks = [data];
        setTasks(allTasks);
        // Owners
        let ownerMap = {};
        allTasks.forEach((task) => {
          if (Array.isArray(task["73c3a39c-fe0e-45d5-a0e6-e4ffac381225"])) {
            task["73c3a39c-fe0e-45d5-a0e6-e4ffac381225"].forEach((owner) => {
              ownerMap[owner.email] = (ownerMap[owner.email] || 0) + 1;
            });
          }
        });
        setOwners(Object.entries(ownerMap).map(([email, count]) => ({ email, count })));
        // Status counts
        let statusMap = {};
        allTasks.forEach((task) => {
          const status = task["83dabc09-ba5a-4e4b-84f4-e3892536aa8d"];
          statusMap[status] = (statusMap[status] || 0) + 1;
        });
        setStatusCounts(statusMap);
      });
  }, []);

  // Pie chart data
  const pieData = Object.entries(statusCounts).map(([status, count]) => ({ name: status, value: count }));
  // Bar chart data
  const barData = owners.map((o) => ({ name: o.email, count: o.count }));

  return (
    <Box sx={{ bgcolor: "#23243a", color: "#fff", minHeight: "100vh", p: 4 }}>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Dashboard and reporting
      </Typography>
      <Grid container spacing={2} mb={2}>
        <Grid item xs={3}>
          <Card sx={{ bgcolor: "#18192b", color: "#fff" }}>
            <CardContent>
              <Typography variant="subtitle2">All Tasks</Typography>
              <Typography variant="h4" fontWeight={700}>{tasks.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card sx={{ bgcolor: "#18192b", color: "#fff" }}>
            <CardContent>
              <Typography variant="subtitle2">In progress</Typography>
              <Typography variant="h4" fontWeight={700}>{statusCounts["In progress"] || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card sx={{ bgcolor: "#18192b", color: "#fff" }}>
            <CardContent>
              <Typography variant="subtitle2">Stuck</Typography>
              <Typography variant="h4" fontWeight={700}>{statusCounts["Stuck"] || statusCounts["Bllokuar"] || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card sx={{ bgcolor: "#18192b", color: "#fff" }}>
            <CardContent>
              <Typography variant="subtitle2">Done</Typography>
              <Typography variant="h4" fontWeight={700}>{statusCounts["Done"] || statusCounts["Arritur"] || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Card sx={{ bgcolor: "#18192b", color: "#fff", height: 320 }}>
            <CardContent>
              <Typography variant="subtitle2" mb={2}>Tasks by status</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {pieData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={getStatusColor(entry.name)} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <Divider sx={{ my: 2, bgcolor: "#35365a" }} />
              {pieData.map((entry) => (
                <Box key={entry.name} display="flex" alignItems="center" gap={1} mb={1}>
                  <Box sx={{ width: 12, height: 12, bgcolor: getStatusColor(entry.name), borderRadius: "50%" }} />
                  <Typography variant="body2">{entry.name}: {((entry.value / (tasks.length || 1)) * 100).toFixed(1)}%</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card sx={{ bgcolor: "#18192b", color: "#fff", height: 320 }}>
            <CardContent>
              <Typography variant="subtitle2" mb={2}>Tasks by owner</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData}>
                  <XAxis dataKey="name" stroke="#fff" />
                  <YAxis stroke="#fff" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4f51c0" />
                </BarChart>
              </ResponsiveContainer>
              <Divider sx={{ my: 2, bgcolor: "#35365a" }} />
              {barData.map((owner) => (
                <Box key={owner.name || owner.email} display="flex" alignItems="center" gap={1} mb={1}>
                  <Avatar sx={{ width: 24, height: 24, bgcolor: '#4f51c0' }}>
                    {owner.email && typeof owner.email === 'string' && owner.email.length > 0 ? owner.email[0].toUpperCase() : '?'}
                  </Avatar>
                  <Typography variant="body2">{owner.email}: {owner.count}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
