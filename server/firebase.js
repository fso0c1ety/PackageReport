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
  console.error('[Firebase] Please ensure FIREBASE_SERVICE_ACCOUNT env var is set or firebase-service-account.json exists.');
}

const { getMessaging } = require('firebase-admin/messaging');

const sendPushNotification = async (tokens, title, body, data = {}) => {
  if (!admin.apps.length) {
    console.warn('[FCM] Firebase Admin not initialized. Skipping notification.');
    return;
  }
  
  if (!tokens || tokens.length === 0) return;

  // Use the modern 'sendEachForMulticast' API
  const message = {
    notification: {
      title,
      body,
    },
    android: {
      notification: {
        channelId: 'chat_messages',
        priority: 'high',
        defaultSound: true,
        defaultVibrateTimings: true,
        // clickAction removed to allow default intent handling
      }
    },
    data: {
      ...data,
      // click_action removed
    },
    tokens: tokens, // sendEachForMulticast accepts 'tokens' array in the message object
  };

  try {
    const response = await getMessaging().sendEachForMulticast(message);
    console.log(`[FCM] Attempted to send to ${tokens.length} tokens. Success: ${response.successCount}, Failure: ${response.failureCount}`);
    
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

