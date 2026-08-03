function socketUserId(socket) {
  const userId = socket?.data?.user?.id;
  return userId ? String(userId) : null;
}

function assertSocketIdentity(socket, requestedUserId) {
  const authenticatedUserId = socketUserId(socket);
  if (!authenticatedUserId) {
    throw new Error("Unauthenticated socket identity");
  }
  if (requestedUserId && String(requestedUserId) !== authenticatedUserId) {
    throw new Error("Socket identity mismatch");
  }
  return authenticatedUserId;
}

function authenticatedCallPayload(socket, payload = {}) {
  return {
    ...payload,
    callerId: assertSocketIdentity(socket, payload.callerId),
  };
}

module.exports = {
  assertSocketIdentity,
  authenticatedCallPayload,
  socketUserId,
};
