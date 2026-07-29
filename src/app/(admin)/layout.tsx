import { requireSession } from '@/lib/auth';
import { Employee } from '@/models/Employee';
import dbConnect from '@/lib/db';
import SidebarClient from './SidebarClient';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  await dbConnect();

  // Get active employee stats
  const employeesCount = await Employee.countDocuments({ isIgnored: false, endDate: null });
  const uniqueCodes = (await Employee.distinct('machineId', { isIgnored: false, endDate: null })).length;

  return (
    <div className="w-full min-h-screen flex bg-surface text-text font-sans text-[13px] leading-[1.45] relative">
      
      {/* Sidebar matching #F5F3F0 and exactly 240px wide */}
      <div className="w-[240px] flex-none bg-panel border-r border-border flex flex-col">
        {/* Header */}
        <div className="px-[18px] py-[16px] border-b border-border">
          <div className="text-[13.5px] font-semibold tracking-[-0.01em]">Trinity Motors</div>
          <div className="text-[11.5px] text-text-muted mt-[1px]">Attendance &amp; payroll</div>
        </div>
        
        {/* Nav Links Wrapper */}
        <div className="p-[10px] flex flex-col gap-[1px]">
          <SidebarClient />
        </div>

        {/* Footer */}
        <div className="mt-auto px-[18px] py-[14px] border-t border-border text-[11.5px] text-text-muted font-mono">
          {employeesCount} active · {uniqueCodes} codes
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col bg-surface">
        {children}
      </div>
    </div>
  );
}
