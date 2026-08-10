import type { PortalConfig } from "../types";

export const driverPortalConfig: PortalConfig = {
  id: "logistics-driver",
  version: 1,
  name: "Driver Portal",
  templateIds: ["freight_broker", "fleet_management"],
  portalType: "driver",
  jobRoles: ["driver"],
  defaultRoute: "/driver-trips",
  navigation: [
    { id: "home", label: "Home", route: "/driver-trips", icon: "home", mobile: true },
    { id: "my_trips", label: "My Trips", route: "/driver-trips", icon: "truck", mobile: true },
    { id: "calendar", label: "My Calendar", route: "/calendar", icon: "calendar", mobile: true },
    { id: "documents", label: "My Documents", route: "/driver-trips?section=documents", icon: "folder", mobile: true },
    { id: "my_expenses", label: "My Expenses", route: "/driver-trips?section=expenses", icon: "wallet", feature: "expenses" },
    { id: "my_fuel", label: "My Fuel", route: "/driver-trips?section=fuel", icon: "fuel", feature: "fuel" },
    { id: "profile", label: "My Profile", route: "/settings?tab=profile", icon: "profile", mobile: true },
  ],
  widgets: [
    { id: "current_trip", type: "record", title: "Current Trip", entity: "trips" },
    { id: "upcoming_trips", type: "record_list", title: "Upcoming", entity: "trips" },
  ],
  quickActions: [
    { id: "update_status", label: "Update Status", action: "trip.status.update", entity: "trips" },
    { id: "upload_document", label: "Upload Document", action: "document.upload", entity: "documents" },
    { id: "report_problem", label: "Report Problem", action: "trip.problem.report", entity: "trips" },
  ],
  entityScopes: { trips: ["assigned"], documents: ["assigned"], expenses: ["assigned"], fuel: ["assigned"] },
  recordScopes: {
    trips: { scope: "assigned_to_me", field: "_assignedDriverUserId" },
    documents: { scope: "assigned_to_me", field: "_assignedDriverUserId" },
    expenses: { scope: "assigned_to_me", field: "_assignedDriverUserId" },
    fuel: { scope: "assigned_to_me", field: "_assignedDriverUserId" },
  },
  visibleFields: { trips: ["tripNumber", "status", "pickup", "delivery", "pickupDate", "deliveryDate", "truck", "cargo", "contact"] },
  hiddenFields: { trips: ["customerPrice", "carrierPrice", "margin", "internalNotes", "otherDrivers"] },
  permittedActions: {
    trips: ["view", "status.update", "document.upload", "problem.report", "map.view", "location.share"],
    documents: ["view", "upload"], expenses: ["view", "create", "upload"], fuel: ["view", "create", "upload"],
  },
  featureFlags: { map: true, calendar: true, documents: true, notifications: true, expenses: true, fuel: true },
};
