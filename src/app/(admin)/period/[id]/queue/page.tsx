import { getQueueExceptions } from './actions';
import QueueClient from './QueueClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function QueuePage({ params }: { params: { id: string } }) {
  const exceptions = await getQueueExceptions(params.id);

  if (exceptions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Resolution Queue</h1>
          <p className="text-slate-500">All exceptions cleared.</p>
        </div>
        <div className="p-12 border rounded-lg bg-white shadow-sm text-center">
          <p className="text-green-600 font-medium mb-4">No exceptions remaining for this period!</p>
          <Link href={`/period/${params.id}`} passHref>
            <Button>Return to Hub</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Resolution Queue</h1>
        <p className="text-slate-500">
          Use the keyboard to rapidly resolve exceptions.
        </p>
      </div>

      <QueueClient periodId={params.id} initialExceptions={exceptions} />
    </div>
  );
}
