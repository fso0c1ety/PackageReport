import React from "react";
import Image from "next/image";
import { Box, Avatar, IconButton, Badge, Tooltip, Typography } from "@mui/material";
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MenuIcon from '@mui/icons-material/Menu';
import { styled } from "@mui/material/styles";

interface TopBarProps {
  onMenuClick?: () => void;
}

const StyledIconButton = styled(IconButton)(({ theme }) => ({
  color: "#94a3b8",
  transition: "all 0.2s",
  "&:hover": {
    color: "#fff",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    transform: "translateY(-1px)",
  },
}));

const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  return (
    <Box
      component="header"
      sx={{
        width: "100%",
        height: { xs: 60, sm: 72 },
        bgcolor: "#23243a", // Match app background
        display: "flex",
        alignItems: "center",
        px: { xs: 2, md: 4, lg: 6 },
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
        // Glass effect if scrolled could be nice, but stick to solid for now to match request
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {onMenuClick && (
          <IconButton
            onClick={onMenuClick}
            sx={{ 
              color: '#fff', 
              display: { md: 'none' },
              mr: 1
            }}
          >
            <MenuIcon />
          </IconButton>
        )}
      </Box>

      {/* Right Side Options */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 1, sm: 2 },
          bgcolor: "rgba(255, 255, 255, 0.03)",
          p: 0.5,
          pl: 2,
          pr: 1,
          borderRadius: "30px",
          border: "1px solid rgba(255, 255, 255, 0.05)"
        }}
      >
        <Tooltip title="Search">
            <StyledIconButton size="small">
                <SearchIcon fontSize="small" />
            </StyledIconButton>
        </Tooltip>
        
        <Tooltip title="Notifications">
            <StyledIconButton size="small">
                <Badge color="error" variant="dot">
                    <NotificationsNoneIcon fontSize="small" />
                </Badge>
            </StyledIconButton>
        </Tooltip>

        <Tooltip title="Messages">
            <StyledIconButton size="small">
                <MailOutlineIcon fontSize="small" />
            </StyledIconButton>
        </Tooltip>

        <Tooltip title="Help">
            <StyledIconButton size="small">
                <HelpOutlineIcon fontSize="small" />
            </StyledIconButton>
        </Tooltip>

        <Box sx={{ width: 1, height: 24, bgcolor: "rgba(255,255,255,0.1)", mx: 0.5 }} />

        <Avatar 
            sx={{ 
                width: 36, 
                height: 36, 
                bgcolor: '#6366f1', 
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                border: '2px solid rgba(35, 36, 58, 1)',
                boxShadow: '0 0 0 2px #6366f1',
                transition: "all 0.2s",
                "&:hover": {
                    transform: "scale(1.05)"
                }
            }}
        >
            VH
        </Avatar>
      </Box>
    </Box>
  );
};
export default TopBar;
