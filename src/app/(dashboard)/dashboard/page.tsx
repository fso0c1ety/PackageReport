"use client";
import { getApiUrl, authenticatedFetch, getAvatarUrl } from "../../apiUrl";
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  Select,
  MenuItem,
  TextField,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  IconButton,
  Button,
  Stack,
  LinearProgress,
  Tooltip as MuiTooltip
} from "@mui/material";
import { styled } from "@mui/material/styles";
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
  CartesianGrid,
  Legend
} from "recharts";
import FilterListIcon from "@mui/icons-material/FilterList";
import DownloadIcon from "@mui/icons-material/Download";
import SearchIcon from "@mui/icons-material/Search";
import DashboardIcon from "@mui/icons-material/Dashboard";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PeopleIcon from "@mui/icons-material/People";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

// --- Styled Components ---

const DashboardRoot = styled(Box)(({ theme }) => ({
  minHeight: "100vh",
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  fontFamily: "'Inter', sans-serif",
  display: "flex",
  flexDirection: "column",
}));

const HeaderSection = styled(Box)(({ theme }) => ({
  // Base styles
  padding: theme.spacing(3, 4),
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: theme.palette.background.default,

  // Responsive adjustments to span full width, 
  // countering the parent container's padding.

  // xs: parent p=1 (8px)
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
    flexDirection: "column",
    alignItems: "stretch",
    gap: theme.spacing(2),

    marginTop: -8,
    marginLeft: -8,
    marginRight: -8,
    width: "calc(100% + 16px)",
  },

  // sm: parent p=2 (16px) -> 600px to 900px
  [theme.breakpoints.between("sm", "md")]: {
    marginTop: -16,
    marginLeft: -16,
    marginRight: -16,
    width: "calc(100% + 32px)",
  },

  // md: parent p=3 (24px) -> 900px+
  [theme.breakpoints.up("md")]: {
    marginTop: -24,
    marginLeft: -24,
    marginRight: -24,
    width: "calc(100% + 48px)",
  },
}));

const ContentSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4),
  flex: 1,
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(1.5),
  },
}));

const StyledCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.action.hover,
  color: theme.palette.text.primary,
  borderRadius: "16px",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  overflow: "visible", // For charts
}));

const StatCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.action.hover,
  color: theme.palette.text.primary,
  borderRadius: "16px",
  padding: theme.spacing(3),
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  height: "100%",
  position: "relative",
  overflow: "hidden",
  transition: "transform 0.2s ease-in-out",
  '&:hover': {
    transform: "translateY(-4px)",
    borderColor: "#6366f1",
  },
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
  },
}));

const FilterBar = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing(2),
  marginBottom: theme.spacing(4),
  padding: theme.spacing(2),
  backgroundColor: "rgba(44, 45, 74, 0.6)",
  borderRadius: "12px",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(1.5),
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
  },
}));

const SectionHeader = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: "1.1rem",
  marginBottom: theme.spacing(2),
  color: theme.palette.text.primary,
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

// --- Constants ---

const STATUS_COLORS: Record<string, string> = {
  "Working on it": "#F9B233",
  Done: "#00CA72",
  Stuck: "#FF4C4C",
  "In progress": "#6161FF",
  "To Do": "#94a3b8"
};

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];

// --- Helper Functions ---

function normalizeWorkspaceId(table: any) {
  return table?.workspace_id || table?.workspaceId || "";
}

function getSortedColumns(table: any) {
  return [...(table?.columns || [])].sort((a: any, b: any) => (a?.order ?? 0) - (b?.order ?? 0));
}

function getStatusColumn(table: any) {
  return getSortedColumns(table).find((col: any) => col?.type === "Status");
}

function getPeopleColumn(table: any) {
  return getSortedColumns(table).find((col: any) => col?.type === "People");
}

function getTaskName(task: any, table: any) {
  if (!task?.values) return "Untitled";
  const sortedColumns = getSortedColumns(table);
  const primaryCol = sortedColumns.find((col: any) => !["Files", "People", "Doc", "Connect"].includes(col?.type)) || sortedColumns[0];
  const primaryValue = primaryCol ? task.values?.[primaryCol.id] : undefined;

  if (typeof primaryValue === "string" || typeof primaryValue === "number") {
    return String(primaryValue);
  }

  const fallbackValue = Object.values(task.values).find((value: any) => typeof value === "string" || typeof value === "number");
  return fallbackValue ? String(fallbackValue) : "Untitled";
}

function getStatusValue(task: any, table: any) {
  const statusCol = getStatusColumn(table);
  const statusValue = statusCol ? task?.values?.[statusCol.id] : undefined;
  if (typeof statusValue === "string" && statusValue.trim()) {
    return statusValue;
  }
  return "Unknown";
}

function getStatusColor(task: any, table: any) {
  const status = getStatusValue(task, table);
  const statusCol = getStatusColumn(table);
  const matchingOption = statusCol?.options?.find((option: any) => option?.value === status && option?.color);
  return matchingOption?.color || STATUS_COLORS[status] || "#6161FF";
}

function getTaskAssignees(task: any, table: any) {
  const peopleCol = getPeopleColumn(table);
  const value = peopleCol ? task?.values?.[peopleCol.id] : undefined;
  return Array.isArray(value) ? value.filter((person: any) => person && (person.name || person.email)) : [];
}



export default function DashboardPage() {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const workspacesById = useMemo(
    () => Object.fromEntries(workspaces.map((workspace: any) => [workspace.id, workspace])),
    [workspaces]
  );

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [wsRes, tablesRes] = await Promise.all([
          authenticatedFetch(getApiUrl("workspaces")),
          authenticatedFetch(getApiUrl("tables")),
        ]);
        const wsData = await wsRes.json();
        const tablesData = await tablesRes.json();

        setWorkspaces(Array.isArray(wsData) ? wsData : []);
        setTables(Array.isArray(tablesData) ? tablesData : []);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredTables = useMemo(() => {
    return selectedWorkspace
      ? tables.filter((table: any) => normalizeWorkspaceId(table) === selectedWorkspace)
      : tables;
  }, [tables, selectedWorkspace]);

  const dashboardTasks = useMemo(() => {
    const baseTasks = filteredTables.flatMap((table: any) =>
      (table.tasks || [])
        .filter((task: any) => task && task.id && task.values)
        .map((task: any) => ({
          ...task,
          _table: table,
          _workspaceId: normalizeWorkspaceId(table),
          _workspaceName: workspacesById[normalizeWorkspaceId(table)]?.name || table.workspace_name || "Unknown Workspace",
          _taskName: getTaskName(task, table),
          _status: getStatusValue(task, table),
          _statusColor: getStatusColor(task, table),
          _assignees: getTaskAssignees(task, table),
        }))
    );

    return baseTasks.filter((task: any) => {
      const matchesPerson = !selectedPerson || task._assignees.some((person: any) =>
        person?.name === selectedPerson || person?.email === selectedPerson
      );

      const matchesSearch = !search || task._taskName.toLowerCase().includes(search.toLowerCase());

      return matchesPerson && matchesSearch;
    });
  }, [filteredTables, workspacesById, selectedPerson, search]);

  const allPeople = useMemo(() => {
    return Array.from(
      new Set(
        filteredTables.flatMap((table: any) =>
          (table.tasks || []).flatMap((task: any) =>
            getTaskAssignees(task, table).map((person: any) => person.name || person.email).filter(Boolean)
          )
        )
      )
    ).sort();
  }, [filteredTables]);

  // Metrics
  const totalTasks = dashboardTasks.length;
  const statusCounts = dashboardTasks.reduce((acc: any, t) => {
    const status = t._status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const completedTasks = statusCounts['Done'] || 0;
  const inProgressTasks = (statusCounts['Working on it'] || 0) + (statusCounts['In progress'] || 0);
  const stuckTasks = statusCounts['Stuck'] || 0;
  const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;

  // Pie Data
  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    value: count
  })).sort((a: any, b: any) => b.value - a.value);

  // Bar Data (People)
  const peopleCounts = dashboardTasks.reduce((acc: any, t) => {
    t._assignees.forEach((person: any) => {
        const name = person.name || person.email;
        acc[name] = (acc[name] || 0) + 1;
    });
    return acc;
  }, {});

  const barData = Object.entries(peopleCounts)
    .map(([name, count]: any) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // Top 8 only

  const handleExportReport = () => {
    const rows = dashboardTasks.map((task: any) => ({
      task: task._taskName,
      workspace: task._workspaceName,
      table: task._table?.name || "Unknown Table",
      status: task._status,
      assignees: task._assignees.map((person: any) => person.name || person.email).join(", ") || "Unassigned",
    }));

    const header = ["Task Name", "Workspace", "Table", "Status", "Assignees"];
    const csv = [
      header.join(","),
      ...rows.map((row: any) => [
        row.task,
        row.workspace,
        row.table,
        row.status,
        row.assignees,
      ].map((value: string) => `"${String(value).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dashboard-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardRoot>
      <HeaderSection>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: "-0.03em", mb: 0.5 }}>
            Analytics & Reports
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Track project health, team velocity, and task completion
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportReport}
          sx={{
            color: 'text.primary',
            borderColor: "rgba(255,255,255,0.2)",
            textTransform: "none",
            '&:hover': { borderColor: "#6366f1", bgcolor: "rgba(99, 102, 241, 0.1)" }
          }}
        >
          Export Report
        </Button>
      </HeaderSection>

      <ContentSection>
        {/* Filters */}
        <FilterBar>
          <Box display="flex" alignItems="center" gap={1} color="#6366f1" mr={2}>
            <FilterListIcon fontSize="small" />
            <Typography variant="subtitle2" fontWeight={700}>Filter By:</Typography>
          </Box>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel sx={{ color: 'text.secondary' }}>Workspace</InputLabel>
            <Select
              value={selectedWorkspace}
              label="Workspace"
              onChange={e => setSelectedWorkspace(e.target.value)}
              sx={{ color: 'text.primary', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}
            >
              <MenuItem value="">All Workspaces</MenuItem>
              {workspaces.map(ws => <MenuItem key={ws.id} value={ws.id}>{ws.name}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel sx={{ color: 'text.secondary' }}>Assignee</InputLabel>
            <Select
              value={selectedPerson}
              label="Assignee"
              onChange={e => setSelectedPerson(e.target.value)}
              sx={{ color: 'text.primary', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}
            >
              <MenuItem value="">All Team Members</MenuItem>
              {allPeople.map((name: any) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField
            size="small"
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 18 }} /> }}
            sx={{
              ml: "auto",
              width: 300,
              '& .MuiOutlinedInput-root': {
                color: 'text.primary',
                '& fieldset': { borderColor: "rgba(255,255,255,0.1)" },
                '&:hover fieldset': { borderColor: "rgba(255,255,255,0.2)" },
                '&.Mui-focused fieldset': { borderColor: "#6366f1" }
              }
            }}
          />
        </FilterBar>

        {/* Stats Grid */}
        <Grid container spacing={2} sx={{ mb: { xs: 2, md: 4 } }}>
          {/* Total Tasks */}
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <StatCard>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexDirection={{ xs: "column", sm: "row" }} gap={1}>
                <Box>
                  <Typography variant="body2" color="#94a3b8" fontWeight={600} mb={0.5} sx={{ fontSize: { xs: "0.7rem", sm: "0.875rem" } }}>TOTAL TASKS</Typography>
                  <Typography variant="h3" fontWeight={700} sx={{ fontSize: { xs: "1.75rem", md: "3rem" } }}>{totalTasks}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: "rgba(99, 102, 241, 0.15)", color: "#6366f1", borderRadius: "12px", width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }}>
                  <AssignmentIcon fontSize="small" />
                </Avatar>
              </Box>
              <Box mt={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label="Active" size="small" sx={{ bgcolor: "rgba(99, 102, 241, 0.2)", color: "#818cf8", height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                </Stack>
              </Box>
            </StatCard>
          </Grid>

          {/* Completion Rate */}
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <StatCard>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexDirection={{ xs: "column", sm: "row" }} gap={1}>
                <Box>
                  <Typography variant="body2" color="#94a3b8" fontWeight={600} mb={0.5} sx={{ fontSize: { xs: "0.7rem", sm: "0.875rem" } }}>COMPLETION</Typography>
                  <Typography variant="h3" fontWeight={700} sx={{ fontSize: { xs: "1.75rem", md: "3rem" } }}>{completionRate}%</Typography>
                </Box>
                <Avatar sx={{ bgcolor: "rgba(34, 197, 94, 0.15)", color: "#22c55e", borderRadius: "12px", width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }}>
                  <TrendingUpIcon fontSize="small" />
                </Avatar>
              </Box>
              <Box mt={2} width="100%">
                <LinearProgress
                  variant="determinate"
                  value={Number(completionRate)}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.1)",
                    height: 6,
                    borderRadius: 3,
                    '& .MuiLinearProgress-bar': { bgcolor: "#22c55e" }
                  }}
                />
              </Box>
            </StatCard>
          </Grid>

          {/* In Progress */}
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <StatCard>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexDirection={{ xs: "column", sm: "row" }} gap={1}>
                <Box>
                  <Typography variant="body2" color="#94a3b8" fontWeight={600} mb={0.5} sx={{ fontSize: { xs: "0.7rem", sm: "0.875rem" } }}>IN FLIGHT</Typography>
                  <Typography variant="h3" fontWeight={700} sx={{ fontSize: { xs: "1.75rem", md: "3rem" } }}>{inProgressTasks}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: "rgba(249, 178, 51, 0.15)", color: "#F9B233", borderRadius: "12px", width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }}>
                  <CalendarTodayIcon fontSize="small" />
                </Avatar>
              </Box>
              <Typography variant="caption" color="#94a3b8" mt={2} display="block" sx={{ display: { xs: 'none', sm: 'block' } }}>
                Working on it + In Progress
              </Typography>
            </StatCard>
          </Grid>

          {/* Stuck */}
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <StatCard>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexDirection={{ xs: "column", sm: "row" }} gap={1}>
                <Box>
                  <Typography variant="body2" color="#94a3b8" fontWeight={600} mb={0.5} sx={{ fontSize: { xs: "0.7rem", sm: "0.875rem" } }}>BLOCKED</Typography>
                  <Typography variant="h3" fontWeight={700} sx={{ color: stuckTasks > 0 ? "#FF4C4C" : "inherit", fontSize: { xs: "1.75rem", md: "3rem" } }}>{stuckTasks}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: "rgba(255, 76, 76, 0.15)", color: "#FF4C4C", borderRadius: "12px", width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }}>
                  <CheckCircleIcon fontSize="small" /> {/* Placeholder icon */}
                </Avatar>
              </Box>
              <Typography variant="caption" color="#94a3b8" mt={2} display="block" sx={{ display: { xs: 'none', sm: 'block' } }}>
                Tasks requiring attention
              </Typography>
            </StatCard>
          </Grid>
        </Grid>

        {/* Charts Section - Forced Side by Side */}
        <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: { xs: 2, lg: 3 }, mb: 4, minHeight: { lg: 400 } }}>

          {/* Chart 1 */}
          <StyledCard sx={{ flex: 1, p: { xs: 2, md: 3 }, height: { xs: "auto", lg: "100%" } }}>
            <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
              <SectionHeader sx={{ mb: 0 }}>
                <Box component="span" sx={{ width: 8, height: 24, bgcolor: "#6366f1", borderRadius: 1, mr: 1, display: "inline-block" }} />
                Status
              </SectionHeader>
            </Box>
            <Box sx={{ width: "100%", height: 300, minWidth: 0, position: "relative" }}>
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={2}
                      tooltipType="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={dashboardTasks.find((task: any) => task._status === entry.name)?._statusColor || STATUS_COLORS[String(entry.name)] || "#6161FF"}
                          strokeWidth={0}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e1f30', borderColor: '#35365a', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                      itemStyle={{ color: 'text.primary', fontWeight: 600 }}
                    />
                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Box>
          </StyledCard>

          {/* Chart 2 */}
          <StyledCard sx={{ flex: 1, p: { xs: 2, md: 3 }, height: { xs: "auto", lg: "100%" } }}>
            <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
              <SectionHeader sx={{ mb: 0 }}>
                <Box component="span" sx={{ width: 8, height: 24, bgcolor: "#00CA72", borderRadius: 1, mr: 1, display: "inline-block" }} />
                Team Workload
              </SectionHeader>
            </Box>
            <Box sx={{ width: "100%", height: 300, minWidth: 0, position: "relative" }}>
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={{ backgroundColor: '#1e1f30', borderColor: '#35365a', borderRadius: 8 }}
                      itemStyle={{ color: 'text.primary' }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#6366f1"
                      radius={[6, 6, 0, 0]}
                      barSize={32}
                    >
                      {barData.map((entry: any, index: any) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>
          </StyledCard>
        </Box>

        {/* Detailed Table */}
        <StyledCard sx={{ overflow: "hidden" }}>
          <Box p={{ xs: 2, md: 3 }} borderBottom="1px solid rgba(255,255,255,0.05)">
            <SectionHeader sx={{ mb: 0 }}>Detailed Task Report</SectionHeader>
          </Box>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: 'background.default', color: "#64748b", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>TASK NAME</TableCell>
                  <TableCell sx={{ bgcolor: 'background.default', color: "#64748b", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>WORKSPACE</TableCell>
                  <TableCell sx={{ bgcolor: 'background.default', color: "#64748b", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>STATUS</TableCell>
                  <TableCell sx={{ bgcolor: 'background.default', color: "#64748b", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>ASSIGNEES</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dashboardTasks.map((task, idx) => {
                  const status = task._status;
                  const color = task._statusColor;
                  const assignees = task._assignees;

                  return (
                    <TableRow key={idx} hover sx={{ '&:hover': { bgcolor: "rgba(255,255,255,0.02)" } }}>
                      <TableCell sx={{ color: 'text.primary', borderBottom: "1px solid rgba(255,255,255,0.05)", fontWeight: 500 }}>
                        {task._taskName}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        {task._workspaceName}
                      </TableCell>
                      <TableCell sx={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <Chip
                          label={status}
                          size="small"
                          sx={{
                            bgcolor: `${color}20`,
                            color: color,
                            fontWeight: 700,
                            borderRadius: 1,
                            border: `1px solid ${color}40`,
                            minWidth: 80
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <Box display="flex" gap={0.5}>
                          {assignees.length > 0 ? (
                            assignees.map((p: any, i: number) => (
                              <MuiTooltip key={i} title={p.name || p.email}>
                                <Avatar
                                  alt={p.name}
                                  src={getAvatarUrl(p.avatar || p.photo_url, p.name)}
                                  sx={{ width: 24, height: 24, fontSize: 10, bgcolor: CHART_COLORS[i % CHART_COLORS.length] }}
                                >
                                  {(p.name || p.email || "?")[0].toUpperCase()}
                                </Avatar>
                              </MuiTooltip>
                            ))
                          ) : <Typography variant="caption" color="#52525b">Unassigned</Typography>}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </StyledCard>
      </ContentSection>
    </DashboardRoot>
  );
}
