const express = require("express");

function createPushNotificationsRouter({ db, logger, sendPushNotification }) {
  const router = express.Router();

  router.put("/users/fcm", async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token is required" });
    try {
      await db.query("UPDATE public.users SET fcm_token = $1 WHERE id = $2", [token, req.user.id]);
      let updatedPluralTokens = false;
      try {
        await db.query(`
          UPDATE public.users SET fcm_tokens = CASE
            WHEN fcm_tokens IS NULL THEN jsonb_build_array($1::text)
            WHEN jsonb_typeof(fcm_tokens) <> 'array' THEN jsonb_build_array($1::text)
            WHEN NOT (fcm_tokens @> jsonb_build_array($1::text)) THEN fcm_tokens || jsonb_build_array($1::text)
            ELSE fcm_tokens END WHERE id = $2
        `, [token, req.user.id]);
        updatedPluralTokens = true;
      } catch (error) {
        logger.warn("fcm_plural_token_update_failed", { userId: req.user.id, error: error.message });
      }
      return res.json({ success: true, storedInArray: updatedPluralTokens });
    } catch (error) {
      logger.error("fcm_token_update_failed", { requestId: req.requestId, userId: req.user.id, error: error.message });
      return res.status(500).json({
        error: "Internal server error",
        message: error.message || null,
        stack: error.stack || null,
        full: JSON.stringify(error),
      });
    }
  });

  router.delete("/users/fcm", async (req, res) => {
    try {
      await db.query("UPDATE public.users SET fcm_token = NULL WHERE id = $1", [req.user.id]);
      try {
        await db.query("UPDATE public.users SET fcm_tokens = '[]'::jsonb WHERE id = $1", [req.user.id]);
      } catch (error) {
        logger.warn("fcm_plural_tokens_clear_failed", { userId: req.user.id, error: error.message });
      }
      return res.json({ success: true });
    } catch (error) {
      logger.error("fcm_tokens_clear_failed", { requestId: req.requestId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.post("/test-notification", async (req, res) => {
    try {
      const result = await db.query("SELECT fcm_token, fcm_tokens FROM users WHERE id = $1", [req.user.id]);
      if (!result.rows[0]) return res.status(400).json({ error: "User not found" });
      const tokens = new Set();
      if (result.rows[0].fcm_token) tokens.add(result.rows[0].fcm_token);
      if (Array.isArray(result.rows[0].fcm_tokens)) {
        result.rows[0].fcm_tokens.forEach((token) => { if (token) tokens.add(token); });
      }
      const tokenList = [...tokens];
      if (tokenList.length === 0) return res.status(400).json({ error: "No FCM tokens found for user" });
      await sendPushNotification(tokenList, "Test Notification", "This is a test from SmartManage!");
      return res.json({ success: true, message: "Notification sent" });
    } catch (error) {
      logger.error("test_notification_failed", { requestId: req.requestId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = { createPushNotificationsRouter };
