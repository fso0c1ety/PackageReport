"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
} from "@mui/material";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";

export default function SettingsPage() {


  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Load current user
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user", e);
      }
    }
  }, []);



  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 600, mx: "auto" }}>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 4, color: "#fff" }}>
        Settings
      </Typography>

      {/* User Profile Section */}
      <Card sx={{ bgcolor: "#2c2d4a", color: "#fff", borderRadius: 4, mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
            <Avatar
              src={user?.avatar}
              sx={{
                width: 80,
                height: 80,
                fontSize: 32,
                bgcolor: '#6366f1',
                boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
              }}
            >
              {user?.name ? user.name.split(' ').map((n: any) => n[0]).join('').toUpperCase() : '?'}
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                {user?.name || "User Name"}
              </Typography>
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                {user?.email || "Email address"}
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ bgcolor: "rgba(255,255,255,0.05)", mb: 2 }} />
          <Typography variant="body2" sx={{ color: "#94a3b8" }}>
            Your personalized avatar is automatically generated based on your name.
          </Typography>
        </CardContent>
      </Card>


    </Box>
  );
}
