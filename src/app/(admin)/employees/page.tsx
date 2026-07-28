import dbConnect from '@/lib/db';
import { Employee } from '@/models/Employee';
import { EmployeeForm } from './EmployeeForm';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
  await dbConnect();
  
  const employeesDoc = await Employee.find({}).sort({ machineId: 1 }).lean();
  // Stringify and parse to pass to client component securely
  const employees = JSON.parse(JSON.stringify(employeesDoc));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Employees</h1>
          <p className="text-slate-500">
            Manage your workforce. The biometric machine ID must match the device export exactly.
          </p>
        </div>
        <EmployeeForm trigger={<Button>Add Employee</Button>} />
      </div>

      <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[100px]">Mach ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Date of Joining</TableHead>
              <TableHead>Current Salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  No employees found. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((emp: any) => {
                const latestRev = [...emp.salaryRevisions].sort((a: any, b: any) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
                return (
                  <TableRow key={emp._id}>
                    <TableCell className="font-medium text-slate-900">{emp.machineId}</TableCell>
                    <TableCell className="font-medium text-slate-900">{emp.name}</TableCell>
                    <TableCell>{emp.dateOfJoining}</TableCell>
                    <TableCell>₹{latestRev?.fixedSalary?.toLocaleString() || 0}</TableCell>
                    <TableCell>
                      {emp.isIgnored ? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                          Ignored
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                          Active
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <EmployeeForm 
                        employee={emp} 
                        trigger={<Button variant="outline" size="sm" className="mr-2">Edit</Button>} 
                      />
                      <Link href={`/employees/${emp._id}/history`} passHref>
                        <Button variant="secondary" size="sm" className="mr-2">History</Button>
                      </Link>
                      <Link href={`/employees/${emp._id}/ledger`} passHref>
                        <Button variant="outline" size="sm" className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100">Ledger</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
