import defaults from "../../config/feature-flags.json";

export type FeatureFlag = keyof typeof defaults;
export type FeatureFlags = Record<FeatureFlag, boolean>;

const publicEnvNames: Partial<Record<FeatureFlag, string | undefined>> = {
  universalTemplates: process.env.NEXT_PUBLIC_FEATURE_UNIVERSAL_TEMPLATES,
  universalColumns: process.env.NEXT_PUBLIC_FEATURE_UNIVERSAL_COLUMNS,
  relationColumns: process.env.NEXT_PUBLIC_FEATURE_RELATION_COLUMNS,
  formulaEngine: process.env.NEXT_PUBLIC_FEATURE_FORMULA_ENGINE,
  dashboardBuilder: process.env.NEXT_PUBLIC_FEATURE_DASHBOARD_BUILDER,
  mapView: process.env.NEXT_PUBLIC_FEATURE_MAP_VIEW,
  calendarView: process.env.NEXT_PUBLIC_FEATURE_CALENDAR_VIEW,
  kanbanView: process.env.NEXT_PUBLIC_FEATURE_KANBAN_VIEW,
  timelineView: process.env.NEXT_PUBLIC_FEATURE_TIMELINE_VIEW,
  galleryView: process.env.NEXT_PUBLIC_FEATURE_GALLERY_VIEW,
  formView: process.env.NEXT_PUBLIC_FEATURE_FORM_VIEW,
  automationBuilder: process.env.NEXT_PUBLIC_FEATURE_AUTOMATION_BUILDER,
  templateMarketplace: process.env.NEXT_PUBLIC_FEATURE_TEMPLATE_MARKETPLACE,
  enterprisePermissions: process.env.NEXT_PUBLIC_FEATURE_ENTERPRISE_PERMISSIONS,
};

function parsePublicBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  if (["1", "true", "yes", "on"].includes(value.toLowerCase())) return true;
  if (["0", "false", "no", "off"].includes(value.toLowerCase())) return false;
  return fallback;
}

export const featureFlags = Object.fromEntries(
  (Object.keys(defaults) as FeatureFlag[]).map((flag) => [
    flag,
    parsePublicBoolean(publicEnvNames[flag], defaults[flag]),
  ]),
) as FeatureFlags;

export function isFeatureEnabled(flag: FeatureFlag) {
  return featureFlags[flag];
}
