const ExcelJS = require('exceljs');
const path = require('path');

async function run() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(__dirname, 'June 2026 Final Salary sheet.xlsx'));
  const ws = wb.worksheets[0];
  const r2 = ws.getRow(2).values;
  const r3 = ws.getRow(3).values;
  console.log("Row 2:", JSON.stringify(r2));
  console.log("Row 3:", JSON.stringify(r3));
}
run();
