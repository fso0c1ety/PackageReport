const { Queue, Worker, QueueEvents } = require("bullmq");
const logger = require("../utils/logger");
const metrics = require("../observability/metrics");

const queues = new Map();
const safeJobId = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 160);
function redisConnection(redisUrl) {
  const parsed = new URL(redisUrl);
  return {
    host: parsed.hostname, port: Number(parsed.port || 6379), username: parsed.username || undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: Number(parsed.pathname.slice(1) || 0), tls: parsed.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

class MemoryQueue {
  constructor(name) { this.name = name; this.handlers = new Map(); this.jobs = new Map(); this.pending = []; this.running = false; }
  process(type, handler) { this.handlers.set(type, handler); }
  async add(type, payload = {}, options = {}) {
    const id = safeJobId(options.idempotencyKey || `${type}_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    if (this.jobs.has(id)) return this.jobs.get(id);
    const job = { id, name: type, type, payload, data: payload, attempts: 0, maxAttempts: options.attempts || 5, status: "waiting", error: null };
    this.jobs.set(id, job); this.pending.push(job); metrics.increment("jobs_enqueued_total", { queue: this.name, type }); queueMicrotask(() => this.drain()); return job;
  }
  async getJob(id) { return this.jobs.get(String(id)) || null; }
  async getStatus(id) { const job = await this.getJob(id); return job ? { id: job.id, name: job.name, status: job.status, attempts: job.attempts, error: job.error } : null; }
  async close() { this.pending.length = 0; }
  async drain() {
    if (this.running) return; this.running = true;
    while (this.pending.length) {
      const job = this.pending.shift(); const handler = this.handlers.get(job.type);
      if (!handler) { job.status = "failed"; job.error = "Missing handler"; continue; }
      try { job.status = "active"; job.attempts += 1; await handler(job.payload, job); job.status = "completed"; metrics.increment("jobs_completed_total", { queue: this.name, type: job.type }); }
      catch (error) {
        job.error = error.message;
        if (job.attempts < job.maxAttempts) { job.status = "waiting"; this.pending.push(job); }
        else { job.status = "dead-letter"; logger.error("job_dead_lettered", { queue: this.name, jobId: job.id, error: error.message }); }
      }
    }
    this.running = false;
  }
}

class RedisQueue {
  constructor(name, redisUrl) {
    this.name = name; this.handlers = new Map();
    this.connection = redisConnection(redisUrl);
    this.queue = new Queue(name, { connection: this.connection });
    this.deadLetter = new Queue(`${name}-dead-letter`, { connection: this.connection });
    this.events = new QueueEvents(name, { connection: this.connection });
    this.worker = null;
  }
  process(type, handler) { this.handlers.set(type, handler); this.ensureWorker(); }
  ensureWorker() {
    if (this.worker) return;
    this.worker = new Worker(this.name, async (job) => {
      const handler = this.handlers.get(job.name);
      if (!handler) throw new Error(`No handler registered for ${job.name}`);
      return handler(job.data, job);
    }, { connection: this.connection, concurrency: Number(process.env.JOB_WORKER_CONCURRENCY || 8) });
    this.worker.on("failed", async (job, error) => {
      logger.error("job_failed", { queue: this.name, jobId: job?.id, type: job?.name, attempts: job?.attemptsMade, error: error.message });
      if (job && job.attemptsMade >= Number(job.opts.attempts || 1)) {
        await this.deadLetter.add(job.name, { ...job.data, failedJobId: job.id, failedReason: error.message }, { jobId: safeJobId(`dlq_${job.id}`) });
      }
    });
  }
  async add(type, payload = {}, options = {}) {
    metrics.increment("jobs_enqueued_total", { queue: this.name, type });
    return this.queue.add(type, payload, {
      jobId: safeJobId(options.idempotencyKey || `${type}_${Date.now()}_${Math.random().toString(36).slice(2)}`),
      attempts: options.attempts || 5,
      backoff: options.backoff || { type: "exponential", delay: 1000 },
      removeOnComplete: { age: 86400, count: 5000 }, removeOnFail: false,
    });
  }
  async getJob(id) { return this.queue.getJob(String(id)); }
  async getStatus(id) {
    const job = await this.getJob(id); if (!job) return null;
    return { id: job.id, name: job.name, status: await job.getState(), attempts: job.attemptsMade, progress: job.progress, error: job.failedReason || null };
  }
  async close() { await Promise.allSettled([this.worker?.close(), this.events.close(), this.queue.close(), this.deadLetter.close()]); }
}

function createQueue(name) {
  if (queues.has(name)) return queues.get(name);
  const queue = process.env.REDIS_URL ? new RedisQueue(name, process.env.REDIS_URL) : new MemoryQueue(name);
  queues.set(name, queue); return queue;
}

function getQueue(name) { return queues.get(name) || createQueue(name); }
async function closeQueues() { await Promise.allSettled([...queues.values()].map((queue) => queue.close())); }

module.exports = { closeQueues, createQueue, getQueue, MemoryQueue, RedisQueue, redisConnection, safeJobId };
