const ExcelJS = require('exceljs');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

async function main() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('C:\\Users\\Valon\\Desktop\\PackageReport\\AGS_Transport_To_Do_1774883157.xlsx');
    const worksheet = workbook.worksheets[0];
    
    // Target User
    const email = 'ags@ags-logistics.org';
    const userResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rowCount === 0) throw new Error('User not found');
    const userId = userResult.rows[0].id;
    
    // -- MANDATORY DEEP CLEANUP OF ALL PREVIOUS ATTEMPTS --
    const allOldWs = await db.query('SELECT id FROM workspaces WHERE name = $1 AND owner_id = $2', ['AGS Transport Workspace', userId]);
    for (const ws of allOldWs.rows) {
        const tables = await db.query('SELECT id FROM tables WHERE workspace_id = $1', [ws.id]);
        for (const t of tables.rows) {
            await db.query('DELETE FROM rows WHERE table_id = $1', [t.id]);
        }
        await db.query('DELETE FROM tables WHERE workspace_id = $1', [ws.id]);
        await db.query('DELETE FROM workspaces WHERE id = $1', [ws.id]);
        console.log(`Deep Clean: Deleted workspace instance ${ws.id}`);
    }

    // -- CREATE FRESH WORKSPACE --
    const workspaceId = uuidv4();
    await db.query(`INSERT INTO workspaces (id, name, owner_id) VALUES ($1, $2, $3)`, [workspaceId, 'AGS Transport Workspace', userId]);
    console.log(`Initialized fresh workspace: ${workspaceId}`);

    // -- PRE-SCAN FOR DROPDOWN OPTIONS --
    // Indices: 6=IMPORTUESI, 7=EKSPORTUESI, 8=TRANSPORTUESI
    const dropdownUniqueValues = { 6: new Set(), 7: new Set(), 8: new Set() };
    for (let i = 6; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        [6, 7, 8].forEach(idx => {
            const val = row.values[idx];
            if (val) {
                const str = (typeof val === 'object' && val.text) ? val.text : String(val).trim();
                // Avoid headers appearing as options
                if (str && !['IMPORTUESI', 'EKSPORTUESI', 'TRANSPORTUESI', 'Name', 'Subitems'].includes(str)) {
                    dropdownUniqueValues[idx].add(str);
                }
            }
        });
    }

    const createOptions = (setValue) => {
        return Array.from(setValue).map(val => ({
            id: uuidv4(),
            value: val,
            color: '#c4c4c4'
        }));
    };

    // -- TABLE CONFIGURATION --
    const statusOptionsMain = [
        { value: 'E NGARKUAR', color: '#66ccff' },
        { value: 'E PERFUNDUAR', color: '#00c875' },
        { value: 'NE PRITJE', color: '#df2f4a' },
        { value: 'E ORGANIZUAR', color: '#ffcb00' },
        { value: 'NE DOGAN KS', color: '#9d50dd' },
        { value: 'E ANULUAR', color: '#333333' }
    ];
    const statusOptionsPickup = [
        { value: 'TERHEQJA E DERGESES ESHTE PERFUNDUAR ME SUKSES', color: '#00c875' },
        { value: 'TERHEQJA E DERGESES ESHTE ANULUAR', color: '#df2f4a' },
        { value: 'NE PRITJE', color: '#fdab3d' }
    ];
    const statusOptionsDelivery = [
        { value: 'DOREZIMI I DERGESES TEK KLIENTI ESHTE PERFUNDUAR ME SUKSES', color: '#00c875' },
        { value: 'DOREZIMI I DERGESES TEK KLIENTI ESHTE ANULUAR', color: '#df2f4a' },
        { value: 'ENDE E PA DOREZUAR', color: '#fdab3d' }
    ];

    const headerRowValues = worksheet.getRow(5).values;
    const columns = [];
    const colIdMap = {};

    for (let i = 1; i < headerRowValues.length; i++) {
        const colName = headerRowValues[i];
        if (!colName || colName === 'Subitems') continue;
        
        const colId = uuidv4();
        let type = 'Text';
        let options = undefined;
        const lowerName = colName.toLowerCase();

        if (i === 1) {
            // Task Name column
        } else if (lowerName === 'data' || lowerName === 'date') {
            type = 'Date';
        } else if (lowerName.includes('statusi')) {
            type = 'Status';
            options = statusOptionsMain;
        } else if (lowerName.includes('terheqja')) {
            type = 'Status';
            options = statusOptionsPickup;
        } else if (lowerName.includes('dorezimi')) {
            type = 'Status';
            options = statusOptionsDelivery;
        } else if (lowerName.includes('shteti')) { 
            type = 'Country';
        } else if ([6, 7, 8].includes(i)) {
            type = 'Dropdown';
            options = createOptions(dropdownUniqueValues[i]);
        }

        columns.push({
            id: colId,
            name: (i === 1) ? 'Importuesi' : colName,
            type,
            order: i,
            width: (i === 1) ? 250 : 150,
            ...(options && { options })
        });
        colIdMap[i] = colId;
    }

    const tableId = uuidv4();
    await db.query(`INSERT INTO tables (id, name, workspace_id, columns, created_at, doc_content) VALUES ($1, $2, $3, $4, $5, '')`, 
        [tableId, 'AGS Transport', workspaceId, JSON.stringify(columns), Date.now()]);

    // -- REVERSE INSERTION FOR TOP-LEVEL FIDELITY --
    // We insert Row 183 FIRST (Oldest) and Row 6 LAST (Newest).
    // Board sorts by NEWEST FIRST -> Row 6 will be at the Top.
    let count = 0;
    const startTimeStamp = Date.now();
    for (let i = worksheet.rowCount; i >= 6; i--) {
        const rowValues = worksheet.getRow(i).values;
        if (!rowValues || rowValues.length < 2) continue;
        if (String(rowValues[1]).trim() === 'Name') continue;

        const valObj = {};
        for (const [excelIdx, colId] of Object.entries(colIdMap)) {
            let val = rowValues[excelIdx];
            if (val === null || val === undefined) {
                valObj[colId] = '';
            } else if (val instanceof Date) {
                valObj[colId] = val.toISOString().split('T')[0];
            } else if (typeof val === 'object' && val.text) {
                valObj[colId] = val.text;
            } else {
                valObj[colId] = String(val).trim();
            }
        }

        // Increment timestamp so Row 6 is newest
        const createdAt = new Date(startTimeStamp + (count * 1000)); 
        await db.query(`INSERT INTO rows (id, table_id, values, created_by, created_at) VALUES ($1, $2, $3, $4, $5)`, 
            [uuidv4(), tableId, JSON.stringify(valObj), userId, createdAt]);
        count++;
    }

    console.log(`\nMASTER RE-IMPORT SUMMARY:`);
    console.log(`- Copy Cleanup: Completed`);
    console.log(`- Final Count: ${count} items`);
    console.log(`- Visual Top: ${worksheet.getRow(6).values[1]} (TEST 1)`);
    console.log(`- Visual Bottom: ${worksheet.getRow(worksheet.rowCount).values[6] || 'Item 183'}`);
    process.exit(0);
}

main().catch(err => {
    console.error('Master re-import failed:', err);
    process.exit(1);
});
