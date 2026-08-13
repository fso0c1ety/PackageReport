const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function parseTrustedUrl(value) {
  if (!value) return null;
  const url = new URL(String(value).trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('PUBLIC_APP_URL must be an absolute HTTP(S) URL without credentials');
  }
  url.pathname = url.pathname.replace(/\/$/, '');
  url.search = '';
  url.hash = '';
  return url;
}

function resolvePublicAppUrl({ env = process.env, requestUrl } = {}) {
  const configured = env.PUBLIC_APP_URL || env.NEXT_PUBLIC_FRONTEND_URL || env.NEXT_PUBLIC_APP_URL || env.APP_URL;
  const production = env.NODE_ENV === 'production';
  const url = parseTrustedUrl(configured);

  if (production) {
    if (!url) throw new Error('A trusted production public app URL is required');
    if (url.protocol !== 'https:' || LOCAL_HOSTS.has(url.hostname.toLowerCase())) {
      throw new Error('Production public app URL must use HTTPS and cannot be localhost');
    }
    return url.origin + (url.pathname === '/' ? '' : url.pathname);
  }

  const developmentUrl = url || parseTrustedUrl(requestUrl ? new URL(requestUrl).origin : 'http://localhost:3000');
  return developmentUrl.origin + (developmentUrl.pathname === '/' ? '' : developmentUrl.pathname);
}

module.exports = { resolvePublicAppUrl };
