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
  ToggleButton,
  ToggleButtonGroup,
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

function getStatusColumn(table: any, statusColumnId?: string) {
  const statusColumns = getSortedColumns(table).filter((col: any) => col?.type === "Status");
  return statusColumnId
    ? statusColumns.find((col: any) => col?.id === statusColumnId)
    : statusColumns[0];
}

function getPeopleColumn(table: any) {
  return getSortedColumns(table).find((col: any) => col?.type === "People");
}

function getTaskName(task: any, table: any) {
  if (!task?.values) return "Untitled";
  const sortedColumns = getSortedColumns(table);
  const primaryCol =
    sortedColumns.find((col: any) => /^(name|task|task name|title)$/i.test(String(col?.name || "").trim())) ||
    sortedColumns.find((col: any) => col?.type === "Text") ||
    sortedColumns.find((col: any) => !["Files", "People", "Doc", "Connect", "Status", "Dropdown"].includes(col?.type)) ||
    sortedColumns[0];
  const primaryValue = primaryCol ? task.values?.[primaryCol.id] : undefined;

  if (typeof primaryValue === "string" || typeof primaryValue === "number") {
    return String(primaryValue);
  }

  const fallbackValue = Object.values(task.values).find((value: any) => typeof value === "string" || typeof value === "number");
  return fallbackValue ? String(fallbackValue) : "Untitled";
}

function getStatusValue(task: any, table: any, statusColumnId?: string) {
  const statusCol = getStatusColumn(table, statusColumnId);
  const statusValue = statusCol ? task?.values?.[statusCol.id] : undefined;
  if (typeof statusValue === "string" && statusValue.trim()) {
    return statusValue;
  }
  return "Unknown";
}

function getStatusColor(task: any, table: any, statusColumnId?: string) {
  const status = getStatusValue(task, table, statusColumnId);
  const statusCol = getStatusColumn(table, statusColumnId);
  const matchingOption = statusCol?.options?.find((option: any) => option?.value === status && option?.color);
  return matchingOption?.color || STATUS_COLORS[status] || "#6161FF";
}

function getTaskAssignees(task: any, table: any) {
  const peopleCol = getPeopleColumn(table);
  const value = peopleCol ? task?.values?.[peopleCol.id] : undefined;
  return Array.isArray(value) ? value.filter((person: any) => person && (person.name || person.email)) : [];
}

function getTaskCreator(task: any) {
  if (task?.creator && (task.creator.name || task.creator.email)) {
    return task.creator;
  }
  if (task?.created_by) {
    return {
      id: task.created_by,
      name: "Unknown user",
      email: "",
      avatar: "",
    };
  }
  return null;
}



export default function DashboardPage() {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('');
  const [selectedStatusSource, setSelectedStatusSource] = useState('');
  const [visibleStatusesBySource, setVisibleStatusesBySource] = useState<Record<string, string[]>>({});
  const [workloadMode, setWorkloadMode] = useState<'assigned' | 'created'>('assigned');
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

  const statusSources = useMemo(() => {
    return filteredTables.flatMap((table: any) =>
      getSortedColumns(table)
        .filter((column: any) => column?.type === "Status")
        .map((column: any) => ({
          id: `${table.id}::${column.id}`,
          tableId: String(table.id),
          tableName: table.name || "Untitled Board",
          columnId: String(column.id),
          columnName: column.name || "Status",
          options: Array.isArray(column.options) ? column.options : [],
        }))
    );
  }, [filteredTables]);

  const selectedStatusConfig = useMemo(
    () => statusSources.find((source: any) => source.id === selectedStatusSource) || null,
    [statusSources, selectedStatusSource]
  );

  useEffect(() => {
    if (statusSources.length === 0) {
      setSelectedStatusSource('');
      return;
    }
    if (!statusSources.some((source: any) => source.id === selectedStatusSource)) {
      setSelectedStatusSource(statusSources[0].id);
    }
  }, [statusSources, selectedStatusSource]);

  const availableStatusLabels = useMemo(
    () => selectedStatusConfig?.options.map((option: any) => String(option.value)).filter(Boolean) || [],
    [selectedStatusConfig]
  );

  const visibleStatuses = selectedStatusConfig
    ? (visibleStatusesBySource[selectedStatusConfig.id] ?? availableStatusLabels.slice(0, 4))
    : [];

  const dashboardTasks = useMemo(() => {
    const reportingTables = selectedStatusConfig
      ? filteredTables.filter((table: any) => String(table.id) === selectedStatusConfig.tableId)
      : filteredTables;

    const baseTasks = reportingTables.flatMap((table: any) =>
      (table.tasks || [])
        .filter((task: any) => task && task.id && task.values)
        .map((task: any) => ({
          ...task,
          _table: table,
          _workspaceId: normalizeWorkspaceId(table),
          _workspaceName: workspacesById[normalizeWorkspaceId(table)]?.name || table.workspace_name || "Unknown Workspace",
          _taskName: getTaskName(task, table),
          _status: getStatusValue(task, table, selectedStatusConfig?.columnId),
          _statusColor: getStatusColor(task, table, selectedStatusConfig?.columnId),
          _assignees: getTaskAssignees(task, table),
          _creator: getTaskCreator(task),
        }))
    );

    return baseTasks.filter((task: any) => {
      const matchesPerson = !selectedPerson || task._assignees.some((person: any) =>
        person?.name === selectedPerson || person?.email === selectedPerson
      );

      const matchesSearch = !search || task._taskName.toLowerCase().includes(search.toLowerCase());

      return matchesPerson && matchesSearch;
    });
  }, [filteredTables, workspacesById, selectedPerson, search, selectedStatusConfig]);

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
  const visibleStatusCards = visibleStatuses.map((status) => {
    const option = selectedStatusConfig?.options.find((candidate: any) => candidate.value === status);
    const count = statusCounts[status] || 0;
    return {
      status,
      count,
      color: option?.color || STATUS_COLORS[status] || "#6161FF",
      percentage: totalTasks > 0 ? ((count / totalTasks) * 100).toFixed(1) : "0.0",
    };
  });

  // Pie Data
  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    value: count
  })).sort((a: any, b: any) => b.value - a.value);

  // Bar Data (People)
  const peopleCounts = dashboardTasks.reduce((acc: any, task) => {
    const people = workloadMode === 'created'
      ? (task._creator ? [task._creator] : [])
      : task._assignees;
    people.forEach((person: any) => {
      const name = person.name || person.email;
      if (name) acc[name] = (acc[name] || 0) + 1;
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
      createdBy: task._creator?.name || task._creator?.email || "Unknown creator",
    }));

    const header = ["Task Name", "Workspace", "Table", "Status", "Created By"];
    const csv = [
      header.join(","),
      ...rows.map((row: any) => [
        row.task,
        row.workspace,
        row.table,
        row.status,
        row.createdBy,
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

          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel sx={{ color: 'text.secondary' }}>Reporting status</InputLabel>
            <Select
              value={selectedStatusSource}
              label="Reporting status"
              onChange={e => setSelectedStatusSource(e.target.value)}
              sx={{ color: 'text.primary', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}
            >
              {statusSources.map((source: any) => (
                <MenuItem key={source.id} value={source.id}>
                  {source.tableName} / {source.columnName}
                </MenuItem>
              ))}
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

        {selectedStatusConfig && (
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'stretch', sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1.5,
              mb: { xs: 2, md: 3 },
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
            }}
          >
            <Box sx={{ minWidth: { sm: 180 } }}>
              <Typography variant="subtitle2" fontWeight={700}>Dashboard status cards</Typography>
              <Typography variant="caption" color="text.secondary">Choose the labels shown above the charts</Typography>
            </Box>
            <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
              <InputLabel>Visible statuses</InputLabel>
              <Select
                multiple
                value={visibleStatuses}
                label="Visible statuses"
                onChange={(event) => {
                  const value = event.target.value;
                  const selected = typeof value === 'string' ? value.split(',') : value;
                  setVisibleStatusesBySource((current) => ({
                    ...current,
                    [selectedStatusConfig.id]: selected,
                  }));
                }}
                renderValue={(selected) => selected.length > 0 ? selected.join(', ') : 'No status cards selected'}
              >
                {selectedStatusConfig.options.map((option: any) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box
                      component="span"
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: option.color || STATUS_COLORS[option.value] || '#6161FF',
                        mr: 1,
                        flexShrink: 0,
                      }}
                    />
                    {option.value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

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

          {visibleStatusCards.map((card) => (
            <Grid key={card.status} size={{ xs: 6, sm: 6, md: 3 }}>
              <StatCard sx={{ borderTop: `3px solid ${card.color}` }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexDirection={{ xs: "column", sm: "row" }} gap={1}>
                  <Box minWidth={0}>
                    <MuiTooltip title={card.status}>
                      <Typography variant="body2" color="#94a3b8" fontWeight={600} mb={0.5} noWrap sx={{ fontSize: { xs: "0.7rem", sm: "0.875rem" } }}>
                        {card.status.toUpperCase()}
                      </Typography>
                    </MuiTooltip>
                    <Typography variant="h3" fontWeight={700} sx={{ color: card.color, fontSize: { xs: "1.75rem", md: "3rem" } }}>
                      {card.count}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: `${card.color}20`, color: card.color, borderRadius: "12px", width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }}>
                    <CheckCircleIcon fontSize="small" />
                  </Avatar>
                </Box>
                <Box mt={2} width="100%">
                  <LinearProgress
                    variant="determinate"
                    value={Number(card.percentage)}
                    sx={{
                      bgcolor: "rgba(255,255,255,0.1)",
                      height: 6,
                      borderRadius: 3,
                      '& .MuiLinearProgress-bar': { bgcolor: card.color }
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" mt={0.75} display="block">
                    {card.percentage}% of tasks
                  </Typography>
                </Box>
              </StatCard>
            </Grid>
          ))}
        </Grid>

        {/* Charts Section - Forced Side by Side */}
        <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: { xs: 2, lg: 3 }, mb: 4, minHeight: { lg: 400 } }}>

          {/* Chart 1 */}
          <StyledCard sx={{ flex: 1, p: { xs: 2, md: 3 }, height: { xs: "auto", lg: "100%" } }}>
            <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
              <SectionHeader sx={{ mb: 0 }}>
                <Box component="span" sx={{ width: 8, height: 24, bgcolor: "#6366f1", borderRadius: 1, mr: 1, display: "inline-block" }} />
                {selectedStatusConfig?.columnName || "Status"}
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
              <ToggleButtonGroup
                exclusive
                size="small"
                value={workloadMode}
                onChange={(_event, value) => {
                  if (value) setWorkloadMode(value);
                }}
                aria-label="Team workload source"
                sx={{
                  '& .MuiToggleButton-root': {
                    px: 1.25,
                    py: 0.5,
                    textTransform: 'none',
                    fontSize: 12,
                  },
                }}
              >
                <ToggleButton value="assigned">Assigned to</ToggleButton>
                <ToggleButton value="created">Created by</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box sx={{ width: "100%", height: 300, minWidth: 0, position: "relative" }}>
              {mounted && barData.length > 0 && (
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
              {mounted && barData.length === 0 && (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary',
                    textAlign: 'center',
                    px: 3,
                  }}
                >
                  <PeopleIcon sx={{ fontSize: 36, mb: 1, opacity: 0.6 }} />
                  <Typography variant="body2" fontWeight={600}>
                    {workloadMode === 'assigned' ? 'No assigned tasks' : 'No creator data'}
                  </Typography>
                  <Typography variant="caption">
                    {workloadMode === 'assigned'
                      ? 'Assign people in a People column to populate workload.'
                      : 'Rows with creator information will appear here.'}
                  </Typography>
                </Box>
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
                  <TableCell sx={{ bgcolor: 'background.default', color: "#64748b", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    {(selectedStatusConfig?.columnName || "Status").toUpperCase()}
                  </TableCell>
                  <TableCell sx={{ bgcolor: 'background.default', color: "#64748b", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>CREATED BY</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dashboardTasks.map((task, idx) => {
                  const status = task._status;
                  const color = task._statusColor;
                  const creator = task._creator;

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
                        <Box display="flex" alignItems="center" gap={1}>
                          {creator ? (
                            <>
                              <Avatar
                                alt={creator.name || creator.email}
                                src={getAvatarUrl(creator.avatar, creator.name || creator.email)}
                                sx={{ width: 26, height: 26, fontSize: 11, bgcolor: "#6366f1" }}
                              >
                                {(creator.name || creator.email || "?")[0].toUpperCase()}
                              </Avatar>
                              <Box minWidth={0}>
                                <Typography variant="body2" noWrap sx={{ color: 'text.primary', fontWeight: 600 }}>
                                  {creator.name || creator.email}
                                </Typography>
                                {creator.name && creator.email && (
                                  <Typography variant="caption" noWrap color="text.secondary" display="block">
                                    {creator.email}
                                  </Typography>
                                )}
                              </Box>
                            </>
                          ) : <Typography variant="caption" color="#52525b">Unknown creator</Typography>}
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
