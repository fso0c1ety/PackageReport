export {};

declare global {
  interface Window {
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
