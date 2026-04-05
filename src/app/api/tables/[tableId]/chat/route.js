import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getAuthenticatedUser, pool } from "../../../_lib/server";
import { sendTableNotification } from "../../../_lib/notificationHelper";

export const runtime = "nodejs";

async function canAccessTable(tableId, userId) {
  const tableRes = await pool.query("SELECT id, name, workspace_id, shared_users FROM tables WHERE id = $1", [tableId]);
  const table = tableRes.rows[0];

  if (!table) {
    return { allowed: false, table: null };
  }

  const workspaceRes = await pool.query("SELECT owner_id FROM workspaces WHERE id = $1", [table.workspace_id]);
  const ownerId = workspaceRes.rows[0]?.owner_id;
  const isOwner = ownerId === userId;

  let isShared = false;
  if (Array.isArray(table.shared_users)) {
    isShared = table.shared_users.some((entry) => {
      const sharedUserId = typeof entry === "string" ? entry : entry?.userId;
      return sharedUserId === userId;
    });
  }

  return { allowed: isOwner || isShared, table };
}

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;
    const access = await canAccessTable(tableId, user.id);

    if (!access.table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    if (!access.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await pool.query(
      `SELECT tc.*, u.avatar AS sender_avatar
       FROM table_chats tc
       LEFT JOIN users u ON u.id = tc.sender_id
       WHERE tc.table_id = $1
       ORDER BY tc.timestamp ASC`,
      [tableId]
    );

    const messages = result.rows.map((row) => ({
      ...row,
      senderAvatar:
        row.sender_avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          row.sender || "User"
        )}&background=random&color=fff&bold=true`,
    }));

    return NextResponse.json(messages);
  } catch (err) {
    console.error("[TABLE CHAT][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;
    const access = await canAccessTable(tableId, user.id);

    if (!access.table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    if (!access.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const normalizedAttachment =
      body?.attachment && typeof body.attachment === "object"
        ? {
            name: body.attachment.name || null,
            type: body.attachment.type || null,
            url: body.attachment.url || null,
            size: body.attachment.size || null,
            originalName: body.attachment.originalName || null,
            uploadedAt: body.attachment.uploadedAt || null,
          }
        : null;

    const newMessage = {
      id: uuidv4(),
      table_id: tableId,
      sender: body?.sender || user.name || "User",
      sender_id: user.id,
      text: body?.text || "",
      timestamp: body?.timestamp || Date.now(),
      attachment: normalizedAttachment,
    };

    await pool.query(
      "INSERT INTO table_chats (id, table_id, sender, text, timestamp, attachment, sender_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [
        newMessage.id,
        newMessage.table_id,
        newMessage.sender,
        newMessage.text,
        newMessage.timestamp,
        newMessage.attachment ? JSON.stringify(newMessage.attachment) : null,
        newMessage.sender_id,
      ]
    );

    const userRes = await pool.query("SELECT avatar FROM users WHERE id = $1", [newMessage.sender_id]);
    const senderAvatar =
      userRes.rows[0]?.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        newMessage.sender
      )}&background=random&color=fff&bold=true`;

    try {
      await sendTableNotification({
        table: access.table,
        senderId: user.id,
        type: "chat_message",
        title: `New message in ${access.table?.name || "Board Chat"}`,
        body: `${newMessage.sender}: ${newMessage.text || "Sent an attachment."}`,
        extraData: {
          senderId: user.id,
        },
      });
    } catch (notifyErr) {
      console.error("[TABLE CHAT][POST] Notification send failed:", notifyErr);
    }

    return NextResponse.json({
      ...newMessage,
      sender_avatar: senderAvatar,
      senderAvatar,
    });
  } catch (err) {
    console.error("[TABLE CHAT][POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
