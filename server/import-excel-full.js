const ExcelJS = require('exceljs');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

async function main() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('C:\\Users\\Valon\\Desktop\\PackageReport\\AGS_Transport_To_Do_1774883157.xlsx');
    const worksheet = workbook.worksheets[0];
    
    // Find Workspace
    const email = 'ags@ags-logistics.org';
    const userResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rowCount === 0) throw new Error('User not found');
    const userId = userResult.rows[0].id;
    
    const wsResult = await db.query('SELECT id FROM workspaces WHERE owner_id = $1', [userId]);
    if (wsResult.rowCount === 0) throw new Error('Workspace not found');
    const workspaceId = wsResult.rows[0].id;

    const tableId = uuidv4();
    const tableName = 'AGS Transport To-Do';

    const headerRow = worksheet.getRow(5).values;
    const columns = [];
    const colIdMap = {}; 
    
    // Setup predefined status options if needed
    const statusOptions = [
        { value: 'E ANULUAR', color: '#ff3333' },
        { value: 'I DERGUAR', color: '#33cc33' },
        { value: 'NË PROCES', color: '#ffcc00' }
    ];

    for (let i = 1; i < headerRow.length; i++) {
        if (!headerRow[i]) continue;
        const colName = headerRow[i].toString().trim();
        const colId = uuidv4();
        
        let type = 'Text';
        let options = undefined;

        if (colName.toLowerCase() === 'data') type = 'Date';
        if (colName.toLowerCase() === 'statusi i dergeses') {
            type = 'Status';
            options = statusOptions;
        } else if (['IMPORTUESI', 'EKSPORTUESI', 'TRANSPORTUESI'].includes(colName)) {
            type = 'Dropdown';
            options = []; // will populate dynamically if needed, or leave empty
        }

        const colObj = {
            id: colId,
            name: colName,
            type,
            order: i - 1
        };
        if (options) colObj.options = options;
        
        columns.push(colObj);
        colIdMap[i] = colId;
    }

    await db.query(`INSERT INTO tables (id, name, workspace_id, columns, created_at, doc_content) VALUES ($1, $2, $3, $4, $5, '')`, 
        [tableId, tableName, workspaceId, JSON.stringify(columns), Date.now()]);

    let count = 0;
    // Data starts at row 9 based on our analysis
    for (let i = 9; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        const rowValues = row.values;
        if (!rowValues || rowValues.length < 2) continue; // ignore empty arrays
        
        // Skip entirely empty rows
        const hasData = rowValues.some((v, idx) => idx > 0 && v !== null && v !== '');
        if (!hasData) continue;

        const valObj = {};
        for (const [excelIdx, colId] of Object.entries(colIdMap)) {
            let val = rowValues[excelIdx];
            if (val === null || val === undefined) {
                valObj[colId] = '';
                continue;
            }
            
            if (typeof val === 'object' && val instanceof Date) {
                valObj[colId] = val.toISOString(); // keep ISO string for Date
            } else if (typeof val === 'object' && val.text) {
                valObj[colId] = val.text; // formula or rich text
            } else {
                valObj[colId] = String(val).trim();
            }
        }

        // If it's a group header like "TEST 1", usually it only has the first column populated
        // The frontend expects rows to map directly.

        const taskId = uuidv4();
        await db.query(`INSERT INTO rows (id, table_id, values, created_by) VALUES ($1, $2, $3, $4)`, 
            [taskId, tableId, JSON.stringify(valObj), userId]);
        count++;
    }

    console.log(`Import successful! Migrated ${count} rows into table: ${tableName}`);
    process.exit(0);
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
