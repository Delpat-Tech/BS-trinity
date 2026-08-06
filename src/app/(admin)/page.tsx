import dbConnect from '@/lib/db';
import { Period } from '@/models/Period';
import Link from 'next/link';
import { Employee } from '@/models/Employee';
import PeriodsClient from './PeriodsClient';
import { PayrollLine } from '@/models/PayrollLine';
import DeletePeriodButton from './DeletePeriodButton';
import MonthlyNetChart from './MonthlyNetChart';
import DashboardSidebar from './DashboardSidebar';
import FinancialYearFilter from './FinancialYearFilter';
import KpiCard from './KpiCard';
import { LeaveEntry } from '@/models/LeaveEntry';

export const dynamic = 'force-dynamic';

export default async function DashboardPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  await dbConnect();

  const searchParams = await props.searchParams;
  const fy = searchParams.fy as string;
  let query = {};
  if (fy && fy !== 'all') {
    const startYear = parseInt(fy);
    const endYear = startYear + 1;
    query = {
      $or: [
        { year: startYear, month: { $gte: 4 } },
        { year: endYear, month: { $lte: 3 } }
      ]
    };
  }

  // ── Core data ─────────────────────────────────────────────────────────────
  const periods = await Period.find(query).sort({ year: -1, month: -1 }).lean();

  const payrollSums = await PayrollLine.aggregate([
    { $group: { _id: '$periodId', totalNet: { $sum: '$net' }, totalAbs: { $sum: '$absDays' } } }
  ]);
  const netPayableMap = new Map<string, number>(
    payrollSums.map((p: any) => [p._id.toString(), p.totalNet])
  );
  const absMap = new Map<string, number>(
    payrollSums.map((p: any) => [p._id.toString(), p.totalAbs])
  );

  // ── KPI data ──────────────────────────────────────────────────────────────
  const activeEmployees = await Employee.countDocuments({ isIgnored: false, endDate: null });

  const pendingLeaves = await LeaveEntry.countDocuments({ status: 'pending' });

  const latestLockedPeriod = periods.find((p: any) => p.status === 'locked');
  const currentMonthNet = latestLockedPeriod
    ? (netPayableMap.get((latestLockedPeriod as any)._id.toString()) ?? null)
    : null;
  const totalAbsencesThisMonth = latestLockedPeriod
    ? (absMap.get((latestLockedPeriod as any)._id.toString()) ?? null)
    : null;

  // ── Next period helper ─────────────────────────────────────────────────────
  let nextDate = new Date();
  if (periods.length > 0) {
    nextDate = new Date((periods[0] as any).year, (periods[0] as any).month);
  }
  const nextMonth = nextDate.toLocaleString('default', { month: 'long' });
  const nextYear = nextDate.getFullYear();

  // Serialise netPayableMap for client components (Map can't cross server→client)
  const netPayableObj: Record<string, number> = {};
  netPayableMap.forEach((v, k) => { netPayableObj[k] = v; });

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-[32px] pt-[28px] pb-[20px] border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h1 className="m-0 text-[26px] font-semibold tracking-[-0.025em] text-text flex items-center gap-2">
            Dashboard
          </h1>
          <div className="text-[13.5px] text-text-secondary mt-[6px] leading-relaxed">
            Attendance &amp; payroll overview for Trinity Motors
          </div>
        </div>
        <div className="flex items-center gap-3">
          <FinancialYearFilter />
          <PeriodsClient nextMonth={nextMonth} nextYear={nextYear} />
        </div>
      </div>

      <div className="px-[32px] py-[24px] flex flex-col gap-6 min-h-0">
        {/* ── KPI Row ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          <KpiCard
            title="Active Employees"
            value={activeEmployees}
            subtitle="Currently on roster"
            trend="neutral"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            }
          />
          <KpiCard
            title="Current Month Net"
            value={currentMonthNet !== null ? `₹${currentMonthNet.toLocaleString()}` : '—'}
            subtitle={latestLockedPeriod ? `${(latestLockedPeriod as any).month}/${(latestLockedPeriod as any).year} locked period` : 'No locked period yet'}
            trend={currentMonthNet !== null ? 'up' : 'neutral'}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            }
          />
          <KpiCard
            title="Pending Leaves"
            value={pendingLeaves}
            subtitle="Awaiting approval"
            trend={pendingLeaves > 0 ? 'down' : 'neutral'}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            }
          />
          <KpiCard
            title="Absences This Month"
            value={totalAbsencesThisMonth !== null ? totalAbsencesThisMonth : '—'}
            subtitle={latestLockedPeriod ? 'Across all employees' : 'No locked period yet'}
            trend={totalAbsencesThisMonth !== null && totalAbsencesThisMonth > 0 ? 'down' : 'neutral'}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            }
          />
        </div>

        {/* ── Main Grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-6 min-h-0">
          {/* Left column (2/3) */}
          <div className="col-span-2 flex flex-col gap-6 min-h-0">
            {/* Line Chart */}
            <div className="h-[280px]">
              <MonthlyNetChart
                periods={JSON.parse(JSON.stringify(periods))}
                netPayableMap={netPayableObj as any}
              />
            </div>
            
            {/* We moved Periods Table to /attendance */}
          </div>

          {/* Right column (1/3) — sidebar with leaves + punctuality */}
          <div className="col-span-1 flex flex-col gap-0">
            <DashboardSidebar />
          </div>
        </div>
      </div>
    </>
  );
}
