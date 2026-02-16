// Utility to get API URL (adjust as needed for your environment)
export function getApiUrl(path: string) {
  // Use Express backend (LAN IP for mobile/desktop)
  return `http://192.168.0.28:4000/api${path.startsWith("/") ? path : `/${path}`}`;
}
