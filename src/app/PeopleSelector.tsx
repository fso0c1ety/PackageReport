import React, { useState } from "react";
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

const initialPeople = [
  {
    name: "Valon Halili",
    email: "valonhalili74@gmail.com",
    avatar: null,
  },
  // Add more sample people if needed
];

export default function PeopleSelector({ value = [], onChange }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(value);
  const [people, setPeople] = useState(initialPeople);
  const [inviteError, setInviteError] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleSelect = (person) => {
    if (!selected.some((p) => p.email === person.email)) {
      const newSelected = [...selected, person];
      setSelected(newSelected);
      onChange && onChange(newSelected);
    }
  };
  const handleRemove = (person) => {
    const newSelected = selected.filter((p) => p.email !== person.email);
    setSelected(newSelected);
    onChange && onChange(newSelected);
  };

  const filteredPeople = people.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleInviteClick = () => {
    setInviteDialogOpen(true);
    setInviteEmail("");
    setInviteName("");
    setInviteError("");
  };

  const handleInviteSubmit = () => {
    // Basic email validation
    const email = inviteEmail.trim();
    const name = inviteName.trim() || email.split("@")[0];
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setInviteError("Please enter a valid email address.");
      return;
    }
    if (people.some((p) => p.email === email)) {
      setInviteError("This email is already added.");
      return;
    }
    const newPerson = { name, email, avatar: null };
    setPeople((prev) => [...prev, newPerson]);
    setSelected((prev) => {
      const newSelected = [...prev, newPerson];
      onChange && onChange(newSelected);
      return newSelected;
    });
    setInviteDialogOpen(false);
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {selected.map((person) => (
          <Chip
            key={person.email}
            avatar={<Avatar sx={{ bgcolor: '#0073ea' }}>{person.name.split(' ').map(n => n[0]).join('').toUpperCase()}</Avatar>}
            label={person.name}
            onDelete={() => handleRemove(person)}
            sx={{ mb: 0.5 }}
          />
        ))}
        <Button variant="outlined" size="small" onClick={handleOpen} sx={{ minWidth: 32, px: 1 }}>
          <PersonAddIcon />
        </Button>
      </Box>
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
            sx={{ mb: 2 }}
          />
          <Typography variant="caption" color="text.secondary">Suggested people</Typography>
          <List dense>
            {filteredPeople.map((person) => (
              <ListItem button key={person.email} onClick={() => handleSelect(person)}>
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
