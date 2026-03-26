"use client";
import React, { useState, useRef, useCallback } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Select, FormControl, InputLabel,
  Box, Typography, CircularProgress, Alert, LinearProgress,
  Chip, Stack, IconButton
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import TableChartIcon from "@mui/icons-material/TableChart";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import { getApiUrl, authenticatedFetch } from "./apiUrl";

interface Workspace {
  id: string;
  name: string;
}

interface ImportExcelDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (tableId: string) => void;
  workspaces: Workspace[];
  defaultWorkspaceId?: string;
}

type Stage = "idle" | "ready" | "importing" | "done" | "error";

export default function ImportExcelDialog({
  open, onClose, onSuccess, workspaces, defaultWorkspaceId
}: ImportExcelDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [tableName, setTableName] = useState("");
  const [workspaceId, setWorkspaceId] = useState(defaultWorkspaceId || "");
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<{ rowCount: number; tableName: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync default workspace when dialog opens
  React.useEffect(() => {
    if (open) {
      setWorkspaceId(defaultWorkspaceId || (workspaces[0]?.id ?? ""));
      setFile(null);
      setTableName("");
      setStage("idle");
      setErrorMsg("");
      setResult(null);
    }
  }, [open, defaultWorkspaceId, workspaces]);

  const handleFile = useCallback((f: File | null) => {
    if (!f) return;
    setFile(f);
    // Strip extension for default table name
    const nameWithoutExt = f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
    setTableName(nameWithoutExt);
    setStage("ready");
    setErrorMsg("");
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleImport = async () => {
    if (!file || !workspaceId) return;
    setStage("importing");
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", workspaceId);
      formData.append("tableName", tableName);

      const res = await authenticatedFetch(getApiUrl("/tables/import-excel"), {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      setResult({ rowCount: data.rowCount, tableName: data.tableName });
      setStage("done");
    } catch (err: any) {
      setErrorMsg(err.message || "Import failed");
      setStage("error");
    }
  };

  const handleClose = () => {
    if (stage === "done" && result) {
      // will be handled by parent
    }
    onClose();
  };

  const handleDone = () => {
    if (result) {
      // We don't have the tableId here, parent will refetch
      onSuccess("refetch");
    }
    onClose();
  };

  const accepted = ".xlsx,.xls,.csv";

  return (
    <Dialog
      open={open}
      onClose={stage === "importing" ? undefined : handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: "linear-gradient(135deg, rgba(15,15,30,0.97) 0%, rgba(25,25,50,0.97) 100%)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          color: "#fff",
        }
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 0 }}>
        <TableChartIcon sx={{ color: "#4f8ef7" }} />
        <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
          Import from Excel
        </Typography>
        {stage !== "importing" && (
          <IconButton size="small" onClick={handleClose} sx={{ color: "rgba(255,255,255,0.5)" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5 }}>
        {stage === "done" && result ? (
          // Success state
          <Box sx={{ textAlign: "center", py: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: "#00c875", mb: 2 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Import Complete!
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.6)", mb: 2 }}>
              Table <b style={{ color: "#fff" }}>"{result.tableName}"</b> created with{" "}
              <b style={{ color: "#4f8ef7" }}>{result.rowCount}</b> rows.
            </Typography>
          </Box>
        ) : stage === "importing" ? (
          // Loading state
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CircularProgress size={56} sx={{ color: "#4f8ef7", mb: 2 }} />
            <Typography variant="h6" gutterBottom>Importing…</Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.5)" }}>
              Parsing <b style={{ color: "#fff" }}>{file?.name}</b> and creating table…
            </Typography>
            <LinearProgress sx={{ mt: 3, borderRadius: 2, height: 6, backgroundColor: "rgba(255,255,255,0.08)", "& .MuiLinearProgress-bar": { background: "linear-gradient(90deg,#4f8ef7,#8b5cf6)" } }} />
          </Box>
        ) : (
          // Setup state
          <Stack spacing={2.5}>
            {/* Drop zone */}
            <Box
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              sx={{
                border: `2px dashed ${dragging ? "#4f8ef7" : file ? "#00c875" : "rgba(255,255,255,0.2)"}`,
                borderRadius: 3,
                p: 4,
                textAlign: "center",
                cursor: "pointer",
                background: dragging ? "rgba(79,142,247,0.08)" : file ? "rgba(0,200,117,0.06)" : "rgba(255,255,255,0.03)",
                transition: "all 0.25s ease",
                "&:hover": { borderColor: "#4f8ef7", background: "rgba(79,142,247,0.06)" },
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={accepted}
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <>
                  <UploadFileIcon sx={{ fontSize: 40, color: "#00c875", mb: 1 }} />
                  <Typography fontWeight={600}>{file.name}</Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                    {(file.size / 1024).toFixed(1)} KB — click to change
                  </Typography>
                </>
              ) : (
                <>
                  <UploadFileIcon sx={{ fontSize: 40, color: "rgba(255,255,255,0.3)", mb: 1 }} />
                  <Typography fontWeight={600} sx={{ mb: 0.5 }}>
                    Drag & drop or click to browse
                  </Typography>
                  <Stack direction="row" gap={0.8} justifyContent="center">
                    {[".xlsx", ".xls", ".csv"].map(ext => (
                      <Chip key={ext} label={ext} size="small" sx={{ backgroundColor: "rgba(79,142,247,0.15)", color: "#4f8ef7", fontWeight: 600, fontSize: 11 }} />
                    ))}
                  </Stack>
                </>
              )}
            </Box>

            {/* Table name */}
            <TextField
              label="Table Name"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              fullWidth
              size="small"
              disabled={!file}
              inputProps={{ style: { color: "#fff" } }}
              InputLabelProps={{ style: { color: "rgba(255,255,255,0.5)" } }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "rgba(255,255,255,0.15)" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.35)" },
                  "&.Mui-focused fieldset": { borderColor: "#4f8ef7" },
                }
              }}
            />

            {/* Workspace selector */}
            <FormControl fullWidth size="small" disabled={!file || workspaces.length === 0}>
              <InputLabel sx={{ color: "rgba(255,255,255,0.5)" }}>Workspace</InputLabel>
              <Select
                value={workspaceId}
                label="Workspace"
                onChange={(e) => setWorkspaceId(e.target.value)}
                sx={{
                  color: "#fff",
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.15)" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.35)" },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#4f8ef7" },
                  "& .MuiSvgIcon-root": { color: "rgba(255,255,255,0.5)" },
                }}
                MenuProps={{ PaperProps: { sx: { background: "#1a1a2e", color: "#fff" } } }}
              >
                {workspaces.map(ws => (
                  <MenuItem key={ws.id} value={ws.id}>{ws.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {stage === "error" && (
              <Alert severity="error" sx={{ background: "rgba(229,57,53,0.12)", color: "#ff6b6b", border: "1px solid rgba(229,57,53,0.3)" }}>
                {errorMsg}
              </Alert>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        {stage === "done" ? (
          <Button
            variant="contained"
            onClick={handleDone}
            fullWidth
            sx={{ borderRadius: 2, fontWeight: 700, background: "linear-gradient(135deg,#4f8ef7,#8b5cf6)", "&:hover": { background: "linear-gradient(135deg,#3a7de0,#7c3aed)" } }}
          >
            Open Table
          </Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={stage === "importing"} sx={{ color: "rgba(255,255,255,0.5)" }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={!file || !workspaceId || !tableName.trim() || stage === "importing"}
              sx={{ borderRadius: 2, fontWeight: 700, minWidth: 140, background: "linear-gradient(135deg,#4f8ef7,#8b5cf6)", "&:hover": { background: "linear-gradient(135deg,#3a7de0,#7c3aed)" }, "&.Mui-disabled": { opacity: 0.4 } }}
            >
              Import
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
