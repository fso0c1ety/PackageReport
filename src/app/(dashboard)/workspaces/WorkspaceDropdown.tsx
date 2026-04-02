"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { authenticatedFetch, getApiUrl, getAvatarUrl } from "../../apiUrl";

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
  const searchParams = useSearchParams();

  const resolvedWorkspaceId = currentId || searchParams.get("id") || "";

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
        const hasResolved = resolvedWorkspaceId && data.some((ws) => ws.id === resolvedWorkspaceId);
        if (!hasResolved && data.length > 0) {
          router.replace(`/workspace?id=${data[0].id}`);
        }
        setSelected((prev) => {
          if (resolvedWorkspaceId && data.some((ws) => ws.id === resolvedWorkspaceId)) {
            return resolvedWorkspaceId;
          }
          if (prev && data.some((ws) => ws.id === prev)) {
            return prev;
          }
          return data[0]?.id || "";
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load workspaces", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchWorkspaces();

    const handleUpdate = () => {
      fetchWorkspaces();
    };

    window.addEventListener('workspaceUpdated', handleUpdate);
    return () => {
      window.removeEventListener('workspaceUpdated', handleUpdate);
    };
  }, [resolvedWorkspaceId, router]);

  useEffect(() => {
    setSelected((prev) => {
      if (resolvedWorkspaceId && workspaces.some((ws) => ws.id === resolvedWorkspaceId)) {
        return resolvedWorkspaceId;
      }
      if (prev && workspaces.some((ws) => ws.id === prev)) {
        return prev;
      }
      return workspaces[0]?.id || "";
    });
  }, [resolvedWorkspaceId, workspaces]);

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
        disablePortal: true,
        PaperProps: {
          sx: {
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            mt: 0.5,
            border: 'none',
            borderRadius: 3,
            boxShadow: theme.shadows[8],
            maxHeight: 320,
            "& .MuiMenuItem-root": {
              fontSize: "0.875rem",
              mx: 0.5,
              my: 0.2,
              borderRadius: 2,
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
        minWidth: 0,
        flex: 1,
        height: 40,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.82)',
        color: theme.palette.text.primary,
        borderRadius: 2.5,
        fontSize: "0.9rem",
        fontWeight: 600,
        ".MuiOutlinedInput-notchedOutline": {
          border: "none",
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          border: "none",
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          border: "none",
        },
        "& .MuiSvgIcon-root": {
          color: theme.palette.text.secondary,
        },
        "& .MuiSelect-select": {
          display: "flex",
          alignItems: "center",
          py: 1,
          minWidth: 0,
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
                  src={getAvatarUrl(ws.owner_avatar, ws.owner_name)}
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
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
