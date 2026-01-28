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


export default function BoardPage() {
  const [groups, setGroups] = useState<Group[]>(initialGroups);

  // Fetch tables from backend and sync groups
  const fetchTables = async () => {
    const res = await fetch(getApiUrl("/tables"));
    const tables = await res.json();
    setGroups(tables.map((table: any) => ({
      id: table.id,
      name: table.name,
      color: "#0073ea"
    })));
  };
  const [showTables, setShowTables] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingName, setPendingName] = useState<string | null>(null);

  const handleAddGroup = () => {
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
    await fetch(getApiUrl("/tables"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, columns: defaultColumns }),
    });
    await fetchTables();
  };

  // Fetch tables on mount
  React.useEffect(() => {
    fetchTables();
  }, []);

  return (
    <Box>
      <GroupNameModal open={modalOpen} onClose={handleModalClose} onSubmit={handleModalSubmit} />
      {showTables ? (
        <TablesPage />
      ) : (
        <Stack spacing={4}>
          {groups.map((group) => (
            <Box key={group.id}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, justifyContent: 'space-between' }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 6, height: 28, bgcolor: group.color, borderRadius: 2, mr: 1 }} />
                  <Typography variant="h6" fontWeight={700} color={group.completed ? '#00c875' : '#0073ea'}>
                    {group.name}
                  </Typography>
                  {group.completed && <Typography fontWeight={600} color="#00c875">✔</Typography>}
                </Stack>
                <GroupMenu onDelete={async () => {
                  // Delete group from backend
                  await fetch(getApiUrl(`/tables/${group.id}`), { method: "DELETE" });
                  await fetchTables();
                }} />
              </Stack>
              <TableBoard tableId={group.id} />
            </Box>
          ))}
          <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddGroup} sx={{ mt: 2, width: 200 }}>
            Add new group
          </Button>
        </Stack>
      )}
    </Box>
  );
}
