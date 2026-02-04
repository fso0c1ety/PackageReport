// Utility to get API URL (adjust as needed for your environment)
export function getApiUrl(path: string) {
  // Use Express backend
  return `http://192.168.56.1:4000/api${path.startsWith("/") ? path : `/${path}`}`;
}
