import admin from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';

let initialized = false;

async function initFirebase() {
  if (initialized || admin.apps.length) {
    initialized = true;
    return;
  }
  try {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      // Fallback to local file for dev
      try {
        const fs = await import('fs');
        const path = await import('path');
        const url = await import('url');
        const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
        const raw = fs.readFileSync(path.join(__dirname, '../../server/firebase-service-account.json'), 'utf8');
        serviceAccount = JSON.parse(raw);
      } catch {
        console.warn('[Firebase] No service account file found. Notifications disabled.');
        return;
      }
    }
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    initialized = true;
    console.log('[Firebase] Admin SDK initialized.');
  } catch (err) {
    console.error('[Firebase] Failed to initialize:', err.message);
  }
}

// Eagerly initialize on module load
initFirebase().catch(() => {});

export async function sendPushNotification(tokens, title, body, data = {}) {
  if (!admin.apps.length) {
    console.warn('[FCM] Firebase not initialized. Skipping.');
    return;
  }
  if (!tokens || tokens.length === 0) return;

  const isCall = data.type === 'incoming_call';

  const message = {
    data: { ...data, title: title || '', body: body || '' },
    tokens,
  };

  if (title && body) {
    message.notification = { title, body };
  }

  message.android = {
    priority: isCall ? 'high' : 'normal',
    ttl: isCall ? 0 : 3600 * 1000,
    notification: {
      channelId: isCall ? 'calls_v5' : 'chat_messages',
      sound: isCall ? 'ringtone' : 'default',
      notificationPriority: isCall ? 'PRIORITY_MAX' : 'PRIORITY_DEFAULT',
      visibility: 'PUBLIC',
      ...(isCall ? { category: 'call' } : {}),
    },
  };

  message.webpush = {
    headers: { Urgency: isCall ? 'high' : 'normal' },
    notification: isCall
      ? {
          title,
          body,
          icon: '/logo.png',
          requireInteraction: true,
          actions: [
            { action: 'answer', title: '✅ ACCEPT CALL' },
            { action: 'reject', title: '❌ DECLINE' },
          ],
        }
      : undefined,
    fcmOptions: { link: isCall ? `/chat?userId=${data.callerId}&autoAccept=true` : undefined },
  };

  message.apns = {
    headers: {
      'apns-priority': isCall ? '10' : '5',
      'apns-push-type': 'alert',
    },
    payload: {
      aps: {
        'content-available': 1,
        sound: isCall ? 'ringtone.wav' : 'default',
        ...(isCall ? { category: 'call' } : {}),
      },
    },
  };

  try {
    const response = await getMessaging().sendEachForMulticast(message);
    console.log(`[FCM] Sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);
    return response;
  } catch (err) {
    console.error('[FCM] Error:', err);
  }
}

export { admin };
