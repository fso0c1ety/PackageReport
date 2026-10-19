// Lifetime is exactly one handler invocation; never share across requests/users.
function requestReadPool(pool) {
  const pending = new Map();
  return {
    query(text, values = []) {
      if (typeof text !== 'string' || !/^\s*SELECT\b/i.test(text)) {
        pending.clear();
        return pool.query(text, values);
      }
      const key = JSON.stringify([text, values]);
      if (pending.has(key)) return pending.get(key);
      const promise = Promise.resolve().then(() => pool.query(text, values));
      if (pending.size < 256) pending.set(key, promise);
      void promise.catch(() => { if (pending.get(key) === promise) pending.delete(key); });
      return promise;
    },
  };
}
module.exports = { requestReadPool };
