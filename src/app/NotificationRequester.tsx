"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { authenticatedFetch, getApiUrl } from "./apiUrl";
import { useNotification } from "./NotificationContext";

// WEB: To use Push Notifications on Web, you must initialize Firebase here.
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBIUK8vR4o_0K-TVUy_bA0w_Z7WHY165Eo",
  authDomain: "smart-manage-8aa4e.firebaseapp.com",
  projectId: "smart-manage-8aa4e",
  storageBucket: "smart-manage-8aa4e.firebasestorage.app",
  messagingSenderId: "575987993996",
  appId: "1:575987993996:web:e971ed7d1a448c8826daa9",
  measurementId: "G-LQKV5LJ37P"
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
    const router = useRouter();
    useEffect(() => {
        const initPush = async () => {
            // Check if native or web.
            // Note: For Web Push to work, ensure you have:
            // 1. Created 'public/firebase-messaging-sw.js' with your Firebase config.
            // 2. Initialized Firebase in your app entry point or here if using the JS SDK directly.
            // 3. For Capacitor Push Notifications on Web, ensure the service worker is registered.

            try {
                if (Capacitor.isNativePlatform()) {
                    let permStatus = await PushNotifications.checkPermissions();

                    if (permStatus.receive === 'prompt') {
                        permStatus = await PushNotifications.requestPermissions();
                    }

                    if (permStatus.receive !== 'granted') {
                        // Try to request again or show instructions
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

                        // Add Listeners
                        await PushNotifications.removeAllListeners();

                        await PushNotifications.addListener('registration', async (token) => {
                            console.log('Push Registration Token: ', token.value);
                            // Send token to backend
                            try {
                                const response = await authenticatedFetch(getApiUrl('users/fcm'), {
                                    method: 'PUT',
                                    body: JSON.stringify({ token: token.value })
                                });
                                if (response.ok) {
                                    console.log('FCM Token sent to server successfully');
                                } else {
                                    console.error('Failed to send FCM token to server', response.status);
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

                            // Show visible in-app notification (Snackbar)
                            const title = notification.title || notification.data?.title || 'Notification';
                            const body = notification.body || notification.data?.body || 'New message';
                            showNotification(`${title}: ${body}`, 'info');

                            const tableId = notification.data?.tableId;
                            const workspaceId = notification.data?.workspaceId;
                            const taskId = notification.data?.taskId;
                            const type = notification.data?.type;

                            // ALSO schedule a Local Notification for the System Tray if desired
                            await LocalNotifications.schedule({
                                notifications: [
                                {
                                    title,
                                    body,
                                    id: new Date().getTime(),
                                    schedule: { at: new Date(Date.now() + 100) }, // Schedule for "now"
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
                            if (data.workspaceId) {
                                url = `/workspace?id=${data.workspaceId}`;
                                if (data.tableId) {
                                    url += `&tableId=${data.tableId}`;
                                }
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
                        
                        // Add Local Notification Action Listener (for foreground notifications clicked)
                        await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
                            console.log('Local Notification action performed:', notification);
                            handleNotificationTap(notification.notification.extra);
                        });

                        // Register with FCM
                        await PushNotifications.register();
                    }
                } else {
                     // WEB Push Logic
                     try {
                        const permission = await Notification.requestPermission();
                        if (permission === 'granted' && messaging) {
                             const currentToken = await getToken(messaging, { 
                                 vapidKey: 'BKbVWnX7gUt2601ppWblfDr_3Gwd9b-Rcs2n_BvyBTAl1B_WT_DmrvhRIFPvGjXtX2mn_Z0K2RtXT0oEIj5KPII'
                             });
                             if (currentToken) {
                                 console.log('Web FCM Token:', currentToken);
                                 // Send token to backend
                                 await authenticatedFetch(getApiUrl('users/fcm'), {
                                     method: 'PUT',
                                     body: JSON.stringify({ token: currentToken })
                                 });
                             }
                             
                             const { onMessage } = await import("firebase/messaging"); 
                             onMessage(messaging, (payload) => {
                                 console.log('Message received. ', payload);
                                 const title = payload.notification?.title || 'Notification';
                                 const body = payload.notification?.body || 'New message';
                                 showNotification(`${title}: ${body}`, 'info');
                             });

                        }
                    } catch(e) {
                        console.error('An error occurred while retrieving token on web. ', e);
                    }
                }
            } catch (e) {
                console.error('Error initializing push notifications', e);
            }
        };

        initPush();

        return () => {
             // Cleanup listeners
             PushNotifications.removeAllListeners();
        };
    }, []);

    // This component renders nothing
    return null;
};

export default NotificationRequester;
