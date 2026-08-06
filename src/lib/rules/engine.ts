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
  monthly_paid_leave_quota?: number;
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
  weeklyOff?: string | number;
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
  _id?: any;
  date: string;
  name: string;
  sandwichEligible: boolean;
  recurrence?: string;
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

export type SettlementNote = {
  employeeId: any;
  kind: 'wo_worked_settled' | 'quota_downgrade';
  triggerDate: string;  // the WO-worked day, OR the downgraded PAID_LEAVE date
  settledDate: string;  // the adjacent leave date settled, OR same as triggerDate for quota
  message: string;      // human-readable explanation
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
  outstandingAdvance: number;
  advanceDeduction: number;
  advanceCarried: number;
  latePunchAmt: number;
  otherDebit: number;
  net: number;
  absentDates?: string[];
  presentDatesList?: string[];
  halfDatesList?: string[];
  paidLeaveDatesList?: string[];
  ewDatesList?: string[];
  settlementNotes?: SettlementNote[];
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
}): { lines: PayrollLine[]; exceptions: Exception[]; settlements: SettlementNote[] } {
  const lines: PayrollLine[] = [];
  const exceptions: Exception[] = [];
  const settlements: SettlementNote[] = [];
  const rules = input.period.ruleset;
  const divisor = input.period.divisorDays;

  // Build lookups
  const leavesByEmpDate = new Map<string, LeaveEntry>();
  input.leaves.forEach(l => leavesByEmpDate.set(`${l.employeeId}_${l.date}`, l));

  const periodYear = input.period.year;
  const periodMonth = input.period.month;
  // Build calendar for the month
  const numDays = new Date(periodYear, periodMonth, 0).getDate();
  const periodDates: string[] = [];
  for (let i = 1; i <= numDays; i++) {
    periodDates.push(`${periodYear}-${periodMonth.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`);
  }

  const holidaysByDate = new Map<string, Holiday>();
  periodDates.forEach(dateStr => {
    const [, monthStr, dayStr] = dateStr.split('-');
    const matchingHoliday = input.holidays.find(h => {
      if (h.recurrence === 'monthly') return h.date.endsWith(`-${dayStr}`);
      if (h.recurrence === 'yearly') return h.date.endsWith(`-${monthStr}-${dayStr}`);
      return h.date === dateStr;
    });
    if (matchingHoliday) holidaysByDate.set(dateStr, matchingHoliday);
  });

  const attendanceByEmpDate = new Map<string, AttendanceDay>();
  input.attendance.forEach(a => attendanceByEmpDate.set(`${a.employeeId}_${a.date}`, a));

  const inputsByEmp = new Map<any, PayrollInput>();
  input.inputs.forEach(i => inputsByEmp.set(i.employeeId, i));

  const ledgerByEmp = new Map<any, LedgerEntry[]>();
  input.ledger.forEach(l => {
    if (!ledgerByEmp.has(l.employeeId)) ledgerByEmp.set(l.employeeId, []);
    ledgerByEmp.get(l.employeeId)!.push(l);
  });


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
      const dayMap: Record<string, number> = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
      const empWeeklyOffNum = typeof emp.weeklyOff === 'number' ? emp.weeklyOff : (dayMap[emp.weeklyOff || 'Sunday'] ?? 0);
      const isWeeklyOff = new Date(date).getDay() === empWeeklyOffNum;

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
          // If a paid leave entry exists on a weekly-off day, treat it as PAID_LEAVE
          // so the quota enforcement pass can downgrade it to ABSENT_UNPAID when the
          // monthly quota is already exhausted (enables the "bigger sandwich" scenario).
          if (leave?.kind === 'paid') {
            status = 'PAID_LEAVE';
          } else {
            status = 'WEEKLY_OFF';
          }
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

    // ENFORCE MONTHLY PAID LEAVE QUOTA
    const quota = rules.monthly_paid_leave_quota ?? Infinity;
    if (isFinite(quota)) {
      const paidLeaveDates = periodDates.filter(d => computedStatuses.get(d) === 'PAID_LEAVE');
      if (paidLeaveDates.length > quota) {
        // Downgrade excess paid leaves (beyond quota, in date order) to unpaid
        paidLeaveDates.slice(quota).forEach(d => {
          computedStatuses.set(d, 'ABSENT_UNPAID');
          const note: SettlementNote = {
            employeeId: emp._id,
            kind: 'quota_downgrade',
            triggerDate: d,
            settledDate: d,
            message: `Paid leave on ${d} downgraded to unpaid: monthly quota of ${quota} already exhausted.`,
          };
          settlements.push(note);
        });
      }
    }

    // WO-WORKED SETTLEMENT PASS
    // For each WEEKLY_OFF_WORKED day, try to settle one adjacent ABSENT_UNPAID day
    // (that has a leave entry) into PAID_LEAVE, consuming 1 ewSuggestion credit.
    const woWorkedDates = periodDates.filter(d => computedStatuses.get(d) === 'WEEKLY_OFF_WORKED');
    for (const woDate of woWorkedDates) {
      const beforeDate = getNextDateStr(woDate, -1);
      const afterDate  = getNextDateStr(woDate,  1);

      let settledDate: string | null = null;

      // Prefer before-day
      if (
        periodDates.includes(beforeDate) &&
        computedStatuses.get(beforeDate) === 'ABSENT_UNPAID' &&
        leavesByEmpDate.has(`${emp._id}_${beforeDate}`)
      ) {
        settledDate = beforeDate;
      } else if (
        periodDates.includes(afterDate) &&
        computedStatuses.get(afterDate) === 'ABSENT_UNPAID' &&
        leavesByEmpDate.has(`${emp._id}_${afterDate}`)
      ) {
        settledDate = afterDate;
      }

      if (settledDate !== null) {
        computedStatuses.set(settledDate, 'PAID_LEAVE');
        ewSuggestion -= 1; // credit consumed by settlement
        const note: SettlementNote = {
          employeeId: emp._id,
          kind: 'wo_worked_settled',
          triggerDate: woDate,
          settledDate,
          message: `Working on weekly-off ${woDate} settled the adjacent unpaid absence on ${settledDate} to PAID_LEAVE.`,
        };
        settlements.push(note);
      }
    }

    // PRE-PROCESS HOLIDAYS
    for (const date of periodDates) {
      const holiday = holidaysByDate.get(date);
      const att = attendanceByEmpDate.get(`${emp._id}_${date}`);
      const isOverridden = att?.finalStatus !== null && att?.finalStatus !== undefined;
      const worked = att?.machineStatus === 'P' || att?.machineStatus === 'WOP';

      if (holiday?.sandwichEligible && !worked && !isOverridden && computedStatuses.get(date) !== 'EXCEPTION') {
        computedStatuses.set(date, 'PRESENT'); // Default unworked holiday to PRESENT before sandwich
      }
    }

    // ADVANCED SANDWICH RULE (Block-based)
    const isBlockable = (date: string) => {
      const status = computedStatuses.get(date);
      const holiday = holidaysByDate.get(date);
      const att = attendanceByEmpDate.get(`${emp._id}_${date}`);
      const worked = att?.machineStatus === 'P' || att?.machineStatus === 'WOP';
      const isOverridden = att?.finalStatus !== null && att?.finalStatus !== undefined;

      if (isOverridden) return false;

      if (holiday?.sandwichEligible && !worked) return true;
      if (status === 'WEEKLY_OFF' && rules.sandwich_skips_weekly_off) return true;
      if (status === 'PAID_LEAVE') return true;

      return false;
    };

    let currentBlock: string[] = [];
    const blocks: string[][] = [];

    for (const date of periodDates) {
      if (isBlockable(date)) {
        currentBlock.push(date);
      } else {
        if (currentBlock.length > 0) {
          blocks.push(currentBlock);
          currentBlock = [];
        }
      }
    }
    if (currentBlock.length > 0) blocks.push(currentBlock);

    for (const block of blocks) {
      const startDate = block[0];
      const endDate = block[block.length - 1];

      const prevDate = getNextDateStr(startDate, -1);
      const nextDate = getNextDateStr(endDate, 1);

      if (periodDates.includes(prevDate) && periodDates.includes(nextDate)) {
        if (computedStatuses.get(prevDate) === 'ABSENT_UNPAID' && computedStatuses.get(nextDate) === 'ABSENT_UNPAID') {
          for (const date of block) {
            computedStatuses.set(date, 'ABSENT_UNPAID');
          }
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
    // Track whether the admin has explicitly saved an advanceDeduction value.
    // If the input document doesn't exist at all, or exists with advanceDeduction === 0,
    // we cannot distinguish "admin entered 0" from "admin never entered anything".
    // The safest heuristic: if the stored value is 0 but there is an outstanding balance,
    // auto-apply the full outstanding amount so the ledger is reflected in Net by default.
    const hasManualAdvanceEntry = inputsByEmp.has(emp._id) && (inputsByEmp.get(emp._id)!.advanceDeduction > 0);
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

    // If the admin has explicitly entered a deduction amount, use it.
    // Otherwise, auto-apply the full outstanding balance (capped to what's available).
    const requested = hasManualAdvanceEntry ? empInput.advanceDeduction : outstanding;
    const available = gross + empInput.incentive + empInput.bonus - empInput.latePunchAmt - empInput.otherDebit;
    const advanceDeduction = Math.min(requested, Math.max(0, available));
    const advanceCarried = outstanding - advanceDeduction;

    const net = gross + empInput.incentive + empInput.bonus - advanceDeduction - empInput.latePunchAmt - empInput.otherDebit;

    const absentDates: string[] = [];
    const presentDatesList: string[] = [];
    const halfDatesList: string[] = [];
    const paidLeaveDatesList: string[] = [];
    const ewDatesList: string[] = [];

    const monthShort = new Date(periodYear, periodMonth - 1).toLocaleString('default', { month: 'short' });

    for (const date of periodDates) {
      const status = computedStatuses.get(date);
      const [, , d] = date.split('-');
      const dayFormatted = `${parseInt(d, 10)} ${monthShort}`;

      if (status === 'ABSENT_UNPAID' || !status) {
        absentDates.push(dayFormatted);
      }
      if (status === 'PRESENT' || status === 'WEEKLY_OFF') {
        presentDatesList.push(dayFormatted);
      }
      if (status === 'HALF_DAY') {
        halfDatesList.push(dayFormatted);
      }
      if (status === 'PAID_LEAVE') {
        paidLeaveDatesList.push(dayFormatted);
      }
      if (status === 'WEEKLY_OFF_WORKED') {
        ewDatesList.push(dayFormatted);
      }
    }

    const empSettlements = settlements.filter(s => String(s.employeeId) === String(emp._id));

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
      outstandingAdvance: outstanding,
      advanceDeduction,
      advanceCarried,
      latePunchAmt: empInput.latePunchAmt,
      otherDebit: empInput.otherDebit,
      net,
      absentDates,
      presentDatesList,
      halfDatesList,
      paidLeaveDatesList,
      ewDatesList,
      settlementNotes: empSettlements,
    });
  }

  return { lines, exceptions, settlements };
}
