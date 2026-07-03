const { getTableAccess } = require("../services/permissions");
const db = require("../db");

function requireTablePermission(required = "viewer") {
  return async function requireTablePermissionMiddleware(req, res, next) {
    const tableId = req.params.tableId || req.params.id || req.body?.tableId;
    if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });
    if (!tableId) return res.status(400).json({ error: "Missing tableId" });

    try {
      const table = await getTableAccess(db, tableId, req.user.id, required);
      if (!table) return res.status(404).json({ error: "Table not found or forbidden" });
      req.table = table;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = requireTablePermission;
