import type { PortalConfig } from "./types";

export type PortalReadinessStatus = "READY" | "PARTIAL" | "SHELL" | "DISABLED";

export type PortalReadiness = {
  portalType: string;
  status: PortalReadinessStatus;
  label: string;
  safeRoute: string;
  reason: string;
  configId?: string;
};

const READY: PortalReadiness[] = [
  { portalType: "teacher", status: "READY", label: "Teacher Portal", safeRoute: "/home", reason: "API, scopes, writes and acceptance coverage exist" },
  { portalType: "parent", status: "READY", label: "Parent Portal", safeRoute: "/home", reason: "API, relationship scopes and acceptance coverage exist" },
  { portalType: "doctor", status: "READY", label: "Doctor Portal", safeRoute: "/home", reason: "API, clinical scopes and acceptance coverage exist" },
  { portalType: "patient", status: "READY", label: "Patient Portal", safeRoute: "/home", reason: "API, patient scopes and acceptance coverage exist" },
  { portalType: "client", status: "READY", label: "Client Portal", safeRoute: "/home", reason: "API, company scopes and acceptance coverage exist" },
  { portalType: "driver", status: "PARTIAL", label: "Driver Portal", safeRoute: "/home", reason: "Functional coverage exists; Windows Electron fix is pending PR #114 verification" },
];

const SHELL_PORTALS = [
  "dispatcher", "fleet_manager", "dental_assistant", "receptionist", "sales", "project", "site_manager",
  "field_worker", "store_employee", "warehouse", "production", "hr_employee", "depot", "mechanic", "quality", "inventory",
  "custom",
];

const manifest = new Map<string, PortalReadiness>([
  ...READY.map((entry) => [entry.portalType, entry] as const),
  ...SHELL_PORTALS.map((portalType) => [portalType, {
    portalType, status: "SHELL", label: `${portalType.replaceAll("_", " ")} Portal`, safeRoute: "/home",
    reason: "Portal configuration, API and acceptance coverage are not complete",
  }] as const),
  ["standard", { portalType: "standard", status: "READY", label: "Workspace", safeRoute: "/home", reason: "Standard workspace navigation" }],
]);

export function getPortalReadiness(portalType: string | null | undefined, config?: PortalConfig | null): PortalReadiness {
  const normalized = String(portalType || "standard").toLowerCase().replaceAll("-", "_");
  const entry = manifest.get(normalized) || {
    portalType: normalized, status: "DISABLED" as const, label: "Portal", safeRoute: "/home", reason: "Portal type is not registered",
  };
  return { ...entry, ...(config ? { configId: config.id } : {}) };
}

export function isPortalOpenable(readiness: PortalReadiness) {
  return readiness.status === "READY" || readiness.status === "PARTIAL";
}

export function listPortalReadiness() {
  return [...manifest.values()];
}
