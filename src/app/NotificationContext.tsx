"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Snackbar, Alert, AlertColor } from "@mui/material";

interface NotificationContextType {
    showNotification: (message: string, severity?: AlertColor) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notification, setNotification] = useState<{
        open: boolean;
        message: string;
        severity: AlertColor;
    }>({
        open: false,
        message: "",
        severity: "info",
    });

    const showNotification = useCallback((message: string, severity: AlertColor = "info") => {
        setNotification({ open: true, message, severity });
    }, []);

    const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === "clickaway") return;
        setNotification((prev) => ({ ...prev, open: false }));
    };

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <Snackbar
                open={notification.open}
                autoHideDuration={4000}
                onClose={handleClose}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                sx={{ mt: 2 }}
            >
                <Alert
                    onClose={handleClose}
                    severity={notification.severity}
                    variant="filled"
                    sx={{
                        width: "100%",
                        minWidth: "300px",
                        bgcolor:
                            notification.severity === "success"
                                ? "#00c875"
                                : notification.severity === "error"
                                    ? "#e2445c"
                                    : notification.severity === "warning"
                                        ? "#ffcb00"
                                        : "#1e1f2b",
                        color: "#fff",
                        fontWeight: 600,
                        borderRadius: "12px",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        backdropFilter: "blur(10px)",
                        "& .MuiAlert-icon": { color: "#fff" },
                        "& .MuiAlert-action": { color: "#fff" },
                        fontFamily: "var(--font-outfit), sans-serif",
                    }}
                >
                    {notification.message}
                </Alert>
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
