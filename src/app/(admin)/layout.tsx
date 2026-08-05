import { requireSession } from '@/lib/auth';
import { Employee } from '@/models/Employee';
import dbConnect from '@/lib/db';
import SidebarClient from './SidebarClient';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  await dbConnect();

  const employeesCount = await Employee.countDocuments({ isIgnored: false, endDate: null });
  const uniqueCodes = (await Employee.distinct('machineId', { isIgnored: false, endDate: null })).length;

  return (
    <div className="w-full h-screen flex text-text font-sans text-[13px] leading-[1.5] overflow-hidden bg-page">
      {/* Sidebar — dark steel panel */}
      <div className="w-[220px] flex-none bg-panel flex flex-col h-full z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.15),4px_0_16px_-4px_rgba(0,0,0,0.2)]">
        {/* Brand header */}
        <div className="px-[20px] py-[18px] border-b border-[rgba(255,255,255,0.07)]">
          <div className="flex items-center gap-[10px]">
            {/* Wrench icon mark */}
            <div className="w-[28px] h-[28px] rounded-[6px] bg-[#E8630A] flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <div>
              <div className="text-[14px] font-semibold tracking-[-0.01em] text-white leading-tight">Trinity Motors</div>
              <div className="text-[10.5px] text-[#9BAAB8] mt-[1px] tracking-[0.04em] uppercase font-medium">Attendance System</div>
            </div>
          </div>
        </div>
        
        {/* Nav Links */}
        <div className="p-[10px] flex flex-col flex-1">
          <SidebarClient />
        </div>

        {/* Footer */}
        <div className="px-[16px] py-[14px] border-t border-[rgba(255,255,255,0.07)]">
          <div className="text-[11px] text-[#4A5568] font-medium">Attendance & Payroll</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col bg-surface h-full overflow-y-auto">
        {children}
      </div>

      {/* BrahmaSuite System Branding Badge (Bottom Left) */}
      <div className="fixed bottom-3 left-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/85 text-white border border-slate-700/60 shadow-xl text-[11px] font-medium backdrop-blur-md print:hidden opacity-85 hover:opacity-100 transition-opacity pointer-events-auto">
        <span className="text-slate-400 text-[10px]">Powered by</span>
        <span className="font-bold text-white tracking-wide">BrahmaSuite</span>
      </div>
    </div>
  );
}
