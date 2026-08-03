const express = require("express");

function createSystemRouter({ buildCommit, buildDate, db, metrics }) {
  const router = express.Router();
  router.get("/version", (_req, res) => res.json({
    commit: buildCommit,
    date: buildDate,
    environment: process.env.NODE_ENV || "development",
  }));
  router.get("/health", (_req, res) => res.json({ status: "ok", version: buildCommit, uptimeSeconds: Math.floor(process.uptime()) }));
  router.get("/ready", async (_req, res) => {
    try { await db.query("SELECT 1"); return res.json({ status: "ready", database: "ok" }); }
    catch { return res.status(503).json({ status: "not_ready", database: "unavailable" }); }
  });
  router.get("/metrics", (_req, res) => res.json(metrics.snapshot()));
  return router;
}

module.exports = { createSystemRouter };
