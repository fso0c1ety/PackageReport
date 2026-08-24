export {};

declare global {
  interface Window {
    smartManageRuntime?: { platform: string; isElectron: boolean };
    smartManageWindow?: {
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
      getState: () => Promise<{ isMaximized: boolean }>;
      onState: (callback: (state: { isMaximized: boolean }) => void) => () => void;
    };
    smartManageUpdater?: {
      check: () => Promise<void>;
      download: () => Promise<void>;
      install: () => Promise<void>;
      getState: () => Promise<{ state: string; version?: string; percent?: number }>;
      onState: (callback: (state: Record<string, unknown>) => void) => () => void;
      version: string;
    };
  }
}
