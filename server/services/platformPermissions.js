export const PLATFORM_ROLE_PERMISSIONS = Object.freeze({
  platform_admin: ["demo_requests.read", "demo_requests.manage", "demo_workspaces.create", "demo_access.send"],
  demo_manager: ["demo_requests.read", "demo_requests.manage", "demo_workspaces.create", "demo_access.send"],
  demo_sales: ["demo_requests.read", "demo_requests.manage"],
});

export function hasPlatformPermission(actor, permission) {
  if (!actor?.active || !PLATFORM_ROLE_PERMISSIONS[actor.role]) return false;
  const granted = new Set([...(PLATFORM_ROLE_PERMISSIONS[actor.role] || []), ...(Array.isArray(actor.permissions) ? actor.permissions : [])]);
  return granted.has(permission);
}

