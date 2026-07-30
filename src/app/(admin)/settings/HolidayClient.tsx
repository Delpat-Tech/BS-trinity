'use client';
import { toast } from 'sonner';
import { useState } from 'react';
import { addHoliday, deleteHoliday } from './holidayActions';
import { Trash2Icon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO, startOfDay } from 'date-fns';

export function HolidayClient({ holidays }: { holidays: any[] }) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const [name, setName] = useState('');
  const [sandwichEligible, setSandwichEligible] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const onDateClick = (day: Date) => {
    setSelectedDate(day);
    setName('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !name) return;
    
    setLoading(true);
    setError('');
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      await addHoliday(dateStr, name, sandwichEligible);
      setSelectedDate(null);
      setName('');
      setSandwichEligible(true);
    } catch (err: any) {
      setError(err.message || 'Failed to add holiday');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this holiday?')) return;
    try {
      await deleteHoliday(id);
    } catch (err) {
      toast.error('Failed to delete holiday');
    }
  };

  // Build calendar days
  const startDate = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }); // Monday start
  const endDate = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
  
  const dateFormat = "d";
  const rows = [];
  let days = [];
  let day = startDate;
  let formattedDate = "";

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;
      
      const isHoliday = holidays.find(h => h.date === format(cloneDay, 'yyyy-MM-dd'));
      const isSelected = selectedDate && isSameDay(day, selectedDate);
      const isCurrentMonth = isSameMonth(day, currentMonth);

      days.push(
        <div
          key={day.toString()}
          onClick={() => onDateClick(cloneDay)}
          className={`
            relative p-[8px] flex flex-col items-center justify-center cursor-pointer min-h-[44px] transition-colors
            border-r border-b border-border-subtle
            ${!isCurrentMonth ? 'text-text-muted bg-panel opacity-50' : 'text-text hover:bg-hover'}
            ${isSelected ? 'bg-text text-surface hover:bg-text' : ''}
            ${isHoliday && !isSelected ? 'bg-alert-bg text-alert-text font-semibold' : ''}
          `}
        >
          <span className="text-[13px]">{formattedDate}</span>
          {isHoliday && !isSelected && (
            <div className="absolute bottom-[4px] w-[4px] h-[4px] rounded-full bg-alert-text"></div>
          )}
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="grid grid-cols-7" key={day.toString()}>
        {days}
      </div>
    );
    days = [];
  }

  return (
    <div className="flex flex-col gap-[24px]">
      <div className="bg-surface border border-border shadow-[0_1px_2px_rgba(0,0,0,0.02)] rounded-[4px] overflow-hidden">
        <div className="px-[20px] py-[12px] bg-header border-b border-border flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold">Holiday Calendar</div>
            <div className="text-[12px] text-text-secondary mt-[1px]">Manage public holidays used by the engine's sandwich rule</div>
          </div>
        </div>
        
        <div className="p-[20px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px]">
          
          {/* Calendar Picker */}
          <div className="lg:col-span-1 border border-border rounded-[4px] bg-surface flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-[16px] py-[12px] border-b border-border bg-header">
              <button onClick={prevMonth} className="p-[4px] hover:bg-hover rounded text-text-secondary">
                <ChevronLeftIcon className="w-[16px] h-[16px]" />
              </button>
              <div className="text-[13px] font-semibold">{format(currentMonth, 'MMMM yyyy')}</div>
              <button onClick={nextMonth} className="p-[4px] hover:bg-hover rounded text-text-secondary">
                <ChevronRightIcon className="w-[16px] h-[16px]" />
              </button>
            </div>
            
            <div className="grid grid-cols-7 border-b border-border bg-panel">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                <div key={d} className="text-[11px] font-medium text-text-secondary text-center py-[8px]">
                  {d}
                </div>
              ))}
            </div>
            
            <div className="flex-1 flex flex-col border-l border-t border-border-subtle -ml-[1px] -mt-[1px]">
              {rows}
            </div>

            {selectedDate && (
              <div className="p-[16px] bg-panel border-t border-border">
                <div className="text-[12.5px] font-semibold mb-[12px] text-text flex items-center gap-[6px]">
                  <span>Add Holiday:</span>
                  <span className="font-mono text-text-secondary bg-surface px-[6px] py-[2px] rounded border border-border">
                    {format(selectedDate, 'yyyy-MM-dd')}
                  </span>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-[12px]">
                  <div className="flex flex-col gap-[6px]">
                    <label className="text-[12px] font-medium text-text-secondary">Holiday Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Diwali" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      required 
                      className="w-full rounded-[4px] border border-border-strong px-[10px] py-[8px] font-sans text-[13px] outline-none focus:border-text" 
                      autoFocus
                    />
                  </div>
                  <label className="flex items-start gap-[8px] cursor-pointer mt-[4px]">
                    <input 
                      type="checkbox" 
                      checked={sandwichEligible}
                      onChange={e => setSandwichEligible(e.target.checked)}
                      className="mt-[2px] w-[13px] h-[13px] accent-text" 
                    />
                    <span className="text-[12px] font-medium text-text">Sandwich Eligible</span>
                  </label>
                  
                  {error && <div className="text-[12px] text-alert-text mt-[4px]">{error}</div>}
                  
                  <div className="flex gap-[8px] mt-[8px]">
                    <button type="button" onClick={() => setSelectedDate(null)} className="flex-1 px-[12px] py-[8px] border border-border-strong bg-surface rounded-[4px] text-[12.5px] font-medium hover:bg-hover">
                      Cancel
                    </button>
                    <button type="submit" disabled={loading || !name} className="flex-1 px-[12px] py-[8px] border border-text bg-text text-surface rounded-[4px] text-[12.5px] font-medium hover:bg-[#332F2A] disabled:opacity-50">
                      {loading ? 'Adding...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
          
          {/* List of Holidays */}
          <div className="lg:col-span-2">
            <div className="border border-border rounded-[4px] overflow-hidden bg-surface">
              <table className="w-full text-[13px]">
                <thead className="bg-header border-b border-border">
                  <tr>
                    <th className="text-left font-medium text-[11.5px] text-text-secondary px-[16px] py-[8px]">Date</th>
                    <th className="text-left font-medium text-[11.5px] text-text-secondary px-[16px] py-[8px]">Name</th>
                    <th className="text-center font-medium text-[11.5px] text-text-secondary px-[16px] py-[8px]">Sandwich Eligible</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {holidays.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-[24px] text-text-muted">No holidays configured.</td>
                    </tr>
                  ) : (
                    holidays.sort((a,b) => a.date.localeCompare(b.date)).map((h: any) => (
                      <tr key={h._id} className="hover:bg-hover">
                        <td className="px-[16px] py-[10px] font-mono text-text">{h.date}</td>
                        <td className="px-[16px] py-[10px] font-medium text-text">{h.name}</td>
                        <td className="px-[16px] py-[10px] text-center">
                          {h.sandwichEligible ? (
                            <span className="inline-block px-[6px] py-[2px] bg-success-bg text-success-text border border-success-border rounded-[4px] text-[11px] font-medium">Yes</span>
                          ) : (
                            <span className="inline-block px-[6px] py-[2px] bg-panel text-text-secondary border border-border-strong rounded-[4px] text-[11px] font-medium">No</span>
                          )}
                        </td>
                        <td className="px-[16px] py-[10px] text-right">
                          <button onClick={() => handleDelete(h._id)} className="text-alert-text hover:opacity-70 p-[4px]">
                            <Trash2Icon className="w-[14px] h-[14px]" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
