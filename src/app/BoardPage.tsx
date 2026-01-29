"use client";
import React, { useState } from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import { getApiUrl } from "./apiUrl";
import GroupMenu from "./GroupMenu";
import GroupNameModal from "./GroupNameModal";
import TableBoard from "./TableBoard";
import TablesPage from "./TablesPage";
import AddIcon from "@mui/icons-material/Add";

interface Group {
  id: string;
  name: string;
  color: string;
  completed?: boolean;
}

const initialGroups: Group[] = [
  { id: "default-board", name: "To-Do", color: "#0073ea" },
  { id: "completed", name: "Completed", color: "#00c875", completed: true },
];

function BoardPage() {
  const [workspaces, setWorkspaces] = useState<Group[]>(initialGroups);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>(initialGroups[0]?.id || '');

  // Fetch tables from backend and sync groups
  const fetchTables = async () => {
    const res = await fetch(getApiUrl("/tables"));
    const tables = await res.json();
    setWorkspaces(tables.map((table: any) => ({
      id: table.id,
      name: table.name,
      color: "#0073ea"
    })));
    if (tables.length && !tables.find((t: any) => t.id === selectedWorkspace)) {
      setSelectedWorkspace(tables[0].id);
    }
  };
  const [showTables, setShowTables] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingName, setPendingName] = useState<string | null>(null);

  const handleAddWorkspace = () => {
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  const handleModalSubmit = async (name: string) => {
    setModalOpen(false);
    // Default columns: Text, Status, Number
    const defaultColumns = [
      {
        id: "task",
        name: "Task",
        type: "Text",
        order: 0
      },
      {
        id: "status",
        name: "Status",
        type: "Status",
        order: 1,
        options: [
          { value: "Started", color: "#1976d2" },
          { value: "Working on it", color: "#fdab3d" },
          { value: "Done", color: "#00c875" }
        ]
      },
      {
        id: "number",
        name: "Number",
        type: "Numbers",
        order: 2
      }
    ];
    const res = await fetch(getApiUrl("/tables"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, columns: defaultColumns }),
    });
    const created = await res.json();
    await fetchTables();
    setSelectedWorkspace(created.id);
  };

  // Fetch tables on mount
  React.useEffect(() => {
    fetchTables();
  }, []);

  return (
    <Box>
      {/* Workspace controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            bgcolor: '#0073ea',
            color: '#fff',
            fontWeight: 700,
            fontSize: 20,
            borderRadius: 2,
            textTransform: 'none',
            px: 2,
            boxShadow: 1,
            '&:hover': { bgcolor: '#005bb5' }
          }}
          onClick={handleAddWorkspace}
        >
          Workspaces
        </Button>
        <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
          {workspaces.map((ws) => (
            <Button
              key={ws.id}
              variant={ws.id === selectedWorkspace ? 'outlined' : 'text'}
              sx={{
                fontWeight: 600,
                color: ws.id === selectedWorkspace ? '#0073ea' : '#323338',
                borderColor: '#0073ea',
                bgcolor: ws.id === selectedWorkspace ? '#e3f0fc' : 'transparent',
                textTransform: 'none',
                px: 2,
                borderRadius: 2,
                minWidth: 100
              }}
              onClick={() => setSelectedWorkspace(ws.id)}
            >
              {ws.name}
            </Button>
          ))}
        </Box>
      </Box>
      <GroupNameModal open={modalOpen} onClose={handleModalClose} onSubmit={handleModalSubmit} mode="create" />
      {showTables ? (
        <TablesPage />
      ) : (
        <Box>
          {workspaces
            .filter((ws) => ws.id === selectedWorkspace)
            .map((ws) => (
              <Box key={ws.id} sx={{ mb: { xs: 2, md: 0 } }}>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  color={'#0073ea'}
                  sx={{ fontSize: { xs: 16, sm: 20, md: 24 }, wordBreak: 'break-word', flex: 1, mb: 2 }}
                >
                  {ws.name}
                </Typography>
                <TableBoard tableId={ws.id} />
              </Box>
            ))}
        </Box>
      )}
    </Box>
  );
}

export default BoardPage;
