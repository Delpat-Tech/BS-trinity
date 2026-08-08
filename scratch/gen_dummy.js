const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../public/dummy_data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Employees Excel
// Match the template columns in UploadEmployeesModal.tsx
const employees = [
  { 
    "Emp ID / Machine ID": 1, 
    "Full Name": "Alice Valid", 
    "Designation": "Software Engineer",
    "Mobile Number": "9876543210",
    "Date of Joining (YYYY-MM-DD)": "2026-01-01", 
    "Designated Weekly Off (0=Sun, 1=Mon, ...)": 0,
    "Fixed Salary (₹)": 30000,
    "Aadhaar Number": "111122223333",
    "PAN Number": "ABCDE1111F",
    "Is Ignored / Resigned (TRUE/FALSE)": "FALSE",
    "Resignation End Date (YYYY-MM-DD)": ""
  },
  { 
    "Emp ID / Machine ID": 2, 
    "Full Name": "Bob Sandwich", 
    "Designation": "QA Engineer",
    "Mobile Number": "9876543211",
    "Date of Joining (YYYY-MM-DD)": "2026-01-01", 
    "Designated Weekly Off (0=Sun, 1=Mon, ...)": 0,
    "Fixed Salary (₹)": 35000,
    "Aadhaar Number": "222233334444",
    "PAN Number": "ABCDE2222F",
    "Is Ignored / Resigned (TRUE/FALSE)": "FALSE",
    "Resignation End Date (YYYY-MM-DD)": ""
  },
  { 
    "Emp ID / Machine ID": 3, 
    "Full Name": "Charlie BigSandwich", 
    "Designation": "Product Manager",
    "Mobile Number": "9876543212",
    "Date of Joining (YYYY-MM-DD)": "2026-01-01", 
    "Designated Weekly Off (0=Sun, 1=Mon, ...)": 0,
    "Fixed Salary (₹)": 40000,
    "Aadhaar Number": "333344445555",
    "PAN Number": "ABCDE3333F",
    "Is Ignored / Resigned (TRUE/FALSE)": "FALSE",
    "Resignation End Date (YYYY-MM-DD)": ""
  },
  { 
    "Emp ID / Machine ID": 4, 
    "Full Name": "David HalfAbsent", 
    "Designation": "UI/UX Designer",
    "Mobile Number": "9876543213",
    "Date of Joining (YYYY-MM-DD)": "2026-01-01", 
    "Designated Weekly Off (0=Sun, 1=Mon, ...)": 0,
    "Fixed Salary (₹)": 45000,
    "Aadhaar Number": "444455556666",
    "PAN Number": "ABCDE4444F",
    "Is Ignored / Resigned (TRUE/FALSE)": "FALSE",
    "Resignation End Date (YYYY-MM-DD)": ""
  },
  { 
    "Emp ID / Machine ID": 5, 
    "Full Name": "Eve PaidFlank", 
    "Designation": "DevOps Engineer",
    "Mobile Number": "9876543214",
    "Date of Joining (YYYY-MM-DD)": "2026-01-01", 
    "Designated Weekly Off (0=Sun, 1=Mon, ...)": 0,
    "Fixed Salary (₹)": 50000,
    "Aadhaar Number": "555566667777",
    "PAN Number": "ABCDE5555F",
    "Is Ignored / Resigned (TRUE/FALSE)": "FALSE",
    "Resignation End Date (YYYY-MM-DD)": ""
  },
];

const empWs = XLSX.utils.json_to_sheet(employees);
const empWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(empWb, empWs, "Employees");
XLSX.writeFile(empWb, path.join(outDir, 'employees.xlsx'));

// 2. Attendance Excel
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function generateEsslReport(year, month, filename) {
  const days = getDaysInMonth(year, month);
  const data = [];
  
  // 11 empty rows
  for (let i = 0; i < 11; i++) {
    data.push([]);
  }
  
  // Row 12: Days row
  const daysRow = ["", ""];
  for (let d = 1; d <= days; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).replace(' ', '-');
    daysRow.push(dateStr);
  }
  data.push(daysRow);
  
  // Blocks for each employee
  for (const emp of employees) {
    const empId = emp["Emp ID / Machine ID"];
    
    data.push(["", "Employee Code:-", String(empId)]);
    data.push([]); // +1
    data.push([]); // +2
    
    const inTimeRow = ["", "In Time"]; // +3
    const outTimeRow = ["", "Out Time"]; // +4
    data.push(inTimeRow);
    data.push(outTimeRow);
    
    data.push([]); // +5
    data.push([]); // +6
    data.push([]); // +7
    
    const durationRow = ["", "Duration"]; // +8
    data.push(durationRow);
    
    data.push([]); // +9
    
    const statusRow = ["", "Status"]; // +10
    data.push(statusRow);
    
    for (let d = 1; d <= days; d++) {
      const dateObj = new Date(year, month - 1, d);
      const isSunday = dateObj.getDay() === 0;
      
      let inTime = "09:30";
      let outTime = "18:30";
      let status = "P";
      
      if (isSunday) {
        inTime = "";
        outTime = "";
        status = "WO";
      }
      
      if (d === 14) {
        if ([2, 3, 4].includes(empId)) {
          status = "A";
          inTime = "";
          outTime = "";
        }
      }
      
      if (d === 16) {
        if ([2, 3].includes(empId)) {
          status = "A";
          inTime = "";
          outTime = "";
        }
      }
      
      inTimeRow.push(inTime);
      outTimeRow.push(outTime);
      durationRow.push(inTime ? "09:00" : "");
      statusRow.push(status);
    }
    
    data.push([]); // +11 separator
  }
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(wb, path.join(outDir, filename));
}

generateEsslReport(2026, 4, 'apr_attendance.xlsx');
generateEsslReport(2026, 5, 'may_attendance.xlsx');
generateEsslReport(2026, 6, 'jun_attendance.xlsx');
generateEsslReport(2026, 7, 'jul_attendance.xlsx');

console.log("Generated dummy XLSX files with full schema successfully.");
