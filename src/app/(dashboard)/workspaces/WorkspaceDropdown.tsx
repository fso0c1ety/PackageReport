"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  MenuItem,
  Select,
  SelectChangeEvent,
  CircularProgress,
  Typography,
  Tooltip,
  useTheme
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { authenticatedFetch, getApiUrl } from "../../apiUrl";

interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  owner_name?: string;
  owner_avatar?: string;
}

export default function WorkspaceDropdown({ currentId }: { currentId?: string }) {
  const theme = useTheme();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  const fetchWorkspaces = () => {
    // Get current user id from localStorage to identify shared workspaces
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserId(user.id);
      } catch (e) { console.error(e); }
    }

    authenticatedFetch(getApiUrl("workspaces"))
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data: Workspace[]) => {
        setWorkspaces(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load workspaces", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchWorkspaces();

    // Initial selection
    if (currentId) {
      setSelected(currentId);
    }

    const handleUpdate = () => {
      fetchWorkspaces();
    };

    window.addEventListener('workspaceUpdated', handleUpdate);
    return () => {
      window.removeEventListener('workspaceUpdated', handleUpdate);
    };
  }, [currentId]);

  const handleChange = (event: SelectChangeEvent) => {
    const val = event.target.value;
    setSelected(val);
    router.push(`/workspace?id=${val}`);
  };

  if (loading) {
    return (
      <Box sx={{ width: "100%", height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={16} sx={{ color: theme.palette.text.secondary }} />
      </Box>
    );
  }

  return (
    <Select
      value={selected}
      onChange={handleChange}
      displayEmpty
      IconComponent={KeyboardArrowDownIcon}
      variant="outlined"
      MenuProps={{
        PaperProps: {
          sx: {
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            mt: 0.5,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.shadows[4],
            "& .MuiMenuItem-root": {
              fontSize: "0.875rem",
              mx: 0.5,
              my: 0.2,
              borderRadius: 1,
              "&:hover": {
                bgcolor: theme.palette.action.hover,
                color: theme.palette.text.primary,
              },
              "&.Mui-selected": {
                bgcolor: theme.palette.action.selected,
                color: theme.palette.text.primary,
                fontWeight: 600,
              },
            },
          },
        },
      }}
      sx={{
        width: "100%",
        height: 40,
        bgcolor: theme.palette.action.hover,
        color: theme.palette.text.primary,
        borderRadius: 2,
        fontSize: "0.9rem",
        fontWeight: 500,
        ".MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.divider,
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.text.secondary,
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.primary.main,
        },
        "& .MuiSvgIcon-root": {
          color: theme.palette.text.secondary,
        },
        "& .MuiSelect-select": {
          display: "flex",
          alignItems: "center",
          py: 1,
        },
      }}
    >
      <MenuItem value="" disabled sx={{ color: `${theme.palette.text.secondary} !important` }}>
        Select Workspace
      </MenuItem>
      {workspaces.map((ws) => {
        const isShared = userId && ws.owner_id !== userId;
        return (
          <MenuItem key={ws.id} value={ws.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, overflow: 'hidden' }}>
              <Typography sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ws.name}
              </Typography>
            </Box>
            {isShared && (
              <Tooltip title={`Shared by ${ws.owner_name}`}>
                <Box
                  component="img"
                  src={ws.owner_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(ws.owner_name || 'User')}&background=random&color=fff&bold=true`}
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: `1px solid ${theme.palette.divider}`,
                    ml: 'auto'
                  }}
                />
              </Tooltip>
            )}
          </MenuItem>
        );
      })}
    </Select>
  );
}
