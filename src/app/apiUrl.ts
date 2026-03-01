// Utility to get API URL (adjust as needed for your environment)
// Default fallback
const IS_PROD = process.env.NODE_ENV === 'production';
export const DEFAULT_SERVER_URL = IS_PROD
  ? "https://packagereport.onrender.com"
  : (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
      ? `http://${window.location.hostname}:4000` 
      : "http://192.168.0.25:4000"); // Use local IP for Android emulator/device testing

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

  const headers = { ...((options.headers as any) || {}) } as any;

  // Set default Content-Type to application/json if not provided and body is not FormData
  if (!headers['Content-Type'] && 
      !(typeof FormData !== 'undefined' && options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
      return new Promise(() => { }) as unknown as Response;
    }
    throw new Error("Unauthorized");
  }

  if (response.status === 403) {
    return response; // Return forbidden response to let caller handle it
  }

  return response;
}
