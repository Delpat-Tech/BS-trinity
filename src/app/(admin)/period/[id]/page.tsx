import { Period } from '@/models/Period';
import { Import } from '@/models/Import';
import dbConnect from '@/lib/db';
import PeriodHubClient from './PeriodHubClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PeriodHubPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  await dbConnect();
  
  const period = await Period.findById(id).lean();
  if (!period) return notFound();

  const existingImport = await Import.findOne({ periodId: id }).lean();
  let existingPreviewData = null;

  if (existingImport) {
    const { AttendanceDay } = await import('@/models/AttendanceDay');
    const { Employee } = await import('@/models/Employee');
    const firstFive = await AttendanceDay.find({ periodId: id })
      .limit(5)
      .lean();
      
    const empIds = [...new Set(firstFive.map(r => r.employeeId))];
    const emps = await Employee.find({ _id: { $in: empIds } }).lean();
    const empMap = new Map(emps.map((e: any) => [e._id.toString(), e.name]));

    existingPreviewData = {
      fileName: existingImport.filename || existingImport.fileName || 'Unknown File',
      totalRecords: existingImport.rowCount || existingImport.recordsCreated || 0,
      preview: firstFive.map(r => ({
        machineId: r.employeeId || 'Unknown',
        name: empMap.get(r.employeeId?.toString()) || 'Unknown Employee',
        date: r.date,
        inTime: r.inTime,
        outTime: r.outTime,
        status: r.machineStatus
      }))
    };
  }

  return (
    <PeriodHubClient 
      periodId={id} 
      isLocked={period.status === 'locked'}
      hasBiometrics={!!existingImport}
      existingPreviewData={existingPreviewData}
    />
  );
}
