import jwt from 'jsonwebtoken';

export function getAuthenticatedUser(req) {
  if (!process.env.SECRET_KEY && process.env.NODE_ENV === 'production') {
    console.warn('[Security] SECRET_KEY is not set — using insecure default. Set SECRET_KEY in your Vercel environment variables for production.');
  }
  const EFFECTIVE_SECRET = process.env.SECRET_KEY || 'your_secret_key_here';

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, EFFECTIVE_SECRET);
  } catch {
    return null;
  }
}
