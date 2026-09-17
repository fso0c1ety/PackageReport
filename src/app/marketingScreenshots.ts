export const marketingScreenshots = Object.freeze({
  hero: "/marketing/home.webp",
  dashboard: "/marketing/dashboard.webp",
  maintenance: "/marketing/maintenance.webp",
  driverPortal: "/marketing/portals/driver-mobile.webp",
  boards: "/marketing/boards.webp",
  operations: "/marketing/logistics.webp",
  fleet: "/marketing/fleet.webp",
  crm: "/marketing/crm.webp",
  construction: "/marketing/construction.webp",
  education: "/marketing/daycare.webp",
  healthcare: "/marketing/dental.webp",
});

export function validateMarketingScreenshotRegistry() {
  const values = Object.values(marketingScreenshots);
  return new Set(values).size === values.length;
}
