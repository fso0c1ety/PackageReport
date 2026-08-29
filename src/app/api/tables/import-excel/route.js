import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getAuthenticatedUser, pool } from "../../_lib/server";
import { requireWritableSubscription } from "../../_lib/billing";
import addressFields from "@/shared/internationalAddress.cjs";

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

  if (samples.every((value) => /^-?\d+(?:[.,]\d+)?$/.test(value))) {
    return { type: "Numbers" };
  }

  if (samples.every((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
    return { type: "Email" };
  }

  if (samples.every((value) => /^\+?[0-9 ()-]{7,20}$/.test(value))) {
    return { type: "Phone" };
  }

  if (samples.every((value) => /^(?:https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(value))) {
    return { type: "Website" };
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
    TASK: "Text",
    NAME: "Text",
    "NR.P": "Numbers",
    TEXT: "Text",
    NUMBERS: "Numbers",
    NUMBER: "Numbers",
    STATUS: "Status",
    "STATUSI I DERGESES": "Status",
    DATE: "Date",
    DATA: "Date",
    DROPDOWN: "Dropdown",
    COUNTRY: "Country",
    EMAIL: "Email",
    PHONE: "Phone",
    WEBSITE: "Website",
    MONEY: "Money",
    CURRENCY: "Money",
    PEOPLE: "People",
    FILES: "Files",
    IMAGE: "Image",
    RATING: "Rating",
    COLOR: "Color",
    "QR CODE": "QR",
    BARCODE: "Barcode",
    "LONG TEXT": "LongText",
    TAGS: "Tags",
    LOCATION: "Location",
    "DATE RANGE": "DateRange",
    "MULTI SELECT": "MultiSelect",
    RELATION: "Relation",
    LOOKUP: "Lookup",
    ROLLUP: "Rollup",
  };
  return typeMap[normalizeMondayValue(value)] || null;
}

function normalizeExcelCellValue(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return value;
  if (Object.prototype.hasOwnProperty.call(value, "result")) {
    return normalizeExcelCellValue(value.result);
  }
  if (typeof value.text === "string") return value.text;
  if (Array.isArray(value.richText)) {
    return value.richText.map((part) => part?.text || "").join("");
  }
  return String(value);
}

function excelSerialToIsoDate(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial < 1) return null;
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
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

    const billingError = await requireWritableSubscription(user.id, { workspaceId });
    if (billingError) return billingError;

    const workspaceResult = await pool.query(
      "SELECT id, owner_id FROM workspaces WHERE id = $1 LIMIT 1",
      [workspaceId]
    );
    const workspace = workspaceResult.rows[0];

    if (!workspace || workspace.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer);
    } catch {
      return NextResponse.json({ error: "The uploaded file is not a valid Excel workbook" }, { status: 400 });
    }
    const worksheet = workbook.worksheets[0];
    const firstSheetName = worksheet?.name;

    let smartManageMetadata = null;
    const metadataWorksheet = workbook.getWorksheet('_smart_manage_meta');
    if (metadataWorksheet) {
      const markerValue = metadataWorksheet.getCell('A1').value;
      const rawMetadata = typeof markerValue === "object" && markerValue && "text" in markerValue
        ? markerValue.text
        : markerValue;
      if (typeof rawMetadata === "string") {
        try {
          const parsedMetadata = JSON.parse(rawMetadata);
          if (parsedMetadata?.marker === "SMART_MANAGE_EXPORT" && parsedMetadata?.version === 1) {
            smartManageMetadata = parsedMetadata;
          }
        } catch {
          // Treat malformed metadata as a generic workbook; never fail import.
        }
      }
    }

    if (!firstSheetName) {
      return NextResponse.json({ error: "Workbook is empty" }, { status: 400 });
    }

    const rawRows = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const values = Array.from({ length: Math.max(row.cellCount, 1) }, (_, index) =>
        normalizeExcelCellValue(row.getCell(index + 1).value)
      );
      rawRows.push(values);
    });

    const hasSmartManageSignature = rawRows.some((row) => row.some((cell) =>
      String(cell ?? "").includes("This spreadsheet was created using Smart Manage")
    ));
    const smartManageExport = Boolean(smartManageMetadata || hasSmartManageSignature);

    const mondayHeaderRowIndex = rawRows.findIndex((row) => {
      if (!Array.isArray(row)) return false;
      const normalized = row.map(normalizeMondayValue);
      const hasTask = normalized.includes("NAME") || normalized.includes("TASK");
      const hasStatus = normalized.includes("STATUS") || normalized.includes("STATUSI I DERGESES");
      const hasDate = normalized.includes("DATE") || normalized.includes("DATA");
      return hasTask && hasStatus && hasDate;
    });
    const headerRowIndex = smartManageMetadata?.headerRow
      ? Math.max(0, Number(smartManageMetadata.headerRow) - 1)
      : mondayHeaderRowIndex >= 0
      ? mondayHeaderRowIndex
      : smartManageExport
      ? rawRows.findIndex((row) => Array.isArray(row) && row.length >= 2 && row.some((cell) => String(cell ?? "").trim() !== ""))
      : rawRows.findIndex((row) =>
        Array.isArray(row) && row.some((cell) => String(cell ?? "").trim() !== "")
      );

    if (headerRowIndex === -1) {
      return NextResponse.json({ error: "The selected file does not contain any data" }, { status: 400 });
    }

    const headerRow = Array.isArray(rawRows[headerRowIndex]) ? rawRows[headerRowIndex] : [];
    const declaredTypeRow = !smartManageMetadata && mondayHeaderRowIndex >= 0 && Array.isArray(rawRows[headerRowIndex - 1])
      ? rawRows[headerRowIndex - 1]
      : [];
    const headers = headerRow.map((value, index) => normalizeHeader(value, index));
    const dataRows = rawRows.slice(headerRowIndex + 1).filter((row) => {
      if (!Array.isArray(row) || !row.some((cell) => String(cell ?? "").trim() !== "")) return false;
      const firstCell = normalizeMondayValue(row[0]);
      const normalized = row.map(normalizeMondayValue);
      if (firstCell === "TEST MOS SHKRUJ" || firstCell === "NEW GROUP") return false;
      if (
        (firstCell === "NAME" || firstCell === "TASK")
        && (normalized.includes("STATUS") || normalized.includes("STATUSI I DERGESES"))
        && (normalized.includes("DATE") || normalized.includes("DATA"))
      ) return false;
      return true;
    });

    const columns = headers.map((header, columnIndex) => {
      const declaredColumn = smartManageMetadata?.columns?.[columnIndex];
      const inferred = inferColumnType(dataRows.map((row) => row?.[columnIndex]));
      const declaredType = declaredColumn?.type || getDeclaredColumnType(declaredTypeRow[columnIndex]);
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
        name: declaredColumn?.name || header,
        type,
        order: declaredColumn?.order ?? columnIndex,
        ...(declaredColumn?.width ? { width: declaredColumn.width } : {}),
        ...(uniqueOptions
          ? { options: declaredColumn?.options?.length ? declaredColumn.options : uniqueOptions }
          : inferred.options
          ? { options: inferred.options }
          : {}),
      };
    });

    const tableId = randomUUID();
    const tableName = smartManageMetadata?.boardName || requestedTableName || firstSheetName || "Imported Table";

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
        let normalizedValue = rawValue == null
          ? ""
          : column.type === "Date" && typeof rawValue === "number"
            ? (excelSerialToIsoDate(rawValue) || String(rawValue).trim())
          : column.type === "Numbers" && /^-?\d+(?:[.,]\d+)?$/.test(String(rawValue).trim())
            ? Number(String(rawValue).trim().replace(",", "."))
            : addressFields.isAddressColumn(column) ? String(rawValue) : String(rawValue);
        if (addressFields.isAddressColumn(column)) {
          const validation = addressFields.validateInternationalAddress(normalizedValue);
          if (!validation.valid) throw new Error(`Invalid address in row ${rowIndex + 1}: ${validation.error}`);
          normalizedValue = addressFields.normalizeInternationalAddress(normalizedValue);
        }
        values[column.id] = normalizedValue;
        if (normalizedValue !== "") {
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
