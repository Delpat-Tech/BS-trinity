import * as XLSX from 'xlsx';
import * as path from 'path';

const employees = [
  { id: 1, name: 'Alice Valid' },
  { id: 2, name: 'Bob Sandwich' },
  { id: 3, name: 'Charlie BigSandwich' },
  { id: 4, name: 'David HalfAbsent' },
  { id: 5, name: 'Eve PaidFlank' }
];

const months = [
  { m: 4, name: 'April', days: 30, year: 2026 },
  { m: 5, name: 'May', days: 31, year: 2026 },
  { m: 6, name: 'June', days: 30, year: 2026 },
  { m: 7, name: 'July', days: 31, year: 2026 }
];

for (const monthObj of months) {
  const data: any[][] = [];
  data.push(['Biometric Attendance Report']);
  for(let i=0; i<10; i++) data.push([]);

  // Find date row index
  const daysRow: any[] = ['', 'Dates'];
  const monthShort = monthObj.name.substring(0, 3);
  for (let i = 1; i <= monthObj.days; i++) {
    daysRow.push(`${i.toString().padStart(2, '0')}-${monthShort}`);
  }
  data.push(daysRow);

  for (const emp of employees) {
    // anchor row `r`
    data.push(['', 'Employee Code:-', emp.id]); // r
    data.push(['', 'Employee Name:-', emp.name]); // r+1
    data.push(['', 'Shift', ...Array(monthObj.days).fill('General')]); // r+2
    
    const inRow = ['', 'In Time']; // r+3
    const outRow = ['', 'Out Time']; // r+4
    const r5 = ['', 'Late By']; // r+5
    const r6 = ['', 'Early By']; // r+6
    const r7 = ['', 'Total OT']; // r+7
    const r8 = ['', 'Duration']; // r+8
    const r9 = ['', 'Shift Hrs']; // r+9
    const statusRow = ['', 'Status']; // r+10

    for (let d = 1; d <= monthObj.days; d++) {
      const date = new Date(monthObj.year, monthObj.m - 1, d);
      const isSunday = date.getDay() === 0;

      let inTime: string | null = '09:30';
      let outTime: string | null = '19:30';
      let status = 'P';

      if (isSunday) { inTime = null; outTime = null; status = 'WO'; }

      if (emp.id === 2) {
        if (date.getDay() === 6 && d <= 7) { inTime = null; outTime = null; status = 'A'; } 
        if (date.getDay() === 1 && d <= 7) { inTime = null; outTime = null; status = 'A'; } 
      }

      if (emp.id === 3) {
        if (isSunday && d > 7 && d <= 14) { inTime = '09:30'; outTime = '19:30'; status = 'P'; }
        if (d === 12 && !isSunday) { outTime = '14:00'; status = 'P'; }
      }

      if (emp.id === 4) {
        if (d === 15) { inTime = null; outTime = null; status = 'A'; }
      }

      if (emp.id === 5) {
        if (d === 20) { inTime = null; outTime = null; status = 'A'; }
        if (d === 21 && !isSunday) { outTime = null; status = 'P'; }
      }

      inRow.push(inTime || '');
      outRow.push(outTime || '');
      r5.push('');
      r6.push('');
      r7.push('');
      r8.push('10:00'); // Dummy duration
      r9.push('10:00'); 
      statusRow.push(status);
    }

    data.push(inRow); // r+3
    data.push(outRow); // r+4
    data.push(r5); // r+5
    data.push(r6); // r+6
    data.push(r7); // r+7
    data.push(r8); // r+8
    data.push(r9); // r+9
    data.push(statusRow); // r+10
    data.push([]); // padding
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  const outPath = path.join(__dirname, '..', 'public', 'dummy_data', `attendance_${monthObj.name.toLowerCase()}.xlsx`);
  XLSX.writeFile(wb, outPath);
  console.log(`Created ${outPath}`);
}
