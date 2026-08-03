const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/env');

const SECRET_KEY = getJwtSecret();

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const cookieToken = String(req.headers.cookie || '').split(';').map((part) => part.trim().split('='))
    .find(([name]) => name === 'smart_manage_access')?.[1];
  const token = (authHeader && authHeader.split(' ')[1]) || cookieToken;

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden', message: 'Token is invalid or expired' });
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
