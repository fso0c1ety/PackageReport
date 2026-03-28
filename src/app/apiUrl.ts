// Frontend lives on Vercel while the API/files can be served elsewhere.
export const DEFAULT_FRONTEND_URL =
  process.env.NEXT_PUBLIC_FRONTEND_URL || "https://package-report.vercel.app";

export const DEFAULT_SERVER_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://packagereport.onrender.com";

export const DEFAULT_ASSET_URL =
  process.env.NEXT_PUBLIC_ASSET_URL || DEFAULT_SERVER_URL;

export function getServerUrl() {
  return DEFAULT_SERVER_URL;
}

export function getFrontendUrl() {
  return DEFAULT_FRONTEND_URL;
}

export function getApiUrl(path: string) {
  // Use Express backend (LAN IP for mobile/desktop)
  const base = getServerUrl();

  // Ensure no double slash issues
  let cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Clean up if the base already includes /api, but prevent duplication logic
  if (cleanBase.endsWith('/api')) {
    cleanBase = cleanBase.slice(0, -4);
  }

// Combine
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

  // Handle relative local paths (e.g., /uploads/...)
  // We use the base server URL, NOT the /api prefix
  const base = DEFAULT_ASSET_URL;
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
  
  return `${cleanBase}${cleanPath}`;
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
