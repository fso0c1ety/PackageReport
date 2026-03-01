const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const sendPushNotification = async (tokens, title, body, data = {}) => {
  if (!tokens || tokens.length === 0) return;

  const message = {
    notification: {
      title,
      body,
    },
    data: {
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK' // Standard for many frameworks, ensures click opens app
    },
    tokens: tokens,
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log('[FCM] Successfully sent message:', response.successCount);
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          console.error('[FCM] Failed for token:', tokens[idx], resp.error);
        }
      });
      // Here you could remove failed tokens from your DB if needed
    }
    return response;
  } catch (error) {
    console.error('[FCM] Error sending message:', error);
  }
};

module.exports = { admin, sendPushNotification };
