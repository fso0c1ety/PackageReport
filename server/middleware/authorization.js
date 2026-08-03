const db = require("../db");
const { getFileAccess, getRowAccess, getTableAccess, getWorkspaceAccess } = require("../services/permissions");

function deny(res, resource) {
  return res.status(404).json({ error: `${resource} not found or forbidden` });
}

function requireWorkspacePermission(required = "viewer") {
  return async (req, res, next) => {
    if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });
    const id = req.params.workspaceId || req.body?.workspaceId || req.query?.workspaceId;
    if (!id) return res.status(400).json({ error: "Missing workspaceId" });
    try {
      req.workspace = await getWorkspaceAccess(db, id, req.user.id, required);
      return req.workspace ? next() : deny(res, "Workspace");
    } catch (error) { return next(error); }
  };
}

function requireTablePermission(required = "viewer") {
  return async (req, res, next) => {
    if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });
    const id = req.params.tableId || req.body?.tableId;
    if (!id) return res.status(400).json({ error: "Missing tableId" });
    try {
      req.table = await getTableAccess(db, id, req.user.id, required);
      return req.table ? next() : deny(res, "Table");
    } catch (error) { return next(error); }
  };
}

function requireRowPermission(required = "viewer") {
  return async (req, res, next) => {
    if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });
    const id = req.params.taskId || req.params.rowId || req.body?.id || req.body?.rowId;
    if (!id) return res.status(400).json({ error: "Missing rowId" });
    try {
      const access = await getRowAccess(db, id, req.user.id, required, req.params.tableId || req.body?.tableId || null);
      if (!access) return deny(res, "Row");
      req.row = access.row;
      req.table = access.table;
      return next();
    } catch (error) { return next(error); }
  };
}

function requireFilePermission(required = "viewer") {
  return async (req, res, next) => {
    if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });
    const id = req.params.filename || req.params.fileId || req.body?.fileId;
    if (!id) return res.status(400).json({ error: "Missing file identifier" });
    try {
      req.fileAccess = await getFileAccess(db, decodeURIComponent(id), req.user.id, required);
      return req.fileAccess ? next() : deny(res, "File");
    } catch (error) { return next(error); }
  };
}

module.exports = { requireFilePermission, requireRowPermission, requireTablePermission, requireWorkspacePermission };
