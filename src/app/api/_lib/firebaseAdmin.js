import fs from "fs";
import path from "path";
import admin from "firebase-admin";

let initialized = false;

function initFirebaseAdmin() {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return true;
  }

  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
    let serviceAccount;

    if (raw) {
      serviceAccount = JSON.parse(raw);
    } else {
      const fallbackPath = path.join(process.cwd(), "server", "firebase-service-account.json");
      if (!fs.existsSync(fallbackPath)) {
        console.warn("[Firebase][Admin] FIREBASE_SERVICE_ACCOUNT is missing and no local firebase-service-account.json fallback was found");
        return false;
      }

      serviceAccount = JSON.parse(fs.readFileSync(fallbackPath, "utf8"));
      console.log("[Firebase][Admin] Loaded credentials from local service account file.");
    }

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
