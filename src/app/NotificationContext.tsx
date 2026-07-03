"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Snackbar, Alert, AlertColor, Box, Typography, IconButton, Grow, useTheme } from "@mui/material";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import CloseIcon from '@mui/icons-material/Close';

interface NotificationContextType {
    showNotification: (message: string, severity?: AlertColor) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const theme = useTheme();
    const [notification, setNotification] = useState<{
        open: boolean;
        message: string;
        severity: AlertColor;
        key: number;
    }>({
        open: false,
        message: "",
        severity: "info",
        key: 0,
    });

    const showNotification = useCallback((message: string, severity: AlertColor = "info") => {
        setNotification((prev) => ({ open: true, message, severity, key: prev.key + 1 }));
    }, []);

    const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === "clickaway") return;
        setNotification((prev) => ({ ...prev, open: false }));
    };

    // Helper to get icon and color
    const getSeverityConfig = (severity: AlertColor) => {
        switch (severity) {
            case 'success': return { icon: <CheckCircleIcon />, color: '#00c875', bg: 'rgba(0, 200, 117, 0.1)' };
            case 'error': return { icon: <ErrorIcon />, color: '#e2445c', bg: 'rgba(226, 68, 92, 0.1)' };
            case 'warning': return { icon: <WarningIcon />, color: '#fdab3d', bg: 'rgba(253, 171, 61, 0.1)' };
            default: return { icon: <InfoIcon />, color: '#579bfc', bg: 'rgba(87, 155, 252, 0.1)' };
        }
    };

    const config = getSeverityConfig(notification.severity);
    
    // Parse message for Title: Body format if present
    const parts = notification.message.split(': ');
    const title = parts.length > 1 ? parts[0] : (notification.severity.charAt(0).toUpperCase() + notification.severity.slice(1));
    const body = parts.length > 1 ? parts.slice(1).join(': ') : notification.message;

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <Snackbar
                key={notification.key}
                open={notification.open}
                autoHideDuration={5000}
                onClose={handleClose}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                TransitionComponent={Grow}
                sx={{ mt: 4, zIndex: 2000 }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 2,
                        minWidth: '320px',
                        maxWidth: '400px',
                        width: '100%',
                        bgcolor: 'background.paper', // Dark theme background
                        color: 'text.primary',
                        p: 2,
                        borderRadius: '16px',
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(12px)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {/* Severity color bar left */}
                    <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: config.color }} />
                    
                    {/* Icon */}
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        mt: 0.5,
                        color: config.color,
                        bgcolor: config.bg,
                        borderRadius: '50%',
                        p: 1
                    }}>
                        {config.icon}
                    </Box>

                    {/* Content */}
                    <Box sx={{ flex: 1, pt: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2, mb: 0.5, fontSize: '0.95rem' }}>
                            {title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#9ca3af', lineHeight: 1.4, fontSize: '0.85rem' }}>
                            {body}
                        </Typography>
                    </Box>

                    {/* Close Action */}
                    <IconButton 
                        size="small" 
                        onClick={(e) => handleClose(e)} 
                        sx={{ 
                            color: theme.palette.text.secondary, 
                            '&:hover': { color: theme.palette.text.primary, bgcolor: theme.palette.action.hover },
                            mt: -0.5,
                            mr: -0.5
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Snackbar>
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error("useNotification must be used within a NotificationProvider");
    }
    return context;
}
