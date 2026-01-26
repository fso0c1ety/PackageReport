import Constants from 'expo-constants';

let BASE_URL = 'http://192.168.0.25:4000';
try {
  const manifest = Constants.manifest || Constants.expoConfig || {};
  let host = null;
  if (manifest.hostUri) {
    host = manifest.hostUri.split(':')[0];
  } else if (manifest.debuggerHost) {
    host = manifest.debuggerHost.split(':')[0];
  }
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    BASE_URL = `http://${host}:4000`;
  }
} catch (e) {}

async function jsonFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  // Handle empty response (e.g. after DELETE)
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    return {};
  }
}

export async function fetchReports() {
  return jsonFetch('/reports');
}

export async function createReport(payload) {
  return jsonFetch('/reports', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateReport(id, payload) {
  return jsonFetch(`/reports/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteReport(id) {
  return jsonFetch(`/reports/${id}`, { method: 'DELETE' });
}
