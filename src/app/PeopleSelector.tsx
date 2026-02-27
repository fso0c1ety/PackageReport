"use client";
import React, { useState, useEffect } from "react";
import { getApiUrl, authenticatedFetch } from "./apiUrl";
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
  DialogActions,
  useTheme,
  alpha
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

export default function PeopleSelector({ value = [], onChange, onClose, embed = false }: PeopleSelectorProps & { embed?: boolean }) {
  const theme = useTheme();
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
        const res = await authenticatedFetch(getApiUrl('/people'));
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
    // Toggle logic
    const exists = value.some((p) => p.email === person.email);
    let newSelected;
    if (exists) {
      newSelected = value.filter(p => p.email !== person.email);
    } else {
      newSelected = [...value, person];
    }
    onChange && onChange(newSelected);
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

  const handleInviteSubmit = async () => {
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
    // Persist to backend
    try {
      await authenticatedFetch(getApiUrl('/people'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      });
    } catch (err) {
      // fallback to local only
      setPeople((prev) => {
        const updated = [...prev, newPerson];
        localStorage.setItem("suggestedPeople", JSON.stringify(updated));
        return updated;
      });
    }
    setPeople((prev) => {
      const updated = [...prev, newPerson];
      localStorage.setItem("suggestedPeople", JSON.stringify(updated));
      return updated;
    });
    // Don't auto-select on invite, just add to list
    // onChange && onChange([...value, newPerson]); 
    setInviteDialogOpen(false);
  };

  const Content = (
    <Box sx={{ p: embed ? 0 : 2, width: embed ? '100%' : 320 }}>
      {!embed && <Typography variant="subtitle2" sx={{ mb: 1 }}>People</Typography>}
      <TextField
        fullWidth
        size="small"
        placeholder="Search names, roles or teams"
        value={search}
        onChange={e => setSearch(e.target.value)}
        onKeyDown={handleSearchKeyDown}
        sx={{ mb: 2, bgcolor: 'action.hover', borderRadius: 1, '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', mb: 1, display: 'block' }}>Suggested people</Typography>
      <List dense sx={{ maxHeight: 200, overflowY: 'auto' }}>
        {filteredPeople.map((person) => {
          const isSelected = value.some(p => p.email === person.email);
          return (
            <ListItem
              key={person.email}
              secondaryAction={
                <IconButton edge="end" aria-label="delete" onClick={(e) => { e.stopPropagation(); handleDeleteSuggested(person); }}>
                  <DeleteIcon fontSize="small" sx={{ color: '#5a5b7a' }} />
                </IconButton>
              }
              onClick={() => handleSelect(person)}
              sx={{ 
                width: '100%', 
                textAlign: 'left', 
                cursor: 'pointer', 
                color: 'text.primary', 
                bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                borderRadius: 2,
                mb: 0.5,
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: isSelected ? '#0073ea' : '#5a5b7a', width: 32, height: 32, fontSize: 14 }}>
                  {person.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary={person.name} 
                secondary={person.email} 
                primaryTypographyProps={{ style: { color: '#fff', fontWeight: isSelected ? 600 : 400 } }} 
                secondaryTypographyProps={{ style: { color: '#7d82a8' } }} 
              />
              {isSelected && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#0073ea', mr: 2 }} />}
            </ListItem>
          );
        })}
      </List>
      <Divider sx={{ my: 1, borderColor: '#3a3b5a' }} />
      <Button 
        fullWidth 
        startIcon={<PersonAddIcon />} 
        sx={{ 
          mb: 1, 
          color: '#0073ea',
          background: 'transparent',
          backgroundColor: 'transparent',
          boxShadow: 'none',
          '&:hover': {
            background: 'transparent',
            backgroundColor: 'transparent',
            bgcolor: 'transparent',
            textDecoration: 'underline',
            boxShadow: 'none'
          }
        }} 
        onClick={handleInviteClick}
      >
        Invite a new member by email
      </Button>
      {/* Invite dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} PaperProps={{ sx: { bgcolor: 'background.paper', color: 'text.primary' } }}>
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
          <Button onClick={() => setInviteDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleInviteSubmit} variant="contained" sx={{ bgcolor: 'primary.main' }}>Invite</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  if (embed) return Content;

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
        PaperProps={{ sx: { bgcolor: 'background.paper', color: 'text.primary', borderRadius: 2, border: 1, borderColor: 'divider' } }}
      >
        {Content}
      </Popover>
    </>
  );
}
