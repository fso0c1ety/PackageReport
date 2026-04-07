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

function stringifyDataValue(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function buildNotificationLink(data = {}) {
  if (data.type === "incoming_call" && data.callerId) {
    return `/chat?userId=${data.callerId}`;
  }

  if (data.type === "direct_message" && data.senderId) {
    return `/chat?userId=${data.senderId}`;
  }

  if (data.type === "friend_request" || data.type === "friend_accepted" || data.type === "social_request") {
    return "/chat?tab=social";
  }

  if (data.workspaceId) {
    let url = `/workspace?id=${data.workspaceId}`;
    if (data.tableId) url += `&tableId=${data.tableId}`;
    if (data.taskId) url += `&taskId=${data.taskId}`;
    if (data.type === "chat_message" || data.type === "task_chat") url += `&tab=chat`;
    else if (data.type === "file_comment") url += `&tab=files`;
    return url;
  }

  return "/";
}

export async function sendPushNotification(tokens, title, body, data = {}) {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return { successCount: 0, failureCount: 0, responses: [] };
  }

  const ok = initFirebaseAdmin();
  if (!ok) {
    return { successCount: 0, failureCount: tokens.length, responses: [] };
  }

  const safeData = Object.fromEntries(
    Object.entries(data || {}).map(([k, v]) => [k, stringifyDataValue(v)])
  );

  const isCall = safeData.type === "incoming_call";
  const resolvedTitle = title || safeData.title || "Notification";
  const resolvedBody = body || safeData.body || "You have a new update";

  const message = {
    tokens,
    notification: {
      title: resolvedTitle,
      body: resolvedBody,
    },
    data: {
      ...safeData,
      title: resolvedTitle,
      body: resolvedBody,
    },
    android: {
      priority: isCall ? "high" : "normal",
      ttl: isCall ? 0 : 3600 * 1000,
      notification: {
        channelId: isCall ? "calls_v5" : "chat_messages",
        sound: isCall ? "ringtone" : "default",
        notificationPriority: isCall ? "PRIORITY_MAX" : "PRIORITY_HIGH",
        visibility: "PUBLIC",
      },
    },
    webpush: {
      headers: {
        Urgency: isCall ? "high" : "normal",
      },
      notification: {
        title: resolvedTitle,
        body: resolvedBody,
        icon: "/logo.png",
        badge: "/logo.png",
        requireInteraction: isCall,
        actions: isCall
          ? [
              { action: "answer", title: "✅ Accept Call" },
              { action: "reject", title: "❌ Decline" },
            ]
          : [],
      },
      fcmOptions: {
        link: buildNotificationLink(safeData),
      },
    },
    apns: {
      headers: {
        "apns-priority": isCall ? "10" : "5",
        "apns-push-type": "alert",
      },
      payload: {
        aps: {
          alert: {
            title: resolvedTitle,
            body: resolvedBody,
          },
          sound: "default",
          badge: 1,
          "content-available": 1,
          category: isCall ? "call" : undefined,
        },
      },
    },
  };

  return admin.messaging().sendEachForMulticast(message);
}
