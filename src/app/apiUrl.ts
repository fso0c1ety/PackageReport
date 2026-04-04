const NATIVE_PRODUCTION_FALLBACK_URL = "https://package-report.vercel.app";

// Default to same-origin on web, but provide a safe hosted fallback for Capacitor builds.
export const DEFAULT_FRONTEND_URL =
  process.env.NEXT_PUBLIC_FRONTEND_URL || "";

export function isElectronRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return /electron/i.test(navigator.userAgent);
}

export function isNativeStaticRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  if (isElectronRuntime()) {
    return true;
  }

  const capacitor = (window as typeof window & {
    Capacitor?: { isNativePlatform?: () => boolean };
  }).Capacitor;

  return capacitor?.isNativePlatform?.() === true;
}

export function getAppRoute(path: string) {
  const trimmed = path.trim();
  if (!trimmed) {
    return '/';
  }

  const match = trimmed.match(/^([^?#]*)(.*)$/);
  const rawPath = match?.[1] || trimmed;
  const suffix = match?.[2] || '';
  const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

  if (isNativeStaticRuntime() && normalizedPath !== '/' && !normalizedPath.endsWith('.html')) {
    return `${normalizedPath}.html${suffix}`;
  }

  return `${normalizedPath}${suffix}`;
}

export function redirectToAppRoute(path: string, replace = true) {
  if (typeof window === 'undefined') {
    return;
  }

  const target = getAppRoute(path);

  if (replace) {
    window.location.replace(target);
  } else {
    window.location.assign(target);
  }
}

export const DEFAULT_SERVER_URL =
  process.env.NEXT_PUBLIC_API_URL || "";

export const DEFAULT_ASSET_URL =
  process.env.NEXT_PUBLIC_ASSET_URL || "";

export const DEFAULT_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "";

export const DEFAULT_SUPABASE_STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "uploads";

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

function resolveSupabaseStorageUrl(path: string) {
  const supabaseBase = normalizeBaseUrl(DEFAULT_SUPABASE_URL);
  if (!supabaseBase) {
    return '';
  }

  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  if (!cleanPath.startsWith('uploads/')) {
    return '';
  }

  const objectPath = cleanPath.replace(/^uploads\//, '');
  if (!objectPath) {
    return '';
  }

  return `${supabaseBase}/storage/v1/object/public/${DEFAULT_SUPABASE_STORAGE_BUCKET}/${objectPath}`;
}

function isPrivateDevHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    return true;
  }

  // Match common private network ranges for LAN testing.
  if (/^192\.168\./.test(host) || /^10\./.test(host)) {
    return true;
  }

  const match172 = host.match(/^172\.(\d{1,3})\./);
  if (match172) {
    const secondOctet = Number(match172[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
}

function getLocalDevServerUrl() {
  if (typeof window === 'undefined') {
    return '';
  }

  const { protocol, hostname } = window.location;
  if (!isPrivateDevHost(hostname)) {
    return '';
  }

  return `${protocol}//${hostname}:4000`;
}

export function getServerUrl() {
  const configuredServer = normalizeBaseUrl(DEFAULT_SERVER_URL);
  if (configuredServer) {
    return configuredServer;
  }

  // Handle local development access from physical devices (LAN)
  // IMPORTANT: In native builds, 'localhost' is the app itself, not the backend.
  // So we ONLY treat a local host as a dev server if it's a real LAN IP (192.168.x.x, etc.)
  // OR if we are explicitly on localhost:3000 in a browser.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    const port = window.location.port;
    const isLanIp = /^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host);
    const isLocalWebDev = (host === 'localhost' || host === '127.0.0.1') && port === '3000';

    if (isLanIp || isLocalWebDev) {
      return `${window.location.protocol}//${host}:4000`;
    }
  }

  // Fall back to production Vercel for all other cases (including Native .exe/.apk and hosted Web)
  const configuredFrontend = normalizeBaseUrl(DEFAULT_FRONTEND_URL);
  const finalUrl = configuredFrontend || NATIVE_PRODUCTION_FALLBACK_URL;
  
  if (typeof window !== 'undefined' && isNativeStaticRuntime()) {
    console.log('[DEBUG] Native build detected. Using getServerUrl:', finalUrl);
  }
  
  return finalUrl;
}

export function getFrontendUrl() {
  const configuredFrontend = normalizeBaseUrl(DEFAULT_FRONTEND_URL);
  if (configuredFrontend) return configuredFrontend;

  if (isNativeStaticRuntime()) {
    return NATIVE_PRODUCTION_FALLBACK_URL;
  }

  return getBrowserOrigin() || NATIVE_PRODUCTION_FALLBACK_URL;
}

export function getSocketUrl() {
  return normalizeBaseUrl(DEFAULT_SOCKET_URL);
}

export function getApiUrl(path: string) {
  const base = getServerUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Ensure 'base' is an absolute URL. 
  // If getServerUrl somehow returns empty, use the production fallback to prevent 
  // the app from trying to hit relative routes on the user's device.
  let cleanBase = normalizeBaseUrl(base || NATIVE_PRODUCTION_FALLBACK_URL);

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

  const supabaseStorageUrl = resolveSupabaseStorageUrl(avatar);
  if (supabaseStorageUrl) {
    return supabaseStorageUrl;
  }

  const base =
    normalizeBaseUrl(DEFAULT_ASSET_URL) ||
    getServerUrl() ||
    getBrowserOrigin();
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
  } catch (err: any) {
    if (typeof window !== 'undefined') {
        const errorMsg = `[Fetch Failed] ${url}\nError: ${err?.message || 'Unknown error'}`;
        console.error(errorMsg, err);
        if (isNativeStaticRuntime()) {
          alert(errorMsg);
        }
    }
    throw err;
  }

  if (response.status === 401 || response.status === 403) {
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token'); // Clear invalid token
      redirectToAppRoute('/login');
      return new Promise(() => { }) as unknown as Response;
    }
    throw new Error(response.status === 401 ? "Unauthorized" : "Forbidden");
  }

  return response;
}
