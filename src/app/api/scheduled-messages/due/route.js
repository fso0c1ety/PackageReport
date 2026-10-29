import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { pool, SECRET_KEY } from "../../_lib/server";
import { sendTableNotification } from "../../_lib/notificationHelper";
import { processScheduledMessages } from "../../../../../server/jobs/scheduledMessages";

export const runtime = "nodejs";

function matchesSecret(supplied, expected) {
  if (!supplied || !expected) return false;
  const a = Buffer.from(String(supplied));
  const b = Buffer.from(String(expected));
  return a.length === b.length && timingSafeEqual(a, b);
}

function isAuthorized(req) {
  const supplied = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (matchesSecret(supplied, process.env.CRON_SECRET)) return true;
  if (!SECRET_KEY) return false;
  const expected = createHmac("sha256", SECRET_KEY).update("smart-manage:scheduled-messages:v1").digest("hex");
  return matchesSecret(supplied, expected);
}

export async function GET(req) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await processScheduledMessages({
      db: pool,
      sendNotification: (title, body, type, data, table) => sendTableNotification({
        table,
        title,
        body,
        type,
        taskId: data?.taskId || null,
        extraData: {
          scheduledJob: true,
          dedupeKey: `scheduled-message:${data?.scheduledMessageId || data?.taskId || "unknown"}`,
        },
      }),
      logger: console,
    });
    return NextResponse.json(result || { processed: 0 });
  } catch (error) {
    console.error("[SCHEDULED_MESSAGES][DUE]", error);
    return NextResponse.json({ error: "Unable to process scheduled messages" }, { status: 500 });
  }
}
