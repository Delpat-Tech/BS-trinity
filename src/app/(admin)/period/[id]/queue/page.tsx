import { getQueueExceptions } from './actions';
import QueueClient from './QueueClient';
import dbConnect from '@/lib/db';
import { Period } from '@/models/Period';

export const dynamic = 'force-dynamic';

export default async function QueuePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  await dbConnect();

  const period = await Period.findById(id).lean();
  const exceptions = await getQueueExceptions(id);

  const safeExceptions = JSON.parse(JSON.stringify(exceptions));

  return (
    <div className="p-[20px] flex-1 flex flex-col min-h-0">
      <div className="bg-surface border border-border rounded-[4px] overflow-hidden flex-1 flex flex-col">
        {safeExceptions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-[70px] px-[28px] bg-surface h-full">
            <div className="max-w-[430px] text-center">
              <div className="text-[18px] font-semibold tracking-[-0.015em]">Nothing left to resolve</div>
              <div className="text-[13px] text-text-secondary mt-[6px]">
                All flagged days resolved. Attendance is complete and the payroll figures are final.
              </div>
              <div className="flex gap-[8px] mt-[16px] justify-center">
                <a href={`/period/${id}/review`} className="bg-[#E8630A] text-white rounded-[6px] px-[16px] py-[8px] text-[12.5px] font-medium cursor-pointer hover:bg-[#C9540A] transition-colors inline-block no-underline">
                  Go to payroll review
                </a>
              </div>
            </div>
          </div>
        ) : (
          <QueueClient periodId={id} initialExceptions={safeExceptions} uploadedFileName={period?.uploadedFileName || 'biometric_export.xls'} />
        )}
      </div>
    </div>
  );
}
