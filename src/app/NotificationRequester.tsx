"use client";

import { useEffect } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

const NotificationRequester = () => {
    useEffect(() => {
        const initPush = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    // Start with Local Notifications as they are safer and don't require external config like firebase
                    let localPermStatus = await LocalNotifications.checkPermissions();
                    
                    if (localPermStatus.display === 'prompt') {
                        localPermStatus = await LocalNotifications.requestPermissions();
                    }
                    
                    if (localPermStatus.display !== 'granted') {
                        await LocalNotifications.requestPermissions();
                    }

                    // Also Request Push Notification permission for the system dialog 
                    // (Android 13+ requires this for any notification)
                    // But DO NOT register if you don't have google-services.json
                    let pushPermStatus = await PushNotifications.checkPermissions();
                    
                    if (pushPermStatus.receive === 'prompt') {
                        pushPermStatus = await PushNotifications.requestPermissions();
                    }

                    if (pushPermStatus.receive !== 'granted') {
                         await PushNotifications.requestPermissions();
                    }
                    
                    // We removed .register() to avoid crashes on devices without google-services.json
                    
                } catch (e) {
                    console.error('Error requesting notification permissions', e);
                }
            }
        };

        initPush();
    }, []);

    // This component renders nothing
    return null;
};

export default NotificationRequester;
