import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import path from 'path';
import { Employee } from '../src/models/Employee';
import { LedgerEntry } from '../src/models/LedgerEntry';

async function seedJune() {
  // Load .env file manually
  const fs = require('fs');
  const dotenvPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(dotenvPath)) {
    const envContent = fs.readFileSync(dotenvPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    }
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trinity';
  await mongoose.connect(uri, { bufferCommands: false });

  console.log('Connected to MongoDB');

  const wb = new ExcelJS.Workbook();
  const filePath = path.join(__dirname, '..', 'June 2026 Final Salary sheet.xlsx');
  await wb.xlsx.readFile(filePath);
  const ws = wb.worksheets[0];
  
  console.log(`Worksheet name: ${ws.name}, row count: ${ws.rowCount}`);

  console.log('Reading from June 2026 sheet...');

  let employeesCreated = 0;
  let balancesCreated = 0;

  // Clear existing employees and ledger for a clean run
  await Employee.deleteMany({});
  await LedgerEntry.deleteMany({});
  console.log('Cleared existing employees and ledger entries.');

  const seen = new Set<number>();

  // The actual data seems to start around row 4. Let's iterate.
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 4) {
      console.log('Row 4 cells:', row.values);
    }
    if (rowNumber < 3) return; // Skip headers

    let machineId: number;
    const cellValue = row.getCell(2).value;
    if (typeof cellValue === 'number') {
      machineId = cellValue;
    } else if (typeof cellValue === 'string') {
      machineId = parseInt(cellValue.trim(), 10);
    } else {
      return;
    }
    
    if (isNaN(machineId)) return;

    if (seen.has(machineId)) {
      console.log(`Skipping duplicate machineId ${machineId} at row ${rowNumber}`);
      return;
    }
    seen.add(machineId);

    const name = (row.getCell(3).value as string) || `Employee ${machineId}`;
    const designation = (row.getCell(4).value as string) || 'Staff';
    
    let dateOfJoiningStr = '2020-01-01'; // fallback
    const rawDoj = row.getCell(5).value;
    if (rawDoj instanceof Date) {
      dateOfJoiningStr = rawDoj.toISOString().split('T')[0];
    } else if (typeof rawDoj === 'string') {
      if (rawDoj.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dateOfJoiningStr = rawDoj;
      }
    }

    let fixedSalary = Number(row.getCell(6).value) || 0;
    if (fixedSalary === 0) fixedSalary = 10000; // fallback if empty

    const paymentModeStr = (row.getCell(21).value as string) || 'Bank';
    const paymentMode = paymentModeStr.toLowerCase().includes('cash') ? 'Cash' : 'Bank';

    const emp = new Employee({
      _id: machineId,
      machineId,
      name,
      designation,
      dateOfJoining: dateOfJoiningStr,
      paymentMode,
      isIgnored: false,
      salaryRevisions: [{
        fixedSalary,
        effectiveFrom: '2020-01-01',
        createdAt: new Date()
      }]
    });

    emp.save().then(async (savedEmp: any) => {
      // Check column 15 for advance (ADVANCE AS ON 1ST March. 2025)
      const advanceVal = Number(row.getCell(15).value) || 0;
      if (advanceVal > 0) {
        await LedgerEntry.create({
          employeeId: savedEmp._id,
          periodId: null,
          date: '2026-05-31', // Cutover date right before June
          type: 'opening',
          amount: advanceVal,
          note: 'Opening balance from June sheet'
        });
        balancesCreated++;
      }
    }).catch(console.error);

    employeesCreated++;
  });

  // wait a bit for async saves to finish (dirty but works for a quick script)
  setTimeout(() => {
    console.log(`Seeded ${employeesCreated} employees.`);
    console.log(`Seeded ${balancesCreated} opening ledger balances.`);
    mongoose.disconnect();
    process.exit(0);
  }, 2000);
}

seedJune().catch(console.error);
