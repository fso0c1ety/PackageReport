const crypto = require("crypto");
const { getJwtSecret } = require("../config/env");

const SCHEDULER_PURPOSE = "smart-manage:scheduled-automations:v1";

function schedulerToken(secret = getJwtSecret()) {
  return crypto.createHmac("sha256", secret).update(SCHEDULER_PURPOSE).digest("hex");
}

function schedulerUrl(env = process.env) {
  const base = env.APP_URL || env.NEXT_PUBLIC_FRONTEND_URL || "https://package-report.vercel.app";
  return `${String(base).replace(/\/$/, "")}/api/automation/due`;
}

async function triggerScheduledAutomations({ fetchImpl = globalThis.fetch, env = process.env } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("Scheduled automation runner requires Fetch API");
  const response = await fetchImpl(schedulerUrl(env), {
    method: "GET",
    headers: { authorization: `Bearer ${schedulerToken()}` },
    signal: AbortSignal.timeout(55_000),
  });
  if (!response.ok) throw new Error(`Scheduled automation endpoint returned ${response.status}`);
  return response.json();
}

function startScheduledAutomationJob(dependencies = {}, intervalMs = 60_000) {
  const logger = dependencies.logger || console;
  let inFlight = false;
  const run = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      const result = await triggerScheduledAutomations(dependencies);
      logger.info?.("scheduled_automations_processed", {
        checked: Number(result?.checked) || 0,
        triggered: Array.isArray(result?.triggered) ? result.triggered.length : 0,
        calendarReminders: Number(result?.calendarReminders) || 0,
      });
    } catch (error) {
      logger.error?.("scheduled_automations_failed", { error: error?.message || String(error) });
    } finally {
      inFlight = false;
    }
  };
  void run();
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}

module.exports = { schedulerToken, schedulerUrl, triggerScheduledAutomations, startScheduledAutomationJob };
