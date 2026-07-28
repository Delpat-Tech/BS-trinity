import { Period } from '@/models/Period';
import dbConnect from '@/lib/db';
import PeriodHubClient from './PeriodHubClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PeriodHubPage({ params }: { params: { id: string } }) {
  await dbConnect();
  
  const period = await Period.findById(params.id).lean();
  if (!period) return notFound();

  return (
    <PeriodHubClient 
      periodId={params.id} 
      isLocked={period.status === 'locked'} 
    />
  );
}
