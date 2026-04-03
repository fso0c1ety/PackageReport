import admin from "firebase-admin";

let initialized = false;

function initFirebaseAdmin() {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return true;
  }

  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
      console.warn("[Firebase][Admin] FIREBASE_SERVICE_ACCOUNT env var is missing");
      return false;
    }

    const serviceAccount = JSON.parse(raw);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    initialized = true;
    return true;
  } catch (error) {
    console.error("[Firebase][Admin] Initialization failed:", error);
    return false;
  }
}

export async function sendPushNotification(tokens, title, body, data = {}) {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return { successCount: 0, failureCount: 0, responses: [] };
  }

  const ok = initFirebaseAdmin();
  if (!ok) {
    return { successCount: 0, failureCount: tokens.length, responses: [] };
  }

  const message = {
    tokens,
    notification: {
      title: title || "Notification",
      body: body || "You have a new update",
    },
    data: {
      ...Object.fromEntries(
        Object.entries(data || {}).map(([k, v]) => [k, v == null ? "" : String(v)])
      ),
      title: title || "",
      body: body || "",
    },
    webpush: {
      headers: {
        Urgency: "high",
      },
    },
  };

  return admin.messaging().sendEachForMulticast(message);
}
