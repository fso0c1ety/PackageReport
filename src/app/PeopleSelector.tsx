"use client";
import React, { useState, useEffect } from "react";
import { getApiUrl } from "./apiUrl";
import {
  Box,
  Avatar,
  Typography,
  TextField,
  Chip,
  Button,
  Popover,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import DeleteIcon from '@mui/icons-material/Delete';

const defaultPeople: Person[] = [];

export interface Person {
  name: string;
  email: string;
  avatar: string | null;
}

interface PeopleSelectorProps {
  value?: Person[];
  onChange?: (newValue: Person[]) => void;
  onClose?: (finalValue: Person[]) => void;
}

export default function PeopleSelector({ value = [], onChange, onClose }: PeopleSelectorProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState("");
  const [people, setPeople] = useState<Person[]>(defaultPeople);
  const [inviteError, setInviteError] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");

  // Fetch people from backend on mount
  useEffect(() => {
    async function fetchPeople() {
      try {
        const res = await fetch(getApiUrl('/people'));
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setPeople(data);
          } else {
            console.warn('No people loaded from backend /api/people:', data);
          }
        } else {
          console.error('Failed to fetch /api/people:', res.status, res.statusText);
        }
      } catch (err) {
        console.error('Error fetching /api/people:', err);
        // fallback to localStorage if backend fails
        const stored = localStorage.getItem("suggestedPeople");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setPeople(parsed);
            }
          } catch (e) {
            console.error('Error parsing localStorage suggestedPeople:', e);
          }
        }
      }
    }
    fetchPeople();
  }, []);

  // Save people to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("suggestedPeople", JSON.stringify(people));
  }, [people]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => {
    setAnchorEl(null);
    if (onClose) onClose(value);
  };

  // Handle Enter key in search field to submit selection
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setAnchorEl(null);
      if (onClose) onClose(value);
    }
  };

  const handleSelect = (person: Person) => {
    if (!value.some((p) => p.email === person.email)) {
      const newSelected = [...value, person];
      onChange && onChange(newSelected);
    }
  };

  // Deduplicate people by email
  const uniquePeopleMap: { [email: string]: Person } = {};
  people.forEach((p) => {
    if (p.email && !uniquePeopleMap[p.email]) {
      uniquePeopleMap[p.email] = p;
    }
  });
  const uniquePeople = Object.values(uniquePeopleMap);
  const filteredPeople = uniquePeople.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  // Remove a person from suggested people
  const handleDeleteSuggested = (person: Person) => {
    setPeople((prev) => {
      const updated = prev.filter((p) => p.email !== person.email);
      localStorage.setItem("suggestedPeople", JSON.stringify(updated));
      return updated;
    });
  };

  const handleInviteClick = () => {
    setInviteDialogOpen(true);
    setInviteEmail("");
    setInviteName("");
    setInviteError("");
  };

  const handleInviteSubmit = () => {
    // Basic email validation
    const email = inviteEmail.trim();
    let name = inviteName.trim();
    if (!name) {
      // Use the part before @ as fallback name
      name = email.includes("@") ? email.split("@")[0] : email;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setInviteError("Please enter a valid email address.");
      return;
    }
    if (people.some((p) => p.email === email)) {
      setInviteError("This email is already added.");
      return;
    }
    const newPerson = { name, email, avatar: null };
    setPeople((prev) => {
      const updated = [...prev, newPerson];
      localStorage.setItem("suggestedPeople", JSON.stringify(updated));
      return updated;
    });
    onChange && onChange([...value, newPerson]);
    setInviteDialogOpen(false);
  };

  return (
    <>
      <Button variant="outlined" size="small" onClick={handleOpen} sx={{ minWidth: 32, px: 1 }}>
        <PersonAddIcon />
      </Button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, width: 320 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>People</Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Search names, roles or teams"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            sx={{ mb: 2 }}
          />
          <Typography variant="caption" color="text.secondary">Suggested people</Typography>
          <List dense>
            {filteredPeople.map((person) => (
              <ListItem
                key={person.email}
                secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteSuggested(person)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
                onClick={() => handleSelect(person)}
                sx={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: '#0073ea' }}>{person.name.split(' ').map(n => n[0]).join('').toUpperCase()}</Avatar>
                </ListItemAvatar>
                <ListItemText primary={person.name} secondary={person.email} />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 1 }} />
          <Button fullWidth startIcon={<PersonAddIcon />} sx={{ mb: 1 }} onClick={handleInviteClick}>
            Invite a new member by email
          </Button>
          {/* Invite dialog */}
          <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)}>
            <DialogTitle>Invite a new member</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Email Address"
                type="email"
                fullWidth
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="Name (optional)"
                fullWidth
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
              />
              {inviteError && <Typography color="error" variant="body2">{inviteError}</Typography>}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleInviteSubmit} variant="contained">Invite</Button>
            </DialogActions>
          </Dialog>
          <Button fullWidth startIcon={<NotificationsOffIcon />} variant="outlined" color="inherit">
            Mute
          </Button>
          {/* Removed Auto-assign people option */}
        </Box>
      </Popover>
    </>
  );
}
