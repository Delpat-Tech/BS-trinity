import { Period } from '@/models/Period';
import dbConnect from '@/lib/db';
import PeriodHubClient from './PeriodHubClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PeriodHubPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  await dbConnect();
  
  const period = await Period.findById(id).lean();
  if (!period) return notFound();

  return (
    <PeriodHubClient 
      periodId={id} 
      isLocked={period.status === 'locked'}
      hasBiometrics={!!period.biometricsUploaded}
    />
  );
}
