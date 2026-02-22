// Utility to get API URL (adjust as needed for your environment)
export const SERVER_URL = "http://192.168.0.28:4000";

export function getApiUrl(path: string) {
  // Use Express backend (LAN IP for mobile/desktop)
  return `${SERVER_URL}/api${path.startsWith("/") ? path : `/${path}`}`;
}
