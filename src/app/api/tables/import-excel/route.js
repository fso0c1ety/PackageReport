import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import ExcelJS from 'exceljs';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

function getHexFromExcelColor(color) {
  if (!color) return null;
  let hex = '';
  if (color.argb) {
    hex = color.argb.length === 8 ? color.argb.substring(2) : color.argb;
  } else if (color.theme !== undefined) {
    const themeColors = { 0: 'FFFFFF', 1: '000000', 2: 'E7E6E6', 3: '44546A', 4: '4472C4', 5: 'ED7D31', 6: 'A5A5A5', 7: 'FFC000', 8: '5B9BD5', 9: '70AD47' };
    hex = themeColors[color.theme] || null;
  }
  if (hex && /^[0-9A-Fa-f]{6}$/.test(hex)) return `#${hex}`;
  return null;
}

async function analyzeExcelWithNexusBrain(rawRows) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Nexus Brain API Key missing');
  const sample = rawRows.slice(0, 30);
  const systemPrompt = `You are the Nexus Brain, a world-class data engineering expert specializing in spreadsheet ingestion.\nAnalyze these raw spreadsheet rows and provide a highly accurate JSON schema.\n\nOBJECTIVES:\n1. "headerRowIndex": Find the exact 0-based index where the table headers start.\n2. "dataStartRowIndex": Find where the actual data begins.\n3. "columns": Define each column with name and type from [Text, Status, Date, Numbers, Country, Dropdown]. For Status/Dropdown include options with vibrant hex colors.\n4. "skipRowIndices": Identify empty/summary rows to skip.\n\nReturn ONLY JSON:\n{"headerRowIndex":number,"dataStartRowIndex":number,"columns":[{"name":string,"type":string,"options":[{"value":string,"color":string}]}],"skipRowIndices":[number]}`;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: `Here is a sample of the Excel data:\n${JSON.stringify(sample)}` }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) throw new Error('Nexus Brain Analysis Failed');
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const workspaceId = formData.get('workspaceId');
    const tableName = formData.get('tableName');

    if (!file || typeof file === 'string') return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    if (!workspaceId) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [workspaceId]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet(1) || workbook.worksheets[0];

    const raw = [];
    worksheet.eachRow({ includeEmpty: true }, (row) => {
      const rowValues = [];
      row.eachCell({ includeEmpty: true }, (cell) => { rowValues.push(cell.value === undefined ? null : cell.value); });
      raw.push(rowValues);
    });

    let aiResult;
    try { aiResult = await analyzeExcelWithNexusBrain(raw); } catch (aiErr) {
      console.warn('[Nexus Brain] Fallback to basic detection:', aiErr);
      let headerIdx = 0;
      for (let i = 0; i < Math.min(raw.length, 20); i++) {
        if ((raw[i] || []).filter((c) => c !== null && String(c).trim() !== '').length >= 3) { headerIdx = i; break; }
      }
      aiResult = { headerRowIndex: headerIdx, dataStartRowIndex: headerIdx + 1, columns: (raw[headerIdx] || []).map((name) => ({ name: name ? String(name).trim() : 'Column', type: 'Text' })), skipRowIndices: [] };
    }

    const { headerRowIndex, dataStartRowIndex, columns: aiColumns, skipRowIndices } = aiResult;
    const rawHeaderRow = raw[headerRowIndex] || [];
    const columns = [];
    const colMap = [];

    for (let i = 0; i < aiColumns.length; i++) {
      const aiCol = aiColumns[i];
      if (!aiCol.name) continue;
      const excelColIdx = rawHeaderRow.findIndex((h) => h && String(h).trim().toLowerCase() === aiCol.name.toLowerCase()) + 1;
      const colId = uuidv4();
      const col = { id: colId, name: aiCol.name, type: aiCol.type || 'Text', order: i, _excelColIdx: excelColIdx > 0 ? excelColIdx : i + 1 };
      if (col.type === 'Status' || col.type === 'Dropdown') {
        const optionsMap = new Map();
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber <= dataStartRowIndex) return;
          if (skipRowIndices && skipRowIndices.includes(rowNumber - 1)) return;
          const cell = row.getCell(col._excelColIdx);
          const val = cell.value ? String(cell.value).trim() : null;
          if (val && !optionsMap.has(val)) {
            let hexColor = getHexFromExcelColor(cell.fill?.fgColor);
            if (!hexColor && aiCol.options) { const aiOpt = aiCol.options.find((o) => o.value.toLowerCase() === val.toLowerCase()); hexColor = aiOpt ? aiOpt.color : '#4f8ef7'; }
            optionsMap.set(val, hexColor || '#4f8ef7');
          }
        });
        col.options = Array.from(optionsMap.entries()).map(([value, color]) => ({ value, color }));
      }
      columns.push(col);
      colMap.push(col);
    }

    const tableId = uuidv4();
    const dbColumns = columns.map(({ _excelColIdx, ...rest }) => rest);
    await db.query('INSERT INTO tables (id, name, workspace_id, columns, created_at) VALUES ($1, $2, $3, $4, $5)', [tableId, tableName || worksheet.name, workspaceId, JSON.stringify(dbColumns), Date.now()]);

    let rowCount = 0;
    for (let i = dataStartRowIndex + 1; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      if (row.actualCellCount === 0) continue;
      if (skipRowIndices && skipRowIndices.includes(i - 1)) continue;
      const values = {};
      let hasData = false;
      for (const col of colMap) {
        const cell = row.getCell(col._excelColIdx);
        let val = cell.value;
        if (val && typeof val === 'object' && 'result' in val) val = val.result;
        if (val && val.richText) val = val.richText.map((t) => t.text).join('');
        if (val && val.text && val.hyperlink) val = val.text;
        if (val instanceof Date) { values[col.id] = val.toISOString(); } else if (val !== null && val !== undefined) { values[col.id] = String(val).trim(); } else { values[col.id] = null; }
        if (values[col.id]) hasData = true;
      }
      if (hasData) { await db.query('INSERT INTO rows (id, table_id, values) VALUES ($1, $2, $3)', [uuidv4(), tableId, JSON.stringify(values)]); rowCount++; }
    }

    return NextResponse.json({ tableId, tableName: tableName || worksheet.name, columns: dbColumns, rowCount });
  } catch (err) {
    console.error('[Import Excel Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
