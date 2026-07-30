import dbConnect from '@/lib/db';
import { Employee } from '@/models/Employee';
import EmployeesListClient from './EmployeesListClient';

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
  await dbConnect();
  
  const employeesDoc = await Employee.find({}).sort({ machineId: 1 }).lean();
  const employees = JSON.parse(JSON.stringify(employeesDoc));

  return <EmployeesListClient employees={employees} />;
}
