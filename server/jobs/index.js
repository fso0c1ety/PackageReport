const { createQueue } = require("./queue");
const logger = require("../utils/logger");
const automationEngine = require("../services/automationEngine");
const billingService = require("../services/billingService");

const appQueue = createQueue("smart-manage");

appQueue.process("notification.send", async (payload) => {
  logger.info("notification_job_placeholder", { recipientId: payload.recipientId, type: payload.type });
});

appQueue.process("automation.run", async (payload) => {
  await automationEngine.runForRowChange(payload);
});

appQueue.process("billing.lifecycle", async () => {
  const purgedTables = await billingService.processTrialLifecycle();
  logger.info("billing_lifecycle_completed", { purgedTables });
});

appQueue.add("billing.lifecycle", {}, { idempotencyKey: `billing-lifecycle:${new Date().toISOString().slice(0, 13)}` });
const billingTimer = setInterval(() => {
  appQueue.add("billing.lifecycle", {}, { idempotencyKey: `billing-lifecycle:${new Date().toISOString().slice(0, 13)}` });
}, 60 * 60 * 1000);
billingTimer.unref?.();

module.exports = { appQueue };
