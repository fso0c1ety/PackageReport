const NATIVE_PRODUCTION_FALLBACK_URL = "https://package-report.vercel.app";

// Default to same-origin on web, but provide a safe hosted fallback for Capacitor builds.
export const DEFAULT_FRONTEND_URL =
  process.env.NEXT_PUBLIC_FRONTEND_URL || "";

function isNativeStaticRuntime() {
  if (typeof window === 'undefined') {
    return false;
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
  const localDevServer = normalizeBaseUrl(getLocalDevServerUrl());
  if (localDevServer) {
    return localDevServer;
  }

  // In native APK builds, `window.location.origin` is usually `http://localhost`,
  // which is only the embedded WebView and not the real backend.
  if (isNativeStaticRuntime()) {
    // Check if we are on a LAN IP through the WebView's location (less likely in static mode but possible)
    if (typeof window !== 'undefined' && isPrivateDevHost(window.location.hostname)) {
        return `${window.location.protocol}//${window.location.hostname}:4000`;
    }

    // Default to the computer's last known LAN IP if we're in dev mode or no frontend URL is provided
    const configuredFrontend = normalizeBaseUrl(DEFAULT_FRONTEND_URL);
    if (!configuredFrontend) {
        // Safe developmental fallback for common LAN testing setup
        return 'http://192.168.0.28:4000';
    }
    
    return configuredFrontend;
  }

  return getBrowserOrigin() || normalizeBaseUrl(DEFAULT_FRONTEND_URL) || NATIVE_PRODUCTION_FALLBACK_URL;
}

export function getFrontendUrl() {
  if (isNativeStaticRuntime()) {
    return normalizeBaseUrl(DEFAULT_FRONTEND_URL) || NATIVE_PRODUCTION_FALLBACK_URL;
  }

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
  } catch (err) {
    if (typeof window !== 'undefined') {
        console.error(`[Fetch Failed] ${url}`, err);
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
