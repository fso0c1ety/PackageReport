export type PortalRecordScope = {
  scope: "assigned_to_me" | "created_by_me" | "my_team" | "my_department" | "my_company" | "selected_records" | "all_permitted" | "custom";
  field?: string;
  ids?: string[];
  rule?: Record<string, unknown>;
};

export type PortalNavigationItem = {
  id: string;
  label: string;
  route: string;
  icon?: string;
  feature?: string;
  mobile?: boolean;
};

export type PortalConfig = {
  id: string;
  version: number;
  name: string;
  templateIds: string[];
  portalType: string;
  jobRoles: string[];
  defaultRoute: string;
  navigation: PortalNavigationItem[];
  widgets: Array<{ id: string; type: string; title: string; entity?: string }>;
  quickActions: Array<{ id: string; label: string; action: string; entity?: string }>;
  entityScopes: Record<string, string[]>;
  recordScopes: Record<string, PortalRecordScope>;
  visibleFields: Record<string, string[]>;
  hiddenFields: Record<string, string[]>;
  permittedActions: Record<string, string[]>;
  featureFlags: Record<string, boolean>;
};

export type PortalMembershipContext = {
  workspaceId?: string;
  templateKey?: string | null;
  portalType?: string;
  primaryJobRole?: string | null;
  jobRoles?: string[];
  navigation?: string[];
  landingRoute?: string;
  recordAccess?: PortalRecordScope;
  allowedActions?: string[];
};
