import dbConnect from '@/lib/db';
import { Employee } from '@/models/Employee';
import { EmployeeForm } from './EmployeeForm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
  await dbConnect();
  
  const employeesDoc = await Employee.find({}).sort({ machineId: 1 }).lean();
  const employees = JSON.parse(JSON.stringify(employeesDoc));

  return (
    <>
      <div className="px-[28px] pt-[20px] pb-[16px] border-b border-border flex items-center justify-between">
        <div>
          <h1 className="m-0 text-[18px] font-semibold tracking-[-0.015em]">Employees</h1>
          <div className="text-[12.5px] text-text-secondary mt-[2px]">
            Manage workforce and biometrics mapping. The machine ID must match the device export exactly.
          </div>
        </div>
        <EmployeeForm trigger={
          <button className="bg-text text-surface border border-text rounded-[4px] px-[13px] py-[7px] text-[12.5px] font-medium cursor-pointer hover:bg-[#332F2A]">
            Add Employee
          </button>
        } />
      </div>

      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className="text-left font-medium text-[11.5px] text-text-secondary px-[28px] py-[8px] border-b border-border bg-header w-[100px]">Mach ID</th>
            <th className="text-left font-medium text-[11.5px] text-text-secondary px-[12px] py-[8px] border-b border-border bg-header">Name</th>
            <th className="text-left font-medium text-[11.5px] text-text-secondary px-[12px] py-[8px] border-b border-border bg-header w-[150px]">Date of Joining</th>
            <th className="text-left font-medium text-[11.5px] text-text-secondary px-[12px] py-[8px] border-b border-border bg-header w-[150px]">Current Salary</th>
            <th className="text-left font-medium text-[11.5px] text-text-secondary px-[12px] py-[8px] border-b border-border bg-header w-[100px]">Status</th>
            <th className="text-right font-medium text-[11.5px] text-text-secondary px-[12px] py-[8px] border-b border-border bg-header w-[220px]"></th>
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center text-text-muted py-8">
                No employees found. Add one to get started.
              </td>
            </tr>
          )}
          {employees.map((emp: any) => {
            const latestRev = [...emp.salaryRevisions].sort((a: any, b: any) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
            
            return (
              <tr key={emp._id} className="hover:bg-header transition-colors">
                <td className="px-[28px] py-[11px] border-b border-border-subtle font-mono text-[13px] font-medium">
                  {emp.machineId}
                </td>
                <td className="px-[12px] py-[11px] border-b border-border-subtle font-medium text-text">
                  {emp.name}
                </td>
                <td className="px-[12px] py-[11px] border-b border-border-subtle text-text-secondary font-mono text-[12.5px]">
                  {emp.dateOfJoining}
                </td>
                <td className="px-[12px] py-[11px] border-b border-border-subtle text-text-secondary font-mono text-[13px]">
                  ₹{latestRev?.fixedSalary?.toLocaleString() || 0}
                </td>
                <td className="px-[12px] py-[11px] border-b border-border-subtle">
                  {emp.isIgnored ? (
                    <span className="inline-block text-[11.5px] font-medium px-[8px] py-[2px] rounded-[10px] bg-alert-bg text-alert-text border border-alert-border">
                      Ignored
                    </span>
                  ) : (
                    <span className="inline-block text-[11.5px] font-medium px-[8px] py-[2px] rounded-[10px] bg-success-bg text-success-text border border-success-border">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-[12px] py-[11px] pr-[28px] border-b border-border-subtle text-right">
                  <div className="inline-flex gap-[6px]">
                    <EmployeeForm 
                      employee={emp} 
                      trigger={
                        <button className="bg-surface text-text border border-border-strong rounded-[4px] px-[10px] py-[5px] text-[12px] cursor-pointer hover:bg-hover">
                          Edit
                        </button>
                      } 
                    />
                    <Link href={`/employees/${emp._id}/history`}>
                      <button className="bg-surface text-text border border-border-strong rounded-[4px] px-[10px] py-[5px] text-[12px] cursor-pointer hover:bg-hover">
                        History
                      </button>
                    </Link>
                    <Link href={`/employees/${emp._id}/ledger`}>
                      <button className="bg-surface text-text border border-border-strong rounded-[4px] px-[10px] py-[5px] text-[12px] cursor-pointer hover:bg-hover">
                        Ledger
                      </button>
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
