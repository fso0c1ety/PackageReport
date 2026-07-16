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
  settings?: { formula?: string; currency?: string };
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

export type WorkspaceTemplateManifest = WorkspaceTemplate & {
  id: WorkspaceTemplateKey;
  category: string;
  modules: string[];
  views: Array<{ boardName: string; name: string; type: string; isDefault?: boolean }>;
  dashboards: Array<{ name: string; widgets: Array<Record<string, unknown>> }>;
  automations: Array<Record<string, unknown>>;
  roles: Array<{ key: string; name: string; permissions: string[] }>;
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
  { key: "freight_broker", icon: "\u{1F4E6}", name: "Logistics - Freight Broker", description: "Clients, carriers, loads, invoices and dispatch reporting", color: "#2563eb", boards: [
    board("Clients", [{ name: "Email", type: "Email" }, { name: "Phone", type: "Phone" }, { name: "Address", type: "Location" }, { name: "Payment Terms", type: "Dropdown" }, status(["Lead", "Active", "Inactive"])], [{ Name: "Example Client", Status: "Lead" }]),
    board("Carriers", [{ name: "Phone", type: "Phone" }, { name: "Email", type: "Email" }, { name: "MC / License", type: "Text" }, { name: "Insurance Expiry", type: "Date" }, { name: "Documents", type: "Files" }, status(["Available", "Assigned", "Inactive"]) ]),
    board("Loads", [{ name: "Load ID", type: "Text" }, { name: "Client", type: "Relation" }, { name: "Carrier", type: "Relation" }, { name: "Pickup", type: "Location" }, { name: "Delivery", type: "Location" }, { name: "Pickup Date", type: "Date" }, { name: "Delivery Date", type: "Date" }, { name: "Buy Rate", type: "Money", settings: { currency: "EUR" } }, { name: "Sell Rate", type: "Money", settings: { currency: "EUR" } }, { name: "Profit", type: "Formula", settings: { formula: "[Sell Rate] - [Buy Rate]" } }, { name: "Dispatcher", type: "People" }, { name: "POD", type: "Files" }, { name: "Invoice Sent", type: "Checkbox" }, { name: "Carrier Paid", type: "Checkbox" }, status(["Planned", "In Transit", "Delivered", "Delayed"]) ]),
    board("Invoices", [{ name: "Load", type: "Relation" }, { name: "Client", type: "Relation" }, { name: "Amount", type: "Money", settings: { currency: "EUR" } }, { name: "Invoice Date", type: "Date" }, { name: "Due Date", type: "Date" }, { name: "PDF", type: "Files" }, status(["Draft", "Sent", "Paid", "Overdue"]) ]),
    board("Documents", [{ name: "Load", type: "Relation" }, { name: "Document Type", type: "Dropdown" }, { name: "File", type: "Files" }, { name: "Expiry Date", type: "Date" }, status(["Valid", "Expiring", "Expired"]) ]),
    board("Tasks", [{ name: "Load", type: "Relation" }, { name: "Assignee", type: "People" }, { name: "Priority", type: "Priority" }, { name: "Due Date", type: "Date" }, status(["To Do", "In Progress", "Done"]) ]),
    board("Reports", [{ name: "Report Type", type: "Dropdown" }, { name: "Period", type: "Timeline" }, { name: "Revenue", type: "Money", settings: { currency: "EUR" } }, { name: "Costs", type: "Money", settings: { currency: "EUR" } }, { name: "Profit", type: "Formula", settings: { formula: "[Revenue] - [Costs]" } }, { name: "Generated", type: "CreatedDate" }]),
  ]},
  { key: "fleet_management", icon: "\u{1F69B}", name: "Logistics - Fleet Management", description: "Trucks, drivers, trips, fuel, expenses and maintenance", color: "#0ea5e9", boards: [
    board("Trucks", [{ name: "Truck ID", type: "Text" }, { name: "Plate", type: "Text" }, { name: "Brand", type: "Text" }, { name: "Model", type: "Text" }, { name: "Year", type: "Numbers" }, { name: "Current KM", type: "Numbers" }, { name: "Capacity", type: "Numbers" }, { name: "Insurance Expiry", type: "Date" }, { name: "Registration Expiry", type: "Date" }, { name: "Service KM", type: "Numbers" }, { name: "Driver", type: "Relation" }, status(["Available", "On Trip", "Service", "Inactive"]) ]),
    board("Drivers", [{ name: "Phone", type: "Phone" }, { name: "Email", type: "Email" }, { name: "License", type: "Text" }, { name: "License Expiry", type: "Date" }, { name: "Passport", type: "Files" }, status(["Active", "Off Duty", "Inactive"]) ]),
    board("Trips", [{ name: "Truck", type: "Relation" }, { name: "Driver", type: "Relation" }, { name: "Pickup", type: "Location" }, { name: "Delivery", type: "Location" }, { name: "Start Date", type: "Date" }, { name: "End Date", type: "Date" }, { name: "Revenue", type: "Money", settings: { currency: "EUR" } }, { name: "Fuel", type: "Money", settings: { currency: "EUR" } }, { name: "Parking", type: "Money", settings: { currency: "EUR" } }, { name: "Tolls", type: "Money", settings: { currency: "EUR" } }, { name: "Maintenance", type: "Money", settings: { currency: "EUR" } }, { name: "Other Costs", type: "Money", settings: { currency: "EUR" } }, { name: "Total Costs", type: "Formula", settings: { formula: "[Fuel] + [Parking] + [Tolls] + [Maintenance] + [Other Costs]" } }, { name: "Trip Profit", type: "Formula", settings: { formula: "[Revenue] - [Fuel] - [Parking] - [Tolls] - [Maintenance] - [Other Costs]" } }, status(["Planned", "In Transit", "Completed", "Delayed"]) ]),
    board("Fuel", [{ name: "Truck", type: "Relation" }, { name: "Driver", type: "Relation" }, { name: "Date", type: "Date" }, { name: "Liters", type: "Numbers" }, { name: "Price per Liter", type: "Money", settings: { currency: "EUR" } }, { name: "Total", type: "Formula", settings: { formula: "[Liters] * [Price per Liter]" } }, { name: "Odometer KM", type: "Numbers" }, { name: "Receipt", type: "Files" }]),
    board("Maintenance", [{ name: "Truck", type: "Relation" }, { name: "Type", type: "Dropdown" }, { name: "Due Date", type: "Date" }, { name: "Due KM", type: "Numbers" }, { name: "Cost", type: "Money", settings: { currency: "EUR" } }, { name: "Documents", type: "Files" }, status(["Upcoming", "Due", "Overdue", "Completed"]) ]),
    board("Expenses", [{ name: "Truck", type: "Relation" }, { name: "Trip", type: "Relation" }, { name: "Category", type: "Dropdown" }, { name: "Date", type: "Date" }, { name: "Amount", type: "Money", settings: { currency: "EUR" } }, { name: "Receipt", type: "Files" }, { name: "Notes", type: "LongText" }]),
  ]},
  { key: "crm_sales", icon: "\u{1F465}", name: "CRM & Sales", description: "Companies, contacts and complete sales pipeline", color: "#8b5cf6", boards: [board("Companies", [{ name: "Website", type: "Website" }, { name: "Industry", type: "Dropdown" }, { name: "Owner", type: "People" }, { name: "Annual Value", type: "Money" }, status(["Prospect", "Customer", "Inactive"])], [{ Name: "New prospect", Status: "Prospect" }]), board("Contacts", [{ name: "Company", type: "Relation" }, { name: "Email", type: "Email" }, { name: "Phone", type: "Phone" }, { name: "Position", type: "Text" }, { name: "Last Contact", type: "Date" }]), board("Deals", [{ name: "Company", type: "Relation" }, { name: "Contact", type: "Relation" }, { name: "Value", type: "Money" }, { name: "Probability", type: "Progress" }, { name: "Weighted Value", type: "Formula", settings: { formula: "[Value] * [Probability] / 100" } }, { name: "Close Date", type: "Date" }, { name: "Sales Owner", type: "People" }, status(["Lead", "Qualified", "Proposal", "Won", "Lost"]) ]), board("Sales Tasks", [{ name: "Deal", type: "Relation" }, { name: "Assignee", type: "People" }, { name: "Due Date", type: "Date" }, { name: "Priority", type: "Priority" }, status(["To Do", "In Progress", "Done"]) ]), board("CRM Reports", [{ name: "Period", type: "Timeline" }, { name: "Pipeline Value", type: "Money" }, { name: "Won Revenue", type: "Money" }, { name: "Conversion Rate", type: "Progress" }, { name: "Generated", type: "CreatedDate" }])]},
  { key: "project_management", icon: "\u{1F4CB}", name: "Project Management", description: "Projects, tasks, milestones, budgets and reports", color: "#6366f1", boards: [board("Projects", [{ name: "Owner", type: "People" }, { name: "Client", type: "Text" }, { name: "Budget", type: "Money" }, { name: "Progress", type: "Progress" }, { name: "Start Date", type: "Date" }, { name: "Deadline", type: "Date" }, status()]), board("Tasks", [{ name: "Project", type: "Relation" }, { name: "Assignee", type: "People" }, { name: "Priority", type: "Priority" }, { name: "Estimate Hours", type: "Numbers" }, { name: "Due Date", type: "Date" }, status(["To Do", "In Progress", "Review", "Done"]) ]), board("Milestones", [{ name: "Project", type: "Relation" }, { name: "Owner", type: "People" }, { name: "Due Date", type: "Date" }, { name: "Deliverables", type: "Files" }, status(["Planned", "In Progress", "Completed"]) ]), board("Project Documents", [{ name: "Project", type: "Relation" }, { name: "Category", type: "Dropdown" }, { name: "File", type: "Files" }, { name: "Updated", type: "UpdatedDate" }]), board("Project Reports", [{ name: "Project", type: "Relation" }, { name: "Spent", type: "Money" }, { name: "Budget", type: "Money" }, { name: "Remaining", type: "Formula", settings: { formula: "[Budget] - [Spent]" } }, { name: "Progress", type: "Progress" }])]},
  { key: "construction", icon: "\u{1F3D7}", name: "Construction", description: "Sites, crews, contractors, materials and costs", color: "#f59e0b", boards: [board("Projects", [{ name: "Location", type: "Location" }, { name: "Manager", type: "People" }, { name: "Client", type: "Text" }, { name: "Budget", type: "Money" }, { name: "Spent", type: "Money" }, { name: "Remaining", type: "Formula", settings: { formula: "[Budget] - [Spent]" } }, { name: "Deadline", type: "Date" }, status()]), board("Site Tasks", [{ name: "Project", type: "Relation" }, { name: "Crew", type: "People" }, { name: "Priority", type: "Priority" }, { name: "Due Date", type: "Date" }, { name: "Files", type: "Files" }, status()]), board("Materials", [{ name: "Project", type: "Relation" }, { name: "Supplier", type: "Relation" }, { name: "Quantity", type: "Numbers" }, { name: "Unit Cost", type: "Money" }, { name: "Total Cost", type: "Formula", settings: { formula: "[Quantity] * [Unit Cost]" } }, status(["Ordered", "Delivered", "Used"]) ]), board("Contractors", [{ name: "Phone", type: "Phone" }, { name: "Email", type: "Email" }, { name: "Trade", type: "Dropdown" }, { name: "Documents", type: "Files" }, status(["Available", "Assigned", "Inactive"]) ]), board("Construction Reports", [{ name: "Project", type: "Relation" }, { name: "Period", type: "Timeline" }, { name: "Cost", type: "Money" }, { name: "Progress", type: "Progress" }, { name: "Photos", type: "Files" }])]},
  { key: "dental_clinic", icon: "\u{1F9B7}", name: "Dental Clinic", description: "Patients, appointments, treatments and billing", color: "#14b8a6", boards: [board("Patients", [{ name: "Phone", type: "Phone" }, { name: "Email", type: "Email" }, { name: "Birthday", type: "Date" }, { name: "Medical Notes", type: "LongText" }, { name: "Documents", type: "Files" }]), board("Appointments", [{ name: "Patient", type: "Relation" }, { name: "Date", type: "Date" }, { name: "Dentist", type: "People" }, { name: "Treatment", type: "Relation" }, status(["Scheduled", "Confirmed", "Completed", "Cancelled"]) ]), board("Treatments", [{ name: "Patient", type: "Relation" }, { name: "Dentist", type: "People" }, { name: "Procedure", type: "Dropdown" }, { name: "Cost", type: "Money" }, { name: "Date", type: "Date" }, { name: "Files", type: "Files" }, status(["Planned", "In Progress", "Completed"]) ]), board("Dental Billing", [{ name: "Patient", type: "Relation" }, { name: "Treatment", type: "Relation" }, { name: "Amount", type: "Money" }, { name: "Paid", type: "Money" }, { name: "Balance", type: "Formula", settings: { formula: "[Amount] - [Paid]" } }, { name: "Due Date", type: "Date" }, status(["Draft", "Sent", "Paid", "Overdue"]) ]), board("Dental Inventory", [{ name: "SKU", type: "Text" }, { name: "Stock", type: "Numbers" }, { name: "Minimum Stock", type: "Numbers" }, { name: "Expiry Date", type: "Date" }, status(["In Stock", "Low Stock", "Out of Stock"]) ])]},
  { key: "retail_store", icon: "\u{1F3EC}", name: "Retail / Store", description: "Products, stock, sales, suppliers and purchasing", color: "#ec4899", boards: [board("Products", [{ name: "Barcode", type: "Barcode" }, { name: "Sale Price", type: "Money" }, { name: "Cost Price", type: "Money" }, { name: "Margin", type: "Formula", settings: { formula: "[Sale Price] - [Cost Price]" } }, { name: "Stock", type: "Numbers" }, { name: "Category", type: "Tags" }, { name: "Image", type: "Image" }, status(["In Stock", "Low Stock", "Out of Stock"]) ]), board("Suppliers", [{ name: "Email", type: "Email" }, { name: "Phone", type: "Phone" }, { name: "Website", type: "Website" }, { name: "Products", type: "Relation" }]), board("Sales", [{ name: "Product", type: "Relation" }, { name: "Quantity", type: "Numbers" }, { name: "Unit Price", type: "Money" }, { name: "Total", type: "Formula", settings: { formula: "[Quantity] * [Unit Price]" } }, { name: "Date", type: "Date" }, { name: "Cashier", type: "People" }]), board("Purchase Orders", [{ name: "Supplier", type: "Relation" }, { name: "Order Date", type: "Date" }, { name: "Expected Date", type: "Date" }, { name: "Amount", type: "Money" }, { name: "Invoice", type: "Files" }, status(["Draft", "Ordered", "Received", "Cancelled"]) ]), board("Retail Reports", [{ name: "Period", type: "Timeline" }, { name: "Revenue", type: "Money" }, { name: "Cost", type: "Money" }, { name: "Profit", type: "Formula", settings: { formula: "[Revenue] - [Cost]" } }, { name: "Generated", type: "CreatedDate" }])]},
  { key: "manufacturing", icon: "\u{1F3ED}", name: "Manufacturing", description: "Production, inventory, suppliers, quality and maintenance", color: "#64748b", boards: [board("Production Orders", [{ name: "Product", type: "Relation" }, { name: "Quantity", type: "Numbers" }, { name: "Start Date", type: "Date" }, { name: "Due Date", type: "Date" }, { name: "Progress", type: "Progress" }, { name: "Manager", type: "People" }, status(["Planned", "In Production", "Quality Check", "Completed"]) ]), board("Inventory", [{ name: "SKU", type: "Text" }, { name: "Quantity", type: "Numbers" }, { name: "Minimum Stock", type: "Numbers" }, { name: "Unit Cost", type: "Money" }, { name: "Location", type: "Location" }, status(["Available", "Low Stock", "Out of Stock"]) ]), board("Suppliers", [{ name: "Email", type: "Email" }, { name: "Phone", type: "Phone" }, { name: "Materials", type: "Relation" }, status(["Active", "On Hold", "Inactive"]) ]), board("Quality Control", [{ name: "Production Order", type: "Relation" }, { name: "Inspector", type: "People" }, { name: "Rating", type: "Rating" }, { name: "Issues", type: "LongText" }, { name: "Files", type: "Files" }, status(["Pending", "Passed", "Failed"]) ]), board("Machine Maintenance", [{ name: "Machine", type: "Text" }, { name: "Type", type: "Dropdown" }, { name: "Due Date", type: "Date" }, { name: "Cost", type: "Money" }, status(["Upcoming", "Due", "Completed"]) ]), board("Manufacturing Reports", [{ name: "Period", type: "Timeline" }, { name: "Produced", type: "Numbers" }, { name: "Rejected", type: "Numbers" }, { name: "Efficiency", type: "Progress" }, { name: "Cost", type: "Money" }])]},
  { key: "hr_employees", icon: "\u{1F4C5}", name: "HR & Employees", description: "Employees, leave, attendance, recruitment and payroll", color: "#22c55e", boards: [board("Employees", [{ name: "Email", type: "Email" }, { name: "Phone", type: "Phone" }, { name: "Department", type: "Dropdown" }, { name: "Manager", type: "People" }, { name: "Start Date", type: "Date" }, { name: "Salary", type: "Money" }, { name: "Documents", type: "Files" }, status(["Active", "Leave", "Inactive"]) ]), board("Leave Requests", [{ name: "Employee", type: "Relation" }, { name: "Start Date", type: "Date" }, { name: "End Date", type: "Date" }, { name: "Approver", type: "People" }, status(["Requested", "Approved", "Rejected"]) ]), board("Attendance", [{ name: "Employee", type: "Relation" }, { name: "Date", type: "Date" }, { name: "Hours", type: "Numbers" }, { name: "Location", type: "Location" }, status(["Present", "Remote", "Absent"]) ]), board("Recruitment", [{ name: "Email", type: "Email" }, { name: "Phone", type: "Phone" }, { name: "Position", type: "Text" }, { name: "CV", type: "Files" }, { name: "Interview Date", type: "Date" }, status(["Applied", "Interview", "Offer", "Hired", "Rejected"]) ]), board("Payroll", [{ name: "Employee", type: "Relation" }, { name: "Period", type: "Timeline" }, { name: "Gross", type: "Money" }, { name: "Deductions", type: "Money" }, { name: "Net", type: "Formula", settings: { formula: "[Gross] - [Deductions]" } }, status(["Draft", "Approved", "Paid"]) ])]},
  { key: "blank", icon: "\u2728", name: "Blank Workspace", description: "Start clean and build your own workflow", color: "#a855f7", boards: [board("Main Board", [{ name: "Owner", type: "People" }, status(), { name: "Date", type: "Date" }])]},
];

export const getWorkspaceTemplate = (key?: string) =>
  WORKSPACE_TEMPLATES.find((template) => template.key === key)
  ?? WORKSPACE_TEMPLATES.find((template) => template.key === "blank")!;

const categoryFor = (key: WorkspaceTemplateKey) => key.startsWith("freight") || key.startsWith("fleet") ? "Logistics" : key === "crm_sales" ? "Sales" : key === "project_management" ? "Projects" : key === "dental_clinic" ? "Healthcare" : key === "retail_store" ? "Retail" : key === "construction" ? "Construction" : key === "manufacturing" ? "Manufacturing" : key === "hr_employees" ? "HR" : "Other";
const modulesFor = (category: string) => ({ Logistics: ["logistics", "calendar", "finance", "documents", "reports"], Sales: ["crm", "calendar", "finance", "reports"], Projects: ["projects", "calendar", "documents", "reports"], Healthcare: ["crm", "calendar", "inventory", "finance", "documents"], Retail: ["inventory", "finance", "crm", "reports"], Construction: ["projects", "inventory", "finance", "documents", "reports"], Manufacturing: ["inventory", "maintenance", "finance", "reports"], HR: ["hr", "calendar", "documents"], Other: ["calendar", "documents"] } as Record<string, string[]>)[category] || ["calendar", "documents"];

export const getWorkspaceTemplateManifest = (key?: string): WorkspaceTemplateManifest => {
  const template = getWorkspaceTemplate(key);
  const category = categoryFor(template.key);
  return {
    ...template,
    id: template.key,
    category,
    modules: modulesFor(category),
    views: template.boards.flatMap((seedBoard) => [
      { boardName: seedBoard.name, name: "Table", type: "table", isDefault: true },
      ...(seedBoard.columns.some((column) => column.type === "Status") ? [{ boardName: seedBoard.name, name: "Kanban", type: "kanban" }] : []),
      ...(seedBoard.columns.some((column) => column.type === "Date") ? [{ boardName: seedBoard.name, name: "Calendar", type: "calendar" }] : []),
    ]),
    dashboards: [{ name: `${template.name} Overview`, widgets: [{ type: "kpi", title: "Total rows", aggregation: "count" }, { type: "status", title: "Status overview", aggregation: "count" }] }],
    automations: [],
    roles: [{ key: "owner", name: "Owner", permissions: ["*"] }, { key: "admin", name: "Admin", permissions: ["manage_workspace"] }, { key: "employee", name: "Employee", permissions: ["view", "edit"] }],
  };
};
