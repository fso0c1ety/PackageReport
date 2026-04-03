"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Snackbar, Button, Alert } from "@mui/material"; // Added UI components
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { authenticatedFetch, getApiUrl } from "./apiUrl";
import { useNotification } from "./NotificationContext";

// WEB: To use Push Notifications on Web, you must initialize Firebase here.
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import { useCallContext } from "./CallContext";

const firebaseConfig = {
  apiKey: "AIzaSyBIUK8vR4o_0K-TVUy_bA0w_Z7WHY165Eo",
  authDomain: "smart-manage-8aa4e.firebaseapp.com",
  projectId: "smart-manage-8aa4e",
  storageBucket: "smart-manage-8aa4e.firebasestorage.app",
  messagingSenderId: "575987993996",
  appId: "1:575987993996:web:e971ed7d1a448c8826daa9",
  measurementId: "G-LQKV5LJ37P"
};

const getNotificationType = (payload: any) => {
    const data = payload?.data || {};
    if (data.type) return data.type;
    return payload?.notification?.title === 'Incoming Call' ? 'incoming_call' : 'generic';
};

// Initialize only if window is defined (client-side)
let messaging: any = null;
if (typeof window !== "undefined") {
    try {
        const app = initializeApp(firebaseConfig);
        messaging = getMessaging(app);
    } catch (e) {
        console.error("Firebase init error", e);
    }
}

const NotificationRequester = () => {
    const { showNotification } = useNotification();
    const { showIncomingCall } = useCallContext();
    const router = useRouter();
    const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

    const initWebPush = async () => {
        try {
            if (messaging) {
                    // Explicitly register the Service Worker with 'none' cache to force updates
                    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                        scope: '/',
                        updateViaCache: 'none'
                    });
                    console.log('Service Worker registered with scope:', registration.scope);

                    console.log('Requesting Web FCM Token...');
                    const currentToken = await getToken(messaging, { 
                        vapidKey: 'BKbVWnX7gUt2601ppWblfDr_3Gwd9b-Rcs2n_BvyBTAl1B_WT_DmrvhRIFPvGjXtX2mn_Z0K2RtXT0oEIj5KPII',
                        serviceWorkerRegistration: registration
                    });
                    if (currentToken) {
                        console.log('Web FCM Token obtained:', currentToken);
                        // Send token to backend
                        const response = await authenticatedFetch('/api/users/fcm', {
                            method: 'PUT',
                            body: JSON.stringify({ token: currentToken })
                        });
                        if (response.ok) {
                            console.log('Web FCM Token sent to server successfully');
                        } else {
                            const errorText = await response.text();
                            console.error('Failed to send Web FCM token to server', response.status, errorText);
                        }
                    } else {
                        console.warn('No registration token available. Request permission to generate one.');
                    }
                    
                    const { onMessage } = await import("firebase/messaging"); 
                    onMessage(messaging, (payload) => {
                        console.log('Foreground message received: ', payload);
                        const data = payload.data || {};
                        const type = getNotificationType(payload);

                        if (type === 'incoming_call') {
                            showIncomingCall({
                                ...data,
                                callerName: data.callerName || payload.notification?.title || 'Incoming Call'
                            });
                        } else {
                            const title = payload.notification?.title || 'Notification';
                            const body = payload.notification?.body || 'New message';
                            showNotification(`${title}: ${body}`, 'info');
                        }
                    });
            } else {
                console.warn('Firebase Messaging not initialized.');
            }
        } catch(e) {
            console.error('An error occurred while retrieving token on web. ', e);
        }
    };

    const handleWebPermissionRequest = async () => {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setShowPermissionPrompt(false);
                initWebPush();
            } else {
                console.warn("Notification permission denied");
                setShowPermissionPrompt(false);
            }
        } catch (e) {
            console.error("Error requesting permission", e);
        }
    };

    useEffect(() => {
        const initPush = async () => {
            try {
                if (Capacitor.isNativePlatform()) {
                    let permStatus = await PushNotifications.checkPermissions();

                    if (permStatus.receive === 'prompt') {
                        permStatus = await PushNotifications.requestPermissions();
                    }

                    if (permStatus.receive !== 'granted') {
                       try {
                            permStatus = await PushNotifications.requestPermissions();
                       } catch (e) {
                           console.warn("User denied permissions or error requesting", e);
                       }
                    }

                    if (permStatus.receive === 'granted') {
                        await PushNotifications.createChannel({
                            id: 'chat_messages',
                            name: 'Chat Messages',
                            description: 'Notifications for new chat messages',
                            importance: 5,
                            visibility: 1,
                            vibration: true,
                        });

                        await PushNotifications.createChannel({
                            id: 'calls_v5',
                            name: 'Incoming Calls',
                            description: 'Notifications for incoming audio and video calls',
                            importance: 5,
                            visibility: 1,
                            vibration: true,
                            sound: 'ringtone',
                        });

                        await PushNotifications.removeAllListeners();

                        await PushNotifications.addListener('registration', async (token) => {
                            console.log('Push Registration Token: ', token.value);
                            try {
                                const response = await authenticatedFetch('/api/users/fcm', {
                                    method: 'PUT',
                                    body: JSON.stringify({ token: token.value })
                                });
                                if (response.ok) {
                                    console.log('FCM Token sent to server successfully');
                                } else {
                                    const errorText = await response.text();
                                    console.error('Failed to send FCM token to server', response.status, errorText);
                                }
                            } catch (err) {
                                console.error('Error sending FCM token to server:', err);
                            }
                        });

                        await PushNotifications.addListener('registrationError', (error: any) => {
                            console.error('Error on registration: ' + JSON.stringify(error));
                        });

                        await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
                            console.log('Push received: ' + JSON.stringify(notification));

                            // Extract title and body from the notification object or the data payload (for data-only messages)
                            const title = notification.title || notification.data?.title || 'Notification';
                            const body = notification.body || notification.data?.body || 'New message';
                            const type = notification.data?.type;

                            if (type === 'incoming_call') {
                                showIncomingCall(notification.data);
                            } else {
                                showNotification(`${title}: ${body}`, 'info');
                            }

                            const tableId = notification.data?.tableId;
                            const workspaceId = notification.data?.workspaceId;
                            const taskId = notification.data?.taskId;

                            await LocalNotifications.schedule({
                                notifications: [
                                {
                                    title,
                                    body,
                                    id: new Date().getTime(),
                                    schedule: { at: new Date(Date.now() + 100) },
                                    sound: undefined,
                                    attachments: undefined,
                                    actionTypeId: "",
                                    extra: { tableId, workspaceId, taskId, type }
                                }
                                ]
                            });
                        });
                        
                        const handleNotificationTap = (data: any) => {
                            let url = "";
                            if (data.type === 'incoming_call') {
                                url = `/chat?userId=${data.callerId}&autoAccept=true`;
                            } else if (data.workspaceId) {
                                url = `/workspace?id=${data.workspaceId}`;
                                if (data.tableId) {
                                    url += `&tableId=${data.tableId}`;
                                }
                                router.push(url);
                            } else if (data.type === 'incoming_call') {
                                // For background tap on call, we show the UI immediately
                                showIncomingCall(data);
                            }
                            
                            if (url) {
                                if (data.taskId) {
                                    url += `&taskId=${data.taskId}`;
                                }
                                
                                if (data.type === 'chat_message' || data.type === 'task_chat') {
                                    url += `&tab=chat`;
                                } else if (data.type === 'file_comment') {
                                    url += `&tab=files`;
                                }
                                
                                router.push(url);
                            }
                        };

                        await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                            console.log('Push action performed: ' + JSON.stringify(notification));
                             handleNotificationTap(notification.notification.data);
                        });
                        
                        await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
                            console.log('Local Notification action performed:', notification);
                            handleNotificationTap(notification.notification.extra);
                        });

                        await PushNotifications.register();
                    }
                } else {
                     // WEB Push Logic
                     if (Notification.permission === 'granted') {
                         initWebPush();
                     } else if (Notification.permission === 'default') {
                         setShowPermissionPrompt(true);
                     }
                }
            } catch (e) {
                console.error('Error initializing push notifications', e);
            }
        };

        const timer = setTimeout(() => {
            initPush();
        }, 1000); // Small delay to ensure mount

        return () => {
             if (Capacitor.isNativePlatform()) {
                 PushNotifications.removeAllListeners();
             }
             clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        const handleServiceWorkerMessage = (event: MessageEvent) => {
            const message = event.data;
            if (!message || message.type !== 'incoming_call_click') return;
            showIncomingCall(message.payload || {});
        };

        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
        return () => {
            navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
        };
    }, [showIncomingCall]);

    if (!showPermissionPrompt) return null;

    return (
        <Snackbar
            open={showPermissionPrompt}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            message="Would you like to receive notifications?"
            action={
                <Button color="primary" size="small" onClick={handleWebPermissionRequest}>
                    Enable
                </Button>
            }
            sx={{ bottom: { xs: 90, sm: 24 } }} // Adjust for mobile bottom bar if needed
        />
    );
};

export default NotificationRequester;
