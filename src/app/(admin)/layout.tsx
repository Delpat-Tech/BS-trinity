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
    <div className="w-full h-screen flex bg-surface text-text font-sans text-[13px] leading-[1.45] overflow-hidden">
      
      {/* Sidebar matching #F5F3F0 and exactly 240px wide */}
      <div className="w-[240px] flex-none bg-panel border-r border-border flex flex-col h-full">
        {/* Header */}
        <div className="px-[18px] py-[16px] border-b border-border">
          <div className="text-[17px] font-bold tracking-tight text-text">Trinity Motors</div>
          <div className="text-[12px] text-text-muted mt-[2px] font-medium">Attendance &amp; payroll</div>
        </div>
        
        {/* Nav Links Wrapper */}
        <div className="p-[10px] flex flex-col gap-[1px]">
          <SidebarClient />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col bg-surface h-full overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
