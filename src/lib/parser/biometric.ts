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

  function extractDay(val: any): number | null {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') {
      if (val >= 1 && val <= 31) return val;
      if (val > 20000 && val < 60000) {
        const date = new Date((val - 25569) * 86400 * 1000);
        return date.getDate();
      }
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      let m = trimmed.match(/^(\d{1,2})-[A-Za-z]{3}/);
      if (m) return parseInt(m[1], 10);
      m = trimmed.match(/^(\d{1,2})$/);
      if (m) return parseInt(m[1], 10);
      m = trimmed.match(/^(\d{1,2})\/\d{1,2}\/\d{2,4}$/);
      if (m) return parseInt(m[1], 10);
      m = trimmed.match(/^\d{1,2}\/(\d{1,2})\/\d{2,4}$/);
      if (m) return parseInt(m[1], 10);
      
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        return parsed.getDate();
      }
    }
    return null;
  }

  // 1. Build column to date map dynamically by finding the row with 28-31 dates
  let dateColumns: { col: number; dateStr: string }[] = [];
  
  for (let r = 0; r < Math.min(20, rows.length); r++) {
    const row = rows[r] || [];
    const extractedDays: { col: number, day: number }[] = [];
    for (let c = 0; c < row.length; c++) {
      const day = extractDay(row[c]);
      if (day !== null) {
        extractedDays.push({ col: c, day });
      }
    }
    
    // Allow for a few empty columns in between, but if we found ~28 days, it's our row
    if (extractedDays.length >= 28 && extractedDays.length <= 31) {
      dateColumns = extractedDays.map(ed => {
        const dateObj = new Date(year, month - 1, ed.day);
        return { col: ed.col, dateStr: format(dateObj, 'yyyy-MM-dd') };
      });
      break;
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

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // 3. Extract days
  const parsedDays: ParsedDay[] = [];

  for (const r of anchors) {
    let machineIdRaw = null;
    for (let c = 2; c < Math.min(20, rows[r].length); c++) {
      if (rows[r][c] && !isNaN(parseInt(String(rows[r][c]).trim(), 10))) {
        machineIdRaw = rows[r][c];
        break;
      }
    }

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

      const finalStatusVal = (inTime || outTime) ? 'P' : 'A';

      parsedDays.push({
        machineId,
        date: dateStr,
        shift: shift,
        inTime: inTime as string | null,
        outTime: outTime as string | null,
        durationMins,
        machineStatus: finalStatusVal as 'P' | 'A' | 'WO' | 'WOP'
      });
    }
  }

  return { ok: true, days: parsedDays };
}
