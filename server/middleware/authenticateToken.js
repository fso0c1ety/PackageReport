const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/env');

const SECRET_KEY = getJwtSecret();

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden', message: 'Token is invalid or expired' });
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
