export type UpdateType = "OPTIONAL" | "RECOMMENDED" | "REQUIRED";
export type PlatformPolicy = {
  latestVersion: string;
  minimumVersion: string;
  updateType: UpdateType;
  releaseNotes: string[];
  storeUrl: string | null;
};
export const OFFICIAL_WINDOWS_DOWNLOAD: string;
export function compareSemver(left: string, right: string): -1 | 0 | 1 | null;
export function evaluateUpdate(installedVersion: string, policy: PlatformPolicy): { available: boolean; required: boolean; invalid: boolean; updateType?: UpdateType };
export function officialStoreUrl(platform: string, value?: string): string | null;
export function parseSemver(value: string): object | null;
export function sanitizeReleaseNotes(value: string | string[]): string[];
export function buildPlatformPolicy(platform: string, currentVersion: string, env?: Record<string, string | undefined>): PlatformPolicy;
export function shouldShowUpdate(input: { targetVersion: string; updateType: UpdateType; dismissedVersion?: string | null; dismissedAt?: number | null; now?: number; reminderMs?: number }): boolean;
