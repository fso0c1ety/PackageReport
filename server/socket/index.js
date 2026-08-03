const jwt = require("jsonwebtoken");
const { assertSocketIdentity, authenticatedCallPayload, socketUserId } = require("./identity");

function attachSocketServer(io, {
  db,
  getTableAccess,
  jwtSecret,
  logger,
  sendDirectNotification,
}) {
  const pendingOffers = new Map();
  const userSockets = new Map();

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
        const table = await getTableAccess(db, tableId, userId, "viewer");
        if (!table) throw new Error("Table access denied");
        socket.join(`table:${tableId}`);
        socket.join(tableId);
        logger.info("socket_join_table", { socketId: socket.id, userId, tableId });
      } catch {
        logger.warn("socket_join_table_forbidden", { socketId: socket.id, userId, tableId });
        socket.emit("error", { code: "FORBIDDEN", message: "Table access denied" });
      }
    });

    const forwardTableEvent = async (eventName, payload = {}) => {
      const tableId = payload.tableId;
      const table = tableId && await getTableAccess(db, tableId, userId, "viewer");
      if (!table) {
        socket.emit("error", { code: "FORBIDDEN", message: "Table access denied" });
        return;
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
      const result = await db.query("SELECT table_id FROM rows WHERE id=$1", [taskId]);
      const tableId = result.rows[0]?.table_id;
      const table = tableId && await getTableAccess(db, tableId, userId, "viewer");
      if (!table) {
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

    socket.on("register_user", (requestedUserId) => {
      try {
        const authenticatedUserId = assertSocketIdentity(socket, requestedUserId);
        const sockets = userSockets.get(authenticatedUserId) || new Set();
        if (sockets.size > 0) socket.emit("duplicate_session_check");
        sockets.add(socket.id);
        userSockets.set(authenticatedUserId, sockets);
        socket.join(`user_${authenticatedUserId}`);
        if (pendingOffers.has(authenticatedUserId)) {
          socket.emit("call_offer", pendingOffers.get(authenticatedUserId));
        }
      } catch {
        socket.emit("error", { code: "IDENTITY_MISMATCH", message: "Socket identity mismatch" });
      }
    });

    socket.on("call_offer", async (rawPayload = {}) => {
      try {
        const payload = authenticatedCallPayload(socket, rawPayload);
        if (!payload.targetId) return;
        socket.to(`user_${payload.targetId}`).emit("call_offer", payload);
        pendingOffers.set(String(payload.targetId), payload);
        setTimeout(() => {
          if (pendingOffers.get(String(payload.targetId)) === payload) pendingOffers.delete(String(payload.targetId));
        }, 60000);
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
      socket.on(eventName, (payload = {}) => {
        if (!payload.targetId) return;
        pendingOffers.delete(String(payload.targetId));
        socket.to(`user_${payload.targetId}`).emit(eventName, { ...payload, senderId: userId });
      });
    }

    socket.on("confirm_takeover", (requestedUserId) => {
      try {
        const authenticatedUserId = assertSocketIdentity(socket, requestedUserId);
        const sockets = userSockets.get(authenticatedUserId);
        if (!sockets) return;
        for (const socketId of sockets) {
          if (socketId !== socket.id) io.to(socketId).emit("force_logout");
        }
        userSockets.set(authenticatedUserId, new Set([socket.id]));
      } catch {
        socket.emit("error", { code: "IDENTITY_MISMATCH", message: "Socket identity mismatch" });
      }
    });

    socket.on("disconnect", () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(userId);
      }
      logger.info("socket_disconnected", { socketId: socket.id, userId });
    });
  });

  return { pendingOffers, userSockets };
}

module.exports = { attachSocketServer };
