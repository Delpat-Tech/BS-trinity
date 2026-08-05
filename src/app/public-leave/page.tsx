import dbConnect from '@/lib/db';
import { Employee } from '@/models/Employee';
import PublicLeaveClient from './PublicLeaveClient';

export const dynamic = 'force-dynamic';

export default async function PublicLeavePage() {
  await dbConnect();
  
  // Only send _id, name, and mobileNumber to the client for security.
  const employees = await Employee.find(
    { endDate: null, isIgnored: false }, 
    { _id: 1, name: 1, mobileNumber: 1 }
  ).lean();

  return <PublicLeaveClient employees={employees as any} />;
}
