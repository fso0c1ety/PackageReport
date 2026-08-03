const express = require("express");

function createSystemRouter({ buildCommit, buildDate }) {
  const router = express.Router();
  router.get("/version", (_req, res) => res.json({
    commit: buildCommit,
    date: buildDate,
    environment: process.env.NODE_ENV || "development",
  }));
  return router;
}

module.exports = { createSystemRouter };
