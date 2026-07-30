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
          <div className="p-12 text-center text-text-muted">
            No exceptions found. The period is ready for review.
          </div>
        ) : (
          <QueueClient periodId={id} initialExceptions={safeExceptions} uploadedFileName={period?.uploadedFileName || 'biometric_export.xls'} />
        )}
      </div>
    </div>
  );
}
