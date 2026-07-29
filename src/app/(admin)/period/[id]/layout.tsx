import dbConnect from '@/lib/db';
import { Period } from '@/models/Period';
import { getQueueExceptions } from './queue/actions';
import { notFound } from 'next/navigation';
import PeriodTabsClient from './PeriodTabsClient';
import Link from 'next/link';
import { Employee } from '@/models/Employee';

export default async function PeriodLayout(props: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  await dbConnect();

  const period = await Period.findById(id).lean();
  if (!period) return notFound();

  const isLocked = period.status === 'locked';

  // Get unmapped exceptions
  let exceptionsCount = 0;
  if (!isLocked) {
    try {
      const exceptions = await getQueueExceptions(id);
      exceptionsCount = exceptions.length;
    } catch (e) {
      exceptionsCount = 0;
    }
  }
  
  const employeesCount = await Employee.countDocuments({ isIgnored: false, endDate: null });

  const date = new Date(period.year, period.month - 1);
  const monthName = date.toLocaleString('default', { month: 'long' });
  const shortMonth = date.toLocaleString('default', { month: 'short' });

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-surface h-full">
      {/* Topbar context */}
      <div className="px-[28px] pt-[18px] pb-[0] border-b border-border">
        
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-[10px]">
            <h1 className="m-0 text-[18px] font-semibold tracking-[-0.015em]">{monthName} {period.year}</h1>
            <span className="text-[12px] text-text-muted font-mono">01–30 {shortMonth} · {employeesCount} employees</span>
            
            {isLocked ? (
              <span className="inline-block text-[11.5px] font-medium px-[8px] py-[2px] rounded-[10px] bg-success-bg text-success-text border border-success-border">
                Locked
              </span>
            ) : (
              <span className="inline-block text-[11.5px] font-medium px-[8px] py-[2px] rounded-[10px] bg-alert-bg text-alert-text border border-alert-border">
                Open
              </span>
            )}
          </div>
          
          <Link href="/">
            <button className="bg-transparent border-none text-[12.5px] text-text-secondary cursor-pointer p-0 hover:text-text">
              ← All periods
            </button>
          </Link>
        </div>

        {/* Tabs */}
        <PeriodTabsClient periodId={id} exceptionsCount={exceptionsCount} />
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-auto bg-surface flex flex-col">
        {props.children}
      </div>
    </div>
  );
}
