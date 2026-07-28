import * as XLSX from 'xlsx';
import { format, parse } from 'date-fns';

export type ParsedDay = {
  machineId: number;
  date: string; // yyyy-MM-dd
  shift: string | null;
  inTime: string | null;
  outTime: string | null;
  durationMins: number | null;
  machineStatus: 'P' | 'A' | 'WO' | 'WOP';
};

export function parseBiometricFile(
  buffer: Buffer,
  month: number,
  year: number
): { ok: true; days: ParsedDay[] } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  let workbook: XLSX.WorkBook;
  
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch (e) {
    return { ok: false, errors: ['Failed to read Excel file.'] };
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return { ok: false, errors: ['No sheet found in workbook.'] };
  }

  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false });
  if (rows.length < 12) {
    return { ok: false, errors: ['File does not contain enough rows.'] };
  }

  // 1. Build column to date map from row 11 (0-indexed -> 10 or 11?)
  // Wait, the spec says "row index 11", which usually implies 0-indexed if it says "index 11". Let's assume 0-indexed 11 (the 12th row).
  // I will check both row 11 and 10 to be safe, but let's strictly use index 11.
  const daysRowIndex = 11;
  const daysRow = rows[daysRowIndex] || [];
  const dateColumns: { col: number; dateStr: string }[] = [];

  for (let c = 0; c < daysRow.length; c++) {
    const val = daysRow[c];
    if (typeof val === 'string') {
      const trimmed = val.trim();
      // Format might be "01-Jun", "1-Jun", "01-Jun-2026"
      // We know it's "DD-MMM"
      const match = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})$/);
      if (match) {
        const d = parseInt(match[1], 10);
        // We know the month and year
        const dateObj = new Date(year, month - 1, d);
        if (dateObj.getMonth() === month - 1) {
          dateColumns.push({ col: c, dateStr: format(dateObj, 'yyyy-MM-dd') });
        }
      } else {
        // Also check if it happens to be DD-MMM-YYYY or similar
        const match2 = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-\d+$/);
        if (match2) {
            const d = parseInt(match2[1], 10);
            const dateObj = new Date(year, month - 1, d);
            if (dateObj.getMonth() === month - 1) {
              dateColumns.push({ col: c, dateStr: format(dateObj, 'yyyy-MM-dd') });
            }
        }
      }
    }
  }

  if (dateColumns.length < 28 || dateColumns.length > 31) {
    errors.push(`Expected 28 to 31 dates, found ${dateColumns.length}.`);
  }

  // 2. Find blocks
  const anchors: number[] = [];
  for (let r = 0; r < rows.length; r++) {
    const cell = rows[r]?.[1];
    if (typeof cell === 'string' && cell.trim() === 'Employee Code:-') {
      anchors.push(r);
    }
  }

  if (anchors.length === 0) {
    errors.push('No Employee Code:- anchors found.');
  }

  for (const r of anchors) {
    const inTimeLabel = String(rows[r + 3]?.[1] || '').trim();
    const statusLabel = String(rows[r + 10]?.[1] || '').trim();
    if (inTimeLabel !== 'In Time') {
      errors.push(`Expected 'In Time' at [${r+3}][1], found '${inTimeLabel}'.`);
    }
    if (statusLabel !== 'Status') {
      errors.push(`Expected 'Status' at [${r+10}][1], found '${statusLabel}'.`);
    }
  }

  const validStatuses = new Set(['P', 'A', 'WO', 'WOP', '']);
  for (const r of anchors) {
    for (const { col } of dateColumns) {
      let statusVal = String(rows[r + 10]?.[col] || '').trim();
      if (!validStatuses.has(statusVal)) {
        errors.push(`Invalid status '${statusVal}' at [${r+10}][${col}].`);
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // 3. Extract days
  const parsedDays: ParsedDay[] = [];

  for (const r of anchors) {
    const machineIdRaw = rows[r]?.[6];
    const machineId = parseInt(String(machineIdRaw).trim(), 10);

    if (isNaN(machineId)) continue;

    for (const { col, dateStr } of dateColumns) {
      const shift = String(rows[r + 2]?.[col] || '').trim() || null;
      
      let inTime: string | null = String(rows[r + 3]?.[col] || '').trim();
      if (inTime === '00:00' || inTime === '') inTime = null;
      // Ensure HH:mm:ss if it's HH:mm
      if (inTime && inTime.length === 5) inTime = inTime + ':00';

      let outTime: string | null = String(rows[r + 4]?.[col] || '').trim();
      if (outTime === '00:00' || outTime === '') outTime = null;
      if (outTime && outTime.length === 5) outTime = outTime + ':00';

      const durationStr = String(rows[r + 8]?.[col] || '').trim();
      let durationMins: number | null = null;
      if (durationStr && durationStr !== '00:00') {
        const [hh, mm] = durationStr.split(':').map(Number);
        if (!isNaN(hh) && !isNaN(mm)) {
          durationMins = hh * 60 + mm;
        }
      }

      const statusVal = String(rows[r + 10]?.[col] || '').trim();
      if (!statusVal) continue; // Spec: Status is P, A, WO, WOP, or empty. If empty, maybe skip or map to 'A'? Wait. "Every value in the Status row is one of P, A, WO, WOP, or empty." Does an empty status mean we drop the day, or map it? Usually empty means out of service or absent. I'll emit it only if there is a known status, or if empty implies absent I'll let it be. Actually, spec says: "For each dated column, emit one row: { ... machineStatus }". 
      // If statusVal is empty, what is the type of machineStatus? It's strictly 'P' | 'A' | 'WO' | 'WOP'.
      // If it's empty, maybe we skip emitting the row? Or treat it as 'A'?
      // Let's drop empty status days. "Every value ... or empty." Empty cells exist for days before joining or after leaving, or non-existent dates. We should skip empty statuses.
      if (statusVal === '') continue;

      parsedDays.push({
        machineId,
        date: dateStr,
        shift: shift,
        inTime: inTime as string | null,
        outTime: outTime as string | null,
        durationMins,
        machineStatus: statusVal as 'P' | 'A' | 'WO' | 'WOP'
      });
    }
  }

  return { ok: true, days: parsedDays };
}
