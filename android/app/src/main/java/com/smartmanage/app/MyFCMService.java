package com.smartmanage.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class MyFCMService extends FirebaseMessagingService {
    private static final String TAG = "MyFCMService";
    private static final String CHANNEL_ID = "calls_v4";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        Map<String, String> data = remoteMessage.getData();
        String type = data.get("type");

        // We only intercept "incoming_call" to provide the full-screen "Pop-up" experience
        if ("incoming_call".equals(type)) {
            Log.d(TAG, "Incoming call received in background/killed state. Triggering Full-Screen Intent.");
            showCallNotification(data);
        }
    }

    private void showCallNotification(Map<String, String> data) {
        String title = data.get("title");
        String body = data.get("body");
        String callerId = data.get("callerId");
        boolean isVideo = "true".equals(data.get("isVideo"));

        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        // Create Channel for Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Incoming Calls",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Full-screen notifications for incoming calls");
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            
            // Set sound to the ringtone
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();
            // Note: 'ringtone' must exist in android/app/src/main/res/raw/ringtone.wav
            Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/raw/ringtone");
            channel.setSound(soundUri, audioAttributes);

            notificationManager.createNotificationChannel(channel);
        }

        // Intent to launch the app when "Answer" or the notification is tapped
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("callerId", callerId);
        intent.putExtra("type", "incoming_call");
        intent.putExtra("isVideo", isVideo);
        intent.putExtra("autoAccept", true);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 
            0, 
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Build the notification
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setContentTitle(title != null ? title : "Incoming Call")
            .setContentText(body != null ? body : "Someone is calling you...")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setOngoing(true)
            .setAutoCancel(true)
            .setFullScreenIntent(pendingIntent, true) // This is the "POP" part
            .setContentIntent(pendingIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        // Add Answer/Decline Actions
        Intent declineIntent = new Intent(this, MainActivity.class); // In a real app, this might be a BroadcastReceiver to stop the sound
        declineIntent.putExtra("action", "decline");
        PendingIntent pendingDecline = PendingIntent.getActivity(this, 1, declineIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        builder.addAction(android.R.drawable.ic_menu_call, "ANSWER", pendingIntent);
        builder.addAction(android.R.drawable.ic_menu_close_clear_cancel, "DECLINE", pendingDecline);
        
        // Notification ID for calls
        notificationManager.notify(1001, builder.build());
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "Refreshed token: " + token);
    }
}
