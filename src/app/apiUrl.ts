// Frontend lives on Vercel while the API/files can be served elsewhere.
export const DEFAULT_FRONTEND_URL =
  process.env.NEXT_PUBLIC_FRONTEND_URL || "https://package-report.vercel.app";

export const DEFAULT_SERVER_URL =
  process.env.NEXT_PUBLIC_API_URL || "";

export const DEFAULT_ASSET_URL =
  process.env.NEXT_PUBLIC_ASSET_URL || DEFAULT_SERVER_URL;

export function getServerUrl() {
  return DEFAULT_SERVER_URL;
}

export function getFrontendUrl() {
  return DEFAULT_FRONTEND_URL;
}

function isNativeRuntime() {
  if (typeof window === 'undefined') return false;
  const maybeCapacitor = (window as any)?.Capacitor;
  return Boolean(maybeCapacitor?.isNativePlatform?.());
}

export function getApiUrl(path: string) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // In web browser deployments (including Vercel preview), use same-origin API routes
  // to avoid CORS issues between preview and production domains.
  if (typeof window !== 'undefined' && !isNativeRuntime()) {
    return `/api${cleanPath}`;
  }

  // Use Express backend (LAN IP for mobile/desktop)
  const base = getServerUrl().trim();

  // Ensure no double slash issues
  let cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;

  if (!cleanBase) {
    return `/api${cleanPath}`;
  }

  if (!cleanBase.startsWith('http://') && !cleanBase.startsWith('https://')) {
    cleanBase = `https://${cleanBase}`;
  }

  // Clean up if the base already includes /api, but prevent duplication logic
  if (cleanBase.endsWith('/api')) {
    cleanBase = cleanBase.slice(0, -4);
  }

// Combine
  return `${cleanBase}/api${cleanPath}`;
}

export function getAssetUrl(asset: string | null | undefined) {
  if (!asset) return '';
  const raw = String(asset).trim();
  if (!raw) return '';

  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('data:') ||
    raw.startsWith('blob:')
  ) {
    return raw;
  }

  let normalized = raw;
  if (!normalized.startsWith('/')) {
    // Legacy rows may store only a filename; uploaded files are served from /uploads.
    normalized = normalized.startsWith('uploads/') ? `/${normalized}` : `/uploads/${normalized}`;
  }

  let base = DEFAULT_ASSET_URL.trim();
  if (base && !base.startsWith('http://') && !base.startsWith('https://')) {
    base = `https://${base}`;
  }

  // Web should still use external asset host when configured (legacy /uploads are not on Vercel).
  if (typeof window !== 'undefined' && !isNativeRuntime()) {
    if (!base) return normalized;
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    return `${cleanBase}${normalized}`;
  }

  if (!base) return normalized;
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${cleanBase}${normalized}`;
}

/**
 * Resolves an avatar URL consistently across the application.
 * Handles: null/undefined, absolute URLs, Base64 data URLs, and relative local paths.
 */
export function getAvatarUrl(avatar: string | null | undefined, name: string = "User") {
  if (!avatar) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&bold=true`;
  }
  return getAssetUrl(avatar);
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

  return response;
}
