// Schema metadata only: never cache users, memberships or authorization.
const byPool = new WeakMap();
async function getAutomationIdType(pool) {
  const cached = byPool.get(pool);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;
  const entry = { expiresAt: Date.now() + 60_000 };
  entry.promise = pool.query("SELECT data_type FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='automations' AND column_name='id' LIMIT 1")
    .then(({ rows }) => {
      if (!rows[0]?.data_type) throw new Error('Automation schema unavailable; run controlled migrations');
      return rows[0].data_type;
    }).catch(error => { if (byPool.get(pool) === entry) byPool.delete(pool); throw error; });
  byPool.set(pool, entry);
  return entry.promise;
}
module.exports = { getAutomationIdType };
