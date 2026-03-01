"use client";

import { useEffect } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { authenticatedFetch, getApiUrl } from "./apiUrl";

const NotificationRequester = () => {
    useEffect(() => {
        const initPush = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    // Start with Local Notifications
                    let localPermStatus = await LocalNotifications.checkPermissions();
                    
                    if (localPermStatus.display === 'prompt') {
                        localPermStatus = await LocalNotifications.requestPermissions();
                    }
                    
                    if (localPermStatus.display !== 'granted') {
                        await LocalNotifications.requestPermissions();
                    }

                    // Request Push Notification permission
                    let pushPermStatus = await PushNotifications.checkPermissions();
                    
                    if (pushPermStatus.receive === 'prompt') {
                        pushPermStatus = await PushNotifications.requestPermissions();
                    }

                    if (pushPermStatus.receive !== 'granted') {
                         await PushNotifications.requestPermissions();
                    }
                    
                    if (pushPermStatus.receive === 'granted') {
                         // Add Listeners first
                         await PushNotifications.removeAllListeners();

                         await PushNotifications.addListener('registration', async (token) => {
                            console.log('Push Registration Token: ', token.value);
                            // Send token to backend
                            try {
                                const response = await authenticatedFetch(getApiUrl('/users/fcm'), {
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
                        });
            
                        await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                            console.log('Push action performed: ' + JSON.stringify(notification));
                        });

                         // Register with FCM
                         await PushNotifications.register();
                    }
                    
                } catch (e) {
                    console.error('Error requesting notification permissions', e);
                }
            }
        };

        initPush();

        return () => {
             if (Capacitor.isNativePlatform()) {
                 PushNotifications.removeAllListeners();
             }
        };
    }, []);

    // This component renders nothing
    return null;
};

export default NotificationRequester;
