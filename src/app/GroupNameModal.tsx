import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from "@mui/material";

interface GroupNameModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  initialName?: string;
  mode?: 'create' | 'rename';
}

export default function GroupNameModal({ open, onClose, onSubmit, initialName = '', mode = 'create' }: GroupNameModalProps) {
  const [name, setName] = useState(initialName);

  React.useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit(name.trim());
      setName("");
    }
  };

  const handleClose = () => {
    setName("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{mode === 'rename' ? 'Rename Group' : 'New Group'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Group Name"
          type="text"
          fullWidth
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!name.trim()}>{mode === 'rename' ? 'Rename' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
}
