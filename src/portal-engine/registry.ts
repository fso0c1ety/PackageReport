import { driverPortalConfig } from "./configs/driver";
import { clientPortalConfig, doctorPortalConfig, parentPortalConfig, patientPortalConfig, teacherPortalConfig } from "./configs/professionals";
import type { PortalConfig, PortalMembershipContext } from "./types";

const registry: PortalConfig[] = [driverPortalConfig, teacherPortalConfig, parentPortalConfig, doctorPortalConfig, patientPortalConfig, clientPortalConfig];

export function listPortalConfigs() {
  return registry.slice();
}

export function resolvePortalConfig(context: PortalMembershipContext): PortalConfig | null {
  const roles = new Set([context.primaryJobRole, ...(context.jobRoles || [])].filter(Boolean));
  return registry.find((config) => {
    if (config.portalType !== context.portalType) return false;
    if (context.templateKey && config.templateIds.length && !config.templateIds.includes(context.templateKey)) return false;
    return !config.jobRoles.length || config.jobRoles.some((role) => roles.has(role));
  }) || null;
}

export function portalRoute(config: PortalConfig, workspaceId?: string) {
  if (!workspaceId) return config.defaultRoute;
  const separator = config.defaultRoute.includes("?") ? "&" : "?";
  return `${config.defaultRoute}${separator}id=${encodeURIComponent(workspaceId)}`;
}
