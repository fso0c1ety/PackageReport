import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getAuthenticatedUser, pool } from "../../_lib/server";

export const runtime = "nodejs";

const STATUS_COLORS = ["#1976d2", "#fdab3d", "#00c875", "#9c27b0", "#ef5350", "#26a69a"];

function inferColumnType(values) {
  const samples = values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .slice(0, 50);

  if (samples.length === 0) {
    return { type: "Text" };
  }

  const allDates = samples.every((value) => !Number.isNaN(Date.parse(value)));
  if (allDates) {
    return { type: "Date" };
  }

  const uniqueValues = Array.from(new Set(samples.map((value) => value.toLowerCase())));
  if (uniqueValues.length >= 2 && uniqueValues.length <= 8) {
    return {
      type: "Status",
      options: uniqueValues.map((value, index) => ({
        value: samples.find((sample) => sample.toLowerCase() === value) || value,
        color: STATUS_COLORS[index % STATUS_COLORS.length],
      })),
    };
  }

  return { type: "Text" };
}

function normalizeHeader(value, index) {
  const trimmed = String(value ?? "").trim();
  return trimmed || `Column ${index + 1}`;
}

function normalizeMondayValue(value) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}

function getDeclaredColumnType(value) {
  const typeMap = {
    TEXT: "Text",
    NUMBERS: "Numbers",
    NUMBER: "Numbers",
    STATUS: "Status",
    "STATUSI I DERGESES": "Status",
    DATE: "Date",
    DROPDOWN: "Dropdown",
    COUNTRY: "Country",
  };
  return typeMap[normalizeMondayValue(value)] || null;
}

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const workspaceId = String(formData.get("workspaceId") || "").trim();
    const requestedTableName = String(formData.get("tableName") || "").trim();

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const workspaceResult = await pool.query(
      "SELECT id, owner_id FROM workspaces WHERE id = $1 LIMIT 1",
      [workspaceId]
    );
    const workspace = workspaceResult.rows[0];

    if (!workspace || workspace.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return NextResponse.json({ error: "Workbook is empty" }, { status: 400 });
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false,
    });

    const mondayHeaderRowIndex = rawRows.findIndex((row) => {
      if (!Array.isArray(row)) return false;
      const normalized = row.map(normalizeMondayValue);
      return normalized.includes("NAME")
        && normalized.includes("STATUSI I DERGESES")
        && normalized.includes("DATA");
    });
    const headerRowIndex = mondayHeaderRowIndex >= 0
      ? mondayHeaderRowIndex
      : rawRows.findIndex((row) =>
        Array.isArray(row) && row.some((cell) => String(cell ?? "").trim() !== "")
      );

    if (headerRowIndex === -1) {
      return NextResponse.json({ error: "The selected file does not contain any data" }, { status: 400 });
    }

    const headerRow = Array.isArray(rawRows[headerRowIndex]) ? rawRows[headerRowIndex] : [];
    const declaredTypeRow = mondayHeaderRowIndex >= 0 && Array.isArray(rawRows[headerRowIndex - 1])
      ? rawRows[headerRowIndex - 1]
      : [];
    const headers = headerRow.map((value, index) => normalizeHeader(value, index));
    const dataRows = rawRows.slice(headerRowIndex + 1).filter((row) => {
      if (!Array.isArray(row) || !row.some((cell) => String(cell ?? "").trim() !== "")) return false;
      const firstCell = normalizeMondayValue(row[0]);
      const normalized = row.map(normalizeMondayValue);
      if (firstCell === "TEST MOS SHKRUJ" || firstCell === "NEW GROUP") return false;
      if (
        firstCell === "NAME"
        && normalized.includes("STATUSI I DERGESES")
        && normalized.includes("DATA")
      ) return false;
      return true;
    });

    const columns = headers.map((header, columnIndex) => {
      const inferred = inferColumnType(dataRows.map((row) => row?.[columnIndex]));
      const declaredType = getDeclaredColumnType(declaredTypeRow[columnIndex]);
      const type = declaredType || inferred.type;
      const uniqueOptions = (type === "Status" || type === "Dropdown" || type === "Country")
        ? Array.from(new Set(
          dataRows
            .map((row) => String(row?.[columnIndex] ?? "").trim())
            .filter(Boolean)
        )).map((value, index) => ({
          value,
          color: STATUS_COLORS[index % STATUS_COLORS.length],
        }))
        : undefined;
      return {
        id: randomUUID(),
        name: header,
        type,
        order: columnIndex,
        ...(uniqueOptions
          ? { options: uniqueOptions }
          : inferred.options
          ? { options: inferred.options }
          : {}),
      };
    });

    const tableId = randomUUID();
    const tableName = requestedTableName || firstSheetName || "Imported Table";

    await pool.query(
      "INSERT INTO tables (id, name, workspace_id, columns, created_at, shared_users) VALUES ($1, $2, $3, $4, $5, $6)",
      [tableId, tableName, workspaceId, JSON.stringify(columns), Date.now(), JSON.stringify([])]
    );

    let rowCount = 0;
    for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex += 1) {
      const row = dataRows[rowIndex];
      const values = {};
      let hasData = false;

      columns.forEach((column, columnIndex) => {
        const rawValue = row?.[columnIndex];
        const normalizedValue = rawValue == null ? "" : String(rawValue).trim();
        values[column.id] = normalizedValue;
        if (normalizedValue) {
          hasData = true;
        }
      });

      if (!hasData) {
        continue;
      }

      values.order = rowCount;

      await pool.query(
        "INSERT INTO rows (id, table_id, values, created_by, created_at) VALUES ($1, $2, $3, $4, NOW())",
        [randomUUID(), tableId, JSON.stringify(values), user.id]
      );
      rowCount += 1;
    }

    return NextResponse.json({
      success: true,
      tableId,
      tableName,
      rowCount,
      columns,
    });
  } catch (err) {
    console.error("[IMPORT EXCEL][POST] Error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
