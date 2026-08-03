const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const TOKEN_TTL_HOURS = 24;

function hashAccountToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function createRawAccountToken() {
  return crypto.randomBytes(32).toString('base64url');
}

async function replaceAccountToken(db, { table, userId, pendingProfile = null }) {
  if (!['email_verification_tokens', 'account_activation_tokens'].includes(table)) {
    throw new Error('Unsupported account token table');
  }
  const rawToken = createRawAccountToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
  await db.query(`DELETE FROM ${table} WHERE user_id=$1 OR expires_at<NOW()`, [userId]);
  if (table === 'account_activation_tokens') {
    await db.query(
      `INSERT INTO account_activation_tokens (id,user_id,token_hash,pending_profile,expires_at)
       VALUES ($1,$2,$3,$4::jsonb,$5)`,
      [uuidv4(), userId, hashAccountToken(rawToken), JSON.stringify(pendingProfile || {}), expiresAt]
    );
  } else {
    await db.query(
      `INSERT INTO email_verification_tokens (id,user_id,token_hash,expires_at)
       VALUES ($1,$2,$3,$4)`,
      [uuidv4(), userId, hashAccountToken(rawToken), expiresAt]
    );
  }
  return { rawToken, expiresAt };
}

async function consumeAccountToken(client, { table, rawToken }) {
  if (!['email_verification_tokens', 'account_activation_tokens'].includes(table)) {
    throw new Error('Unsupported account token table');
  }
  const result = await client.query(
    `SELECT * FROM ${table}
     WHERE token_hash=$1 AND used_at IS NULL AND expires_at>NOW()
     FOR UPDATE`,
    [hashAccountToken(rawToken)]
  );
  return result.rows[0] || null;
}

module.exports = {
  TOKEN_TTL_HOURS,
  consumeAccountToken,
  hashAccountToken,
  replaceAccountToken,
};
