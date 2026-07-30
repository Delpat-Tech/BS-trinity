import dbConnect from '@/lib/db';
import { Period } from '@/models/Period';
import Link from 'next/link';
import { Employee } from '@/models/Employee';
import PeriodsClient from './PeriodsClient';

import { Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await dbConnect();
  const periods = await Period.find().sort({ year: -1, month: -1 }).lean();
  const employeesCount = await Employee.countDocuments({ isIgnored: false, endDate: null });

  // Suggest next month
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
          <h1 className="m-0 text-[24px] font-semibold tracking-tight text-text flex items-center gap-2">
            <Calendar className="w-6 h-6 text-text-secondary" />
            Periods
          </h1>
          <div className="text-[14px] text-text-secondary mt-[4px]">One period per month. A locked period cannot be edited.</div>
        </div>
        <PeriodsClient nextMonth={nextMonth} nextYear={nextYear} />
      </div>

      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className="text-left font-medium text-[11.5px] text-text-secondary px-[32px] py-[8px] border-b border-border bg-header">Month</th>
            <th className="text-left font-medium text-[11.5px] text-text-secondary px-[12px] py-[8px] border-b border-border bg-header w-[130px]">Status</th>
            <th className="text-right font-medium text-[11.5px] text-text-secondary px-[12px] py-[8px] border-b border-border bg-header w-[130px]">Divisor Days</th>
            <th className="text-right font-medium text-[11.5px] text-text-secondary px-[12px] py-[8px] border-b border-border bg-header w-[110px]">Employees</th>
            <th className="text-right font-medium text-[11.5px] text-text-secondary px-[12px] py-[8px] border-b border-border bg-header w-[150px]">Net payable</th>
            <th className="border-b border-border bg-header w-[190px]"></th>
          </tr>
        </thead>
        <tbody>
          {periods.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center text-text-muted py-8">
                No periods found.
              </td>
            </tr>
          )}
          {periods.map((period: any) => {
            const date = new Date(period.year, period.month - 1);
            const monthName = date.toLocaleString('default', { month: 'long' });
            const shortMonth = date.toLocaleString('default', { month: 'short' });
            const isLocked = period.status === 'locked';
            
            // Dummy logic for 'net payable' for display if it's not precalculated, since this requires heavy aggregation if not stored.
            // For now, we will display 'N/A' or '-' if we don't have it.
            
            return (
              <tr key={period._id.toString()} className="hover:bg-header transition-colors">
                <td className="px-[32px] py-[11px] border-b border-border-subtle">
                  <span className={isLocked ? "font-medium" : "font-semibold text-[14px]"}>{monthName} {period.year}</span>
                  <span className="block text-[11.5px] text-text-muted font-mono mt-[1px]">01–30 {shortMonth}</span>
                </td>
                
                <td className="px-[12px] py-[11px] border-b border-border-subtle">
                  {isLocked ? (
                    <span className="inline-block text-[11.5px] font-medium px-[8px] py-[2px] rounded-[10px] bg-success-bg text-success-text border border-success-border">
                      Locked
                    </span>
                  ) : (
                    <span className="inline-block text-[11.5px] font-medium px-[8px] py-[2px] rounded-[10px] bg-alert-bg text-alert-text border border-alert-border">
                      Open
                    </span>
                  )}
                </td>
                
                <td className="px-[12px] py-[11px] border-b border-border-subtle text-right font-mono text-[14px] text-text-muted">
                  {period.divisorDays}
                </td>
                
                <td className="px-[12px] py-[11px] border-b border-border-subtle text-right font-mono text-text-secondary">
                  {employeesCount}
                </td>
                
                <td className="px-[12px] py-[11px] border-b border-border-subtle text-right font-mono text-text-secondary">
                  -
                </td>
                
                <td className="px-[12px] py-[11px] pr-[32px] border-b border-border-subtle text-right">
                  {isLocked ? (
                    <Link href={`/period/${period._id.toString()}/review`}>
                      <button className="bg-surface text-text border border-border-strong rounded-[4px] px-[12px] py-[6px] text-[12.5px] cursor-pointer hover:bg-header">
                        View salary sheet
                      </button>
                    </Link>
                  ) : (
                    <Link href={`/period/${period._id.toString()}`}>
                      <button className="bg-text text-surface border border-text rounded-[4px] px-[12px] py-[6px] text-[12.5px] font-medium cursor-pointer hover:bg-[#332F2A]">
                        Continue working
                      </button>
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
