/**
 * Sandwich Leave Engine Tests
 * Run with:  npx tsx src/lib/rules/engine.test.ts
 *
 * Scenarios:
 *  S1 — Valid (NOT sandwich): nothing absent before/after the holiday+WO block
 *  S2 — Sandwich: unpaid leave before + WO + Holiday + unpaid leave after  → all 4 unpaid
 *  S3 — Bigger Sandwich: paid leave on WO day with quota exhausted → downgraded to unpaid → sandwich
 *  S4 — No sandwich: absent only on one side of the block
 *  S5 — Valid: paid leave (within quota) flanking the block → no sandwich
 *
 * August 2026 calendar used (Independence Day = Aug 15, sandwichEligible).
 * Employee's weekly-off = Sunday (Sundays in Aug: 2, 9, 16, 23, 30).
 */

import { computePayroll, type Employee, type Period, type Holiday, type AttendanceDay, type LeaveEntry, type SettlementNote } from './engine';

// ─── Tiny test harness ───────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS — ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL — ${label}${detail ? `\n     → ${detail}` : ''}`);
    failed++;
  }
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** Period: August 2026, quota = 1 paid leave/month */
const PERIOD: Period = {
  _id: 'p1',
  month: 8,
  year: 2026,
  divisorDays: 26,
  ruleset: {
    shift_start: '09:30',
    shift_end: '18:30',
    grace_until: '09:45',
    half_day_if_in_after: '13:00',
    half_day_if_out_before: '13:00',
    late_strike_window: ['09:46', '10:30'],
    early_strike_window: ['17:00', '18:29'],
    strikes_per_penalty: 3,
    penalty_days_per_trigger: 1,
    sandwich_skips_weekly_off: true,  // weekly offs are blockable in sandwich
    monthly_paid_leave_quota: 1,       // only 1 paid leave allowed per month
  },
};

const EMP: Employee = {
  _id: 'e1',
  machineId: 1,
  name: 'Test Employee',
  dateOfJoining: '2026-01-01',
  endDate: null,
  isIgnored: false,
  weeklyOff: 'Sunday',
  salaryRevisions: [{ fixedSalary: 30000, effectiveFrom: '2026-01-01' }],
};

/** Independence Day — sandwich eligible */
const HOLIDAY_15: Holiday = {
  date: '2026-08-15',
  name: 'Independence Day',
  sandwichEligible: true,
  recurrence: 'yearly',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const absAtt   = (date: string): AttendanceDay =>
  ({ employeeId: 'e1', date, inTime: null,        outTime: null,        machineStatus: 'A', finalStatus: null });
const presAtt  = (date: string): AttendanceDay =>
  ({ employeeId: 'e1', date, inTime: '09:30:00',  outTime: '18:30:00',  machineStatus: 'P', finalStatus: null });
const paidLeave   = (date: string): LeaveEntry => ({ employeeId: 'e1', date, kind: 'paid' });
const unpaidLeave = (date: string): LeaveEntry => ({ employeeId: 'e1', date, kind: 'unpaid' });

/**
 * Run the engine for a single employee over all of August 2026.
 * Any date not in `attendance` is auto-filled:
 *   - Holiday dates → no record added (engine treats as absent/unworked → blockable)
 *   - Sundays       → absent (engine marks WEEKLY_OFF)
 *   - Other days    → present
 */
const HOLIDAY_DATES = new Set(['2026-08-15']); // keep in sync with holidays array

function run(attendance: AttendanceDay[], leaves: LeaveEntry[]) {
  const supplied = new Set(attendance.map(a => a.date));
  for (let d = 1; d <= 31; d++) {
    const date = `2026-08-${String(d).padStart(2, '0')}`;
    if (supplied.has(date)) continue;
    if (HOLIDAY_DATES.has(date)) continue;        // no record → worked=false → blockable
    const isSunday = new Date(date).getDay() === 0;
    attendance.push(isSunday ? absAtt(date) : presAtt(date));
  }
  return computePayroll({
    period: PERIOD,
    employees: [EMP],
    attendance,
    leaves,
    holidays: [HOLIDAY_15],
    ledger: [],
    inputs: [],
  }).lines[0];
}

// ─── Scenario 1 ─────────────────────────────────────────────────────────────
// Sat 15 = Holiday, Sun 16 = WO, Mon 17 = paid leave (quota still free)
// No absence BEFORE the block → no sandwich
console.log('\n📋 S1 — Valid: Holiday(Sat 15) + WO(Sun 16) + PaidLeave(Mon 17), no absence before');
console.log('   Expected: 15=PRESENT(holiday paid), 16=WEEKLY_OFF(paid), 17=PAID_LEAVE — NO sandwich');
{
  const line = run(
    [absAtt('2026-08-16'), absAtt('2026-08-17')],
    [paidLeave('2026-08-17')],
  );
  assert('S1: 15 Aug NOT absent', !(line.absentDates?.some(d => d.includes('15')) ?? false), JSON.stringify(line.absentDates));
  assert('S1: 16 Aug NOT absent', !(line.absentDates?.some(d => d.includes('16')) ?? false), JSON.stringify(line.absentDates));
  assert('S1: 17 Aug NOT absent (paid leave)', !(line.absentDates?.some(d => d.includes('17')) ?? false), JSON.stringify(line.absentDates));
  assert('S1: paidLeaveDays = 1', line.paidLeaveDays === 1, `paidLeaveDays=${line.paidLeaveDays}`);
}

// ─── Scenario 2 ─────────────────────────────────────────────────────────────
// Fri 14 = unpaid leave, Sat 15 = Holiday, Sun 16 = WO, Mon 17 = unpaid leave
// block=[15,16], prev=14=ABSENT_UNPAID, next=17=ABSENT_UNPAID → sandwich
console.log('\n📋 S2 — Sandwich: UnpaidLeave(Fri 14) + Holiday(Sat 15) + WO(Sun 16) + UnpaidLeave(Mon 17)');
console.log('   Expected: all 4 days (14,15,16,17) = ABSENT_UNPAID');
{
  const line = run(
    [absAtt('2026-08-14'), absAtt('2026-08-16'), absAtt('2026-08-17')],
    [unpaidLeave('2026-08-14'), unpaidLeave('2026-08-17')],
  );
  assert('S2: 14 Aug absent', line.absentDates?.some(d => d.includes('14')) ?? false, JSON.stringify(line.absentDates));
  assert('S2: 15 Aug absent (sandwiched)', line.absentDates?.some(d => d.includes('15')) ?? false, JSON.stringify(line.absentDates));
  assert('S2: 16 Aug absent (sandwiched)', line.absentDates?.some(d => d.includes('16')) ?? false, JSON.stringify(line.absentDates));
  assert('S2: 17 Aug absent', line.absentDates?.some(d => d.includes('17')) ?? false, JSON.stringify(line.absentDates));
  assert('S2: paidLeaveDays = 0', line.paidLeaveDays === 0, `paidLeaveDays=${line.paidLeaveDays}`);
}

// ─── Scenario 3 ─────────────────────────────────────────────────────────────
// Quota used on Aug 5 (paid leave). Then:
// Fri 14 = unpaid leave
// Sat 15 = Holiday
// Sun 16 = WO, employee also has paid leave applied on it — quota already exhausted → ABSENT_UNPAID
// Mon 17 = unpaid leave
// block=[15], prev=14=ABSENT_UNPAID, next=16=ABSENT_UNPAID → sandwich on 15
console.log('\n📋 S3 — Bigger Sandwich: quota exhausted on Aug 5; paid leave on WO(Sun 16) → downgraded to unpaid');
console.log('   Expected: 14=unpaid, 15=sandwiched(unpaid), 16=unpaid(downgraded WO), 17=unpaid');
{
  const line = run(
    [absAtt('2026-08-05'), absAtt('2026-08-14'), absAtt('2026-08-16'), absAtt('2026-08-17')],
    [paidLeave('2026-08-05'), unpaidLeave('2026-08-14'), paidLeave('2026-08-16'), unpaidLeave('2026-08-17')],
  );
  assert('S3: 5 Aug is paid leave (within quota)', line.paidLeaveDatesList?.some(d => d.includes('5')) ?? false, JSON.stringify(line.paidLeaveDatesList));
  assert('S3: 14 Aug absent', line.absentDates?.some(d => d.includes('14')) ?? false, JSON.stringify(line.absentDates));
  assert('S3: 15 Aug absent (sandwiched)', line.absentDates?.some(d => d.includes('15')) ?? false, JSON.stringify(line.absentDates));
  assert('S3: 16 Aug absent (WO+paid leave downgraded)', line.absentDates?.some(d => d.includes('16')) ?? false, JSON.stringify(line.absentDates));
  assert('S3: 17 Aug absent', line.absentDates?.some(d => d.includes('17')) ?? false, JSON.stringify(line.absentDates));
  assert('S3: paidLeaveDays = 1 (only Aug 5)', line.paidLeaveDays === 1, `paidLeaveDays=${line.paidLeaveDays}`);
}

// ─── Scenario 4 ─────────────────────────────────────────────────────────────
// Fri 14 = unpaid leave, Sat 15 = Holiday, Sun 16 = WO, Mon 17 = PRESENT
// block=[15,16], prev=14=ABSENT_UNPAID, next=17=PRESENT → NO sandwich
console.log('\n📋 S4 — No Sandwich: UnpaidLeave(14) + Holiday(15) + WO(16) + Present(17)');
console.log('   Expected: 15=PRESENT(holiday), 16=WEEKLY_OFF — sandwich does NOT trigger');
{
  const line = run(
    [absAtt('2026-08-14'), absAtt('2026-08-16'), presAtt('2026-08-17')],
    [unpaidLeave('2026-08-14')],
  );
  assert('S4: 14 Aug absent', line.absentDates?.some(d => d.includes('14')) ?? false, JSON.stringify(line.absentDates));
  assert('S4: 15 Aug NOT absent (holiday, no sandwich)', !(line.absentDates?.some(d => d.includes('15')) ?? false), JSON.stringify(line.absentDates));
  assert('S4: 16 Aug NOT absent (WO, no sandwich)', !(line.absentDates?.some(d => d.includes('16')) ?? false), JSON.stringify(line.absentDates));
  assert('S4: 17 Aug NOT absent', !(line.absentDates?.some(d => d.includes('17')) ?? false), JSON.stringify(line.absentDates));
}

// ─── Scenario 5 ─────────────────────────────────────────────────────────────
// Fri 14 = PRESENT, Sat 15 = Holiday, Sun 16 = WO, Mon 17 = paid leave (quota free)
// block=[15,16], prev=14=PRESENT → NO sandwich (even though 17 has paid leave)
console.log('\n📋 S5 — Valid: Present(14) + Holiday(15) + WO(16) + PaidLeave(Mon 17, within quota)');
console.log('   Expected: 15=PRESENT, 16=WEEKLY_OFF, 17=PAID_LEAVE — no sandwich');
{
  const line = run(
    [presAtt('2026-08-14'), absAtt('2026-08-16'), absAtt('2026-08-17')],
    [paidLeave('2026-08-17')],
  );
  assert('S5: 15 Aug NOT absent', !(line.absentDates?.some(d => d.includes('15')) ?? false), JSON.stringify(line.absentDates));
  assert('S5: 16 Aug NOT absent', !(line.absentDates?.some(d => d.includes('16')) ?? false), JSON.stringify(line.absentDates));
  assert('S5: 17 Aug NOT absent (paid leave)', !(line.absentDates?.some(d => d.includes('17')) ?? false), JSON.stringify(line.absentDates));
  assert('S5: paidLeaveDays = 1', line.paidLeaveDays === 1, `paidLeaveDays=${line.paidLeaveDays}`);
}

// ─── Scenario 6 ─────────────────────────────────────────────────────────────
// Sat 8 = absent with unpaid leave entry, Sun 9 = WO but employee works
// Working on WO should NOT auto-settle Sat 8 to PAID_LEAVE. Sat 8 remains ABSENT.
console.log('\n📋 S6 — WO-worked does NOT auto-settle before-day leave: Absent+UnpaidLeave(Sat 8) + WO_WORKED(Sun 9)');
console.log('   Expected: 8=ABSENT, 9=WO_WORKED (ewDays=1), SettlementNote kind=wo_worked_noted for date 9');
{
  // Sun 9 is worked (machineStatus P, isWeeklyOff → WEEKLY_OFF_WORKED)
  const woWorkedAtt: AttendanceDay = { employeeId: 'e1', date: '2026-08-09', inTime: '09:30:00', outTime: '18:30:00', machineStatus: 'P', finalStatus: null };
  const line = run(
    [absAtt('2026-08-08'), woWorkedAtt],
    [unpaidLeave('2026-08-08')],
  );
  assert('S6: 8 Aug remains ABSENT', line.absentDates?.some(d => d.includes('8 ')) ?? false, JSON.stringify(line.absentDates));
  assert('S6: 8 Aug NOT paid leave', !(line.paidLeaveDatesList?.some(d => d.includes('8 ')) ?? false), JSON.stringify(line.paidLeaveDatesList));
  assert('S6: ewDays = 1 (recorded WO_WORKED)', line.ewDays === 1, `ewDays=${line.ewDays}`);
  assert('S6: settlementNotes has wo_worked_noted for date 9', line.settlementNotes?.some(n => n.kind === 'wo_worked_noted' && n.triggerDate === '2026-08-09') ?? false, JSON.stringify(line.settlementNotes));
}

// ─── Scenario 7 ─────────────────────────────────────────────────────────────
// Sun 9 = WO but employee works, Mon 10 = absent (leave entry)
// Working on WO should NOT auto-settle Mon 10 to PAID_LEAVE. Mon 10 remains ABSENT.
console.log('\n📋 S7 — WO-worked does NOT auto-settle after-day leave: WO_WORKED(Sun 9) + Absent(Mon 10)');
console.log('   Expected: 10=ABSENT, 9=WO_WORKED (ewDays=1), SettlementNote kind=wo_worked_noted for date 9');
{
  const woWorkedAtt: AttendanceDay = { employeeId: 'e1', date: '2026-08-09', inTime: '09:30:00', outTime: '18:30:00', machineStatus: 'P', finalStatus: null };
  const line = run(
    [woWorkedAtt, absAtt('2026-08-10')],
    [unpaidLeave('2026-08-10')],
  );
  assert('S7: 10 Aug remains ABSENT', line.absentDates?.some(d => d.includes('10')) ?? false, JSON.stringify(line.absentDates));
  assert('S7: 10 Aug NOT paid leave', !(line.paidLeaveDatesList?.some(d => d.includes('10')) ?? false), JSON.stringify(line.paidLeaveDatesList));
  assert('S7: ewDays = 1 (recorded WO_WORKED)', line.ewDays === 1, `ewDays=${line.ewDays}`);
  assert('S7: settlementNotes has wo_worked_noted for date 9', line.settlementNotes?.some(n => n.kind === 'wo_worked_noted' && n.triggerDate === '2026-08-09') ?? false, JSON.stringify(line.settlementNotes));
}

// ─── Scenario 8 ─────────────────────────────────────────────────────────────
// quota=1 paid leave. Employee takes paid leave Aug 4 (within quota) AND Aug 5 (excess).
// Aug 5 should be downgraded → ABSENT_UNPAID, and a quota_downgrade SettlementNote should appear.
console.log('\n📋 S8 — Quota downgrade notification: 2 paid leaves with quota=1');
console.log('   Expected: 4=PAID_LEAVE, 5=ABSENT_UNPAID, settlementNote kind=quota_downgrade for date 5');
{
  const line = run(
    [absAtt('2026-08-04'), absAtt('2026-08-05')],
    [paidLeave('2026-08-04'), paidLeave('2026-08-05')],
  );
  assert('S8: 4 Aug is PAID_LEAVE (within quota)', line.paidLeaveDatesList?.some(d => d.includes('4 ')) ?? false, JSON.stringify(line.paidLeaveDatesList));
  assert('S8: 5 Aug is ABSENT_UNPAID (downgraded)', line.absentDates?.some(d => d.includes('5 ')) ?? false, JSON.stringify(line.absentDates));
  assert('S8: settlementNotes has quota_downgrade', line.settlementNotes?.some(n => n.kind === 'quota_downgrade' && n.triggerDate === '2026-08-05') ?? false, JSON.stringify(line.settlementNotes));
  assert('S8: paidLeaveDays = 1', line.paidLeaveDays === 1, `paidLeaveDays=${line.paidLeaveDays}`);
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
console.log(`  Results: ${passed} passed, ${failed} failed  (${passed + failed} total assertions)`);
console.log('─'.repeat(60) + '\n');
if (failed > 0) process.exit(1);
