"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Avatar,
  Typography,
  IconButton,
  Button,
  Stack,
  useTheme,
  alpha,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import AddLinkIcon from "@mui/icons-material/AddLink";
import { useRouter } from "next/navigation";
import { getAvatarUrl, authenticatedFetch, getApiUrl } from "./apiUrl";
import { useNotification } from "./NotificationContext";
import InviteToTableDialog from "./InviteToTableDialog";
import CheckIcon from "@mui/icons-material/Check";
import AutoModeIcon from "@mui/icons-material/AutoMode";

interface UserProfileDialogProps {
  open: boolean;
  onClose: () => void;
  user: any;
}

export default function UserProfileDialog({ open, onClose, user }: UserProfileDialogProps) {
  const theme = useTheme();
  const router = useRouter();
  const { showNotification } = useNotification();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [friendStatus, setFriendStatus] = useState<'loading' | 'none' | 'pending' | 'accepted'>('none');

  React.useEffect(() => {
      if (open && user && user.id) {
          setFriendStatus('loading');
          authenticatedFetch(getApiUrl(`friends/status/${user.id}`))
              .then(res => res.json())
              .then(data => {
                  if (data && data.status) setFriendStatus(data.status);
                  else setFriendStatus('none');
              })
              .catch(err => {
                  console.error("Failed to fetch friend status:", err);
                  setFriendStatus('none');
              });
      }
  }, [open, user]);

  if (!user) return null;

  const handleAddFriend = async () => {
    setRequesting(true);
    try {
      const res = await authenticatedFetch(getApiUrl("friends/request"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId: user.id }),
      });
      if (!res.ok) throw new Error("Request failed");
      showNotification("Friend request sent!", "success");
    } catch (err) {
      showNotification("Failed to send friend request", "error");
    } finally {
      setRequesting(false);
    }
  };

  const handleMessage = () => {
    onClose();
    router.push(`/chat?userId=${user.id}`);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: "hidden",
            bgcolor: theme.palette.background.paper,
            backgroundImage: "none",
            boxShadow: theme.shadows[10],
          },
        }}
      >
        <Box
          sx={{
            height: 100,
            bgcolor: theme.palette.primary.main,
            position: "relative",
          }}
        >
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              color: "white",
              bgcolor: alpha("#000", 0.2),
              "&:hover": { bgcolor: alpha("#000", 0.3) },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <DialogContent sx={{ pt: 0, pb: 4, textAlign: "center", position: "relative", overflow: "visible" }}>
          <Avatar
            src={getAvatarUrl(user.avatar, user.name)}
            sx={{
              width: 100,
              height: 100,
              mx: "auto",
              mt: -6,
              border: `4px solid ${theme.palette.background.paper}`,
              boxShadow: theme.shadows[4],
              bgcolor: theme.palette.background.paper, 
            }}
          />

          <Typography variant="h5" sx={{ mt: 2, fontWeight: 800, fontFamily: "var(--font-outfit)" }}>
            {user.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {user.email}
          </Typography>

          <Divider sx={{ mb: 3, opacity: 0.6 }} />

          <Stack spacing={2}>
            {friendStatus === 'loading' ? (
                <Button fullWidth variant="contained" disabled sx={{ borderRadius: 2, py: 1.2, textTransform: "none", fontWeight: 600, boxShadow: "none" }}>
                    Loading...
                </Button>
            ) : friendStatus === 'accepted' ? (
                <Button fullWidth variant="contained" disabled startIcon={<CheckIcon />} sx={{ borderRadius: 2, py: 1.2, textTransform: "none", fontWeight: 600, boxShadow: "none", bgcolor: `${theme.palette.success.main} !important`, color: '#fff !important' }}>
                    Friends
                </Button>
            ) : friendStatus === 'pending' ? (
                <Button fullWidth variant="contained" disabled startIcon={<AutoModeIcon />} sx={{ borderRadius: 2, py: 1.2, textTransform: "none", fontWeight: 600, boxShadow: "none", bgcolor: `${theme.palette.warning.main} !important`, color: '#fff !important' }}>
                    Pending Request
                </Button>
            ) : (
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  onClick={handleAddFriend}
                  disabled={requesting}
                  sx={{
                    borderRadius: 2,
                    py: 1.2,
                    textTransform: "none",
                    fontWeight: 600,
                    boxShadow: "none",
                  }}
                >
                  Add Friend
                </Button>
            )}
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ChatBubbleOutlineIcon />}
                onClick={handleMessage}
                sx={{
                  borderRadius: 2,
                  py: 1.2,
                  textTransform: "none",
                  fontWeight: 600,
                  borderColor: theme.palette.divider,
                  color: theme.palette.text.primary,
                  "&:hover": { borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.05) },
                }}
              >
                Message
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AddLinkIcon />}
                onClick={() => setInviteOpen(true)}
                sx={{
                  borderRadius: 2,
                  py: 1.2,
                  textTransform: "none",
                  fontWeight: 600,
                  borderColor: theme.palette.divider,
                  color: theme.palette.text.primary,
                  "&:hover": { borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.05) },
                }}
              >
                Invite
              </Button>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>

      <InviteToTableDialog
        open={inviteOpen}
        onClose={() => {
            setInviteOpen(false);
            onClose();
        }}
        userId={user.id}
        userName={user.name}
      />
    </>
  );
}
