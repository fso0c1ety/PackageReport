export type WorkspaceTemplateKey =
  | "freight_broker"
  | "fleet_management"
  | "crm_sales"
  | "project_management"
  | "construction"
  | "dental_clinic"
  | "retail_store"
  | "manufacturing"
  | "hr_employees"
  | "blank";

type SeedColumn = {
  name: string;
  type: string;
  options?: Array<{ value: string; color: string }>;
};

type SeedBoard = {
  name: string;
  columns: SeedColumn[];
  rows?: Array<Record<string, string | number | boolean>>;
};

export type WorkspaceTemplate = {
  key: WorkspaceTemplateKey;
  icon: string;
  name: string;
  description: string;
  color: string;
  boards: SeedBoard[];
};

const status = (values = ["New", "In Progress", "Done"]): SeedColumn => ({
  name: "Status",
  type: "Status",
  options: values.map((value, index) => ({
    value,
    color: ["#579bfc", "#fdab3d", "#00c875", "#e2445c"][index % 4],
  })),
});

const board = (name: string, columns: SeedColumn[], rows: SeedBoard["rows"] = []): SeedBoard => ({
  name,
  columns: [{ name: "Name", type: "Text" }, ...columns],
  rows,
});

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  { key: "freight_broker", icon: "\u{1F4E6}", name: "Logistics - Freight Broker", description: "Clients, carriers, loads and invoices", color: "#2563eb", boards: [board("Clients", [{ name: "Email", type: "Email" }, { name: "Phone", type: "Phone" }, status(["Lead", "Active", "Inactive"])], [{ Name: "Example Client", Status: "Lead" }]), board("Carriers", [{ name: "Phone", type: "Phone" }, { name: "Email", type: "Email" }, status(["Available", "Assigned", "Inactive"])]), board("Loads", [{ name: "Client", type: "Relation" }, { name: "Carrier", type: "Relation" }, { name: "Pickup", type: "Location" }, { name: "Delivery", type: "Location" }, { name: "Pickup Date", type: "Date" }, { name: "Delivery Date", type: "Date" }, { name: "Sell Rate", type: "Money" }, { name: "Buy Rate", type: "Money" }, { name: "Profit", type: "Formula" }, status(["Planned", "In Transit", "Delivered", "Delayed"])])]},
  { key: "fleet_management", icon: "\u{1F69B}", name: "Logistics - Fleet Management", description: "Trucks, drivers, trips and maintenance", color: "#0ea5e9", boards: [board("Trucks", [{ name: "Plate", type: "Text" }, { name: "Current KM", type: "Numbers" }, { name: "Driver", type: "Relation" }, status(["Available", "On Trip", "Service"])]), board("Drivers", [{ name: "Phone", type: "Phone" }, { name: "License Expiry", type: "Date" }, status(["Active", "Off Duty"])]), board("Trips", [{ name: "Truck", type: "Relation" }, { name: "Driver", type: "Relation" }, { name: "Revenue", type: "Money" }, { name: "Costs", type: "Money" }, { name: "Profit", type: "Formula" }, status()]), board("Maintenance", [{ name: "Truck", type: "Relation" }, { name: "Due Date", type: "Date" }, { name: "Service KM", type: "Numbers" }, status(["Upcoming", "Due", "Completed"])])]},
  { key: "crm_sales", icon: "\u{1F465}", name: "CRM & Sales", description: "Companies, contacts and sales pipeline", color: "#8b5cf6", boards: [board("Companies", [{ name: "Website", type: "Website" }, { name: "Owner", type: "People" }, status(["Prospect", "Customer", "Inactive"])], [{ Name: "New prospect", Status: "Prospect" }]), board("Contacts", [{ name: "Company", type: "Relation" }, { name: "Email", type: "Email" }, { name: "Phone", type: "Phone" }]), board("Deals", [{ name: "Company", type: "Relation" }, { name: "Value", type: "Money" }, { name: "Close Date", type: "Date" }, status(["Lead", "Qualified", "Won", "Lost"])])]},
  { key: "project_management", icon: "\u{1F4CB}", name: "Project Management", description: "Projects, tasks and milestones", color: "#6366f1", boards: [board("Projects", [{ name: "Owner", type: "People" }, { name: "Progress", type: "Progress" }, { name: "Deadline", type: "Date" }, status()]), board("Tasks", [{ name: "Project", type: "Relation" }, { name: "Assignee", type: "People" }, { name: "Priority", type: "Priority" }, { name: "Due Date", type: "Date" }, status(["To Do", "In Progress", "Review", "Done"])])]},
  { key: "construction", icon: "\u{1F3D7}", name: "Construction", description: "Sites, projects, crews and materials", color: "#f59e0b", boards: [board("Projects", [{ name: "Location", type: "Location" }, { name: "Manager", type: "People" }, { name: "Budget", type: "Money" }, { name: "Deadline", type: "Date" }, status()]), board("Site Tasks", [{ name: "Project", type: "Relation" }, { name: "Crew", type: "People" }, { name: "Files", type: "Files" }, status()])]},
  { key: "dental_clinic", icon: "\u{1F9B7}", name: "Dental Clinic", description: "Patients, appointments and treatments", color: "#14b8a6", boards: [board("Patients", [{ name: "Phone", type: "Phone" }, { name: "Email", type: "Email" }, { name: "Birthday", type: "Date" }]), board("Appointments", [{ name: "Patient", type: "Relation" }, { name: "Date", type: "Date" }, { name: "Dentist", type: "People" }, status(["Scheduled", "Confirmed", "Completed", "Cancelled"])])]},
  { key: "retail_store", icon: "\u{1F3EC}", name: "Retail / Store", description: "Products, inventory and suppliers", color: "#ec4899", boards: [board("Products", [{ name: "Barcode", type: "Barcode" }, { name: "Price", type: "Money" }, { name: "Stock", type: "Numbers" }, { name: "Category", type: "Tags" }, status(["In Stock", "Low Stock", "Out of Stock"])]), board("Suppliers", [{ name: "Email", type: "Email" }, { name: "Phone", type: "Phone" }, { name: "Website", type: "Website" }])]},
  { key: "manufacturing", icon: "\u{1F3ED}", name: "Manufacturing", description: "Production, inventory and quality", color: "#64748b", boards: [board("Production Orders", [{ name: "Product", type: "Text" }, { name: "Quantity", type: "Numbers" }, { name: "Start Date", type: "Date" }, { name: "Due Date", type: "Date" }, { name: "Progress", type: "Progress" }, status()]), board("Inventory", [{ name: "SKU", type: "Text" }, { name: "Quantity", type: "Numbers" }, { name: "Location", type: "Location" }])]},
  { key: "hr_employees", icon: "\u{1F4C5}", name: "HR & Employees", description: "Employees, leave and onboarding", color: "#22c55e", boards: [board("Employees", [{ name: "Email", type: "Email" }, { name: "Phone", type: "Phone" }, { name: "Department", type: "Dropdown" }, { name: "Manager", type: "People" }, { name: "Start Date", type: "Date" }, status(["Active", "Leave", "Inactive"])]), board("Leave Requests", [{ name: "Employee", type: "Relation" }, { name: "Start Date", type: "Date" }, { name: "End Date", type: "Date" }, status(["Requested", "Approved", "Rejected"])])]},
  { key: "blank", icon: "\u2728", name: "Blank Workspace", description: "Start clean and build your own workflow", color: "#a855f7", boards: [board("Main Board", [{ name: "Owner", type: "People" }, status(), { name: "Date", type: "Date" }])]},
];

export const getWorkspaceTemplate = (key?: string) =>
  WORKSPACE_TEMPLATES.find((template) => template.key === key)
  ?? WORKSPACE_TEMPLATES.find((template) => template.key === "blank")!;
