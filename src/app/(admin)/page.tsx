import dbConnect from '@/lib/db';
import { Period } from '@/models/Period';
import Link from 'next/link';
import { Employee } from '@/models/Employee';
import PeriodsClient from './PeriodsClient';

import { PayrollLine } from '@/models/PayrollLine';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await dbConnect();
  const periods = await Period.find().sort({ year: -1, month: -1 }).lean();
  const employeesCount = await Employee.countDocuments({ isIgnored: false, endDate: null });

  const payrollSums = await PayrollLine.aggregate([
    {
      $group: {
        _id: "$periodId",
        totalNet: { $sum: "$net" }
      }
    }
  ]);
  const netPayableMap = new Map<string, number>(
    payrollSums.map((p: any) => [p._id.toString(), p.totalNet])
  );

  let nextDate = new Date();
  if (periods.length > 0) {
    nextDate = new Date(periods[0].year, periods[0].month);
  }
  const nextMonth = nextDate.toLocaleString('default', { month: 'long' });
  const nextYear = nextDate.getFullYear();

  return (
    <>
      <div className="px-[32px] pt-[28px] pb-[20px] border-b border-border flex items-center justify-between">
        <div>
          <h1 className="m-0 text-[26px] font-semibold tracking-[-0.025em] text-text flex items-center gap-2">
            Attendance
          </h1>
          <div className="text-[13.5px] text-text-secondary mt-[6px] leading-relaxed">One period per month. A locked period cannot be edited.</div>
        </div>
        <PeriodsClient nextMonth={nextMonth} nextYear={nextYear} />
      </div>

      <div className="mx-[32px] mt-[24px] mb-[32px] border border-border rounded-[8px] overflow-hidden bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="text-left text-[11px] font-medium tracking-[0.04em] uppercase text-text-muted px-[32px] py-[8px] border-b border-border bg-header">Month</th>
              <th className="text-left text-[11px] font-medium tracking-[0.04em] uppercase text-text-muted px-[12px] py-[8px] border-b border-border bg-header w-[130px]">Status</th>
              <th className="text-right text-[11px] font-medium tracking-[0.04em] uppercase text-text-muted px-[12px] py-[8px] border-b border-border bg-header w-[130px]">Divisor Days</th>
              <th className="text-right text-[11px] font-medium tracking-[0.04em] uppercase text-text-muted px-[12px] py-[8px] border-b border-border bg-header w-[110px]">Employees</th>
              <th className="text-right text-[11px] font-medium tracking-[0.04em] uppercase text-text-muted px-[12px] py-[8px] border-b border-border bg-header w-[150px]">Net payable</th>
              <th className="border-b border-border bg-header w-[190px]"></th>
            </tr>
          </thead>
          <tbody>
            {periods.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-text-muted py-8 border-b border-border-subtle last:border-0">
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
              
              return (
                <tr key={period._id.toString()} className="hover:bg-[#FAFAF8] transition-colors duration-100">
                  <td className="px-[32px] py-[14px] border-b border-border-subtle last:border-0">
                    <span className="text-[14px] font-medium tracking-[-0.01em] text-text">{monthName} {period.year}</span>
                    <span className="block text-[11px] text-text-muted font-mono mt-[2px]">01–30 {shortMonth}</span>
                  </td>
                  
                  <td className="px-[12px] py-[14px] border-b border-border-subtle last:border-0">
                    {isLocked ? (
                      <span className="inline-block text-[11px] font-medium px-[10px] py-[3px] rounded-full bg-[#F0F5E6] text-[#3D5A10]">
                        Locked
                      </span>
                    ) : (
                      <span className="inline-block text-[11px] font-medium px-[10px] py-[3px] rounded-full bg-[#FEF6EC] text-[#8A4B0B]">
                        Open
                      </span>
                    )}
                  </td>
                  
                  <td className="px-[12px] py-[14px] border-b border-border-subtle last:border-0 text-right font-mono text-[14px] text-text-muted">
                    {period.divisorDays}
                  </td>
                  
                  <td className="px-[12px] py-[14px] border-b border-border-subtle last:border-0 text-right font-mono text-text-secondary">
                    {employeesCount}
                  </td>
                  
                  <td className="px-[12px] py-[14px] border-b border-border-subtle last:border-0 text-right font-mono">
                    {totalNetPayable !== undefined ? (
                      <span className="text-[14px] text-text font-medium">₹{totalNetPayable.toLocaleString()}</span>
                    ) : (
                      <span className="text-[14px] text-text-muted">-</span>
                    )}
                  </td>
                  
                  <td className="px-[12px] py-[14px] pr-[32px] border-b border-border-subtle last:border-0 text-right">
                    {isLocked ? (
                      <Link href={`/period/${period._id.toString()}/review`}>
                        <button className="bg-transparent text-text-secondary border border-border rounded-[6px] px-[14px] py-[7px] text-[12px] font-medium hover:bg-hover hover:text-text hover:border-border-strong transition-colors">
                          View salary sheet
                        </button>
                      </Link>
                    ) : (
                      <Link href={`/period/${period._id.toString()}`}>
                        <button className="bg-[#E8630A] text-white rounded-[6px] px-[14px] py-[7px] text-[12px] font-medium hover:bg-[#C9540A] shadow-sm transition-colors">
                          Upload
                        </button>
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
