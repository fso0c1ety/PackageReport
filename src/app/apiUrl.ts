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
