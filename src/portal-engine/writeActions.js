const actions = Object.freeze({
  teacher: Object.freeze({
    "attendance:create": { mode: "create", entity: "Attendance", subjectEntity: "Children", relationField: "Child", fields: ["Date", "Arrival Time", "Departure Time", "Present / Absent", "Notes"], scopeField: "_classTeacherUserId", notifyExternal: true },
    "meal:create": { mode: "create", entity: "Meals", subjectEntity: "Groups", relationField: "Assigned Groups", fields: ["Date", "Breakfast", "Lunch", "Snack", "Allergens"], scopeField: "_classTeacherUserId", notifyExternal: true },
    "observation:create": { mode: "append", entity: "Children", targetField: "_teacherObservations", fields: ["text", "shareable"], scopeField: "_classTeacherUserId", notifyExternal: true },
  }),
  parent: Object.freeze({
    "message:create": { mode: "message", entity: "Children", fields: ["message"], scopeField: "_linkedParentUserId", notifyManager: true },
    "acknowledgement:create": { mode: "append", entity: "Documents", targetField: "_portalAcknowledgements", fields: ["message"], scopeField: "_linkedParentUserId", notifyManager: true },
  }),
  doctor: Object.freeze({
    "treatment:update": { mode: "update", entity: "Treatments", fields: ["Procedure", "Date", "Status"], scopeField: "_assignedDoctorUserId", notifyExternal: true },
    "clinical_note:create": { mode: "append", entity: "Treatments", targetField: "_clinicalNotes", fields: ["text"], scopeField: "_assignedDoctorUserId", notifyManager: true, sensitive: true },
    "follow_up:create": { mode: "create", entity: "Appointments", subjectEntity: "Patients", relationField: "Patient", fields: ["Name", "Date", "Treatment", "Status"], scopeField: "_assignedDoctorUserId", notifyExternal: true },
  }),
  patient: Object.freeze({
    "message:create": { mode: "message", entity: "Appointments", fields: ["message"], scopeField: "_linkedPatientUserId", notifyManager: true },
    "appointment:request": { mode: "append", entity: "Appointments", targetField: "_patientRequests", fields: ["requestType", "message"], scopeField: "_linkedPatientUserId", notifyManager: true },
    "acknowledgement:create": { mode: "append", entity: "Treatments", targetField: "_portalAcknowledgements", fields: ["message"], scopeField: "_linkedPatientUserId", notifyManager: true },
  }),
  client: Object.freeze({
    "message:create": { mode: "message", entity: "Loads", fields: ["message"], scopeField: "clientCompanyId", notifyManager: true },
    "shipment:request": { mode: "append", entity: "Loads", targetField: "_clientRequests", fields: ["requestType", "message"], scopeField: "clientCompanyId", notifyManager: true },
    "document:create": { mode: "create", entity: "Documents", subjectEntity: "Loads", relationField: "Load", fields: ["Document Type", "File", "Status"], scopeField: "clientCompanyId", notifyManager: true },
  }),
});

export function portalWriteAction(portalType, action) {
  return actions[String(portalType || "")]?.[String(action || "")] || null;
}

export function portalWriteActions(portalType) {
  return Object.keys(actions[String(portalType || "")] || {});
}

export function portalWriteActionOptions(portalType) {
  return Object.entries(actions[String(portalType || "")] || {}).map(([id, definition]) => ({
    id,
    mode: definition.mode,
    entity: definition.entity,
    subjectEntity: definition.subjectEntity || null,
    fields: [...definition.fields],
  }));
}

export const portalWriteRegistry = actions;
