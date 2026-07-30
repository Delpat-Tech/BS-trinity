import ExcelJS from 'exceljs';

export function generateSalarySheet(period: any, lines: any[], employees: any[]): ExcelJS.Workbook {
  const empMap = new Map(employees.map(e => [e._id.toString(), e]));

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`${period.year}-${String(period.month).padStart(2, '0')} Salary`);

  // Add main header
  worksheet.addRow([
    null, null, null, null, 
    `${new Date(period.year, period.month - 1).toLocaleString('default', { month: 'long' })} ${period.year} Salary Sheet`
  ]);

  // Set columns
  worksheet.columns = [
    { header: '', key: 'empty1', width: 5 },
    { header: '', key: 'empty2', width: 5 },
    { header: 'ID', key: 'machineId', width: 10 },
    { header: 'EMP. NAME', key: 'name', width: 30 },
    { header: 'Designation ', key: 'designation', width: 25 },
    { header: 'DATE OF JOINING', key: 'dateOfJoining', width: 18 },
    { header: 'FIXED SALARY', key: 'fixedSalary', width: 15 },
    { header: '', key: 'empty3', width: 5 },
    { header: 'Total Working Days ', key: 'divisorDays', width: 20 },
    { header: 'ABS. DAYS', key: 'absDays', width: 12 },
    { header: '  E.W. Days', key: 'ewDays', width: 12 },
    { header: 'Total Present days ', key: 'presentDaysTotal', width: 20 },
    { header: 'TOTAL PAID DAYS', key: 'totalPaidDays', width: 18 },
    { header: 'GROSS SALARY', key: 'gross', width: 15 },
    { header: 'INCENTIVE', key: 'incentive', width: 12 },
    { header: 'BONUS', key: 'bonus', width: 12 },
    { header: 'OUTSTANDING ADVANCE', key: 'advanceCarried', width: 22 },
    { header: 'DEDUCT ADVANCE', key: 'advanceDeduction', width: 18 },
    { header: 'TOTAL LATE PUNCH', key: 'lateStrikes', width: 18 },
    { header: 'L.PUNCH AMT', key: 'latePunchAmt', width: 15 },
    { header: 'Debit ', key: 'otherDebit', width: 12 },
    { header: 'NET SALARY ', key: 'net', width: 15 },
    { header: 'MODE', key: 'mode', width: 15 },
    { header: 'Signature', key: 'signature', width: 20 },
  ];

  // Format headers
  const headerRow = worksheet.getRow(2);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  // Sort lines by machineId
  lines.sort((a: any, b: any) => {
    const eA = empMap.get(a.employeeId.toString()) as any;
    const eB = empMap.get(b.employeeId.toString()) as any;
    return (eA?.machineId || 0) - (eB?.machineId || 0);
  });

  // Add rows
  lines.forEach(line => {
    const emp: any = empMap.get(line.employeeId.toString());
    if (!emp) return;

    worksheet.addRow({
      machineId: emp.machineId,
      name: emp.name,
      designation: emp.designation,
      dateOfJoining: emp.dateOfJoining,
      fixedSalary: line.fixedSalary,
      divisorDays: line.divisorDays,
      absDays: line.absDays,
      ewDays: line.ewDays,
      presentDaysTotal: line.presentDays + line.paidLeaveDays + (line.halfDays * 0.5),
      totalPaidDays: line.totalPaidDays,
      gross: line.gross,
      incentive: line.incentive,
      bonus: line.bonus,
      advanceCarried: line.advanceCarried + line.advanceDeduction, // outstanding before deduction
      advanceDeduction: line.advanceDeduction,
      lateStrikes: line.lateStrikes,
      latePunchAmt: line.latePunchAmt,
      otherDebit: line.otherDebit,
      net: line.net,
      mode: emp.paymentMode || 'BANK'
    });
  });

  return workbook;
}
