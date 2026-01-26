export function nowString() {
  try {
    const d = new Date();
    // Use locale string for simplicity; adjust as needed
    return d.toLocaleString();
  } catch (e) {
    return String(Date.now());
  }
}
