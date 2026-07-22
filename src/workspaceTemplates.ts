export type WorkspaceTemplateKey = string;

type SeedColumn = {
  name: string;
  type: string;
  options?: Array<{ value: string; color: string }>;
  settings?: { formula?: string; currency?: string; relationBoard?: string };
};

type SeedBoard = {
  name: string;
  columns: SeedColumn[];
  rows?: Array<Record<string, unknown>>;
};

export type WorkspaceTemplate = {
  key: WorkspaceTemplateKey;
  icon: string;
  name: string;
  description: string;
  color: string;
  category?: string;
  boards: SeedBoard[];
  views?: Array<{ boardName: string; name: string; type: string; isDefault?: boolean; config?: Record<string, unknown> }>;
  dashboardWidgets?: Array<Record<string, unknown>>;
  automations?: Array<Record<string, unknown>>;
};

export type WorkspaceTemplateManifest = WorkspaceTemplate & {
  id: WorkspaceTemplateKey;
  category: string;
  modules: string[];
  views: Array<{ boardName: string; name: string; type: string; isDefault?: boolean; config?: Record<string, unknown> }>;
  dashboards: Array<{ name: string; widgets: Array<Record<string, unknown>> }>;
  automations: Array<Record<string, unknown>>;
  roles: Array<{ key: string; name: string; permissions: string[] }>;
};

const status = (values = ["New", "In Progress", "Done"], name = "Status"): SeedColumn => ({
  name,
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

const industryTemplate = (key: string, icon: string, name: string, category: string, color: string, boardNames: string[]): WorkspaceTemplate => {
  const primaryBoard = boardNames[0];
  return {
    key, icon, name, category, color,
    description: `${name} operations, records, finance, documents and reporting`,
    boards: boardNames.map((boardName, index) => board(boardName, [
      { name: `${boardName.replace(/s$/, "")} ID`, type: "AutoNumber" },
      ...(index ? [{ name: primaryBoard, type: "Relation", settings: { relationBoard: primaryBoard } } as SeedColumn] : []),
      { name: "Owner", type: "People" },
      { name: "Date", type: "Date" },
      { name: "Amount", type: "Money", settings: { currency: "EUR" } },
      { name: "Cost", type: "Money", settings: { currency: "EUR" } },
      { name: "Net Value", type: "Formula", settings: { formula: "[Amount] - [Cost]" } },
      { name: "Documents", type: "Files" },
      status(["New", "In Progress", "Completed", "Cancelled"]),
    ], index === 0 ? [{ Name: `Sample ${boardName.replace(/s$/, "")}`, Status: "New" }] : [])),
    views: [
      { boardName: primaryBoard, name: `${primaryBoard} Table`, type: "table", isDefault: true },
      { boardName: primaryBoard, name: `${primaryBoard} Pipeline`, type: "kanban", config: { groupBy: "Status" } },
      { boardName: primaryBoard, name: `${primaryBoard} Calendar`, type: "calendar", config: { dateColumn: "Date" } },
    ],
    dashboardWidgets: [
      { type: "kpi", title: `Total ${primaryBoard}`, sourceBoard: primaryBoard, aggregation: "count" },
      { type: "status", title: `${primaryBoard} by Status`, sourceBoard: primaryBoard },
      { type: "revenue", title: "Total Value", sourceBoard: primaryBoard, sourceColumn: "Amount", aggregation: "sum" },
      { type: "profit", title: "Net Value", sourceBoard: primaryBoard, sourceColumn: "Net Value", aggregation: "sum" },
      { type: "activity", title: "Recent Activity", sourceBoard: primaryBoard },
    ],
    automations: [
      { trigger: "status_changes", board: primaryBoard, column: "Status", value: "Completed", action: "notify_manager" },
      { trigger: "date_arrives", board: primaryBoard, column: "Date", action: "notify_owner" },
    ],
  };
};

const ADDITIONAL_INDUSTRY_TEMPLATES: WorkspaceTemplate[] = [
  industryTemplate("medical_clinic", "\u{1FA7A}", "Medical Clinic", "Healthcare", "#0ea5e9", ["Patients", "Appointments", "Doctors", "Treatments", "Prescriptions", "Billing"]),
  industryTemplate("pharmacy", "\u{1F48A}", "Pharmacy", "Healthcare", "#10b981", ["Medicines", "Sales", "Purchases", "Suppliers", "Prescriptions", "Inventory"]),
  industryTemplate("laboratory", "\u{1F9EA}", "Laboratory", "Healthcare", "#06b6d4", ["Patients", "Lab Orders", "Samples", "Tests", "Results", "Billing"]),
  industryTemplate("physiotherapy", "\u{1F9B4}", "Physiotherapy", "Healthcare", "#14b8a6", ["Patients", "Sessions", "Therapists", "Treatment Plans", "Exercises", "Billing"]),
  industryTemplate("veterinary_clinic", "\u{1F43E}", "Veterinary Clinic", "Healthcare", "#22c55e", ["Animals", "Owners", "Appointments", "Treatments", "Vaccinations", "Billing"]),
  industryTemplate("private_school", "\u{1F3EB}", "Private School", "Education", "#6366f1", ["Students", "Classes", "Teachers", "Attendance", "Grades", "Fees"]),
  industryTemplate("training_center", "\u{1F393}", "Training Center", "Education", "#8b5cf6", ["Students", "Courses", "Trainers", "Enrollments", "Attendance", "Payments"]),
  industryTemplate("language_school", "\u{1F5E3}", "Language School", "Education", "#a855f7", ["Students", "Courses", "Levels", "Teachers", "Exams", "Payments"]),
  industryTemplate("student_management", "\u{1F4DA}", "Student Management", "Education", "#4f46e5", ["Students", "Programs", "Enrollments", "Attendance", "Assessments", "Documents"]),
  industryTemplate("restaurant", "\u{1F37D}", "Restaurant", "Retail & Services", "#ef4444", ["Menu Items", "Orders", "Tables", "Reservations", "Inventory", "Suppliers"]),
  industryTemplate("cafe", "\u2615", "Cafe", "Retail & Services", "#92400e", ["Products", "Orders", "Tables", "Shifts", "Inventory", "Suppliers"]),
  industryTemplate("hotel", "\u{1F3E8}", "Hotel", "Retail & Services", "#0f766e", ["Guests", "Rooms", "Reservations", "Services", "Housekeeping", "Payments"]),
  industryTemplate("beauty_salon", "\u{1F487}", "Beauty Salon", "Retail & Services", "#ec4899", ["Clients", "Appointments", "Services", "Staff", "Products", "Payments"]),
  industryTemplate("car_service", "\u{1F527}", "Car Service", "Retail & Services", "#475569", ["Customers", "Vehicles", "Service Orders", "Parts", "Mechanics", "Invoices"]),
  industryTemplate("car_rental", "\u{1F697}", "Car Rental", "Retail & Services", "#0284c7", ["Customers", "Vehicles", "Reservations", "Rentals", "Inspections", "Payments"]),
  industryTemplate("cleaning_company", "\u{1F9F9}", "Cleaning Company", "Retail & Services", "#0891b2", ["Clients", "Sites", "Jobs", "Teams", "Schedules", "Invoices"]),
  industryTemplate("architecture_studio", "\u{1F4D0}", "Architecture Studio", "Construction & Property", "#f59e0b", ["Clients", "Projects", "Design Phases", "Drawings", "Approvals", "Invoices"]),
  industryTemplate("property_management", "\u{1F3E2}", "Property Management", "Construction & Property", "#d97706", ["Properties", "Units", "Tenants", "Leases", "Maintenance", "Payments"]),
  industryTemplate("real_estate_agency", "\u{1F3E0}", "Real Estate Agency", "Construction & Property", "#ca8a04", ["Properties", "Leads", "Viewings", "Agents", "Offers", "Contracts"]),
  industryTemplate("maintenance_company", "\u{1F6E0}", "Maintenance Company", "Construction & Property", "#64748b", ["Clients", "Assets", "Work Orders", "Technicians", "Parts", "Invoices"]),
  industryTemplate("accounting_office", "\u{1F9FE}", "Accounting Office", "Professional Services", "#059669", ["Clients", "Engagements", "Transactions", "Tax Filings", "Documents", "Invoices"]),
  industryTemplate("law_office", "\u2696", "Law Office", "Professional Services", "#334155", ["Clients", "Cases", "Hearings", "Tasks", "Documents", "Billing"]),
  industryTemplate("marketing_agency", "\u{1F4E3}", "Marketing Agency", "Professional Services", "#db2777", ["Clients", "Campaigns", "Content", "Tasks", "Budgets", "Reports"]),
  industryTemplate("software_agency", "\u{1F4BB}", "Software Agency", "Professional Services", "#2563eb", ["Clients", "Projects", "Sprints", "Issues", "Releases", "Invoices"]),
  industryTemplate("recruitment_agency", "\u{1F50E}", "Recruitment Agency", "Professional Services", "#7c3aed", ["Clients", "Vacancies", "Candidates", "Interviews", "Placements", "Invoices"]),
  industryTemplate("production_management", "\u{1F3ED}", "Production Management", "Manufacturing", "#64748b", ["Products", "Production Orders", "Work Centers", "Shifts", "Output", "Reports"]),
  industryTemplate("raw_materials", "\u{1F9F1}", "Raw Materials", "Manufacturing", "#78716c", ["Materials", "Suppliers", "Purchases", "Receipts", "Consumption", "Inventory"]),
  industryTemplate("quality_control", "\u2705", "Quality Control", "Manufacturing", "#16a34a", ["Products", "Inspections", "Tests", "Defects", "Corrective Actions", "Reports"]),
  industryTemplate("machine_maintenance", "\u2699", "Machine Maintenance", "Manufacturing", "#475569", ["Machines", "Maintenance Plans", "Work Orders", "Technicians", "Parts", "Downtime"]),
  industryTemplate("orders_distribution", "\u{1F69A}", "Orders & Distribution", "Manufacturing", "#0369a1", ["Customers", "Orders", "Products", "Shipments", "Routes", "Deliveries"]),
];

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
    { name: "Drivers", columns: [{ name: "User", type: "People" }, { name: "Phone", type: "Phone" }, { name: "Email", type: "Email" }, { name: "License", type: "Text" }, { name: "License Expiry", type: "Date" }, { name: "Passport", type: "Files" }, status(["Active", "Off Duty", "Inactive"]) ] },
    board("Trips", [{ name: "Trip Number", type: "Text" }, { name: "Truck", type: "Relation" }, { name: "Driver", type: "Relation" }, { name: "Pickup", type: "Location" }, { name: "Delivery", type: "Location" }, { name: "Pickup Date", type: "Date" }, { name: "Delivery Date", type: "Date" }, { name: "Cargo", type: "LongText" }, { name: "Cargo Weight", type: "Numbers" }, { name: "Contact Person", type: "Text" }, { name: "Contact Phone", type: "Phone" }, { name: "Trailer", type: "Text" }, { name: "Distance", type: "Numbers" }, { name: "Estimated Travel Time", type: "Text" }, { name: "Instructions", type: "LongText" }, { name: "Revenue", type: "Money", settings: { currency: "EUR" } }, { name: "Fuel", type: "Money", settings: { currency: "EUR" } }, { name: "Parking", type: "Money", settings: { currency: "EUR" } }, { name: "Tolls", type: "Money", settings: { currency: "EUR" } }, { name: "Maintenance", type: "Money", settings: { currency: "EUR" } }, { name: "Other Costs", type: "Money", settings: { currency: "EUR" } }, { name: "Total Costs", type: "Formula", settings: { formula: "[Fuel] + [Parking] + [Tolls] + [Maintenance] + [Other Costs]" } }, { name: "Trip Profit", type: "Formula", settings: { formula: "[Revenue] - [Fuel] - [Parking] - [Tolls] - [Maintenance] - [Other Costs]" } }, status(["Assigned", "Accepted", "Going to Pickup", "At Pickup", "Loaded", "In Transit", "At Delivery", "Delivered", "Problem Reported"]) ]),
    board("Fuel", [{ name: "Truck", type: "Relation" }, { name: "Driver", type: "Relation" }, { name: "Trip", type: "Relation" }, { name: "Date", type: "Date" }, { name: "Liters", type: "Numbers" }, { name: "Price per Liter", type: "Money", settings: { currency: "EUR" } }, { name: "Total", type: "Formula", settings: { formula: "[Liters] * [Price per Liter]" } }, { name: "Station", type: "Text" }, { name: "Odometer KM", type: "Numbers" }, { name: "Receipt", type: "Files" }]),
    board("Maintenance", [{ name: "Truck", type: "Relation" }, { name: "Type", type: "Dropdown" }, { name: "Due Date", type: "Date" }, { name: "Due KM", type: "Numbers" }, { name: "Cost", type: "Money", settings: { currency: "EUR" } }, { name: "Documents", type: "Files" }, status(["Upcoming", "Due", "Overdue", "Completed"]) ]),
    board("Expenses", [{ name: "Truck", type: "Relation" }, { name: "Trip", type: "Relation" }, { name: "Category", type: "Dropdown" }, { name: "Date", type: "Date" }, { name: "Amount", type: "Money", settings: { currency: "EUR" } }, { name: "Receipt", type: "Files" }, { name: "Notes", type: "LongText" }]),
    board("Documents", [{ name: "Truck", type: "Relation" }, { name: "Driver", type: "Relation" }, { name: "Trip", type: "Relation" }, { name: "Document Type", type: "Dropdown" }, { name: "File", type: "Files" }, { name: "Expiry Date", type: "Date" }, status(["Valid", "Expiring", "Expired"]) ]),
  ]},
  { key: "crm_sales", icon: "\u{1F465}", name: "CRM & Sales", description: "Companies, contacts and complete sales pipeline", color: "#8b5cf6", boards: [board("Companies", [{ name: "Website", type: "Website" }, { name: "Industry", type: "Dropdown" }, { name: "Owner", type: "People" }, { name: "Annual Value", type: "Money" }, status(["Prospect", "Customer", "Inactive"])], [{ Name: "New prospect", Status: "Prospect" }]), board("Contacts", [{ name: "Company", type: "Relation" }, { name: "Email", type: "Email" }, { name: "Phone", type: "Phone" }, { name: "Position", type: "Text" }, { name: "Last Contact", type: "Date" }]), board("Deals", [{ name: "Company", type: "Relation" }, { name: "Contact", type: "Relation" }, { name: "Value", type: "Money" }, { name: "Probability", type: "Progress" }, { name: "Weighted Value", type: "Formula", settings: { formula: "[Value] * [Probability] / 100" } }, { name: "Close Date", type: "Date" }, { name: "Sales Owner", type: "People" }, status(["Lead", "Qualified", "Proposal", "Won", "Lost"]) ]), board("Sales Tasks", [{ name: "Deal", type: "Relation" }, { name: "Assignee", type: "People" }, { name: "Due Date", type: "Date" }, { name: "Priority", type: "Priority" }, status(["To Do", "In Progress", "Done"]) ]), board("CRM Reports", [{ name: "Period", type: "Timeline" }, { name: "Pipeline Value", type: "Money" }, { name: "Won Revenue", type: "Money" }, { name: "Conversion Rate", type: "Progress" }, { name: "Generated", type: "CreatedDate" }])]},
  { key: "project_management", icon: "\u{1F4CB}", name: "Project Management", description: "Projects, tasks, milestones, budgets and reports", color: "#6366f1", boards: [board("Projects", [{ name: "Owner", type: "People" }, { name: "Client", type: "Text" }, { name: "Budget", type: "Money" }, { name: "Progress", type: "Progress" }, { name: "Start Date", type: "Date" }, { name: "Deadline", type: "Date" }, status()]), board("Tasks", [{ name: "Project", type: "Relation" }, { name: "Assignee", type: "People" }, { name: "Priority", type: "Priority" }, { name: "Estimate Hours", type: "Numbers" }, { name: "Due Date", type: "Date" }, status(["To Do", "In Progress", "Review", "Done"]) ]), board("Milestones", [{ name: "Project", type: "Relation" }, { name: "Owner", type: "People" }, { name: "Due Date", type: "Date" }, { name: "Deliverables", type: "Files" }, status(["Planned", "In Progress", "Completed"]) ]), board("Project Documents", [{ name: "Project", type: "Relation" }, { name: "Category", type: "Dropdown" }, { name: "File", type: "Files" }, { name: "Updated", type: "UpdatedDate" }]), board("Project Reports", [{ name: "Project", type: "Relation" }, { name: "Spent", type: "Money" }, { name: "Budget", type: "Money" }, { name: "Remaining", type: "Formula", settings: { formula: "[Budget] - [Spent]" } }, { name: "Progress", type: "Progress" }])]},
  { key: "construction", icon: "\u{1F3D7}", name: "Construction", description: "Sites, crews, contractors, materials and costs", color: "#f59e0b", boards: [board("Projects", [{ name: "Location", type: "Location" }, { name: "Manager", type: "People" }, { name: "Client", type: "Text" }, { name: "Budget", type: "Money" }, { name: "Spent", type: "Money" }, { name: "Remaining", type: "Formula", settings: { formula: "[Budget] - [Spent]" } }, { name: "Deadline", type: "Date" }, status()]), board("Site Tasks", [{ name: "Project", type: "Relation" }, { name: "Crew", type: "People" }, { name: "Priority", type: "Priority" }, { name: "Due Date", type: "Date" }, { name: "Files", type: "Files" }, status()]), board("Materials", [{ name: "Project", type: "Relation" }, { name: "Supplier", type: "Relation" }, { name: "Quantity", type: "Numbers" }, { name: "Unit Cost", type: "Money" }, { name: "Total Cost", type: "Formula", settings: { formula: "[Quantity] * [Unit Cost]" } }, status(["Ordered", "Delivered", "Used"]) ]), board("Contractors", [{ name: "Phone", type: "Phone" }, { name: "Email", type: "Email" }, { name: "Trade", type: "Dropdown" }, { name: "Documents", type: "Files" }, status(["Available", "Assigned", "Inactive"]) ]), board("Construction Reports", [{ name: "Project", type: "Relation" }, { name: "Period", type: "Timeline" }, { name: "Cost", type: "Money" }, { name: "Progress", type: "Progress" }, { name: "Photos", type: "Files" }])]},
  { key: "dental_clinic", icon: "\u{1F9B7}", name: "Dental Clinic", description: "Patients, appointments, treatments and billing", color: "#14b8a6", boards: [board("Patients", [{ name: "Phone", type: "Phone" }, { name: "Email", type: "Email" }, { name: "Birthday", type: "Date" }, { name: "Medical Notes", type: "LongText" }, { name: "Documents", type: "Files" }]), board("Appointments", [{ name: "Patient", type: "Relation" }, { name: "Date", type: "Date" }, { name: "Dentist", type: "People" }, { name: "Treatment", type: "Relation" }, status(["Scheduled", "Confirmed", "Completed", "Cancelled"]) ]), board("Treatments", [{ name: "Patient", type: "Relation" }, { name: "Dentist", type: "People" }, { name: "Procedure", type: "Dropdown" }, { name: "Cost", type: "Money" }, { name: "Date", type: "Date" }, { name: "Files", type: "Files" }, status(["Planned", "In Progress", "Completed"]) ]), board("Dental Billing", [{ name: "Patient", type: "Relation" }, { name: "Treatment", type: "Relation" }, { name: "Amount", type: "Money" }, { name: "Paid", type: "Money" }, { name: "Balance", type: "Formula", settings: { formula: "[Amount] - [Paid]" } }, { name: "Due Date", type: "Date" }, status(["Draft", "Sent", "Paid", "Overdue"]) ]), board("Dental Inventory", [{ name: "SKU", type: "Text" }, { name: "Stock", type: "Numbers" }, { name: "Minimum Stock", type: "Numbers" }, { name: "Expiry Date", type: "Date" }, status(["In Stock", "Low Stock", "Out of Stock"]) ])]},
  { key: "retail_store", icon: "\u{1F3EC}", name: "Retail / Store", description: "Products, stock, sales, suppliers and purchasing", color: "#ec4899", boards: [board("Products", [{ name: "Barcode", type: "Barcode" }, { name: "Sale Price", type: "Money" }, { name: "Cost Price", type: "Money" }, { name: "Margin", type: "Formula", settings: { formula: "[Sale Price] - [Cost Price]" } }, { name: "Stock", type: "Numbers" }, { name: "Category", type: "Tags" }, { name: "Image", type: "Image" }, status(["In Stock", "Low Stock", "Out of Stock"]) ]), board("Suppliers", [{ name: "Email", type: "Email" }, { name: "Phone", type: "Phone" }, { name: "Website", type: "Website" }, { name: "Products", type: "Relation" }]), board("Sales", [{ name: "Product", type: "Relation" }, { name: "Quantity", type: "Numbers" }, { name: "Unit Price", type: "Money" }, { name: "Total", type: "Formula", settings: { formula: "[Quantity] * [Unit Price]" } }, { name: "Date", type: "Date" }, { name: "Cashier", type: "People" }]), board("Purchase Orders", [{ name: "Supplier", type: "Relation" }, { name: "Order Date", type: "Date" }, { name: "Expected Date", type: "Date" }, { name: "Amount", type: "Money" }, { name: "Invoice", type: "Files" }, status(["Draft", "Ordered", "Received", "Cancelled"]) ]), board("Retail Reports", [{ name: "Period", type: "Timeline" }, { name: "Revenue", type: "Money" }, { name: "Cost", type: "Money" }, { name: "Profit", type: "Formula", settings: { formula: "[Revenue] - [Cost]" } }, { name: "Generated", type: "CreatedDate" }])]},
  { key: "manufacturing", icon: "\u{1F3ED}", name: "Manufacturing", description: "Production, inventory, suppliers, quality and maintenance", color: "#64748b", boards: [board("Production Orders", [{ name: "Product", type: "Relation" }, { name: "Quantity", type: "Numbers" }, { name: "Start Date", type: "Date" }, { name: "Due Date", type: "Date" }, { name: "Progress", type: "Progress" }, { name: "Manager", type: "People" }, status(["Planned", "In Production", "Quality Check", "Completed"]) ]), board("Inventory", [{ name: "SKU", type: "Text" }, { name: "Quantity", type: "Numbers" }, { name: "Minimum Stock", type: "Numbers" }, { name: "Unit Cost", type: "Money" }, { name: "Location", type: "Location" }, status(["Available", "Low Stock", "Out of Stock"]) ]), board("Suppliers", [{ name: "Email", type: "Email" }, { name: "Phone", type: "Phone" }, { name: "Materials", type: "Relation" }, status(["Active", "On Hold", "Inactive"]) ]), board("Quality Control", [{ name: "Production Order", type: "Relation" }, { name: "Inspector", type: "People" }, { name: "Rating", type: "Rating" }, { name: "Issues", type: "LongText" }, { name: "Files", type: "Files" }, status(["Pending", "Passed", "Failed"]) ]), board("Machine Maintenance", [{ name: "Machine", type: "Text" }, { name: "Type", type: "Dropdown" }, { name: "Due Date", type: "Date" }, { name: "Cost", type: "Money" }, status(["Upcoming", "Due", "Completed"]) ]), board("Manufacturing Reports", [{ name: "Period", type: "Timeline" }, { name: "Produced", type: "Numbers" }, { name: "Rejected", type: "Numbers" }, { name: "Efficiency", type: "Progress" }, { name: "Cost", type: "Money" }])]},
  { key: "hr_employees", icon: "\u{1F4C5}", name: "HR & Employees", description: "Employees, leave, attendance, recruitment and payroll", color: "#22c55e", boards: [board("Employees", [{ name: "Email", type: "Email" }, { name: "Phone", type: "Phone" }, { name: "Department", type: "Dropdown" }, { name: "Manager", type: "People" }, { name: "Start Date", type: "Date" }, { name: "Salary", type: "Money" }, { name: "Documents", type: "Files" }, status(["Active", "Leave", "Inactive"]) ]), board("Leave Requests", [{ name: "Employee", type: "Relation" }, { name: "Start Date", type: "Date" }, { name: "End Date", type: "Date" }, { name: "Approver", type: "People" }, status(["Requested", "Approved", "Rejected"]) ]), board("Attendance", [{ name: "Employee", type: "Relation" }, { name: "Date", type: "Date" }, { name: "Hours", type: "Numbers" }, { name: "Location", type: "Location" }, status(["Present", "Remote", "Absent"]) ]), board("Recruitment", [{ name: "Email", type: "Email" }, { name: "Phone", type: "Phone" }, { name: "Position", type: "Text" }, { name: "CV", type: "Files" }, { name: "Interview Date", type: "Date" }, status(["Applied", "Interview", "Offer", "Hired", "Rejected"]) ]), board("Payroll", [{ name: "Employee", type: "Relation" }, { name: "Period", type: "Timeline" }, { name: "Gross", type: "Money" }, { name: "Deductions", type: "Money" }, { name: "Net", type: "Formula", settings: { formula: "[Gross] - [Deductions]" } }, status(["Draft", "Approved", "Paid"]) ])]},
  { key: "customs_brokerage", icon: "\u{1F6C3}", name: "Customs Brokerage", description: "Declarations, shipments, customs offices, invoices and compliance documents", color: "#0f766e", boards: [
    board("Clients", [{ name: "Email", type: "Email" }, { name: "Phone", type: "Phone" }, { name: "Tax ID", type: "Text" }, { name: "Address", type: "Location" }, status(["Lead", "Active", "Inactive"]) ]),
    board("Declarations", [{ name: "Declaration ID", type: "Text" }, { name: "Client", type: "Relation" }, { name: "Shipment", type: "Relation" }, { name: "Customs Office", type: "Relation" }, { name: "Declaration Date", type: "Date" }, { name: "Customs Value", type: "Money" }, { name: "Duty", type: "Money" }, { name: "VAT", type: "Money" }, { name: "Total Charges", type: "Formula", settings: { formula: "[Duty] + [VAT]" } }, status(["Draft", "Submitted", "Cleared", "Rejected"]) ]),
    board("Invoices", [{ name: "Client", type: "Relation" }, { name: "Declaration", type: "Relation" }, { name: "Amount", type: "Money" }, { name: "Due Date", type: "Date" }, { name: "Invoice File", type: "Files" }, status(["Draft", "Sent", "Paid", "Overdue"]) ]),
    board("Documents", [{ name: "Declaration", type: "Relation" }, { name: "Document Type", type: "Dropdown" }, { name: "File", type: "Files" }, { name: "Expiry Date", type: "Date" }, status(["Valid", "Missing", "Expired"]) ]),
    board("Customs Offices", [{ name: "Code", type: "Text" }, { name: "Location", type: "Location" }, { name: "Phone", type: "Phone" }, { name: "Website", type: "Website" }]),
    board("Tasks", [{ name: "Declaration", type: "Relation" }, { name: "Assignee", type: "People" }, { name: "Due Date", type: "Date" }, { name: "Priority", type: "Priority" }, status(["To Do", "In Progress", "Done"]) ]),
    board("Shipments", [{ name: "Shipment ID", type: "Text" }, { name: "Client", type: "Relation" }, { name: "Origin", type: "Location" }, { name: "Destination", type: "Location" }, { name: "Arrival Date", type: "Date" }, { name: "Documents", type: "Files" }, status(["Expected", "At Customs", "Released", "Delayed"]) ]),
  ]},
  { key: "courier_delivery", icon: "\u{1F4E8}", name: "Courier & Delivery", description: "Customers, orders, routes, drivers, vehicles, deliveries and payments", color: "#0284c7", boards: [
    board("Customers", [{ name: "Phone", type: "Phone" }, { name: "Email", type: "Email" }, { name: "Address", type: "Location" }, status(["Active", "Inactive"]) ]),
    board("Orders", [{ name: "Order ID", type: "Text" }, { name: "Customer", type: "Relation" }, { name: "Pickup", type: "Location" }, { name: "Delivery", type: "Location" }, { name: "Delivery Date", type: "Date" }, { name: "Driver", type: "Relation" }, { name: "Price", type: "Money" }, { name: "Delivery Cost", type: "Money" }, { name: "Profit", type: "Formula", settings: { formula: "[Price] - [Delivery Cost]" } }, status(["New", "Assigned", "In Transit", "Delivered", "Failed"]) ]),
    board("Drivers", [{ name: "Phone", type: "Phone" }, { name: "Vehicle", type: "Relation" }, { name: "License Expiry", type: "Date" }, status(["Available", "Delivering", "Off Duty"]) ]),
    board("Vehicles", [{ name: "Plate", type: "Text" }, { name: "Type", type: "Dropdown" }, { name: "Capacity", type: "Numbers" }, { name: "Insurance Expiry", type: "Date" }, status(["Available", "On Route", "Service"]) ]),
    board("Routes", [{ name: "Driver", type: "Relation" }, { name: "Vehicle", type: "Relation" }, { name: "Date", type: "Date" }, { name: "Orders", type: "Relation" }, { name: "Progress", type: "Progress" }, status(["Planned", "Active", "Completed"]) ]),
    board("Deliveries", [{ name: "Order", type: "Relation" }, { name: "Delivered At", type: "Date" }, { name: "Proof", type: "Files" }, { name: "Recipient", type: "Text" }, status(["Pending", "Delivered", "Returned"]) ]),
    board("Payments", [{ name: "Order", type: "Relation" }, { name: "Amount", type: "Money" }, { name: "Payment Date", type: "Date" }, { name: "Method", type: "Dropdown" }, status(["Pending", "Paid", "Refunded"]) ]),
  ]},
  { key: "warehouse_distribution", icon: "\u{1F3ED}", name: "Warehouse & Inventory Management", description: "Professional products, warehouse capacity, stock movement, suppliers, customers and purchasing", color: "#7c3aed", boards: [
    board("Products", [{ name: "SKU", type: "Text" }, { name: "Barcode", type: "Barcode" }, { name: "QR Code", type: "QR" }, { name: "Product Name", type: "Text" }, { name: "Category", type: "Tags" }, { name: "Supplier", type: "Relation" }, { name: "Purchase Price", type: "Money", settings: { currency: "EUR" } }, { name: "Selling Price", type: "Money", settings: { currency: "EUR" } }, { name: "Current Stock", type: "Numbers" }, { name: "Minimum Stock", type: "Numbers" }, { name: "Stock Value", type: "Formula", settings: { formula: "[Current Stock] * [Purchase Price]" } }, { name: "Unit", type: "Dropdown" }, { name: "Warehouse", type: "Relation" }, { name: "Shelf", type: "Text" }, { name: "Image", type: "Image" }, status(["In Stock", "Low Stock", "Out of Stock", "Inactive"]) ]),
    board("Stock In", [{ name: "Document Number", type: "Text" }, { name: "Product", type: "Relation" }, { name: "Supplier", type: "Relation" }, { name: "Quantity", type: "Numbers" }, { name: "Purchase Price", type: "Money", settings: { currency: "EUR" } }, { name: "Date", type: "Date" }, { name: "Warehouse", type: "Relation" }, { name: "Batch", type: "Text" }, { name: "Expiry Date", type: "Date" }, { name: "Responsible Person", type: "People" }, status(["Draft", "Approved", "Cancelled"]) ]),
    board("Stock Out", [{ name: "Document Number", type: "Text" }, { name: "Product", type: "Relation" }, { name: "Customer", type: "Relation" }, { name: "Quantity", type: "Numbers" }, { name: "Date", type: "Date" }, { name: "Warehouse", type: "Relation" }, { name: "Order", type: "Relation" }, { name: "Responsible Person", type: "People" }, status(["Draft", "Approved", "Cancelled"]) ]),
    board("Suppliers", [{ name: "Company", type: "Text" }, { name: "Contact Person", type: "Text" }, { name: "Phone", type: "Phone" }, { name: "Email", type: "Email" }, { name: "Country", type: "Country" }, { name: "Balance", type: "Money", settings: { currency: "EUR" } }, { name: "Products", type: "Relation" }, { name: "Documents", type: "Files" }, status(["Active", "On Hold", "Inactive"]) ]),
    board("Customers", [{ name: "Phone", type: "Phone" }, { name: "Email", type: "Email" }, { name: "Address", type: "Location" }, { name: "Orders", type: "Relation" }, { name: "Balance", type: "Money", settings: { currency: "EUR" } }, status(["Active", "On Hold", "Inactive"]) ]),
    board("Purchase Orders", [{ name: "Order Number", type: "Text" }, { name: "Supplier", type: "Relation" }, { name: "Products", type: "Relation" }, { name: "Quantity", type: "Numbers" }, { name: "Purchase Price", type: "Money", settings: { currency: "EUR" } }, { name: "Total", type: "Formula", settings: { formula: "[Quantity] * [Purchase Price]" } }, { name: "Expected Delivery", type: "Date" }, { name: "Documents", type: "Files" }, status(["Draft", "Ordered", "Partially Delivered", "Delivered", "Cancelled"]) ]),
    board("Warehouses", [{ name: "Warehouse Name", type: "Text" }, { name: "Address", type: "Text" }, { name: "Location", type: "Location" }, { name: "Manager", type: "People" }, { name: "Capacity", type: "Numbers" }, { name: "Current Stock", type: "Rollup" }, { name: "Remaining Capacity", type: "Formula", settings: { formula: "[Capacity] - [Current Stock]" } }, { name: "Products", type: "Relation" }, status(["Active", "Near Capacity", "Full", "Inactive"]) ]),
  ], dashboardWidgets: [
    { type: "kpi", title: "Total Stock Value", sourceBoard: "Products", aggregation: "sum", sourceColumn: "Stock Value" },
    { type: "table", title: "Low Stock Products", sourceBoard: "Products", filter: { status: "Low Stock" } },
    { type: "kpi", title: "Out-of-Stock Products", sourceBoard: "Products", filter: { status: "Out of Stock" } },
    { type: "kpi", title: "Incoming Goods", sourceBoard: "Stock In", filter: { status: "Approved" } },
    { type: "kpi", title: "Outgoing Goods", sourceBoard: "Stock Out", filter: { status: "Approved" } },
    { type: "calendar", title: "Expiring Products", sourceBoard: "Stock In", sourceColumn: "Expiry Date" },
    { type: "chart", title: "Top-Selling Products", sourceBoard: "Stock Out", aggregation: "sum", sourceColumn: "Quantity" },
    { type: "chart", title: "Supplier Balances", sourceBoard: "Suppliers", aggregation: "sum", sourceColumn: "Balance" },
    { type: "chart", title: "Stock by Warehouse", sourceBoard: "Warehouses", aggregation: "sum", sourceColumn: "Current Stock" },
  ], automations: [
    { trigger: "formula_threshold", board: "Products", column: "Current Stock", operator: "<=", compareTo: "Minimum Stock", action: "notify_manager" },
    { trigger: "formula_threshold", board: "Products", column: "Current Stock", operator: "<=", compareTo: "Minimum Stock", action: "create_purchase_task" },
    { trigger: "date_before", board: "Stock In", column: "Expiry Date", days: 30, action: "mark_warning" },
    { trigger: "status_changes", board: "Stock In", column: "Status", value: "Approved", action: "increase_stock" },
    { trigger: "status_changes", board: "Stock Out", column: "Status", value: "Approved", action: "decrease_stock" },
    { trigger: "status_changes", board: "Purchase Orders", column: "Status", value: "Delivered", action: "create_stock_in" },
  ]},
  { key: "kindergarten_nursery", icon: "\u{1F9F8}", name: "Kindergarten / Nursery Management", description: "Children, parents, groups, attendance, fees, employees, meals and documents", color: "#f97316", boards: [
    board("Children", [{ name: "Child ID", type: "AutoNumber" }, { name: "Full Name", type: "Text" }, { name: "Date of Birth", type: "Date" }, { name: "Age", type: "Formula", settings: { formula: "ROUND(DAYS_BETWEEN(TODAY(), [Date of Birth]) / 365, 0)" } }, { name: "Parent", type: "Relation" }, { name: "Group", type: "Relation" }, { name: "Allergies", type: "Tags" }, { name: "Medical Notes", type: "LongText" }, { name: "Enrollment Date", type: "Date" }, { name: "Photo", type: "Image" }, { name: "Documents", type: "Files" }, status(["Enrolled", "Waiting", "Inactive"]) ]),
    board("Parents", [{ name: "Phone", type: "Phone" }, { name: "Email", type: "Email" }, { name: "Address", type: "Location" }, { name: "Children", type: "Relation" }, { name: "Emergency Contact", type: "Phone" }, status(["Paid", "Partially Paid", "Unpaid"], "Payment Status") ]),
    board("Groups", [{ name: "Age Range", type: "Text" }, { name: "Educator", type: "People" }, { name: "Assistant", type: "People" }, { name: "Capacity", type: "Numbers" }, { name: "Children Count", type: "Rollup" }, { name: "Room", type: "Text" }, status(["Open", "Full", "Closed"]) ]),
    board("Attendance", [{ name: "Child", type: "Relation" }, { name: "Date", type: "Date" }, { name: "Arrival Time", type: "Text" }, { name: "Departure Time", type: "Text" }, { name: "Reason", type: "Text" }, { name: "Notes", type: "LongText" }, status(["Present", "Absent", "Excused"], "Present / Absent") ]),
    board("Payments", [{ name: "Child", type: "Relation" }, { name: "Parent", type: "Relation" }, { name: "Month", type: "Date" }, { name: "Amount", type: "Money", settings: { currency: "EUR" } }, { name: "Discount", type: "Money", settings: { currency: "EUR" } }, { name: "Paid Amount", type: "Money", settings: { currency: "EUR" } }, { name: "Remaining Amount", type: "Formula", settings: { formula: "[Amount] - [Discount] - [Paid Amount]" } }, { name: "Due Date", type: "Date" }, status(["Paid", "Partially Paid", "Unpaid", "Overdue"], "Payment Status") ]),
    board("Employees", [{ name: "Position", type: "Dropdown" }, { name: "Phone", type: "Phone" }, { name: "Email", type: "Email" }, { name: "Contract", type: "Files" }, { name: "Schedule", type: "Timeline" }, { name: "Salary", type: "Money", settings: { currency: "EUR" } }, { name: "Documents", type: "Files" }, status(["Active", "Leave", "Inactive"]) ]),
    board("Meals", [{ name: "Date", type: "Date" }, { name: "Breakfast", type: "LongText" }, { name: "Lunch", type: "LongText" }, { name: "Snack", type: "LongText" }, { name: "Allergens", type: "Tags" }, { name: "Assigned Groups", type: "Relation" }]),
    board("Documents", [{ name: "Child", type: "Relation" }, { name: "Document Type", type: "Dropdown" }, { name: "Upload Date", type: "Date" }, { name: "Expiry Date", type: "Date" }, { name: "File", type: "Files" }, status(["Valid", "Missing", "Expiring", "Expired"]) ]),
  ], views: [
    { boardName: "Children", name: "Children Table", type: "table", isDefault: true },
    { boardName: "Attendance", name: "Attendance Calendar", type: "calendar", isDefault: true, config: { dateColumn: "Date" } },
    { boardName: "Groups", name: "Groups Kanban", type: "kanban", isDefault: true, config: { groupBy: "Status" } },
    { boardName: "Payments", name: "Payments Table", type: "table", isDefault: true },
    { boardName: "Children", name: "Birthday Calendar", type: "calendar", config: { dateColumn: "Date of Birth" } },
    { boardName: "Employees", name: "Employee Schedule", type: "timeline", isDefault: true, config: { timelineColumn: "Schedule" } },
  ], dashboardWidgets: [
    { type: "kpi", title: "Children Present Today", sourceBoard: "Attendance", filter: { status: "Present", date: "today" } },
    { type: "kpi", title: "Children Absent Today", sourceBoard: "Attendance", filter: { status: "Absent", date: "today" } },
    { type: "kpi", title: "Unpaid Monthly Fees", sourceBoard: "Payments", aggregation: "sum", sourceColumn: "Remaining Amount" },
    { type: "calendar", title: "Upcoming Birthdays", sourceBoard: "Children", sourceColumn: "Date of Birth" },
    { type: "progress", title: "Group Occupancy", sourceBoard: "Groups", sourceColumn: "Children Count" },
    { type: "kpi", title: "Monthly Income", sourceBoard: "Payments", aggregation: "sum", sourceColumn: "Paid Amount" },
    { type: "kpi", title: "Pending Documents", sourceBoard: "Documents", filter: { status: "Missing" } },
    { type: "status", title: "Employee Attendance", sourceBoard: "Employees" },
    { type: "table", title: "Today's Meals", sourceBoard: "Meals", filter: { date: "today" } },
  ], automations: [
    { trigger: "date_arrives", board: "Payments", column: "Due Date", action: "notify_manager" },
    { trigger: "date_before", board: "Children", column: "Date of Birth", days: 3, action: "notify_educator" },
    { trigger: "formula_threshold", board: "Groups", column: "Children Count", compareTo: "Capacity", action: "block_enrollment" },
    { trigger: "date_before", board: "Documents", column: "Expiry Date", days: 30, action: "notify_manager" },
    { trigger: "status_changes", board: "Attendance", column: "Present / Absent", value: "Absent", action: "notify_educator" },
  ]},
  ...ADDITIONAL_INDUSTRY_TEMPLATES,
  { key: "blank", icon: "\u2728", name: "Blank Workspace", category: "General", description: "Start clean and build your own workflow", color: "#a855f7", boards: [board("Main Board", [{ name: "Owner", type: "People" }, status(), { name: "Date", type: "Date" }])]},
];

export const getWorkspaceTemplate = (key?: string) =>
  WORKSPACE_TEMPLATES.find((template) => template.key === key)
  ?? WORKSPACE_TEMPLATES.find((template) => template.key === "blank")!;

const categoryFor = (key: WorkspaceTemplateKey) => ["freight_broker", "fleet_management", "customs_brokerage", "courier_delivery", "warehouse_distribution"].includes(key) ? "Logistics" : key === "kindergarten_nursery" ? "Education" : key === "crm_sales" ? "Sales" : key === "project_management" ? "Projects" : key === "dental_clinic" ? "Healthcare" : key === "retail_store" ? "Retail" : key === "construction" ? "Construction" : key === "manufacturing" ? "Manufacturing" : key === "hr_employees" ? "HR" : "Other";
const modulesFor = (category: string) => [...new Set([
  ...(({ Logistics: ["logistics", "calendar", "finance", "documents", "reports"], Sales: ["crm", "calendar", "finance", "reports"], Projects: ["projects", "calendar", "documents", "reports"], Healthcare: ["crm", "calendar", "inventory", "finance", "documents"], Education: ["crm", "calendar", "finance", "documents", "reports"], Retail: ["inventory", "finance", "crm", "reports"], "Retail & Services": ["inventory", "calendar", "finance", "crm", "reports"], Construction: ["projects", "inventory", "finance", "documents", "reports"], "Construction & Property": ["projects", "calendar", "finance", "documents", "reports"], "Professional Services": ["crm", "projects", "calendar", "finance", "documents", "reports"], Manufacturing: ["inventory", "maintenance", "finance", "reports"], HR: ["hr", "calendar", "documents"], Other: ["calendar", "documents"] } as Record<string, string[]>)[category] || ["calendar", "documents"]),
  "tasks",
  ...(["Logistics", "Sales", "Healthcare", "Education", "Retail", "Retail & Services", "Professional Services"].includes(category) ? ["customers"] : []),
])];

export const getWorkspaceTemplateManifest = (key?: string): WorkspaceTemplateManifest => {
  const template = getWorkspaceTemplate(key);
  const category = template.category ?? categoryFor(template.key);
  const hasFormula = template.boards.some((seedBoard) => seedBoard.columns.some((column) => column.type === "Formula"));
  const hasRelation = template.boards.some((seedBoard) => seedBoard.columns.some((column) => column.type === "Relation"));
  const fleetRelationTarget = (boardName: string, columnName: string) => {
    if (template.key !== "fleet_management") return undefined;
    const targets: Record<string, Record<string, string>> = {
      Trucks: { Driver: "Drivers" },
      Trips: { Truck: "Trucks", Driver: "Drivers" },
      Fuel: { Truck: "Trucks", Driver: "Drivers", Trip: "Trips" },
      Maintenance: { Truck: "Trucks" },
      Expenses: { Truck: "Trucks", Trip: "Trips", Driver: "Drivers" },
      Documents: { Truck: "Trucks", Driver: "Drivers", Trip: "Trips" },
    };
    return targets[boardName]?.[columnName];
  };
  const sampleValueFor = (column: SeedColumn, boardName: string) => {
    const base = boardName.replace(/s$/, "");
    if (column.type === "Relation") return { __relationBoard: column.settings?.relationBoard || column.name };
    if (column.type === "People") return { __currentUser: true };
    if (["Money", "Numbers", "Progress"].includes(column.type)) return column.name.toLowerCase().includes("year") ? 2026 : 100;
    if (column.type === "Checkbox") return false;
    if (column.type === "Date") return "2026-07-23";
    if (column.type === "Timeline") return { start: "2026-07-23", end: "2026-07-24" };
    if (column.type === "Email") return "demo@smartmanage.com";
    if (column.type === "Phone") return "+383 49 000 000";
    if (column.type === "Location") return "Test Location, Kosovo";
    if (column.type === "Status") return column.options?.[0]?.value || "New";
    if (["Files", "Formula", "CreatedDate", "UpdatedDate", "AutoNumber"].includes(column.type)) return undefined;
    return `Test ${column.name || base}`;
  };
  const fleetSamples: Record<string, Record<string, unknown>> = {
    Drivers: { User: { __currentUser: true }, Phone: "+383 49 737 749", Email: "argjendpeci@test.com", License: "TEST-LICENSE-001", "License Expiry": "2027-12-31", Passport: "TEST-PASSPORT-001", Status: "Active" },
    Trucks: { Name: "KAMIONI 1", "Truck ID": "TEST-001", Plate: "TEST-001", Brand: "Mercedes-Benz", Model: "Actros", Year: 2024, Capacity: 24000, "Insurance Expiry": "2027-12-31", "Registration Expiry": "2027-12-31", Status: "Available", Driver: { __relationBoard: "Drivers" } },
    Trips: { Name: "Test Trip", "Trip Number": "TRIP-0001", Driver: { __relationBoard: "Drivers" }, Truck: { __relationBoard: "Trucks" }, Pickup: "Vakıflı Mahallesi, Hayrabolu, Tekirdağ, Türkiye", Delivery: "Ulpianë, Prishtinë 10000, Kosovo", "Pickup Date": "2026-07-23T08:00:00.000Z", "Delivery Date": "2026-07-24T18:00:00.000Z", Cargo: "Test Cargo", "Cargo Weight": 10000, "Contact Person": "Test Contact", "Contact Phone": "+383 49 000 000", Status: "Assigned", Instructions: "Test pickup and delivery instructions" },
    Expenses: { Name: "EXP-0001", Trip: { __relationBoard: "Trips" }, Driver: { __relationBoard: "Drivers" }, Type: "Toll", Category: "Toll", Description: "Test Expense", Amount: 50, Date: "2026-07-23", Status: "Pending" },
    Fuel: { Name: "FUEL-0001", Truck: { __relationBoard: "Trucks" }, Driver: { __relationBoard: "Drivers" }, Trip: { __relationBoard: "Trips" }, Liters: 100, "Price per Liter": 1.5, Date: "2026-07-23", Station: "Test Fuel Station", "Odometer KM": 100000 },
    Maintenance: { Name: "MAIN-0001", Truck: { __relationBoard: "Trucks" }, Type: "Regular Service", Description: "Test Maintenance", "Due Date": "2026-07-30", Cost: 200, Status: "Upcoming" },
    Documents: { Name: "Test CMR", "Document Type": "CMR", Trip: { __relationBoard: "Trips" }, Driver: { __relationBoard: "Drivers" }, Truck: { __relationBoard: "Trucks" }, Status: "Valid" },
  };
  const boards = template.boards.map((seedBoard, index) => ({
    ...seedBoard,
    columns: [
      ...seedBoard.columns.map((column) => {
        const relationBoard = column.type === "Relation" ? fleetRelationTarget(seedBoard.name, column.name) : undefined;
        return relationBoard ? { ...column, settings: { ...(column.settings || {}), relationBoard } } : column;
      }),
      ...(template.key === "fleet_management" && seedBoard.name === "Expenses" && !seedBoard.columns.some((column) => column.name === "Driver")
        ? [{ name: "Driver", type: "Relation", settings: { relationBoard: "Drivers" } }]
        : []),
      ...(!hasFormula && index === 0 ? [{ name: "Amount", type: "Money", settings: { currency: "EUR" } }, { name: "Cost", type: "Money", settings: { currency: "EUR" } }, { name: "Net Value", type: "Formula", settings: { formula: "[Amount] - [Cost]" } }] : []),
      ...(!hasRelation && index === 1 ? [{ name: template.boards[0].name, type: "Relation", settings: { relationBoard: template.boards[0].name } }] : []),
    ],
    rows: seedBoard.rows?.length ? seedBoard.rows : [{
      ...Object.fromEntries(seedBoard.columns.map((column) => [column.name, sampleValueFor(column, seedBoard.name)]).filter(([, value]) => value !== undefined)),
      Name: `Test ${seedBoard.name.replace(/s$/, "")}`,
      ...(template.key === "fleet_management" ? (fleetSamples[seedBoard.name] || {}) : {}),
    }],
  }));
  const primaryBoard = boards[0];
  const statusColumn = primaryBoard?.columns.find((column) => column.type === "Status");
  const dateColumn = primaryBoard?.columns.find((column) => column.type === "Date");
  const defaultAutomations = [
    ...(statusColumn ? [{ trigger: "status_changes", board: primaryBoard.name, column: statusColumn.name, value: statusColumn.options?.at(-1)?.value, action: "notify_manager" }] : []),
    ...(dateColumn ? [{ trigger: "date_arrives", board: primaryBoard.name, column: dateColumn.name, action: "notify_owner" }] : []),
  ];
  return {
    ...template,
    boards,
    id: template.key,
    category,
    modules: modulesFor(category),
    views: template.views ?? boards.flatMap((seedBoard) => [
      { boardName: seedBoard.name, name: "Table", type: "table", isDefault: true },
      ...(seedBoard.columns.some((column) => column.type === "Status") ? [{ boardName: seedBoard.name, name: "Kanban", type: "kanban" }] : []),
      ...(seedBoard.columns.some((column) => column.type === "Date") ? [{ boardName: seedBoard.name, name: "Calendar", type: "calendar" }] : []),
    ]),
    dashboards: [{ name: `${template.name} Overview`, widgets: template.dashboardWidgets ?? [{ type: "kpi", title: "Total rows", aggregation: "count" }, { type: "status", title: "Status overview", aggregation: "count" }] }],
    automations: template.automations?.length ? template.automations : defaultAutomations,
    roles: ["freight_broker", "fleet_management"].includes(template.key)
      ? [
          { key: "logistics_admin", name: "Logistics Admin", permissions: ["*"] },
          { key: "dispatcher", name: "Dispatcher", permissions: ["view", "edit", "assign_trips"] },
          { key: "fleet_manager", name: "Fleet Manager", permissions: ["view", "edit", "manage_fleet"] },
          { key: "driver", name: "Driver", permissions: ["view_assigned_trips", "update_trip_status", "upload_trip_documents"] },
          { key: "viewer", name: "Viewer", permissions: ["view"] },
        ]
      : [{ key: "owner", name: "Owner", permissions: ["*"] }, { key: "admin", name: "Admin", permissions: ["manage_workspace"] }, { key: "employee", name: "Employee", permissions: ["view", "edit"] }],
  };
};

export const validateWorkspaceTemplateCatalog = () => {
  const errors: string[] = [];
  const keys = new Set<string>();
  for (const template of WORKSPACE_TEMPLATES) {
    if (keys.has(template.key)) errors.push(`Duplicate template key: ${template.key}`);
    keys.add(template.key);
    const manifest = getWorkspaceTemplateManifest(template.key);
    if (!manifest.boards.length) errors.push(`${template.key}: boards are required`);
    if (template.key !== "blank" && manifest.boards.length < 2) errors.push(`${template.key}: multiple boards are required`);
    if (template.key !== "blank" && !manifest.boards.some((seedBoard) => seedBoard.columns.some((column) => column.type === "Relation"))) errors.push(`${template.key}: relation column is required`);
    if (template.key !== "blank" && !manifest.boards.some((seedBoard) => seedBoard.columns.some((column) => column.type === "Formula"))) errors.push(`${template.key}: formula column is required`);
    if (!manifest.views.length) errors.push(`${template.key}: views are required`);
    if (!manifest.dashboards[0]?.widgets.length) errors.push(`${template.key}: dashboard widgets are required`);
    if (template.key !== "blank" && !manifest.automations.length) errors.push(`${template.key}: automations are required`);
    if (!manifest.roles.length) errors.push(`${template.key}: roles are required`);
  }
  return { valid: errors.length === 0, errors, count: WORKSPACE_TEMPLATES.length };
};

export const WORKSPACE_TEMPLATE_CATALOG_STATUS = validateWorkspaceTemplateCatalog();
if (!WORKSPACE_TEMPLATE_CATALOG_STATUS.valid) throw new Error(`Invalid workspace template catalog: ${WORKSPACE_TEMPLATE_CATALOG_STATUS.errors.join("; ")}`);
