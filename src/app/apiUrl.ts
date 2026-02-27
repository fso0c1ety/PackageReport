// Utility to get API URL (adjust as needed for your environment)
// Default fallback
export const DEFAULT_SERVER_URL = "http://192.168.0.28:4000";

export function getServerUrl() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('server_url') || DEFAULT_SERVER_URL;
  }
  return DEFAULT_SERVER_URL;
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

export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  // Use generic return type or specific if needed
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers as any || {}),
  } as any;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
      // Return a promise that never resolves so we don't proceed with parsing the response
      return new Promise(() => { }) as unknown as Response;
    }
    throw new Error(response.status === 401 ? "Unauthorized" : "Forbidden");
  }

  return response;
}
