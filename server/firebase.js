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

  const safeData = Object.fromEntries(
    Object.entries(data || {}).map(([key, value]) => [
      key,
      value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value),
    ])
  );

  const isCall = safeData.type === 'incoming_call';
  const resolvedTitle = title || safeData.title || '';
  const resolvedBody = body || safeData.body || '';

  let notificationLink = '/';
  if (isCall && safeData.callerId) {
    notificationLink = `/chat?userId=${safeData.callerId}&autoAccept=true`;
  } else if (safeData.type === 'direct_message' && safeData.senderId) {
    notificationLink = `/chat?userId=${safeData.senderId}`;
  } else if (safeData.workspaceId) {
    notificationLink = `/workspace?id=${safeData.workspaceId}`;
    if (safeData.tableId) notificationLink += `&tableId=${safeData.tableId}`;
    if (safeData.taskId) notificationLink += `&taskId=${safeData.taskId}`;
    if (safeData.type === 'chat_message' || safeData.type === 'task_chat') notificationLink += `&tab=chat`;
    else if (safeData.type === 'file_comment') notificationLink += `&tab=files`;
  } else if (safeData.type === 'friend_request' || safeData.type === 'friend_accepted' || safeData.type === 'social_request') {
    notificationLink = '/chat?tab=social';
  }

  // Base message structure
  const message = {
    data: {
      ...safeData,
      title: resolvedTitle,
      body: resolvedBody,
    },
    tokens: tokens,
  };

  if (resolvedTitle && resolvedBody) {
    message.notification = {
      title: resolvedTitle,
      body: resolvedBody,
    };
  }

  message.android = {
    priority: isCall ? 'high' : 'normal',
    ttl: isCall ? 0 : 3600 * 1000,
    notification: {
      channelId: isCall ? 'calls_v5' : 'chat_messages',
      sound: isCall ? 'ringtone' : 'default',
      notificationPriority: isCall ? 'PRIORITY_MAX' : 'PRIORITY_HIGH',
      visibility: 'PUBLIC',
      category: isCall ? 'call' : undefined,
    },
  };

  message.webpush = {
    headers: {
      Urgency: isCall ? 'high' : 'normal',
    },
    notification: {
      title: resolvedTitle,
      body: resolvedBody,
      icon: '/logo.png',
      badge: '/logo.png',
      requireInteraction: isCall,
      actions: isCall
        ? [
            { action: 'answer', title: '✅ ACCEPT CALL' },
            { action: 'reject', title: '❌ DECLINE' }
          ]
        : [],
    },
    fcmOptions: {
      link: notificationLink,
    },
  };

  message.apns = {
    headers: {
      'apns-priority': isCall ? '10' : '5',
      'apns-push-type': 'alert',
    },
    payload: {
      aps: {
        alert: {
          title: resolvedTitle,
          body: resolvedBody,
        },
        'content-available': 1,
        sound: 'default',
        badge: 1,
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

