const express = require("express");

function createNexusRouter({ fetch, logger }) {
  const router = express.Router();
  router.post("/nexus/chat", async (req, res) => {
    const { messages = [], systemPrompt, input } = req.body || {};
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "AI Service configuration missing" });
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o",
          messages: [{ role: "system", content: systemPrompt }, ...messages, { role: "user", content: input }],
          response_format: { type: "json_object" },
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const error = new Error(data.error?.message || "OpenAI Request Failed");
        throw error;
      }
      return res.json(await response.json());
    } catch (error) {
      logger.error("nexus_chat_failed", { requestId: req.requestId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: error.message });
    }
  });
  return router;
}

module.exports = { createNexusRouter };
