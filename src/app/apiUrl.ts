// Utility to get API URL (adjust as needed for your environment)
export function getApiUrl(path: string) {
  // Use Express backend
  return `http://192.168.1.206:4000/api${path.startsWith("/") ? path : `/${path}`}`;
}
