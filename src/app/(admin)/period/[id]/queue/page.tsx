import { getQueueExceptions } from './actions';
import QueueClient from './QueueClient';
import dbConnect from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function QueuePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  await dbConnect();

  const exceptions = await getQueueExceptions(id);

  // We serialize properly to avoid Client Component issues, even though it's technically handled, better safe than sorry.
  const safeExceptions = JSON.parse(JSON.stringify(exceptions));

  return (
    <div className="p-[20px]">
      <div className="bg-white border border-line rounded-[4px] overflow-hidden">
        {safeExceptions.length === 0 ? (
          <div className="p-12 text-center text-muted">
            No exceptions found. The period is ready for review.
          </div>
        ) : (
          <QueueClient periodId={id} initialExceptions={safeExceptions} />
        )}
      </div>
    </div>
  );
}
