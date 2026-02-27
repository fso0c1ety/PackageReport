"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { DEFAULT_SERVER_URL } from "../apiUrl";

export default function SettingsPage() {
  const [serverUrl, setServerUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Load current setting
    if (typeof window !== "undefined") {
      const current = localStorage.getItem("server_url");
      setServerUrl(current || DEFAULT_SERVER_URL);
    }
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    setError("");

    // Basic validation
    let url = serverUrl.trim();
    if (!url.startsWith("http")) {
      url = `http://${url}`;
    }
    // Remove trailing slash
    if (url.endsWith("/")) {
      url = url.slice(0, -1);
    }

    try {
      // Test connection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const testUrl = url.includes('/api') ? `${url}/people` : `${url}/api/people`;
      
      const res = await fetch(testUrl, { 
        method: 'GET',
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);

      if (res.ok) {
        localStorage.setItem("server_url", url);
        setServerUrl(url); // Update UI with cleaned URL
        setSaved(true);
        // Force reload to apply new API URL across app
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw new Error("Server responded with error");
      }
    } catch (err) {
      setError("Could not connect to server. Check IP and Port.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem("server_url");
    setServerUrl(DEFAULT_SERVER_URL);
    setSaved(true);
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 600, mx: "auto" }}>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 4, color: "#fff" }}>
        Settings
      </Typography>

      <Card sx={{ bgcolor: "#2c2d4a", color: "#fff", borderRadius: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Server Connection
          </Typography>
          <Typography variant="body2" sx={{ color: "#94a3b8", mb: 3 }}>
            Configure the IP address and port of your local backend server.
            (Default: {DEFAULT_SERVER_URL})
          </Typography>

          <TextField
            fullWidth
            label="Server URL"
            value={serverUrl}
            onChange={(e) => {
                setServerUrl(e.target.value);
                setSaved(false);
                setError("");
            }}
            placeholder="http://192.168.0.28:4000"
            variant="outlined"
            size="medium"
            InputLabelProps={{
              sx: { color: "#94a3b8", "&.Mui-focused": { color: "#6366f1" } },
            }}
            InputProps={{
              sx: {
                color: "#fff",
                bgcolor: "#23243a",
                borderRadius: 2,
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.1)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.2)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#6366f1",
                },
              },
            }}
            sx={{ mb: 3 }}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {saved && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              Settings saved! Reloading app...
            </Alert>
          )}

          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              sx={{
                bgcolor: "#6366f1",
                "&:hover": { bgcolor: "#5558dd" },
                textTransform: "none",
                fontWeight: 600,
                flex: 1,
                borderRadius: 2,
                py: 1.2
              }}
            >
              {loading ? "Testing Connection..." : "Save Connection"}
            </Button>
            
            <Button
                variant="outlined"
                onClick={handleReset}
                sx={{
                    color: "#94a3b8",
                    borderColor: "rgba(255,255,255,0.1)",
                    "&:hover": { 
                        borderColor: "#fff", 
                        color: "#fff",
                        bgcolor: "rgba(255,255,255,0.05)" 
                    },
                    textTransform: "none",
                    borderRadius: 2
                }}
            >
                Reset to Default
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
