"use client";
import React, { useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import GroupMenu from "../GroupMenu";
import { getApiUrl } from "../apiUrl";

interface Workspace {
  id: string;
  name: string;
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<string | null>(null);

  const fetchWorkspaces = async () => {
    setLoading(true);
    const res = await fetch(getApiUrl("/workspaces"));
    const data = await res.json();
    setWorkspaces(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleDelete = async (id: string) => {
    await fetch(getApiUrl(`/workspaces/${id}`), { method: "DELETE" });
    fetchWorkspaces();
  };

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 6 }}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Workspaces
      </Typography>
      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        workspaces.map((ws) => (
          <Box key={ws.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, border: "1px solid #e0e4ef", borderRadius: 2, mb: 2 }}>
            <Typography fontWeight={600}>{ws.name}</Typography>
            <GroupMenu
              onDelete={() => handleDelete(ws.id)}
              onRename={() => {}}
            />
          </Box>
        ))
      )}
    </Box>
  );
}
