// Utility to get API URL (adjust as needed for your environment)
// Default fallback
const IS_PROD = process.env.NODE_ENV === 'production';

// Determine default URL based on environment and hostname
let defaultUrl = "http://localhost:4000";
if (IS_PROD) {
    if (typeof window !== 'undefined') {
        // If on production domain, point to production backend
        if (window.location.hostname.includes('onrender.com')) {
            defaultUrl = "https://packagereport.onrender.com";
        } else {
            // Otherwise (e.g. localhost preview of production build), point to local backend
            defaultUrl = `http://${window.location.hostname}:4000`;
        }
    } else {
        // Server-side (SSG/SSR): Default to production URL
        defaultUrl = "https://packagereport.onrender.com";
    }
} else {
    // Development mode
    defaultUrl = (typeof window !== 'undefined'
      ? `http://${window.location.hostname}:4000`
      : "http://localhost:4000"); // Standard local dev
}

export const DEFAULT_SERVER_URL = defaultUrl;

export function getServerUrl() {
  if (typeof window !== 'undefined') {
    // If we are on localhost, prioritize localhost backend unless explicitly overridden
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
         return "http://localhost:4000";
    }
    
    // Otherwise check local storage or fall back to default
    const stored = localStorage.getItem('server_url');
    if (stored) return stored;
  }
  return DEFAULT_SERVER_URL;
}

export function getApiUrl(path: string) {
  // Use Express backend (LAN IP for mobile/desktop)
  const base = getServerUrl();
  console.log('[API] Using server URL:', base); // Debugging log

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
