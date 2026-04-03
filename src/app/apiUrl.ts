// Default to same-origin so the app can run entirely behind the Vercel host.
export const DEFAULT_FRONTEND_URL =
  process.env.NEXT_PUBLIC_FRONTEND_URL || "";

export const DEFAULT_SERVER_URL =
  process.env.NEXT_PUBLIC_API_URL || "";

export const DEFAULT_ASSET_URL =
  process.env.NEXT_PUBLIC_ASSET_URL || "";

export const DEFAULT_SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "";

function normalizeBaseUrl(url: string) {
  const trimmed = url.trim();

  if (!trimmed) {
    return trimmed;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return withProtocol.endsWith('/') ? withProtocol.slice(0, -1) : withProtocol;
}

function getBrowserOrigin() {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

export function getServerUrl() {
  return getBrowserOrigin() || normalizeBaseUrl(DEFAULT_SERVER_URL) || normalizeBaseUrl(DEFAULT_FRONTEND_URL);
}

export function getFrontendUrl() {
  return getBrowserOrigin() || normalizeBaseUrl(DEFAULT_FRONTEND_URL);
}

export function getSocketUrl() {
  return normalizeBaseUrl(DEFAULT_SOCKET_URL);
}

export function getApiUrl(path: string) {
  const base = getServerUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (!base) {
    return `/api${cleanPath}`;
  }

  let cleanBase = normalizeBaseUrl(base);

  // Clean up if the base already includes /api, but prevent duplication logic
  if (cleanBase.endsWith('/api')) {
    cleanBase = cleanBase.slice(0, -4);
  }

  return `${cleanBase}/api${cleanPath}`;
}

/**
 * Resolves an avatar URL consistently across the application.
 * Handles: null/undefined, absolute URLs, Base64 data URLs, and relative local paths.
 */
export function getAvatarUrl(avatar: string | null | undefined, name: string = "User") {
  if (!avatar) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&bold=true`;
  }

  // Handle absolute URLs (http:// or https://)
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }

  // Handle Base64 data URLs (data:image/...)
  if (avatar.startsWith('data:')) {
    return avatar;
  }

  const base = getBrowserOrigin() || normalizeBaseUrl(DEFAULT_ASSET_URL) || getServerUrl();
  const normalizedPath = avatar.startsWith('/')
    ? avatar
    : avatar.startsWith('uploads/')
      ? `/${avatar}`
      : avatar.includes('/')
        ? `/${avatar}`
        : `/uploads/${avatar}`;

  if (!base) {
    return normalizedPath;
  }

  return `${base}${normalizedPath}`;
}

export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  // Use generic return type or specific if needed
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers = { ...((options.headers as any) || {}) } as any;

  // Set default Content-Type to application/json if not provided and body is not FormData
  if (!headers['Content-Type'] && 
      !(typeof FormData !== 'undefined' && options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // console.log(`[Fetch] ${url}`); // Debug

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    if (typeof window !== 'undefined') {
        console.error(`[Fetch Failed] ${url}`, err);
    }
    throw err;
  }

  if (response.status === 401 || response.status === 403) {
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token'); // Clear invalid token
      window.location.href = '/login';
      return new Promise(() => { }) as unknown as Response;
    }
    throw new Error(response.status === 401 ? "Unauthorized" : "Forbidden");
  }

  return response;
}
