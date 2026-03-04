"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  IconButton,
  Alert,
  useTheme,
} from "@mui/material";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Close";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import { getApiUrl, authenticatedFetch } from "../../apiUrl";

export default function SettingsPage() {
  const theme = useTheme();
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Load current user
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setEditName(parsedUser.name || "");
        setEditEmail(parsedUser.email || "");
        setEditAvatar(parsedUser.avatar || "");
      } catch (e) {
        console.error("Failed to parse user", e);
      }
    }
  }, []);

  const handleCreateNewUser = () => {
    // If no user exists, create a default one
    const newUser = {
      name: "New User",
      email: "user@example.com",
      avatar: ""
    };
    localStorage.setItem("user", JSON.stringify(newUser));
    setUser(newUser);
    setEditName(newUser.name);
    setEditEmail(newUser.email);
    setEditAvatar(newUser.avatar);
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setError("Name is required");
      return;
    }

    try {
      const res = await authenticatedFetch(getApiUrl('users/profile'), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, avatar: editAvatar }),
      });

      if (!res.ok) throw new Error("Failed to update profile");

      const updatedUser = {
        ...user,
        name: editName,
        email: editEmail,
        avatar: editAvatar
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);
      setSaved(true);
      setError("");

      // Reload to propagate changes
      setTimeout(() => window.location.reload(), 1000);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to save profile");
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setEditName(user.name || "");
      setEditEmail(user.email || "");
      setEditAvatar(user.avatar || "");
    }
    setIsEditing(false);
    setError("");
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };



  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 600, mx: "auto" }}>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 4, color: 'text.primary' }}>
        Settings
      </Typography>

      {/* User Profile Section */}
      <Card sx={{ bgcolor: 'background.paper', color: 'text.primary', borderRadius: 4, mb: 3, border: `1px solid ${theme.palette.divider}` }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2, justifyContent: "space-between" }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={isEditing ? editAvatar : user?.avatar}
                  sx={{
                    width: 80,
                    height: 80,
                    fontSize: 32,
                    bgcolor: theme.palette.primary.main,
                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                  }}
                >
                  {user?.name ? user.name.split(' ').map((n: any) => n[0]).join('').toUpperCase() : '?'}
                </Avatar>
                {isEditing && (
                  <IconButton
                    color="primary"
                    aria-label="upload picture"
                    component="label"
                    sx={{
                      position: 'absolute',
                      bottom: -5,
                      right: -5,
                      bgcolor: theme.palette.background.paper,
                      '&:hover': { bgcolor: theme.palette.action.hover },
                      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                      width: 32,
                      height: 32,
                      border: `1px solid ${theme.palette.divider}`
                    }}
                  >
                    <input hidden accept="image/*" type="file" onChange={handleAvatarChange} />
                    <PhotoCamera sx={{ fontSize: 18, color: theme.palette.primary.main }} />
                  </IconButton>
                )}
              </Box>
              <Box>
                {isEditing ? (
                  <>
                    <TextField
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      variant="standard"
                      placeholder="Name"
                      InputProps={{ style: { color: theme.palette.text.primary, fontSize: "1.25rem", fontWeight: 700 } }}
                      sx={{ mb: 1, display: "block" }}
                    />
                    <TextField
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      variant="standard"
                      placeholder="Email"
                      InputProps={{ style: { color: theme.palette.text.secondary, fontSize: "0.875rem" } }}
                      sx={{ display: "block" }}
                    />
                  </>
                ) : (
                  <>
                    <Typography variant="h5" fontWeight={700}>
                      {user?.name || "User Name"}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {user?.email || "Email address"}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
            <Box>
              {isEditing ? (
                <Box sx={{ display: "flex", gap: 1 }}>
                  <IconButton onClick={handleSaveProfile} sx={{ color: theme.palette.primary.main }}>
                    <SaveIcon />
                  </IconButton>
                  <IconButton onClick={handleCancelEdit} sx={{ color: theme.palette.error.main }}>
                    <CancelIcon />
                  </IconButton>
                </Box>
              ) : (
                <IconButton 
                  onClick={() => user ? setIsEditing(true) : handleCreateNewUser()} 
                  sx={{ color: 'text.primary', bgcolor: theme.palette.action.hover, "&:hover": { bgcolor: theme.palette.action.selected } }}
                >
                  <EditIcon />
                </IconButton>
              )}
            </Box>
          </Box>
          
          <Divider sx={{ bgcolor: theme.palette.divider, mb: 2 }} />
          
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Your personalized avatar is automatically generated based on your name.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {saved && (
            <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
              Profile updated! Reloading...
            </Alert>
          )}
        </CardContent>
      </Card>


    </Box>
  );
}
