const test = require("node:test");
const assert = require("node:assert/strict");
const { rowMatchesRecordAccess, getRowAccess } = require("../server/services/permissions");

const scopedBoard = (field, extra = {}) => ({
  owner_id: "owner",
  workspace_owner_id: "owner",
  workspace_role: "member",
  board_record_access: { scope: "assigned_to_me", field },
  columns: [],
  ...extra,
});

test("driver A cannot read a trip assigned to driver B", () => {
  const board = scopedBoard("_assignedDriverUserId");
  assert.equal(rowMatchesRecordAccess({ values: { _assignedDriverUserId: "driver-a" } }, board, "driver-a"), true);
  assert.equal(rowMatchesRecordAccess({ values: { _assignedDriverUserId: "driver-b" } }, board, "driver-a"), false);
});

test("doctor and teacher scopes honor their configured linked-user fields", () => {
  assert.equal(rowMatchesRecordAccess({ values: { assignedDoctorUserId: "doctor-a" } }, scopedBoard("assignedDoctorUserId"), "doctor-a"), true);
  assert.equal(rowMatchesRecordAccess({ values: { assignedDoctorUserId: "doctor-b" } }, scopedBoard("assignedDoctorUserId"), "doctor-a"), false);
  assert.equal(rowMatchesRecordAccess({ values: { classTeacherUserId: "teacher-a" } }, scopedBoard("classTeacherUserId"), "teacher-a"), true);
  assert.equal(rowMatchesRecordAccess({ values: { classTeacherUserId: "teacher-b" } }, scopedBoard("classTeacherUserId"), "teacher-a"), false);
});

test("client company scope cannot cross into another company", () => {
  const board = {
    ...scopedBoard("clientCompanyId"),
    board_record_access: { scope: "my_company", field: "clientCompanyId" },
    member_company_id: "company-a",
  };
  assert.equal(rowMatchesRecordAccess({ values: { clientCompanyId: "company-a" } }, board, "client-user"), true);
  assert.equal(rowMatchesRecordAccess({ values: { clientCompanyId: "company-b" } }, board, "client-user"), false);
});

test("direct row lookup rejects a row from another table before permission lookup", async () => {
  const db = { query: async () => ({ rows: [{ id: "row-1", table_id: "table-b", values: {} }] }) };
  assert.equal(await getRowAccess(db, "row-1", "user-a", "viewer", "table-a"), null);
});
