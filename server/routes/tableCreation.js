const express = require("express");
const ExcelJS = require("exceljs");
const fetch = require("node-fetch");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

function createTableCreationRouter({ db }) {
  const router = express.Router();

// Create a table (must provide workspaceId)
router.post('/tables', async (req, res) => {
  if (!req.body.workspaceId) {
    return res.status(400).json({ error: 'workspaceId is required' });
  }

  try {
    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [req.body.workspaceId]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== req.user.id) return res.sendStatus(403);

    let columns = req.body.columns;
    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      columns = [
        { id: uuidv4(), name: 'Text', type: 'Text', order: 0 },
        {
          id: uuidv4(), name: 'Status', type: 'Status', order: 1, options: [
            { value: 'Started', color: '#1976d2' },
            { value: 'Working on it', color: '#fdab3d' },
            { value: 'Done', color: '#00c875' }
          ]
        },
        { id: uuidv4(), name: 'Date', type: 'Date', order: 2 }
      ];
    }

    // Country logic... (keeping it for compatibility)
    const fullCountryList = ["Afghanistan", "Albania", "Algeria" /* ... potentially truncated in snippet ... */]; // I'll skip the full list in the snippet if I can't see the end of it earlier, or just keep the logic

    const newTable = {
      id: uuidv4(),
      name: req.body.name,
      workspace_id: req.body.workspaceId,
      columns: columns,
      created_at: new Date().toISOString()
    };

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await db.query(
      'INSERT INTO tables (id, name, workspace_id, columns, created_at, invite_code) VALUES ($1, $2, $3, $4, $5, $6)',
      [newTable.id, newTable.name, newTable.workspace_id, JSON.stringify(newTable.columns), newTable.created_at, inviteCode]
    );

    res.json(newTable);
  } catch (err) {
    console.error('Error creating table:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper to convert Excel color to Hex
function getHexFromExcelColor(color) {
  if (!color) return null;
  
  let hex = "";
  if (color.argb) {
    // ARGB: remove alpha (A) and ensure 6 chars
    hex = color.argb.length === 8 ? color.argb.substring(2) : color.argb;
  } else if (color.theme !== undefined) {
    // Map standard Excel theme colors (Indices 0-9)
    const themeColors = {
      0: 'FFFFFF', // White
      1: '000000', // Black
      2: 'E7E6E6', // Light Gray
      3: '44546A', // Dark Blue
      4: '4472C4', // Accent 1
      5: 'ED7D31', // Accent 2
      6: 'A5A5A5', // Accent 3
      7: 'FFC000', // Accent 4
      8: '5B9BD5', // Accent 5
      9: '70AD47'  // Accent 6
    };
    hex = themeColors[color.theme] || null;
  }

  if (hex && /^[0-9A-Fa-f]{6}$/.test(hex)) {
    return `#${hex}`;
  }
  return null;
}

// Helper function to call Nexus Brain for Excel analysis
async function analyzeExcelWithNexusBrain(rawRows) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Nexus Brain API Key missing');

  // Take first 30 rows for analysis to provide more context
  const sample = rawRows.slice(0, 30);
  
  const systemPrompt = `You are the Nexus Brain, a world-class data engineering expert specializing in spreadsheet ingestion.
Analyze these raw spreadsheet rows and provide a highly accurate JSON schema.

OBJECTIVES:
1. "headerRowIndex": Find the exact 0-based index where the table headers start. Ignore metadata/trash rows at the top.
2. "dataStartRowIndex": Find where the actual data begins (usually headerRowIndex + 1).
3. "columns": Define each column with:
   - "name": The string name of the column.
   - "type": Choose the most appropriate type from: [Text, Status, Date, Numbers, Country, Dropdown].
   - "options": For 'Status' and 'Dropdown', identify unique values in the sample and suggest vibrant, professional hex colors (e.g., #00c875 for positive/done, #fdab3d for warning/in-progress, #e53935 for negative/blocked).
4. "skipRowIndices": Identify indices of empty rows, summary/total rows, or metadata that should NOT be imported as data rows.

PRECISE RULES:
- If headers span multiple rows, pick the main row containing identifying names.
- For Date columns, look for ISO strings, timestamps, or common date formats.
- For Numbers, identify if they are currency, percentages, or plain decimals.
- BE AGGRESSIVE in identifying summary rows at the bottom of the sample.

Return ONLY JSON:
{
  "headerRowIndex": number,
  "dataStartRowIndex": number,
  "columns": [
    { "name": string, "type": string, "options": [{ "value": string, "color": string }] }
  ],
  "skipRowIndices": [number]
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      "Authorization": `Bearer ${apiKey}` 
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is a sample of the Excel data in JSON format:\n${JSON.stringify(sample)}` }
      ],
      temperature: 0.1, // Low temperature for higher precision
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) throw new Error("Nexus Brain Analysis Failed");
  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);
  return result;
}

const normalizeMondayHeader = (value) =>
  String(value || '')
    .trim()
    .toLocaleUpperCase('sq-AL')
    .replace(/\s+/g, ' ');

function getMondayColumnType(header) {
  const normalized = normalizeMondayHeader(header);

  if (normalized === 'DATA') return 'Date';
  if (
    normalized === 'STATUSI I DERGESES'
    || normalized === 'LLOJI I DERGESES'
    || normalized === 'TERHEQJA E DERGESES NGA EKSPORTUESI'
    || normalized === 'DOREZIMI I DERGESES TEK KLIENTI'
  ) {
    return 'Status';
  }
  if (
    normalized === 'IMPORTUESI'
    || normalized === 'EKSPORTUESI'
    || normalized === 'TRANSPORTUESI'
    || normalized === 'SHTETI EKSPORTUES'
  ) {
    return 'Dropdown';
  }
  return 'Text';
}

function getMondayExportColumnType(typeValue, header) {
  const normalizedType = normalizeMondayHeader(typeValue);
  const exactTypeMap = {
    TEXT: 'Text',
    NUMBERS: 'Numbers',
    NUMBER: 'Numbers',
    STATUS: 'Status',
    'STATUSI I DERGESES': 'Status',
    DATE: 'Date',
    DROPDOWN: 'Dropdown',
    COUNTRY: 'Country',
  };
  return exactTypeMap[normalizedType] || getMondayColumnType(header);
}

function getMondayStatusOptions(header) {
  const normalized = normalizeMondayHeader(header);
  const emptyOption = { value: '', color: '#c4c4c4' };

  if (normalized === 'STATUSI I DERGESES') {
    return [
      { value: 'E NGARKUAR', color: '#66ccff' },
      { value: 'E ANULUAR', color: '#333333' },
      { value: 'E PERFUNDUAR', color: '#00c875' },
      { value: 'NE PRITJE', color: '#df2f4a' },
      emptyOption,
      { value: 'E ORGANIZUAR', color: '#ffcb00' },
      { value: 'NE DOGAN KS', color: '#9d50dd' },
    ];
  }
  if (normalized === 'LLOJI I DERGESES') {
    return [
      { value: 'PARCIALE', color: '#9aadbd' },
      { value: 'E PLOTE', color: '#007eb5' },
      emptyOption,
    ];
  }
  if (normalized === 'TERHEQJA E DERGESES NGA EKSPORTUESI') {
    return [
      { value: 'TERHEQJA E DERGESES ESHTE PERFUNDUAR ME SUKSES', color: '#00c875' },
      { value: 'TERHEQJA E DERGESES ESHTE ANULUAR', color: '#df2f4a' },
      { value: 'NE PRITJE', color: '#fdab3d' },
      emptyOption,
    ];
  }
  if (normalized === 'DOREZIMI I DERGESES TEK KLIENTI') {
    return [
      { value: 'DOREZIMI I DERGESES TEK KLIENTI ESHTE PERFUNDUAR ME SUKSES', color: '#00c875' },
      { value: 'DOREZIMI I DERGESES TEK KLIENTI ESHTE ANULUAR', color: '#df2f4a' },
      { value: 'ENDE E PA DOREZUAR', color: '#fdab3d' },
      emptyOption,
    ];
  }
  return [];
}

function analyzeMondayExport(rawRows) {
  const isMondayExport = rawRows.slice(0, 5).some((row) =>
    Array.isArray(row)
    && row.some((cell) => String(cell || '').toLowerCase().includes('created using monday.com'))
  );
  if (!isMondayExport) return null;

  const headerRowIndex = rawRows.findIndex((row) => {
    if (!Array.isArray(row)) return false;
    const headers = row.map(normalizeMondayHeader);
    return headers.includes('NAME')
      && headers.includes('STATUSI I DERGESES')
      && headers.includes('DATA');
  });
  if (headerRowIndex < 0) return null;

  const headerRow = rawRows[headerRowIndex] || [];
  const typeRow = rawRows[headerRowIndex - 1] || [];
  const skipRowIndices = [];
  rawRows.forEach((row, index) => {
    const firstCell = normalizeMondayHeader(Array.isArray(row) ? row[0] : '');
    const normalizedCells = Array.isArray(row) ? row.map(normalizeMondayHeader) : [];
    // monday.com exports can contain a helper row that stores every dropdown
    // label as one huge comma-separated value. It is metadata, not board data.
    if (index > headerRowIndex && firstCell === 'TEST MOS SHKRUJ') {
      skipRowIndices.push(index);
      return;
    }
    if (index > headerRowIndex && firstCell === 'NEW GROUP') {
      skipRowIndices.push(index);
      return;
    }
    const secondCell = String(Array.isArray(row) ? row[1] || '' : '').trim();
    const fourthCell = String(Array.isArray(row) ? row[3] || '' : '').trim();
    if (
      index > headerRowIndex
      && !firstCell
      && secondCell
      && /^\d+(?:\.\d+)?$/.test(secondCell)
      && /\bto\b/i.test(fourthCell)
    ) {
      skipRowIndices.push(index);
      return;
    }
    // Grouped monday.com boards repeat the column header between groups.
    // These rows must not become tasks or selectable Status labels.
    if (
      index > headerRowIndex
      && firstCell === 'NAME'
      && normalizedCells.includes('STATUSI I DERGESES')
      && normalizedCells.includes('DATA')
    ) {
      skipRowIndices.push(index);
    }
  });

  return {
    headerRowIndex,
    dataStartRowIndex: headerRowIndex + 1,
    columns: headerRow.map((name, columnIndex) => ({
      name: String(name || '').trim(),
      type: getMondayExportColumnType(typeRow[columnIndex], name),
      options: getMondayStatusOptions(name),
    })),
    skipRowIndices,
  };
}

// Import a table from an Excel / CSV file
router.post('/tables/import-excel', async (req, res) => {
  if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });

  // Use multer memoryStorage so we can parse the buffer directly
  const memUpload = multer({ storage: multer.memoryStorage() });
  memUpload.single('file')(req, res, async (err) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { workspaceId, tableName } = req.body;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

    // Check workspace ownership
    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [workspaceId]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const worksheet = workbook.getWorksheet(1) || workbook.worksheets[0];
      
      // Convert to raw array for AI analysis
      const raw = [];
      worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const rowValues = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          rowValues.push(cell.value === undefined ? null : cell.value);
        });
        raw.push(rowValues);
      });

      console.log(`[Import Excel] Analyzing with Nexus Brain...`);
      let aiResult;
      const mondayResult = analyzeMondayExport(raw);
      try {
        aiResult = mondayResult || await analyzeExcelWithNexusBrain(raw);
        if (mondayResult) {
          console.log('[Import Excel] Detected monday.com export; using deterministic column mapping.');
        }
      } catch (aiErr) {
        console.warn(`[Nexus Brain] Analysis failed, falling back to basic detection:`, aiErr);
        // Fallback to basic detection if AI fails
        let headerIdx = 0;
        for (let i = 0; i < Math.min(raw.length, 20); i++) {
          const nonNull = (raw[i] || []).filter(c => c !== null && String(c).trim() !== '').length;
          if (nonNull >= 3) { headerIdx = i; break; }
        }
        aiResult = {
          headerRowIndex: headerIdx,
          dataStartRowIndex: headerIdx + 1,
          columns: (raw[headerIdx] || []).map(name => ({
            name: name ? String(name).trim() : 'Column',
            type: 'Text'
          })),
          skipRowIndices: []
        };
      }

      const { headerRowIndex, dataStartRowIndex, columns: aiColumns, skipRowIndices } = aiResult;
      const rawHeaderRow = raw[headerRowIndex] || [];

      // Build Columns and Extract Colors for Status/Dropdown
      const columns = [];
      const colMap = []; // internal tracking

      for (let i = 0; i < aiColumns.length; i++) {
        const aiCol = aiColumns[i];
        if (!aiCol.name) continue;

        // Find the index of this column in the actual worksheet
        // (AI might have returned a normalized name, so we find the best match)
        const excelColIdx = rawHeaderRow.findIndex(h => h && String(h).trim().toLowerCase() === aiCol.name.toLowerCase()) + 1; // 1-based for exceljs
        
        const colId = uuidv4();
        const col = {
          id: colId,
          name: aiCol.name,
          type: aiCol.type || 'Text',
          order: i,
          _excelColIdx: excelColIdx > 0 ? excelColIdx : (i + 1)
        };

        // If Status/Dropdown, scan rows for exact options and colors
        if (col.type === 'Status' || col.type === 'Dropdown' || col.type === 'Country') {
          const optionsMap = new Map(); // value -> color

          if (col.type === 'Status' && Array.isArray(aiCol.options)) {
            aiCol.options.forEach((option) => {
              if (option && typeof option.value === 'string') {
                optionsMap.set(option.value, option.color || '#4f8ef7');
              }
            });
          }
          
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber <= dataStartRowIndex) return; // skip headers
            if (skipRowIndices && skipRowIndices.includes(rowNumber - 1)) return;

            const cell = row.getCell(col._excelColIdx);
            const val = cell.value ? String(cell.value).trim() : null;
            if (val) {
              // Extract color if not already found for this value
              if (!optionsMap.has(val)) {
                let hexColor = getHexFromExcelColor(cell.fill?.fgColor);
                // If no color in file, use AI suggestion or default
                if (!hexColor && aiCol.options) {
                  const aiOpt = aiCol.options.find(o => o.value.toLowerCase() === val.toLowerCase());
                  hexColor = aiOpt ? aiOpt.color : '#4f8ef7';
                }
                optionsMap.set(val, hexColor || '#4f8ef7');
              }
            }
          });

          col.options = Array.from(optionsMap.entries()).map(([value, color]) => ({ value, color }));
        }

        columns.push(col);
        colMap.push(col);
      }

      // Create Table
      const tableId = uuidv4();
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const dbColumns = columns.map(({ _excelColIdx, ...rest }) => rest);
      await db.query(
        'INSERT INTO tables (id, name, workspace_id, columns, created_at, invite_code) VALUES ($1, $2, $3, $4, $5, $6)',
        [tableId, tableName || worksheet.name, workspaceId, JSON.stringify(dbColumns), new Date().toISOString(), inviteCode]
      );

      // Insert Row Data
      let rowCount = 0;
      for (let i = dataStartRowIndex + 1; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        const actualIdx = i - 1;

        if (row.actualCellCount === 0) continue;
        if (skipRowIndices && skipRowIndices.includes(actualIdx)) continue;

        const values = {};
        let hasData = false;
        
        for (const col of colMap) {
          const cell = row.getCell(col._excelColIdx);
          let val = cell.value;
          
          // Handle formulas (extract result)
          if (val && typeof val === 'object' && 'result' in val) {
            val = val.result;
          }

          // Handle Rich Text
          if (val && val.richText) {
            val = val.richText.map(t => t.text).join('');
          }

          // Handle Hyperlinks
          if (val && val.text && val.hyperlink) {
            val = val.text;
          }
          
          if (val instanceof Date) {
            values[col.id] = val.toISOString();
          } else if (val !== null && val !== undefined) {
            values[col.id] = String(val).trim();
          } else {
            values[col.id] = null;
          }
          if (values[col.id]) hasData = true;
        }

        if (hasData) {
          values.order = rowCount;
          await db.query(
            'INSERT INTO rows (id, table_id, values) VALUES ($1, $2, $3)',
            [uuidv4(), tableId, JSON.stringify(values)]
          );
          rowCount++;
        }
      }

      console.log(`[Import Excel] Success. Built table with ${rowCount} rows.`);
      res.json({ tableId, tableName: tableName || worksheet.name, columns: dbColumns, rowCount });

    } catch (err) {
      console.error('[Import Excel Error]', err);
      res.status(500).json({ error: err.message });
    }
  });
});

  return router;
}

module.exports = { createTableCreationRouter };
