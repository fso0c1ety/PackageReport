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
                    // Check and request Push Notifications permissions
                    let permStatus = await PushNotifications.checkPermissions();

                    if (permStatus.receive === 'prompt') {
                        permStatus = await PushNotifications.requestPermissions();
                    }

                    if (permStatus.receive !== 'granted') {
                        const request = await PushNotifications.requestPermissions();
                        if (request.receive === 'granted') {
                            await PushNotifications.register();
                        }
                    } else {
                        await PushNotifications.register();
                    }

                    // Check and request Local Notifications permissions
                    let localPermStatus = await LocalNotifications.checkPermissions();
                     if (localPermStatus.display === 'prompt') {
                        localPermStatus = await LocalNotifications.requestPermissions();
                    }
                    if (localPermStatus.display !== 'granted') {
                        await LocalNotifications.requestPermissions();
                    }

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
