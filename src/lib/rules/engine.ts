export type Ruleset = {
  shift_start: string;
  shift_end: string;
  grace_until: string;
  half_day_if_in_after: string;
  half_day_if_out_before: string;
  late_strike_window: [string, string];
  early_strike_window: [string, string];
  strikes_per_penalty: number;
  penalty_days_per_trigger: number;
  sandwich_skips_weekly_off: boolean;
};

export type Period = {
  _id: any;
  month: number;
  year: number;
  divisorDays: number;
  ruleset: Ruleset;
};

export type Employee = {
  _id: any;
  machineId: number;
  name: string;
  dateOfJoining: string;
  endDate: string | null;
  isIgnored: boolean;
  weeklyOff?: number;
  salaryRevisions: { fixedSalary: number; effectiveFrom: string }[];
};

export type AttendanceDay = {
  employeeId: any;
  date: string;
  inTime: string | null;
  outTime: string | null;
  machineStatus: 'P' | 'A' | 'WO' | 'WOP';
  finalStatus: string | null;
};

export type LeaveEntry = {
  employeeId: any;
  date: string;
  kind: 'paid' | 'unpaid' | 'half';
};

export type Holiday = {
  date: string;
  sandwichEligible: boolean;
};

export type LedgerEntry = {
  employeeId: any;
  date: string;
  type: 'opening' | 'advance' | 'deduction';
  amount: number;
};

export type PayrollInput = {
  employeeId: any;
  ewDays: number | null;
  incentive: number;
  bonus: number;
  advanceDeduction: number;
  latePunchAmt: number;
  otherDebit: number;
};

export type DayStatus =
  | 'PRESENT'
  | 'HALF_DAY'
  | 'PAID_LEAVE'
  | 'WEEKLY_OFF'
  | 'WEEKLY_OFF_WORKED'
  | 'ABSENT_UNPAID'
  | 'OUT_OF_SERVICE'
  | 'EXCEPTION';

export type Exception = {
  employeeId: any;
  date: string;
  reason: string;
};

export type PayrollLine = {
  employeeId: any;
  fixedSalary: number;
  divisorDays: number;
  dailyRate: number;
  presentDays: number;
  halfDays: number;
  absDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  outOfServiceDays: number;
  lateStrikes: number;
  earlyStrikes: number;
  penaltyDays: number;
  ewDays: number;
  totalPaidDays: number;
  gross: number;
  incentive: number;
  bonus: number;
  advanceDeduction: number;
  advanceCarried: number;
  latePunchAmt: number;
  otherDebit: number;
  net: number;
};

function formatTime(t: string | null): string | null {
  if (!t) return null;
  return t.slice(0, 5); // 'HH:mm:ss' to 'HH:mm'
}

function getNextDateStr(dateStr: string, increment: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + increment);
  return d.toISOString().split('T')[0];
}

export function computePayroll(input: {
  period: Period;
  employees: Employee[];
  attendance: AttendanceDay[];
  leaves: LeaveEntry[];
  holidays: Holiday[];
  ledger: LedgerEntry[];
  inputs: PayrollInput[];
}): { lines: PayrollLine[]; exceptions: Exception[] } {
  const lines: PayrollLine[] = [];
  const exceptions: Exception[] = [];
  const rules = input.period.ruleset;
  const divisor = input.period.divisorDays;

  // Build lookups
  const leavesByEmpDate = new Map<string, LeaveEntry>();
  input.leaves.forEach(l => leavesByEmpDate.set(`${l.employeeId}_${l.date}`, l));

  const holidaysByDate = new Map<string, Holiday>();
  input.holidays.forEach(h => holidaysByDate.set(h.date, h));

  const attendanceByEmpDate = new Map<string, AttendanceDay>();
  input.attendance.forEach(a => attendanceByEmpDate.set(`${a.employeeId}_${a.date}`, a));

  const inputsByEmp = new Map<any, PayrollInput>();
  input.inputs.forEach(i => inputsByEmp.set(i.employeeId, i));

  const ledgerByEmp = new Map<any, LedgerEntry[]>();
  input.ledger.forEach(l => {
    if (!ledgerByEmp.has(l.employeeId)) ledgerByEmp.set(l.employeeId, []);
    ledgerByEmp.get(l.employeeId)!.push(l);
  });

  const periodYear = input.period.year;
  const periodMonth = input.period.month;
  // Build calendar for the month
  const numDays = new Date(periodYear, periodMonth, 0).getDate();
  const periodDates: string[] = [];
  for (let i = 1; i <= numDays; i++) {
    const dStr = `${periodYear}-${String(periodMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    periodDates.push(dStr);
  }

  for (const emp of input.employees) {
    if (emp.isIgnored) continue;

    let presentDays = 0;
    let outOfServiceDays = 0;
    let halfDays = 0;
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    let ewSuggestion = 0;
    let lateStrikes = 0;
    let earlyStrikes = 0;

    const computedStatuses = new Map<string, DayStatus>();

    for (const date of periodDates) {
      let status: DayStatus;
      const att = attendanceByEmpDate.get(`${emp._id}_${date}`);
      const inTime = formatTime(att?.inTime ?? null);
      const outTime = formatTime(att?.outTime ?? null);
      const leave = leavesByEmpDate.get(`${emp._id}_${date}`);

      // 1. LIFECYCLE
      if (date < emp.dateOfJoining || (emp.endDate && date > emp.endDate)) {
        status = 'OUT_OF_SERVICE';
        computedStatuses.set(date, status);
        continue; // go to next date
      }

      // If no attendance record at all, but it's active lifecycle, normally 'ABSENT_UNPAID' or 'EXCEPTION' ?
      // Wait, if no record, maybe it was a holiday or they just didn't punch.
      // Let's create a default mock attendance object to process.
      const machineStatus = att?.machineStatus ?? 'A';
      const finalStatus = att?.finalStatus ?? null;

      // 3. WEEKLY OFF
      const isWeeklyOff = new Date(date).getDay() === (emp.weeklyOff ?? 0);

      if (finalStatus !== null) {
        status = finalStatus as DayStatus;
      } 
      // 4. ORPHAN
      else if (inTime !== null && outTime === null) {
        status = 'EXCEPTION';
        exceptions.push({ employeeId: emp._id, date, reason: 'orphan_punch' });
      }
      // 5. LEAVE
      else if (machineStatus === 'A' && !isWeeklyOff) {
        if (leave?.kind === 'paid') status = 'PAID_LEAVE';
        else if (leave?.kind === 'half') status = 'HALF_DAY';
        else if (leave?.kind === 'unpaid') status = 'ABSENT_UNPAID';
        else status = 'ABSENT_UNPAID';
      }
      // 6. THRESHOLD & WEEKLY OFF
      else {
        // Here, it's either P or it's a Weekly Off
        if (machineStatus === 'A' && isWeeklyOff) {
          status = 'WEEKLY_OFF';
        } else {
          // Employee punched in (machineStatus === 'P')
          const missedFirstHalf = inTime && inTime > rules.half_day_if_in_after;
          const missedSecondHalf = outTime && outTime < rules.half_day_if_out_before;

          if (missedFirstHalf && missedSecondHalf) {
            status = 'ABSENT_UNPAID';
          } else if (missedFirstHalf || missedSecondHalf) {
            status = 'HALF_DAY';
          } else {
            status = isWeeklyOff ? 'WEEKLY_OFF_WORKED' : 'PRESENT';
          }
        }
      }

      // 7. CONFLICT
      if ((status === 'PRESENT' || status === 'WEEKLY_OFF_WORKED' || status === 'HALF_DAY') && leave?.kind === 'half') {
        status = 'EXCEPTION';
        exceptions.push({ employeeId: emp._id, date, reason: 'conflict' });
      }

      // 8. STRIKES
      if (status === 'PRESENT' || status === 'HALF_DAY') {
        if (inTime && inTime >= rules.late_strike_window[0] && inTime <= rules.late_strike_window[1]) {
          lateStrikes++;
        }
        if (outTime && outTime >= rules.early_strike_window[0] && outTime <= rules.early_strike_window[1]) {
          earlyStrikes++;
        }
      }

      computedStatuses.set(date, status);
    }

    // SANDWICH RULE
    for (const date of periodDates) {
      const holiday = holidaysByDate.get(date);
      if (holiday?.sandwichEligible && computedStatuses.get(date) !== 'EXCEPTION') {
        let prevDate = getNextDateStr(date, -1);
        let nextDate = getNextDateStr(date, 1);

        while (periodDates.includes(prevDate) && 
               ((rules.sandwich_skips_weekly_off && computedStatuses.get(prevDate) === 'WEEKLY_OFF') || holidaysByDate.has(prevDate))) {
          prevDate = getNextDateStr(prevDate, -1);
        }
        while (periodDates.includes(nextDate) && 
               ((rules.sandwich_skips_weekly_off && computedStatuses.get(nextDate) === 'WEEKLY_OFF') || holidaysByDate.has(nextDate))) {
          nextDate = getNextDateStr(nextDate, 1);
        }

        const prevAbsent = !periodDates.includes(prevDate) || computedStatuses.get(prevDate) === 'ABSENT_UNPAID';
        const nextAbsent = !periodDates.includes(nextDate) || computedStatuses.get(nextDate) === 'ABSENT_UNPAID';
        
        // Wait, if it goes out of period bounds, is it absent? Spec: "For each holiday H where sandwichEligible: Find the previous and next day that are neither WEEKLY_OFF nor a holiday... If both are ABSENT_UNPAID, set H to ABSENT_UNPAID. A holiday date that is not sandwiched is PRESENT regardless of the machine status, unless overridden."
        // We shouldn't default out-of-period to absent. The spec says "find the previous and next day...". If they aren't in this period, we technically don't have them. I'll strictly check if they are explicitly ABSENT_UNPAID within our computedStatuses. If out of bounds, it doesn't sandwich.

        let isSandwiched = false;
        if (periodDates.includes(prevDate) && periodDates.includes(nextDate)) {
          if (computedStatuses.get(prevDate) === 'ABSENT_UNPAID' && computedStatuses.get(nextDate) === 'ABSENT_UNPAID') {
             isSandwiched = true;
          }
        }

        const existingStatus = computedStatuses.get(date);
        const att = attendanceByEmpDate.get(`${emp._id}_${date}`);
        const isOverridden = att?.finalStatus !== null && att?.finalStatus !== undefined;

        if (isSandwiched) {
           computedStatuses.set(date, 'ABSENT_UNPAID');
        } else if (!isOverridden) {
           computedStatuses.set(date, 'PRESENT'); // Holiday not sandwiched is PRESENT unless overridden
        }
      }
    }

    // AGGREGATION
    for (const date of periodDates) {
      const status = computedStatuses.get(date);
      if (status === 'OUT_OF_SERVICE') outOfServiceDays += 1;
      else if (status === 'PRESENT') presentDays += 1;
      else if (status === 'HALF_DAY') { presentDays += 0.5; halfDays += 1; }
      else if (status === 'PAID_LEAVE') { presentDays += 1; paidLeaveDays += 1; }
      else if (status === 'WEEKLY_OFF') { presentDays += 1; }
      else if (status === 'WEEKLY_OFF_WORKED') { presentDays += 1; ewSuggestion += 1; }
      else if (status === 'ABSENT_UNPAID') { unpaidLeaveDays += 1; }
    }

    const absDays = divisor - presentDays - outOfServiceDays;
    
    const penaltyDays = Math.floor(lateStrikes / rules.strikes_per_penalty) * rules.penalty_days_per_trigger
                      + Math.floor(earlyStrikes / rules.strikes_per_penalty) * rules.penalty_days_per_trigger;

    const empInput = inputsByEmp.get(emp._id) || { ewDays: null, incentive: 0, bonus: 0, advanceDeduction: 0, latePunchAmt: 0, otherDebit: 0, employeeId: emp._id };
    const ewDays = empInput.ewDays ?? ewSuggestion;
    const totalPaidDays = presentDays - penaltyDays + ewDays;

    // MONEY
    // Find latest salaryRevision with effectiveFrom <= period end
    const periodEnd = periodDates[periodDates.length - 1];
    let fixedSalary = 0;
    const salaryRevs = emp.salaryRevisions || [];
    const sortedRevisions = [...salaryRevs].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    for (const rev of sortedRevisions) {
      if (rev.effectiveFrom <= periodEnd) {
        fixedSalary = rev.fixedSalary;
      }
    }

    const dailyRate = fixedSalary / divisor;
    const gross = Math.floor(dailyRate * totalPaidDays);

    let outstanding = 0;
    const ledgers = ledgerByEmp.get(emp._id) || [];
    for (const l of ledgers) {
      if (l.date <= periodEnd) {
        if (l.type === 'advance' || l.type === 'opening') outstanding += l.amount;
        if (l.type === 'deduction') outstanding -= l.amount;
      }
    }

    const requested = empInput.advanceDeduction;
    const available = gross + empInput.incentive + empInput.bonus - empInput.latePunchAmt - empInput.otherDebit;
    const advanceDeduction = Math.min(requested, Math.max(0, available));
    const advanceCarried = outstanding - advanceDeduction;

    const net = gross + empInput.incentive + empInput.bonus - advanceDeduction - empInput.latePunchAmt - empInput.otherDebit;

    lines.push({
      employeeId: emp._id,
      fixedSalary,
      divisorDays: divisor,
      dailyRate,
      presentDays,
      halfDays,
      absDays,
      paidLeaveDays,
      unpaidLeaveDays,
      outOfServiceDays,
      lateStrikes,
      earlyStrikes,
      penaltyDays,
      ewDays,
      totalPaidDays,
      gross,
      incentive: empInput.incentive,
      bonus: empInput.bonus,
      advanceDeduction,
      advanceCarried,
      latePunchAmt: empInput.latePunchAmt,
      otherDebit: empInput.otherDebit,
      net
    });
  }

  return { lines, exceptions };
}
