"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  MenuItem,
  Select,
  SelectChangeEvent,
  CircularProgress,
  Typography
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { authenticatedFetch, getApiUrl } from "../../apiUrl";

interface Workspace {
  id: string;
  name: string;
}

export default function WorkspaceDropdown({ currentId }: { currentId?: string }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    authenticatedFetch(getApiUrl("workspaces"))
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data: Workspace[]) => {
        if (!mounted) return;
        setWorkspaces(data);
        setLoading(false);
        // If currentId is provided, use it
        if (currentId) {
          setSelected(currentId);
        }
      })
      .catch((err) => {
        console.error("Failed to load workspaces", err);
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [currentId]);

  const handleChange = (event: SelectChangeEvent) => {
    const val = event.target.value;
    setSelected(val);
    router.push(`/workspace?id=${val}`);
  };

  if (loading) {
    return (
      <Box sx={{ width: "100%", height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={16} sx={{ color: "rgba(255,255,255,0.3)" }} />
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
            bgcolor: "#23243a",
            color: "#fff",
            mt: 0.5,
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            "& .MuiMenuItem-root": {
              fontSize: "0.875rem",
              mx: 0.5,
              my: 0.2,
              borderRadius: 1,
              "&:hover": {
                bgcolor: "rgba(99, 102, 241, 0.15)",
                color: "#fff",
              },
              "&.Mui-selected": {
                bgcolor: "rgba(99, 102, 241, 0.25) !important",
                color: "#fff",
                fontWeight: 600,
              },
            },
          },
        },
      }}
      sx={{
        width: "100%",
        height: 40,
        bgcolor: "rgba(255,255,255,0.04)",
        color: "#fff",
        borderRadius: 2,
        fontSize: "0.9rem",
        fontWeight: 500,
        ".MuiOutlinedInput-notchedOutline": {
          borderColor: "rgba(255,255,255,0.08)",
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: "rgba(255,255,255,0.2)",
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: "#6366f1",
        },
        "& .MuiSvgIcon-root": {
          color: "rgba(255,255,255,0.4)",
        },
        "& .MuiSelect-select": {
          display: "flex",
          alignItems: "center",
          py: 1,
        },
      }}
    >
      <MenuItem value="" disabled sx={{ color: "rgba(255,255,255,0.4) !important" }}>
        Select Workspace
      </MenuItem>
      {workspaces.map((ws) => (
        <MenuItem key={ws.id} value={ws.id}>
          {ws.name}
        </MenuItem>
      ))}
    </Select>
  );
}
