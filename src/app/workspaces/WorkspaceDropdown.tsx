import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Avatar, MenuItem, Select, SelectChangeEvent, CircularProgress, Typography } from "@mui/material";

interface Workspace {
  id: string;
  name: string;
}

export default function WorkspaceDropdown({ currentId }: { currentId?: string }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // On mount, set selected from localStorage or currentId
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('selectedWorkspaceId') : null;
    if (stored) {
      setSelected(stored);
    } else if (currentId) {
      setSelected(currentId);
      if (typeof window !== 'undefined') localStorage.setItem('selectedWorkspaceId', currentId);
    }
  }, [currentId]);

  useEffect(() => {
    fetch("http://192.168.0.28:4000/api/workspaces")
      .then((res) => res.json())
      .then((data) => {
        setWorkspaces(data);
        setLoading(false);
      });
  }, []);

  const handleChange = (event: SelectChangeEvent<string>) => {
    setSelected(event.target.value);
    if (typeof window !== 'undefined') localStorage.setItem('selectedWorkspaceId', event.target.value);
    router.push(`/workspaces/${event.target.value}`);
  };

  if (loading) return <CircularProgress size={24} sx={{ ml: 2 }} />;

  return (
    <Box sx={{ minWidth: 200, width: '100%' }}>
      <Select
        value={selected}
        onChange={handleChange}
        size="small"
        sx={{
          bgcolor: '#23243a',
          color: '#fff',
          borderRadius: 2,
          fontWeight: 600,
          minWidth: 200,
          width: '100%',
          boxShadow: 'none',
          '.MuiSelect-icon': { color: '#bfc8e0' },
          '.MuiOutlinedInput-notchedOutline': { border: '1px solid #35365a' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4f51c0' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4f51c0' },
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              bgcolor: '#23243a',
              color: '#fff',
              borderRadius: 2,
              boxShadow: 3,
              mt: 1,
              minWidth: 200,
            },
          },
        }}
        displayEmpty
      >
        <MenuItem value="" disabled sx={{ color: '#bfc8e0', fontWeight: 500 }}>
          <Typography variant="body2" sx={{ color: '#bfc8e0' }}>Select workspace</Typography>
        </MenuItem>
        {/* Main workspace removed */}
        {workspaces.map((ws) => (
          <MenuItem key={ws.id} value={ws.id} sx={{ color: '#fff', fontWeight: 600 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Avatar sx={{ bgcolor: "#4f51c0", width: 28, height: 28, fontSize: 16, mr: 1 }}>{ws.name.charAt(0).toUpperCase()}</Avatar>
              {ws.name}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}
