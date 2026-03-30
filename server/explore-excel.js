const ExcelJS = require('exceljs');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

async function main() {
    console.log("--- Exploring Excel ---");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('C:\\Users\\Valon\\Desktop\\PackageReport\\AGS_Transport_To_Do_1774883157.xlsx');
    const worksheet = workbook.worksheets[0];
    
    const fs = require('fs');
    const outputData = { rows: [], user: null, workspaces: [] };

    for (let i = 1; i <= Math.min(10, worksheet.rowCount); i++) {
        const row = worksheet.getRow(i);
        outputData.rows.push(row.values);
    }
    
    console.log("\n--- Checking User & DB ---");
    const email = 'ags@ags-logistics.org';
    const userResult = await db.query('SELECT id, name FROM users WHERE email = $1', [email]);
    if (userResult.rowCount === 0) {
        console.log(`Error: User with email ${email} not found.`);
        process.exit(1);
    }
    const user = userResult.rows[0];
    outputData.user = user;
    
    const wsResult = await db.query('SELECT id, name FROM workspaces WHERE owner_id = $1', [user.id]);
    outputData.workspaces = wsResult.rows;

    fs.writeFileSync('explore.json', JSON.stringify(outputData, null, 2));
    console.log("Wrote explore.json");
    
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
