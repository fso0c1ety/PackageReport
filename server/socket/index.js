const jwt = require("jsonwebtoken");
const { assertSocketIdentity, authenticatedCallPayload, socketUserId } = require("./identity");
const { createSocketEventGuard, isSafeIdentifier, usersMayCommunicate } = require("./security");

function attachSocketServer(io, {
  db,
  getTableAccess,
  jwtSecret,
  logger,
  sendDirectNotification,
  realtimeState,
}) {
  const allowEvent = createSocketEventGuard();

  function rejectUnsafeEvent(socket, eventName, payload) {
    if (allowEvent(socket.id, eventName, payload)) return false;
    socket.emit("error", { code: "INVALID_EVENT", message: "Event payload rejected" });
    logger.warn("socket_event_rejected", { eventName, socketId: socket.id, userId: socketUserId(socket) });
    return true;
  }

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
      || String(socket.handshake.headers?.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return next(new Error("Unauthorized socket connection"));
    try {
      socket.data.user = jwt.verify(token, jwtSecret);
      return next();
    } catch {
      return next(new Error("Invalid socket token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socketUserId(socket);
    logger.info("socket_connected", { socketId: socket.id, userId });

    socket.on("join_table", async (tableId) => {
      try {
        if (!isSafeIdentifier(tableId)) throw new Error("Invalid table identifier");
        const table = await getTableAccess(db, tableId, userId, "viewer");
        if (!table) throw new Error("Table access denied");
        const recordScope = table.board_record_access?.scope || table.record_access?.scope || "all_permitted";
        if (recordScope !== "all_permitted" && table.access_role !== "owner") {
          throw new Error("Record-scoped members must subscribe to task rooms");
        }
        socket.join(`table:${tableId}`);
        socket.join(tableId);
        logger.info("socket_join_table", { socketId: socket.id, userId, tableId });
      } catch {
        logger.warn("socket_join_table_forbidden", { socketId: socket.id, userId, tableId });
        socket.emit("error", { code: "FORBIDDEN", message: "Table access denied" });
      }
    });

    const forwardTableEvent = async (eventName, payload = {}) => {
      if (rejectUnsafeEvent(socket, eventName, payload)) return;
      const tableId = payload.tableId;
      const table = tableId && await getTableAccess(db, tableId, userId, "viewer");
      if (!table) {
        socket.emit("error", { code: "FORBIDDEN", message: "Table access denied" });
        return;
      }
      if (payload.taskId) {
        const { getRowAccess } = require("../services/permissions");
        if (!(await getRowAccess(db, payload.taskId, userId, "viewer", tableId))) {
          socket.emit("error", { code: "FORBIDDEN", message: "Task access denied" });
          return;
        }
      }
      socket.to(`table:${tableId}`).emit(eventName, {
        ...payload,
        user: socket.data.user,
      });
    };

    socket.on("typing_board", (payload) => forwardTableEvent("typing_board", payload));
    socket.on("stop_typing_board", (payload) => forwardTableEvent("stop_typing_board", payload));
    socket.on("typing_task", (payload) => forwardTableEvent("typing_task", payload));
    socket.on("stop_typing_task", (payload) => forwardTableEvent("stop_typing_task", payload));

    socket.on("join_task", async (taskId) => {
      if (!isSafeIdentifier(taskId)) {
        socket.emit("error", { code: "INVALID_EVENT", message: "Invalid task identifier" });
        return;
      }
      const result = await db.query("SELECT table_id FROM rows WHERE id=$1", [taskId]);
      const tableId = result.rows[0]?.table_id;
      const { getRowAccess } = require("../services/permissions");
      const access = tableId && await getRowAccess(db, taskId, userId, "viewer", tableId);
      if (!access) {
        socket.emit("error", { code: "FORBIDDEN", message: "Task access denied" });
        return;
      }
      socket.join(`task:${taskId}`);
      socket.join(taskId);
    });

    socket.on("leave_task", (taskId) => {
      socket.leave(`task:${taskId}`);
      socket.leave(taskId);
    });

    socket.on("register_user", async (requestedUserId) => {
      try {
        const authenticatedUserId = assertSocketIdentity(socket, requestedUserId);
        const previousSockets = await realtimeState.addSocket(authenticatedUserId, socket.id);
        if (previousSockets.length > 0) socket.emit("duplicate_session_check");
        socket.join(`user_${authenticatedUserId}`);
        const pendingCall = await realtimeState.getPendingCall(authenticatedUserId);
        if (pendingCall) socket.emit("call_offer", pendingCall);
        clearInterval(socket.data.presenceTimer);
        socket.data.presenceTimer = setInterval(() => realtimeState.touchPresence(authenticatedUserId).catch((error) => logger.error("socket_presence_refresh_failed", { userId: authenticatedUserId, error: error.message })), 45000);
      } catch {
        socket.emit("error", { code: "IDENTITY_MISMATCH", message: "Socket identity mismatch" });
      }
    });

    socket.on("call_offer", async (rawPayload = {}) => {
      try {
        if (rejectUnsafeEvent(socket, "call_offer", rawPayload)) return;
        const payload = authenticatedCallPayload(socket, rawPayload);
        if (!payload.targetId) return;
        if (!(await usersMayCommunicate(db, userId, payload.targetId))) {
          socket.emit("error", { code: "FORBIDDEN", message: "Call target is not authorized" });
          return;
        }
        socket.to(`user_${payload.targetId}`).emit("call_offer", payload);
        await realtimeState.setPendingCall(String(payload.targetId), payload);
        await sendDirectNotification(
          payload.targetId,
          "Incoming Call",
          `${payload.callerName || "Someone"} is calling you via ${payload.isVideo ? "Video" : "Audio"}.`,
          "incoming_call",
          {
            callerId: payload.callerId,
            callerName: payload.callerName,
            callerAvatar: payload.callerAvatar,
            isVideo: payload.isVideo,
          },
        );
      } catch (error) {
        logger.error("socket_call_offer_failed", { userId, error: error.message });
      }
    });

    for (const eventName of ["call_answer", "call_ringing", "call_busy", "call_ice_candidate", "call_end", "call_reject"]) {
      socket.on(eventName, async (payload = {}) => {
        if (rejectUnsafeEvent(socket, eventName, payload)) return;
        if (!payload.targetId) return;
        if (!(await usersMayCommunicate(db, userId, payload.targetId))) {
          socket.emit("error", { code: "FORBIDDEN", message: "Call target is not authorized" });
          return;
        }
        await realtimeState.deletePendingCall(String(payload.targetId));
        socket.to(`user_${payload.targetId}`).emit(eventName, { ...payload, senderId: userId });
      });
    }

    socket.on("confirm_takeover", async (requestedUserId) => {
      try {
        const authenticatedUserId = assertSocketIdentity(socket, requestedUserId);
        const sockets = await realtimeState.getSockets(authenticatedUserId);
        for (const socketId of sockets) {
          if (socketId !== socket.id) io.to(socketId).emit("force_logout");
        }
      } catch {
        socket.emit("error", { code: "IDENTITY_MISMATCH", message: "Socket identity mismatch" });
      }
    });

    socket.on("disconnect", async () => {
      clearInterval(socket.data.presenceTimer);
      await realtimeState.removeSocket(userId, socket.id).catch((error) => logger.error("socket_presence_cleanup_failed", { userId, error: error.message }));
      logger.info("socket_disconnected", { socketId: socket.id, userId });
    });
  });

  return { realtimeState };
}

module.exports = { attachSocketServer };
