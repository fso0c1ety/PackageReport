// Utility to get API URL (adjust as needed for your environment)
export const DEFAULT_SERVER_URL = "https://packagereport.onrender.com";

export function getServerUrl() {
  if (typeof window !== 'undefined') {
    // Check local storage for overrides
    const stored = localStorage.getItem('server_url');
    if (stored) return stored;
  }
  return DEFAULT_SERVER_URL;
}

export function getApiUrl(path: string) {
  // Use Express backend (LAN IP for mobile/desktop)
  const base = getServerUrl();
  // console.log('[API] Using server URL:', base); // Debugging log

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
