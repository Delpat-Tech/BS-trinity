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

  const { Import } = await import('@/models/Import');
  const existingImport = await Import.findOne({ periodId: id }).lean();
  const hasBiometrics = !!existingImport;

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
      {/* Main Tab Content & Title Card */}
      <div className="flex-1 overflow-auto bg-surface flex flex-col">
        {/* Topbar context */}
        <div className="w-full px-8 pt-6 pb-2">
          <Link href="/attendance">
            <button className="bg-transparent border border-border text-[12.5px] text-text-secondary cursor-pointer px-3 py-1.5 rounded-lg hover:bg-hover hover:text-text flex items-center gap-1 font-medium transition-colors">
              ← Back
            </button>
          </Link>
        </div>

        <PeriodTabsClient 
          periodId={id} 
          exceptionsCount={exceptionsCount} 
          hasBiometrics={hasBiometrics}
          isLocked={isLocked}
          monthName={monthName}
          shortMonth={shortMonth}
          month={period.month}
          year={period.year}
          employeesCount={employeesCount}
        />
        {props.children}
      </div>
    </div>
  );
}
