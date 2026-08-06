import dbConnect from '@/lib/db';
import { Period } from '@/models/Period';
import Link from 'next/link';
import PeriodsClient from '../PeriodsClient';
import { PayrollLine } from '@/models/PayrollLine';
import DeletePeriodButton from '../DeletePeriodButton';
import FinancialYearFilter from '../FinancialYearFilter';

export const dynamic = 'force-dynamic';

export default async function AttendancePage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
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
    { $group: { _id: '$periodId', totalNet: { $sum: '$net' } } }
  ]);
  const netPayableMap = new Map<string, number>(
    payrollSums.map((p: any) => [p._id.toString(), p.totalNet])
  );

  // ── Next period helper ─────────────────────────────────────────────────────
  let nextDate = new Date();
  if (periods.length > 0) {
    nextDate = new Date((periods[0] as any).year, (periods[0] as any).month);
  }
  const nextMonth = nextDate.toLocaleString('default', { month: 'long' });
  const nextYear = nextDate.getFullYear();

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-[32px] pt-[28px] pb-[20px] border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h1 className="m-0 text-[26px] font-semibold tracking-[-0.025em] text-text flex items-center gap-2">
            Attendance
          </h1>
          <div className="text-[13.5px] text-text-secondary mt-[6px] leading-relaxed">
            Manage attendance periods and payroll processing
          </div>
        </div>
        <div className="flex items-center gap-3">
          <FinancialYearFilter />
          <PeriodsClient nextMonth={nextMonth} nextYear={nextYear} />
        </div>
      </div>

      <div className="px-[32px] py-[24px] flex flex-col gap-6 min-h-0">
        {/* Periods Table */}
        <div className="border border-border rounded-[10px] bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-[14px] font-semibold text-text tracking-tight">All Periods</h3>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-[0.05em] text-text-muted">
                <th className="px-5 py-[10px]">Period</th>
                <th className="px-3 py-[10px]">Status</th>
                <th className="px-3 py-[10px] text-right">Divisor</th>
                <th className="px-3 py-[10px] text-right">Total Net</th>
                <th className="px-3 py-[10px] pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {periods.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-[13px] text-text-muted">
                    No periods found.
                  </td>
                </tr>
              )}
              {periods.map((period: any) => {
                const date = new Date(period.year, period.month - 1);
                const monthName = date.toLocaleString('default', { month: 'long' });
                const shortMonth = date.toLocaleString('default', { month: 'short' });
                const isLocked = period.status === 'locked';
                const totalNetPayable = netPayableMap.get(period._id.toString());
                const targetUrl = isLocked
                  ? `/period/${period._id.toString()}/review`
                  : `/period/${period._id.toString()}`;

                return (
                  <tr
                    key={period._id.toString()}
                    className="hover:bg-[#FAFAF8] transition-colors duration-100 cursor-pointer"
                  >
                    <td className="px-5 py-[13px] border-b border-border-subtle last:border-0">
                      <Link href={targetUrl} className="block hover:underline">
                        <span className="text-[13.5px] font-medium tracking-[-0.01em] text-text">{monthName} {period.year}</span>
                        <span className="block text-[11px] text-text-muted font-mono mt-[2px]">01–{new Date(period.year, period.month, 0).getDate()} {shortMonth}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-[13px] border-b border-border-subtle last:border-0">
                      <Link href={targetUrl} className="block">
                        {isLocked ? (
                          <span className="inline-block text-[11px] font-medium px-[10px] py-[3px] rounded-full bg-[#F0F5E6] text-[#3D5A10]">Locked</span>
                        ) : (
                          <span className="inline-block text-[11px] font-medium px-[10px] py-[3px] rounded-full bg-[#FEF6EC] text-[#8A4B0B]">Open</span>
                        )}
                      </Link>
                    </td>
                    <td className="px-3 py-[13px] border-b border-border-subtle last:border-0 text-right font-mono text-[13px] text-text-muted">
                      <Link href={targetUrl} className="block">{period.divisorDays}</Link>
                    </td>
                    <td className="px-3 py-[13px] border-b border-border-subtle last:border-0 text-right font-mono">
                      <Link href={targetUrl} className="block">
                        {totalNetPayable !== undefined ? (
                          <span className="text-[13.5px] text-text font-medium">₹{totalNetPayable.toLocaleString()}</span>
                        ) : (
                          <span className="text-[13px] text-text-muted">—</span>
                        )}
                      </Link>
                    </td>
                    <td className="px-3 py-[13px] pr-5 border-b border-border-subtle last:border-0 text-right">
                      <div className="flex justify-end items-center gap-3">
                        {!isLocked && (
                          <Link href={targetUrl}>
                            <button className="bg-[#E8630A] text-white rounded-[6px] px-[14px] py-[6px] text-[12px] font-medium hover:bg-[#C9540A] shadow-sm transition-colors">
                              Upload
                            </button>
                          </Link>
                        )}
                        <DeletePeriodButton
                          periodId={period._id.toString()}
                          monthName={monthName}
                          year={period.year}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
