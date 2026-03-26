const admin = require('firebase-admin');

// Initialize Firebase Admin
let serviceAccount;
try {
  // 1. Try to load from environment variable (Best for Production/Render)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('[Firebase] Loaded credentials from environment variable.');
  } 
  // 2. Fallback to local file (Best for Local Dev)
  else {
    serviceAccount = require('./firebase-service-account.json');
    console.log('[Firebase] Loaded credentials from local file.');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('[Firebase] Admin SDK initialized successfully.');
  }
} catch (error) {
  console.error('[Firebase] Failed to initialize Admin SDK:', error.message);
  console.warn('[Firebase] Notifications will be disabled until server/firebase-service-account.json is provided or the FIREBASE_SERVICE_ACCOUNT environment variable is set.');
}

const { getMessaging } = require('firebase-admin/messaging');

const sendPushNotification = async (tokens, title, body, data = {}) => {
  if (!admin.apps.length) {
    console.warn('[FCM] Firebase Admin not initialized. Skipping notification.');
    return;
  }
  
  if (!tokens || tokens.length === 0) return;

  const isCall = data.type === 'incoming_call';

  // Base message structure
  const message = {
    data: {
      ...data,
      // Ensure title and body are available in data for service workers (data-only messages)
      title: title || data.title || '',
      body: body || data.body || '',
    },
    tokens: tokens,
  };

  // Always add 'notification' to ensure OS/Browser delivery even if background process is asleep.
  // Data-only messages are often suppressed by browsers/OS unless high-priority headers are perfectly set.
  if (title && body) {
    message.notification = {
      title,
      body,
    };
  }

  // Android-specific configuration
  message.android = {
    priority: isCall ? 'high' : 'normal',
    ttl: isCall ? 0 : 3600 * 1000, // 0 for immediate (calls), 1 hour for others
  };

  // Only add Android notification settings if we are sending a notification or if it's a call
  // For calls, we still want to provide channel information for the background handler
  message.android.notification = {
    channelId: isCall ? 'calls_v4' : 'chat_messages',
    sound: isCall ? 'ringtone' : 'default',
    notificationPriority: isCall ? 'PRIORITY_MAX' : 'PRIORITY_DEFAULT',
    visibility: 'PUBLIC',
  };

  if (isCall) {
    message.android.notification.category = 'call';
  }

  // Webpush-specific configuration for background wake-up
  message.webpush = {
    headers: {
      Urgency: isCall ? 'high' : 'normal',
    },
    notification: isCall ? {
      title: title,
      body: body,
      icon: '/logo.png',
      requireInteraction: true,
      actions: [
        { action: 'answer', title: '✅ ACCEPT CALL' },
        { action: 'reject', title: '❌ DECLINE' }
      ]
    } : undefined,
    fcmOptions: {
      link: isCall ? `/chat?userId=${data.callerId}&autoAccept=true` : undefined,
    },
  };

  // APNS-specific configuration (iOS) for background wake-up
  message.apns = {
    headers: {
      'apns-priority': isCall ? '10' : '5',
      'apns-push-type': 'alert',
    },
    payload: {
      aps: {
        'content-available': 1,
        sound: isCall ? 'ringtone.wav' : 'default',
        category: isCall ? 'call' : undefined,
      },
    },
  };

  try {
    const response = await getMessaging().sendEachForMulticast(message);
    console.log(`[FCM] Sent to ${tokens.length} tokens. Type: ${data.type || 'generic'}. Success: ${response.successCount}, Failure: ${response.failureCount}`);
    
    response.responses.forEach((resp, idx) => {
      if (resp.success) {
        console.log(`[FCM] Token ${idx} success: ${resp.messageId}`);
      } else {
        console.error(`[FCM] Token ${idx} failure:`, resp.error.code, resp.error.message);
        if (resp.error.code === 'messaging/invalid-registration-token' || resp.error.code === 'messaging/registration-token-not-registered') {
          console.warn(`[FCM] Token ${idx} is stale and should be removed.`);
        }
      }
    });
    return response;
  } catch (error) {
    console.error('[FCM] Error sending message:', error);
  }
};

module.exports = { admin, sendPushNotification };

