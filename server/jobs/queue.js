const logger = require("../utils/logger");

class MemoryQueue {
  constructor(name) {
    this.name = name;
    this.handlers = new Map();
    this.pending = [];
    this.running = false;
  }

  process(type, handler) {
    this.handlers.set(type, handler);
  }

  async add(type, payload = {}, options = {}) {
    const job = {
      id: options.idempotencyKey || `${type}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      type,
      payload,
      attempts: 0,
      maxAttempts: options.attempts || 3,
    };
    this.pending.push(job);
    this.drain();
    return job;
  }

  async drain() {
    if (this.running) return;
    this.running = true;
    while (this.pending.length > 0) {
      const job = this.pending.shift();
      const handler = this.handlers.get(job.type);
      if (!handler) {
        logger.warn("job_missing_handler", { queue: this.name, jobId: job.id, type: job.type });
        continue;
      }

      try {
        job.attempts += 1;
        await handler(job.payload, job);
        logger.info("job_completed", { queue: this.name, jobId: job.id, type: job.type });
      } catch (err) {
        logger.error("job_failed", {
          queue: this.name,
          jobId: job.id,
          type: job.type,
          attempts: job.attempts,
          error: err.message,
        });
        if (job.attempts < job.maxAttempts) {
          this.pending.push(job);
        }
      }
    }
    this.running = false;
  }
}

function createQueue(name) {
  if (process.env.REDIS_URL) {
    logger.warn("redis_queue_not_installed_using_memory_fallback", { queue: name });
  }
  return new MemoryQueue(name);
}

module.exports = { createQueue, MemoryQueue };
