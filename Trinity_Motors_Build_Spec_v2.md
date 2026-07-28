# Trinity Motors Attendance & Payroll ERP
# Iteration 1 Build Specification

Client: Trinity Motors, Pune. ~57 active employees, 86 codes on the biometric device.
Vendor: Delpat LLP
Version 2. Database changed from Postgres to MongoDB. All other decisions unchanged.

Status: This is the first production iteration. Trinity begins using it for a live payroll month immediately after handover. It is not a prototype.

Budget: 20 to 24 engineering hours.

---

## 0. Instructions for the implementing agent

Read this section before writing code.

1. **Build exactly what Section 12 lists, in the order it lists.** Do not reorder. Each task has a checkpoint. Do not begin the next task until the checkpoint passes.
2. **Section 13 is a prohibition list.** Everything on it is a deliberate exclusion, not an oversight. Do not add any of it, do not stub it, do not leave TODOs for it.
3. **Where this document specifies a literal value, use it.** Thresholds, enum strings, field names, collection names, formulas. Do not rename for style.
4. **Do not introduce libraries beyond Section 2.** No state manager, no form library, no date library beyond `date-fns`, no test framework beyond `tsx` running a script.
5. **Do not create abstractions for a second client, a second rule set, or a second import format.** There is one client and one device.
6. **T1 is the acceptance test for the entire calculation layer.** If it does not pass, no UI work has value. Do not proceed past it.
7. **Section 5.1 lists five MongoDB conventions that are correctness requirements, not preferences.** Violating any of them produces wrong salaries. Read them before writing a schema.
8. When this document and your judgement disagree about scope, this document wins. When they disagree about a bug, fix the bug and note it.

---

## 1. What the system does

Trinity's biometric device exports one `.xls` per month. Today, an admin manually turns that file into a salary sheet over several days. This system ingests the file, applies Trinity's attendance rules, surfaces only the days it cannot decide, lets the admin resolve those, and produces the final salary figures and an `.xlsx` export.

It is an end of month reconciliation engine, not a real time attendance tracker. There is no live view, no approval workflow, and no employee-facing surface.

---

## 2. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15, App Router, TypeScript, server actions only |
| DB | **MongoDB Atlas**, accessed via **Mongoose 8** |
| Auth | **Auth.js v5, credentials provider, bcrypt, one user** |
| File storage | **Binary field on the import document.** No GridFS, no object store. |
| UI | Tailwind, shadcn/ui |
| XLS parsing | `xlsx` (SheetJS), reads legacy BIFF |
| XLSX export | `exceljs` |
| Dates | `date-fns` |
| Verification | `tsx` running a plain script |

Mongoose rather than the raw driver because payroll needs enforced document shape. A schemaless collection holding salary figures is a liability, and the Mongoose schemas double as the type contract for the whole app. This is the one ODM allowed; do not add anything else on top of it.

The connection must be a **replica set**. Atlas provides this by default. A single-node local `mongod` cannot run transactions, and Section 14 requires one.

No API routes. No queues, cron, workers, or background jobs. Monthly volume is 86 blocks by 31 days, about 2,666 documents. Everything runs synchronously inside a server action in under a second.

---

## 3. Verified facts from the client's real files

These were derived from the actual June 2026 files and reconcile exactly. Treat them as given.

### 3.1 Payroll formula

```
daily_rate       = fixed_salary / divisor_days          // divisor_days = 30
total_paid_days  = present_days - penalty_days + ew_days
gross            = floor(daily_rate * total_paid_days)  // rate NOT pre-rounded
net              = gross + incentive + bonus
                   - advance_deduction - late_punch_amt - other_debit
```

Validated across all 57 rows of the June salary sheet. Implied fixed salaries come out as clean round figures (7,500 / 12,000 / 18,000 / 28,000 / 60,000).

Worked example: fixed 28,000, paid days 34. `28000/30 = 933.3333`, `× 34 = 31733.33`, floor `31733`. Sheet says 31,733.

### 3.2 The divisor is 30, a calendar month

`ABS. DAYS + Total Present Days = 30` on every row of the sheet. Weekly offs are already paid inside the fixed salary and count as present days. `divisorDays` stays 30 for a 31 day month.

### 3.3 Machine status vocabulary

The device emits exactly four codes: `P`, `A`, `WO`, `WOP`.

| Code | Meaning | Day value |
|---|---|---|
| `P` | Present | 1.0 |
| `A` | Absent | 0, unless a leave entry converts it |
| `WO` | Weekly off, not worked | 1.0, paid |
| `WOP` | Weekly off, worked | 1.0, and counts toward the E.W. suggestion |

### 3.4 The device's own late calculation is unusable

`Late By` and `Early By` are `00:00` on every row in the file. The feature is not configured on the device. **Ignore both columns entirely.** Derive lateness from raw `In Time` and `Out Time`.

### 3.5 Machine codes are dirty

The file contains `'07'` alongside `'7'` and `'8'`. Normalize every code with `parseInt(String(v).trim(), 10)` on both sides of the join. Missing this silently splits one employee into two records.

### 3.6 The device holds leavers

86 employee blocks against roughly 57 real people. Unmapped codes must be ignorable, and ignoring must be reversible.

### 3.7 E.W. days cannot be derived reliably

`WOP` is very probably a worked weekly off, which is what an extra working day is. But the counts do not reconcile: machine code 2 shows 8 `WOP` days in June against 5 E.W. days on the sheet.

**Therefore E.W. is an admin input on the payroll review screen, pre-filled with the `WOP` count, editable.** Do not build inference beyond the pre-fill.

### 3.8 Two penalty systems conflict in the client's current process

The BRD specifies a 0.5 day deduction per three late strikes. The June sheet also carries a rupee `Debit` against a late punch count, applied inconsistently (4 punches against 500, 11 punches against nothing, 1,000 against a blank count).

**Implement the day deduction automatically. Leave the rupee amount as a manual field defaulting to 0. Never apply both automatically.** The settings screen states this in words so a future admin does not enable both.

---

## 4. Core principle

**Store facts. Compute everything else on every read.**

Facts, stored: punches, leave entries, holidays, ledger entries, admin overrides, admin-entered numbers, and the ruleset pinned to a period.

Derived, stored nowhere until lock: statuses, strike counts, penalties, present days, gross, net.

One function:

```ts
computePayroll(input: ComputeInput): { lines: PayrollLine[]; exceptions: Exception[] }
```

Pure, idempotent, reads only facts. Same input, same output, always.

This makes retroactive corrections free. A leave card arriving late is one new document, and the next render is correct. There is no recalculation routine to write and no cache to invalidate.

**Never write an update against a computed number.** If you find yourself doing so, the design has been broken.

Locking is the single exception: `computePayroll` runs once more, output is frozen into `payrollLines`, the period becomes read only.

### 4.1 Rulesets are pinned to the period

The ruleset is a fact, so it is stored, not read from global settings at compute time.

When a period is opened, the current settings document is copied into `periods.ruleset` as an embedded object. `computePayroll` reads thresholds from `period.ruleset`, never from the settings collection.

Consequence: changing the grace period in September does not silently alter August's already-paid figures when August is reopened. This is one embedded object and it is not optional.

---

## 5. Data model

### 5.1 MongoDB conventions, mandatory

These five are correctness requirements. Violating any of them produces wrong salaries or silent data corruption.

**1. Calendar dates are stored as `yyyy-MM-dd` strings, never as `Date`.**
Attendance dates, leave dates, holiday dates, joining and end dates, ledger dates. A `Date` in MongoDB is a UTC instant; a document written from an IST server at local midnight lands on the previous calendar day in UTC, and an attendance row silently shifts by one day. Strings sort lexicographically, compare exactly, and cannot drift. Only true timestamps (`createdAt`, `lockedAt`, `overriddenAt`, `uploadedAt`) are `Date`.

**2. Money is stored as integer rupees. Never `Decimal128`, never a fractional `Number`.**
Every stored monetary value is a whole rupee: salaries, gross, net, advances, incentives, debits. `gross` is floored to an integer by the formula, so nothing fractional ever needs storing. `dailyRate` is the sole exception: it is derived, display-only, and stored as a `Number` rounded to 4 decimals on the payroll line. Do not reach for `Decimal128`; it returns wrapper objects that leak into every calculation and every template, and it is not needed when nothing fractional is stored.

**3. Day counts are `Number` in 0.5 increments.**
`presentDays`, `penaltyDays`, `ewDays`, `absDays`, `totalPaidDays`. Halves are exact in binary floating point, so these are safe. Do not introduce a fraction type.

**4. Do not embed attendance days, leave entries, or ledger entries in the employee document.**
Attendance grows by 31 documents per employee per month, unbounded, and is queried by date across all employees during the close. Keep these as separate collections. **Salary revisions are the one exception and are embedded**, because they are bounded, tiny, and always read together with the employee.

**5. There is no cascading delete.**
Employees are never hard-deleted; use `endDate` or `isIgnored`. If a period is ever deleted, delete its `attendanceDays`, `imports`, and `payrollInputs` explicitly in the same transaction.

### 5.2 Collections

```ts
// employees
{
  _id: ObjectId,
  machineId: Number,          // unique, normalized integer
  name: String,               // required
  designation: String,
  dateOfJoining: String,      // 'yyyy-MM-dd', required
  endDate: String | null,     // null = active
  paymentMode: String,        // 'Cash' | 'Bank', default 'Cash'
  isIgnored: Boolean,         // default false
  salaryRevisions: [          // embedded, see 5.1 rule 4
    { fixedSalary: Number,    // integer rupees
      effectiveFrom: String,  // 'yyyy-MM-dd'
      createdAt: Date }
  ],
  createdAt: Date
}

// holidays
{ _id, date: String /* unique */, name: String, sandwichEligible: Boolean }

// leaveEntries
{ _id, employeeId: ObjectId, date: String,
  kind: 'paid' | 'unpaid' | 'half',
  note: String, loggedBy: ObjectId, loggedAt: Date }

// settings                                  (exactly one document)
{ _id: 'global', ruleset: { ...see 5.3 }, updatedAt: Date }

// periods
{ _id, month: Number, year: Number,
  divisorDays: Number,                       // default 30
  ruleset: { ...pinned copy, see 4.1 },
  status: 'open' | 'resolving' | 'review' | 'locked',
  lockedAt: Date, lockedBy: ObjectId, unlockReason: String }

// imports
{ _id, periodId: ObjectId, filename: String,
  fileHash: String,                          // sha256 of the buffer
  fileData: Buffer,                          // the raw .xls, ~600KB, see 5.1
  rowCount: Number, uploadedAt: Date }

// attendanceDays
{ _id, periodId: ObjectId, employeeId: ObjectId, date: String,
  shift: String | null,
  inTime: String | null,                     // 'HH:mm:ss'
  outTime: String | null,
  durationMins: Number | null,
  machineStatus: 'P' | 'A' | 'WO' | 'WOP',   // verbatim, NEVER updated after insert
  finalStatus: String | null,                // admin override, null when untouched
  overrideReason: String | null,
  overriddenBy: ObjectId | null,
  overriddenAt: Date | null }

// ledgerEntries
{ _id, employeeId: ObjectId,
  periodId: ObjectId | null,                 // null for opening balances
  date: String,
  type: 'opening' | 'advance' | 'deduction',
  amount: Number,                            // integer rupees
  note: String, createdAt: Date }

// payrollInputs                             (admin numbers while a period is open)
{ _id, periodId: ObjectId, employeeId: ObjectId,
  ewDays: Number | null,                     // null = use the WOP suggestion
  incentive: Number, bonus: Number,
  advanceDeduction: Number, latePunchAmt: Number, otherDebit: Number }

// payrollLines                              (written ONLY at lock)
{ _id, periodId: ObjectId, employeeId: ObjectId,
  fixedSalary, divisorDays, dailyRate,
  presentDays, halfDays, absDays, paidLeaveDays, unpaidLeaveDays,
  outOfServiceDays, lateStrikes, earlyStrikes, penaltyDays,
  ewDays, totalPaidDays,
  gross, incentive, bonus,
  advanceDeduction, advanceCarried, latePunchAmt, otherDebit, net }

// users
{ _id, email: String /* unique */, passwordHash: String, name: String }
```

### 5.2.1 Indexes

Uniqueness is enforced by indexes, not by application code. Create all of these.

```
employees        { machineId: 1 }                              unique
holidays         { date: 1 }                                   unique
leaveEntries     { employeeId: 1, date: 1 }                    unique
periods          { year: 1, month: 1 }                         unique
imports          { periodId: 1, fileHash: 1 }                  unique
attendanceDays   { periodId: 1, employeeId: 1, date: 1 }       unique
attendanceDays   { periodId: 1, date: 1 }
payrollInputs    { periodId: 1, employeeId: 1 }                unique
payrollLines     { periodId: 1, employeeId: 1 }                unique
ledgerEntries    { employeeId: 1, date: 1 }
users            { email: 1 }                                  unique
```

The unique index on `imports` is what rejects a duplicate upload. Catch the duplicate key error and surface it as a friendly message rather than checking first.

**Do not create collections for strikes, penalties, leave balances, or monthly advance balances.** All are aggregates over the above. A strikes collection drifts from `attendanceDays` the first time a day is edited, and then two screens disagree about the same employee in front of the client.

`machineStatus` is immutable after insert. Original and override sitting in one document satisfies the audit requirement. No separate audit collection.

### 5.3 Ruleset shape

```json
{
  "shift_start": "09:30",
  "shift_end": "19:30",
  "grace_until": "09:40",
  "half_day_if_in_after": "11:30",
  "half_day_if_out_before": "15:30",
  "late_strike_window": ["09:41", "11:29"],
  "early_strike_window": ["15:31", "19:29"],
  "strikes_per_penalty": 3,
  "penalty_days_per_trigger": 0.5,
  "sandwich_skips_weekly_off": true
}
```

Seed the `settings` document with exactly this.

### 5.4 Access control

There is no row level security in MongoDB. **Every server action must call the session helper and throw on an absent session as its first statement.** Write one `requireSession()` helper in `/lib/auth.ts` and call it at the top of every action without exception. A missed guard is a public payroll endpoint.

---

## 6. Parser

`/lib/parser/biometric.ts`

The file is a wide block layout: one block per employee, days as columns, blank spacer columns between week groups. Do not parse by fixed row numbers.

### Algorithm

1. Read the sheet with `XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false })` into a 2D array.
2. **Build the column to date map once.** Scan row index 11 (the `Days` row) across all columns. Any cell parseable as `DD-MMM` yields a date. Columns that fail are spacers, skip them. In the June file this yields 30 dated columns.
3. **Find blocks.** Scan column index 1 for cells containing `Employee Code:-`. Each hit is an anchor row `r`.
4. Machine code sits at `[r][6]`. Normalize with `parseInt(String(v).trim(), 10)`.
5. Block rows are fixed offsets from `r`:

| Offset | Row label |
|---|---|
| +1 | Day |
| +2 | Shift |
| +3 | In Time |
| +4 | Out Time |
| +5 | Late By (ignore) |
| +6 | Early By (ignore) |
| +7 | Total OT (ignore) |
| +8 | Duration |
| +9 | T Duration (ignore) |
| +10 | Status |

6. For each dated column, emit one row: `{ machineId, date, shift, inTime, outTime, durationMins, machineStatus }`.
7. Times are `HH:MM:SS`; `00:00` means no punch, store `null`. Duration is `HH:MM`, convert to minutes.
8. Dates are emitted as `yyyy-MM-dd` strings. See 5.1 rule 1.

### Validation, before parsing anything

Assert all of the following. On any failure, reject the file and report expected against found. **Never parse partially and never produce salary figures from a file that did not fully validate.**

- At least one `Employee Code:-` anchor exists.
- For every anchor, `[r+3][1]` is `In Time` and `[r+10][1]` is `Status`.
- The date map contains between 28 and 31 dates, all in the target month.
- Every value in the Status row is one of `P`, `A`, `WO`, `WOP`, or empty.

### Signature

```ts
type ParsedDay = {
  machineId: number
  date: string          // yyyy-MM-dd
  shift: string | null
  inTime: string | null
  outTime: string | null
  durationMins: number | null
  machineStatus: 'P' | 'A' | 'WO' | 'WOP'
}

parseBiometricFile(buffer: Buffer, month: number, year: number):
  { ok: true; days: ParsedDay[] } | { ok: false; errors: string[] }
```

Store the raw buffer on the import document. If the parser is ever wrong, reparse rather than asking Trinity to re-export.

---

## 7. Rule engine

`/lib/rules/`. Pure TypeScript. **Zero imports from Mongoose, Next.js, or any I/O.** It receives plain objects and returns plain objects. This is what makes T1 possible.

### 7.1 Day statuses

```ts
type DayStatus =
  | 'PRESENT'            // 1.0
  | 'HALF_DAY'           // 0.5
  | 'PAID_LEAVE'         // 1.0
  | 'WEEKLY_OFF'         // 1.0
  | 'WEEKLY_OFF_WORKED'  // 1.0, counts toward E.W. suggestion
  | 'ABSENT_UNPAID'      // 0
  | 'OUT_OF_SERVICE'     // 0, before joining or after end date
  | 'EXCEPTION'          // 0, blocks locking
```

### 7.2 Evaluation order

Run exactly this sequence per employee per day. Order matters.

```
1. LIFECYCLE   date < dateOfJoining OR date > endDate
               -> OUT_OF_SERVICE, stop

2. OVERRIDE    finalStatus is not null
               -> use it verbatim, stop

3. WEEKLY OFF  machineStatus = 'WO'  -> WEEKLY_OFF, stop
               machineStatus = 'WOP' -> WEEKLY_OFF_WORKED, continue to 6

4. ORPHAN      inTime present AND outTime null
               -> EXCEPTION (orphan_punch), stop

5. LEAVE       machineStatus = 'A':
                 leave kind 'paid'   -> PAID_LEAVE, stop
                 leave kind 'half'   -> HALF_DAY, stop
                 leave kind 'unpaid' -> ABSENT_UNPAID, stop
                 no leave entry      -> ABSENT_UNPAID, stop

6. THRESHOLD   inTime  > half_day_if_in_after   -> HALF_DAY
               outTime < half_day_if_out_before -> HALF_DAY
               else                             -> PRESENT

7. CONFLICT    status is PRESENT but a 'half' leave entry exists
               -> EXCEPTION (conflict)

8. STRIKES     inTime  within late_strike_window  -> late strike
               outTime within early_strike_window -> early strike
               (only on PRESENT or HALF_DAY days)
```

Rule 1 sits first deliberately. A mid-month joiner marked absent for their first twelve days is the failure that destroys trust on day one.

Rule 2 sits second so an admin override always wins over recomputation.

Time comparisons are string comparisons on `HH:mm`, which are lexicographically correct. Do not construct `Date` objects to compare times.

### 7.3 Sandwich rule

Applied after the per-day pass.

For each holiday `H` where `sandwichEligible`:
- Find the previous and next day that are neither `WEEKLY_OFF` nor a holiday, when `sandwich_skips_weekly_off` is true. When false, use the literal adjacent calendar days.
- If both are `ABSENT_UNPAID`, set `H` to `ABSENT_UNPAID`.

A holiday date that is not sandwiched is `PRESENT` regardless of the machine status, unless overridden.

### 7.4 Aggregation

```
presentDays       = sum(dayValue)
outOfServiceDays  = count(OUT_OF_SERVICE)
absDays           = divisorDays - presentDays - outOfServiceDays
halfDays          = count(HALF_DAY)
paidLeaveDays     = count(PAID_LEAVE)
unpaidLeaveDays   = count(ABSENT_UNPAID)
penaltyDays       = floor(lateStrikes  / strikes_per_penalty) * penalty_days_per_trigger
                  + floor(earlyStrikes / strikes_per_penalty) * penalty_days_per_trigger
ewSuggestion      = count(WEEKLY_OFF_WORKED)
ewDays            = payrollInputs.ewDays ?? ewSuggestion
totalPaidDays     = presentDays - penaltyDays + ewDays
```

Mid-month joiners prorate automatically: fewer present days against a fixed divisor.

### 7.5 Money

```
fixedSalary  = latest salaryRevision with effectiveFrom <= period end
dailyRate    = fixedSalary / divisorDays        // do NOT round
gross        = floor(dailyRate * totalPaidDays)

outstanding  = sum of ledgerEntries for the employee up to and including this period
requested    = payrollInputs.advanceDeduction ?? 0

// clamp: never emit a negative salary
available        = gross + incentive + bonus - latePunchAmt - otherDebit
advanceDeduction = min(requested, max(0, available))
advanceCarried   = outstanding - advanceDeduction

net = gross + incentive + bonus
      - advanceDeduction - latePunchAmt - otherDebit
```

The clamp exists because a mid-month resignation with an advance larger than the final settlement would otherwise print a negative figure on a salary sheet. The remainder stays in the ledger and is flagged on the review screen.

Every stored figure here is an integer rupee. See 5.1 rule 2.

### 7.6 Signature

```ts
computePayroll(input: {
  period: Period
  employees: Employee[]
  attendance: AttendanceDay[]
  leaves: LeaveEntry[]
  holidays: Holiday[]
  ledger: LedgerEntry[]
  inputs: PayrollInput[]
}): { lines: PayrollLine[]; exceptions: Exception[] }
```

Salary revisions arrive embedded on `Employee`. The data layer fetches and converts Mongoose documents to plain objects with `.lean()` before calling the engine. The engine never sees a Mongoose document.

---

## 8. Actions

The complete surface. Twenty-eight. Anything proposed later must name which of these it serves.

**Employee**: create · map machine code · ignore code · un-ignore code · edit · set end date · add salary revision · view attendance history

**Month**: open period · upload file · replace file · view parse summary · override a day · bulk mark present · reopen a resolved day · skip an exception · enter E.W. · enter incentive, bonus, late punch amount, other debit · set advance deduction · lock · unlock with reason · export

**Leave**: log · edit · delete · view by employee and month

**Money**: log advance · log opening balance · view ledger and balance

**Calendar and rules**: add or remove holiday · edit ruleset

### 8.1 Bulk mark present

One date, all employees or a checked subset. Writes N override fields with a shared reason, exactly like a single override. **No new status, no engine branch, no new collection.**

Scope guard: **only applies to days whose computed status is `ABSENT_UNPAID` or `EXCEPTION` and whose `finalStatus` is null.** Days with real punches are never touched. Show the count of days about to change on the button.

Covers machine outage, workshop shut, off-site crews, and a verbally declared holiday, with one action.

### 8.2 Missing employee assertion

At import, assert every active employee (not ignored, joined on or before period end, no end date before period start) has at least one document in the parsed file. List any that do not.

An active employee absent from the file otherwise silently drops out of payroll and does not get paid. This is the worst failure mode in the system, and it is one query.

---

## 9. Flows

**Monthly close.** Open period → upload → validate and parse → resolve unmapped codes and missing employees → engine flags exceptions → clear the queue, entering leave cards inline → enter E.W., incentives, debits, deductions → review → lock → export.

The close happens across several sittings. All state is in the database. Do not build anything that assumes one session, and let the dashboard show progress.

**New hire.** Create employee with joining date, before the machine code exists. Map the code at the next upload. Engine ignores earlier dates and prorates.

**Resignation.** Set end date. Engine stops expecting punches. Check attendance history, settle outstanding advance, clamp applies.

**Mid-month advance.** Logged same day from the employee record, disconnected from any period. At close, the review grid shows the outstanding balance and accepts this month's deduction. Remainder rolls forward with no action.

**Retroactive leave card.** Logged from the employee record if off-cycle, or inline in the queue if during the close. Same action, two entry points, which is why leave entry exists in both places.

**Correction after lock.** Unlock with a reason, correct, re-lock, re-export.

**Cutover, once.** Employee master, opening advance balances, holiday calendar, leave already consumed in the cutover month.

Flows that do not exist, and therefore features that do not exist: nobody needs to know who is absent today, nobody approves anything, nobody reports across months.

---

## 10. Screens

Five plus settings. The count is a result of clustering actions by when they happen and what context they need, not a target.

### S1 Period dashboard, `/`
One card per month showing status, exception count remaining, and employee count. Open a new period. Resume an in-progress one.

### S2 Upload, `/periods/[id]/upload`
Drop the `.xls`. Show rows parsed, employees matched, and two blocking lists: unmapped machine codes with Map or Ignore per row, and active employees missing from the file. Cannot proceed until both are cleared. Replace file allowed while the period is open, deleting `attendanceDays` for the period but preserving `leaveEntries`, `ledgerEntries`, and `payrollInputs`. Overrides live on the attendance document and are lost on replace; warn explicitly with the count before proceeding.

### S3 Resolution queue, `/periods/[id]/queue`
The screen that decides adoption. One exception at a time, filling the screen: employee, date, raw punch times, and the reason it was flagged in plain words with the threshold quoted, for example `punched in 11:47, half-day threshold is 11:30`.

Fully keyboard operable: `1` full day, `2` half day, `3` absent, `4` paid leave, `S` skip, then a reason, then auto-advance. Resolving an item requires no pointing device. Inline leave entry so the admin never leaves the queue. Bulk mark present is invoked from here. Position is remembered across sessions.

### S4 Payroll review, `/periods/[id]/review`
A grid of all employees with their existing sheet's columns plus the ones it never showed: half days, unpaid leave, late strikes, early strikes, penalty days. E.W. is pre-filled and editable. Incentive, bonus, advance deduction, late punch amount, and other debit are typed here. Outstanding advance and carried balance are shown per row.

Every computed cell expands on click to show its derivation, for example `28 present + 3 E.W. − 0.5 penalty = 30.5 × 933.33`. Trust comes from showing the working.

Lock button, disabled while exceptions remain. Unlock with a mandatory reason. Export.

### S5 Employee record, `/employees` with a drawer
Six sections, each forced by a specific action:

| Section | Exists because |
|---|---|
| Profile header | joining and end date have to be recorded somewhere |
| Machine mapping | a mis-mapping made in haste at upload must be correctable |
| Salary revisions, as a list | a mid-year raise must not rewrite past months |
| Ledger with running balance | mid-month advances are logged off-cycle |
| Leave by month | retroactive cards arrive off-cycle |
| Attendance history | a final settlement has to be verifiable, and resolved days reopened |

Salary as a dated list rather than a single field is the one to defend. Store one `fixedSalary` and the first raise silently changes every past payroll line the moment an old month is reopened. Costs nothing now, unrecoverable later.

### S6 Settings, `/settings`
The ruleset form: shift times, grace, half-day thresholds, strike windows, strikes per penalty, penalty days, sandwich behaviour. Plus holiday CRUD.

Include this static line above the late penalty fields:

> Late arrivals are penalised by day deduction. The rupee Late Punch Amount on the payroll sheet is entered manually and is not applied automatically. Do not use both as a policy.

Rule changes affect periods opened after the change. Periods already open keep the ruleset they were opened with. Show the pinned ruleset, read only, on the review screen.

---

## 11. Export

`/lib/export/salarySheet.ts`, ExcelJS, generated from locked `payrollLines`.

The layout is a field mapping over the payroll line, isolated from calculation. Ship a default template matching Trinity's current sheet so it looks familiar on day one. Changing it must never require touching the engine.

The owner never logs in. This export is the only delivery mechanism to the person who signs off on salaries.

---

## 12. Build sequence

Twenty-two hours. Do not reorder. Do not skip a checkpoint.

| # | Task | Hrs | Checkpoint |
|---|---|---|---|
| **T1** | Parser and rule engine as pure functions. Verification script reading the real June `.xls` and asserting gross per employee against the June salary sheet. **No UI, no database.** | 6 | `npx tsx scripts/verify-june.ts` prints a per-employee diff and exits 0. **Nothing after this has value until it passes.** |
| T2 | Mongoose schemas, indexes, Atlas connection with a cached global client, seed settings, Auth.js credentials login, `requireSession()` helper | 1.5 | Log in, indexes confirmed via `db.collection.getIndexes()` |
| T3 | S5 employee record: create, edit, end date, embedded salary revisions | 2 | Seed 57 employees from the client master |
| T4 | S1 dashboard, open a period, pin the ruleset | 1 | June 2026 opens with a ruleset copy embedded |
| T5 | S2 upload: hash check, validation, parse, store, unmapped codes, missing employees | 3 | Real June file lands 2,666 documents, both lists clear |
| T6 | Wire `computePayroll` to the data layer with `.lean()`, exception generation | 1.5 | Exception count matches T1's |
| T7 | S3 queue: keyboard resolution, reasons, skip, inline leave | 3 | Sixty exceptions cleared without a mouse |
| T8 | Bulk mark present, reopen a resolved day | 1 | Marking a date changes only absent and flagged days |
| T9 | S4 review grid, editable inputs, derivation popovers | 3 | Grid matches T1's numbers exactly |
| T10 | Ledger: advances, opening balances, deduction and carry-forward, clamp | 1.5 | Advance larger than net leaves net at 0 and carries |
| T11 | Lock, unlock with reason, freeze to `payrollLines` | 1 | Locked period is read only |
| T12 | Export | 1 | Opens in Excel, columns match their sheet |
| T13 | S6 settings and holidays | 1 | Threshold change affects the next period only |
| T14 | Seed real data, walk the full close end to end | 1.5 | June closes from upload to export in under 30 minutes |

If time runs short, cut in this order: T13 settings UI (leave the seeded document), then T12 export, then the T9 popovers. **Never cut T1 or T7.**

### Note on the Next.js and Mongoose connection

Use the standard cached global connection pattern in `/lib/db.ts` so hot reload does not open a new pool on every request, and guard model registration with `mongoose.models.X ?? mongoose.model('X', schema)` so recompilation does not throw `OverwriteModelError`. These are the two failure modes of Mongoose inside Next.js and both appear within the first hour.

---

## 13. Do not build

Every item below is a deliberate exclusion. Do not add it, stub it, or leave a TODO.

**MongoDB specific**
- `Decimal128` anywhere. See 5.1 rule 2.
- GridFS. The file is 600KB and lives on the import document.
- Attendance, leave, or ledger data embedded in the employee document
- Aggregation pipelines for payroll. The engine is pure TypeScript and receives plain arrays.
- Change streams, TTL indexes, or schema migration tooling
- A repository or data-access abstraction layer over Mongoose

**General**
- Roles, permissions, or multiple users
- Multi-tenancy, an org field, or any preparation for a second client
- A separate audit log collection or screen. Original and override in one document is the audit.
- Column picker or template editor on export
- Overtime handling. The file has `Total OT` and it is not in the payroll formula.
- Full and final settlement documents. The end date and the clamp are enough.
- Variance flags, payout totals, cash versus bank summaries, or any finance control
- Impact preview or diff before a rule change
- Ruleset version history or effective dating beyond the pinned copy
- Backup or restore features. Atlas point-in-time recovery plus the monthly export is the answer, and it is a conversation, not code.
- Real-time or today views, dashboards, charts, cross-month reporting
- Approval workflows or state machines beyond `periods.status`
- Notifications, email, WhatsApp, employee portal, employee score, incentive automation, KPI mapping. All Phase 2 in the BRD and they stay there.
- Mobile or tablet layouts. Desktop Chrome on one office machine.
- Offline capability
- Unit test suites, E2E tests, CI. The June parity script is the test.
- Loading skeletons, animations, empty-state illustrations, dark mode

---

## 14. Non-functional requirements

Each has a number, because an NFR without a threshold is a wish.

**Correctness**
- The engine reproduces June 2026 gross for every employee before any UI work begins.
- `computePayroll` is deterministic and idempotent.
- No derived value is stored outside `payrollLines`, written only at lock.
- Money is integer rupees. Calendar dates are `yyyy-MM-dd` strings. See 5.1.

**Performance** (real volume: 2,666 documents a month)
- Parse and store under 5 seconds, using a single `insertMany`.
- Full payroll compute under 1 second, using at most one query per collection with `.lean()`. No per-employee queries inside a loop.
- Queue advances to the next item under 200ms. This is the one that matters; the others happen once a month.

**Usability**
- A full monthly close completes in under 30 minutes for someone who has done it twice. The current process takes days.
- The queue is fully keyboard operable.
- Every computed number on the review screen expands to show its inputs.
- Export column names match the sheet Trinity already reads.

**Integrity**
- `machineStatus` is immutable for the life of the document.
- Every override carries actor, timestamp, and reason.
- Lock and unlock carry actor, timestamp, and reason.
- Uploaded files are retained on the import document and re-parseable.

**Resilience**
- A changed export layout fails loudly at validation. Under no circumstances does the system produce salary figures from a file it did not fully understand.
- Duplicate uploads rejected by the unique index on `{ periodId, fileHash }`.
- Parse and store run inside a `session.withTransaction`, as do lock and file replacement. Failure leaves the period exactly as it was. This requires a replica set; Atlas provides one.

**Security**
- Every screen requires authentication. Nothing is public.
- Every server action calls `requireSession()` as its first statement.
- The MongoDB connection string is server-only and never reaches the client bundle.
- Salary data never appears in client-side logs or error reports.

**Maintainability**
- `/lib/rules` imports nothing from Mongoose or the framework.
- Thresholds, divisor, and penalty configuration are data.
- The export template is a field mapping, isolated from calculation.

---

## 15. Before handover

**Seed data.** The salary sheet we hold has ID, present days, and gross populated, but Name, Designation, Date of Joining, Fixed Salary, and Mode are blank. Obtain the unredacted master. Also required: opening advance balances at cutover, the holiday calendar, and leave already consumed in the cutover month.

**One month parallel.** Trinity calculates the cutover month both ways. Diff net salary per employee. This is the moment they trust it, and it is worth more than any feature.

---

## 16. Open questions for Trinity

All five have a working default already built. None block the build.

1. **E.W. days.** Is it the count of weekly offs worked? Machine code 2 shows 8 in the June file against 5 on the sheet.
2. **Late penalty.** The 0.5 day deduction or the rupee amount? Both are visible. Pick one.
3. **Sandwich rule.** Does a weekly off between the holiday and the absence break the chain or get skipped over? Currently skipped.
4. **Divisor.** Does it stay 30 in a 31 day month? Currently yes.
5. **Leavers.** 86 machine codes against 57 people. Which are archived?

Two errors in their own June sheet are worth showing them, gently. Machine code 14 has 8 absent days and 2 present days in a 30 day month, which is arithmetically impossible and was typed by hand. Machine code 9 has `/15300` in the gross column. They make the argument better than any pitch.
