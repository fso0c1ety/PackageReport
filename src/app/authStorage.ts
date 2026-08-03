import { Capacitor } from "@capacitor/core";
import { SecureStorage } from "@aparajita/capacitor-secure-storage";

const REFRESH_TOKEN_KEY = "smart_manage_refresh_token";

declare global {
  interface Window {
    smartManageSecureStorage?: {
      getRefreshToken: () => Promise<string | null>;
      setRefreshToken: (value: string) => Promise<boolean>;
      clearRefreshToken: () => Promise<boolean>;
    };
  }
}

function electronStorage() {
  return typeof window !== "undefined" ? window.smartManageSecureStorage : undefined;
}

export async function getNativeRefreshToken(): Promise<string | null> {
  const electron = electronStorage();
  if (electron) return electron.getRefreshToken();
  if (Capacitor.isNativePlatform()) {
    const value = await SecureStorage.get(REFRESH_TOKEN_KEY);
    return typeof value === "string" ? value : null;
  }
  return null;
}

export async function setNativeRefreshToken(value: string | null | undefined) {
  if (!value) return clearNativeRefreshToken();
  const electron = electronStorage();
  if (electron) { await electron.setRefreshToken(value); return; }
  if (Capacitor.isNativePlatform()) await SecureStorage.set(REFRESH_TOKEN_KEY, value);
}

export async function clearNativeRefreshToken() {
  const electron = electronStorage();
  if (electron) { await electron.clearRefreshToken(); return; }
  if (Capacitor.isNativePlatform()) await SecureStorage.remove(REFRESH_TOKEN_KEY);
}
