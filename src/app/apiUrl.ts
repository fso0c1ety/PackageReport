// Utility to get API URL (adjust as needed for your environment)
export function getApiUrl(path: string) {
  // Use Express backend
  return `http://localhost:4000/api${path.startsWith("/") ? path : `/${path}`}`;
}
