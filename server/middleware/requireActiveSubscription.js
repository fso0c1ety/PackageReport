const db = require("../db");
const billing = require("../services/billingService");

module.exports = async function requireActiveSubscription(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  try {
    let ownerId = req.user.id;
    const tableMatch = req.path.match(/^\/tables\/([^/]+)/);
    const workspaceMatch = req.path.match(/^\/workspaces\/([^/]+)/);

    if (tableMatch && !["join", "import-excel"].includes(tableMatch[1])) {
      const result = await db.query(
        "SELECT w.owner_id FROM tables t JOIN workspaces w ON w.id=t.workspace_id WHERE t.id=$1",
        [tableMatch[1]]
      );
      if (result.rows[0]?.owner_id) ownerId = result.rows[0].owner_id;
    } else if (workspaceMatch) {
      const result = await db.query("SELECT owner_id FROM workspaces WHERE id=$1", [workspaceMatch[1]]);
      if (result.rows[0]?.owner_id) ownerId = result.rows[0].owner_id;
    } else if (req.body?.workspaceId || req.body?.workspace_id) {
      const result = await db.query("SELECT owner_id FROM workspaces WHERE id=$1", [req.body.workspaceId || req.body.workspace_id]);
      if (result.rows[0]?.owner_id) ownerId = result.rows[0].owner_id;
    }

    const status = await billing.getStatus(ownerId);
    if (!status.writable) {
      return res.status(402).json({
        error: "Subscription required",
        code: "SUBSCRIPTION_EXPIRED",
        billing: status,
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: "Unable to verify subscription" });
  }
};
