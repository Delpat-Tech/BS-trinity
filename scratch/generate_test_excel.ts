import * as XLSX from 'xlsx';

const month = 4; // May
const year = 2026;
const daysInMonth = 30;

const employees = [
  { id: 1, name: 'Alice Valid' },
  { id: 2, name: 'Bob Sandwich' },
  { id: 3, name: 'Charlie BigSandwich' },
  { id: 4, name: 'David HalfAbsent' },
  { id: 5, name: 'Eve PaidFlank' }
];

const data: any[][] = [];

// Push headers (not strict, but let's emulate the structure)
data.push(['Biometric Attendance Report']);
data.push([]);
data.push([]);
data.push([]);
data.push([]);
data.push([]);
data.push([]);
data.push([]);
data.push([]);
data.push([]);
data.push([]);

const daysRow: any[] = ['Employee Code:-'];
for (let i = 1; i <= daysInMonth; i++) {
  daysRow.push(`${i.toString().padStart(2, '0')}-Apr`);
}
data.push(daysRow); // Row 11

for (const emp of employees) {
  data.push(['Employee Code:-', emp.id]);
  data.push(['Employee Name:-', emp.name]);
  
  const inRow = ['In Time'];
  const outRow = ['Out Time'];
  const statusRow = ['Status'];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const isSunday = date.getDay() === 0;

    let inTime: string | null = '09:30';
    let outTime: string | null = '19:30';
    let status = 'P';

    // Alice: Normal (Even on Sundays? No, absent on Sundays unless worked)
    if (emp.id === 1) {
      if (isSunday) { inTime = null; outTime = null; status = 'WO'; }
    }
    
    // Bob: Sandwich on May 2 (Sat) and May 4 (Mon)
    if (emp.id === 2) {
      if (isSunday) { inTime = null; outTime = null; status = 'WO'; }
      if (d === 2 || d === 4) { inTime = null; outTime = null; status = 'A'; }
    }

    // Charlie: Works May 10 (Sun) - EW. Half day May 12 (Tue).
    if (emp.id === 3) {
      if (isSunday && d !== 10) { inTime = null; outTime = null; status = 'WO'; }
      if (d === 10) { inTime = '09:30'; outTime = '19:30'; status = 'P'; } // EW
      if (d === 12) { outTime = '14:00'; status = 'P'; } // Half day
    }

    // David: Paid Leave May 15.
    if (emp.id === 4) {
      if (isSunday) { inTime = null; outTime = null; status = 'WO'; }
      if (d === 15) { inTime = null; outTime = null; status = 'A'; }
    }

    // Eve: Unpaid Leave May 20. Orphan punch May 21.
    if (emp.id === 5) {
      if (isSunday) { inTime = null; outTime = null; status = 'WO'; }
      if (d === 20) { inTime = null; outTime = null; status = 'A'; }
      if (d === 21) { outTime = null; status = 'P'; } // Orphan punch!
    }

    inRow.push(inTime || '');
    outRow.push(outTime || '');
    statusRow.push(status);
  }

  data.push(inRow);
  data.push(outRow);
  data.push(statusRow);
  data.push([]);
}

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
XLSX.writeFile(wb, 'april_attendance_test.xlsx');
console.log("Created april_attendance_test.xlsx");
