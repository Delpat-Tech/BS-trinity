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
        { year: startYear, month: { $gte: 4 } }, // April to Dec of startYear
        { year: endYear, month: { $lte: 3 } }    // Jan to March of endYear
      ]
    };
  }

  const periods = await Period.find(query).sort({ year: -1, month: -1 }).lean();
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
                  <td className="px-[32px] py-[14px] border-b border-border-subtle last:border-0">
                    <Link href={targetUrl} className="block hover:underline">
                      <span className="text-[14px] font-medium tracking-[-0.01em] text-text">{monthName} {period.year}</span>
                      <span className="block text-[11px] text-text-muted font-mono mt-[2px]">01–30 {shortMonth}</span>
                    </Link>
                  </td>
                  
                  <td className="px-[12px] py-[14px] border-b border-border-subtle last:border-0">
                    <Link href={targetUrl} className="block">
                      {isLocked ? (
                        <span className="inline-block text-[11px] font-medium px-[10px] py-[3px] rounded-full bg-[#F0F5E6] text-[#3D5A10]">
                          Locked
                        </span>
                      ) : (
                        <span className="inline-block text-[11px] font-medium px-[10px] py-[3px] rounded-full bg-[#FEF6EC] text-[#8A4B0B]">
                          Open
                        </span>
                      )}
                    </Link>
                  </td>
                  
                  <td className="px-[12px] py-[14px] border-b border-border-subtle last:border-0 text-right font-mono text-[14px] text-text-muted">
                    <Link href={targetUrl} className="block">
                      {period.divisorDays}
                    </Link>
                  </td>
                  
                  <td className="px-[12px] py-[14px] border-b border-border-subtle last:border-0 text-right font-mono text-text-secondary">
                    <Link href={targetUrl} className="block">
                      {employeesCount}
                    </Link>
                  </td>
                  
                  <td className="px-[12px] py-[14px] border-b border-border-subtle last:border-0 text-right font-mono">
                    <Link href={targetUrl} className="block">
                      {totalNetPayable !== undefined ? (
                        <span className="text-[14px] text-text font-medium">₹{totalNetPayable.toLocaleString()}</span>
                      ) : (
                        <span className="text-[14px] text-text-muted">-</span>
                      )}
                    </Link>
                  </td>
                  
                  <td className="px-[12px] py-[14px] pr-[32px] border-b border-border-subtle last:border-0 text-right">
                    <div className="flex justify-end items-center gap-[12px]">
                      {!isLocked ? (
                        <Link href={targetUrl}>
                          <button className="bg-[#E8630A] text-white rounded-[6px] px-[14px] py-[7px] text-[12px] font-medium hover:bg-[#C9540A] shadow-sm transition-colors">
                            Upload
                          </button>
                        </Link>
                      ) : null}
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
    </>
  );
}
