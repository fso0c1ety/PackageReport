import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('SECRET_KEY environment variable is required in production');
}

const EFFECTIVE_SECRET = SECRET_KEY || 'your_secret_key_here';

export function getAuthenticatedUser(req) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, EFFECTIVE_SECRET);
  } catch {
    return null;
  }
}
