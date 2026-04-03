import { useState, useMemo } from 'react';
import { cn } from '../lib/utils';
import { OFFICES, Reservation } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, addDays, addMonths, addWeeks, subMonths, subWeeks, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Search as SearchIcon } from 'lucide-react';
import { useReservations } from './ReservationProvider';
import { useEmployee } from './UserProvider';

interface CalendarViewProps {
  viewMode: 'Month' | 'Week' | 'Day';
  selectedOffice: 'Office #1' | 'Office #2';
  selectedDate: string;
  searchQuery: string;
}

export default function CalendarView({ 
  viewMode, 
  selectedOffice, 
  selectedDate,
  searchQuery 
}: CalendarViewProps) {
  const { reservations, cancelReservation } = useReservations();
  const { employee } = useEmployee();
  const [currentDate, setCurrentDate] = useState(parseISO(selectedDate));

  const filteredReservations = useMemo(() => {
    return reservations.filter(res => {
      if (res.office !== selectedOffice) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          res.lobOrDepartment.toLowerCase().includes(query) ||
          res.station.toString().includes(query) ||
          res.date.includes(query)
        );
      }
      
      return true;
    });
  }, [reservations, selectedOffice, searchQuery]);

  const renderMonthView = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    // Leading blank cells so the 1st aligns with the correct Mon–Sun column
    const leadingBlanks = (start.getDay() === 0 ? 6 : start.getDay() - 1);

    return (
      <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="bg-slate-50 p-3 text-[10px] font-black uppercase text-slate-400 text-center">{d}</div>
        ))}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} className="bg-white min-h-[100px]" />
        ))}
        {days.map((day, i) => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayRes = filteredReservations.filter(r => r.date === dayStr);
          const isSelected = isSameDay(day, parseISO(selectedDate));
          
          return (
            <div key={i} className={cn(
              "min-h-[100px] bg-white p-2 transition-all",
              isSelected && "bg-amber-50/30 ring-2 ring-amber-500/20 ring-inset"
            )}>
              <div className="flex justify-between items-start mb-2">
                <span className={cn(
                  "text-xs font-black",
                  isSameDay(day, new Date()) ? 'text-amber-600' : 'text-slate-400'
                )}>{format(day, 'd')}</span>
              </div>
              <div className="space-y-1">
                {dayRes.length > 0 && (
                  <div className="px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 text-[8px] font-black uppercase tracking-widest">
                    {dayRes.length} Confirmed
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const officeConfig = OFFICES.find(o => o.name === selectedOffice)!;

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-8 gap-px bg-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 p-3 text-[10px] font-black uppercase text-slate-400 text-center">Station</div>
            {days.map(day => (
              <div key={day.toString()} className="bg-slate-50 p-3 text-[10px] font-black uppercase text-slate-400 text-center">
                {format(day, 'EEE dd/MM')}
              </div>
            ))}
            
            {Array.from({ length: officeConfig.stations }, (_, i) => i + 1).map(num => (
              <div key={num} className="contents">
                <div className="bg-slate-50 p-3 text-[10px] font-black text-slate-600 text-center border-t border-slate-100">
                  {num.toString().padStart(2, '0')}
                </div>
                {days.map(day => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const res = filteredReservations.find(r => r.date === dayStr && r.station === num);
                  return (
                    <div key={day.toString()} className="bg-white p-2 border-t border-slate-100 min-h-[60px]">
                      {res && (
                        <div className="p-1.5 rounded-lg bg-green-100 text-green-700 text-[8px] font-black uppercase tracking-tighter leading-tight">
                          {res.lobOrDepartment}<br/>{res.start}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const officeConfig = OFFICES.find(o => o.name === selectedOffice)!;
    const dayStr = format(currentDate, 'yyyy-MM-dd');

    return (
      <div className="space-y-2">
        {Array.from({ length: officeConfig.stations }, (_, i) => i + 1).map(num => {
          const res = filteredReservations.find(r => r.date === dayStr && r.station === num);
          return (
            <div key={num} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-amber-200 transition-all">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-slate-600 group-hover:text-amber-600 group-hover:border-amber-200 transition-all">
                {num.toString().padStart(2, '0')}
              </div>
              <div className="flex-1">
                {res ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{res.lobOrDepartment}</h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{res.start} – {res.end}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-widest">
                      {res.status}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available</span>
                    <button className="text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700">
                      Book Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const navigatePrev = () => {
    if (viewMode === 'Month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'Week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, -1));
  };

  const navigateNext = () => {
    if (viewMode === 'Month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'Week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const navLabel =
    viewMode === 'Day'  ? format(currentDate, 'EEEE, MMMM dd yyyy') :
    viewMode === 'Week' ? `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM dd, yyyy')}` :
                          format(currentDate, 'MMMM yyyy');

  return (
    <div className="space-y-6">
      {/* Navigation bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-100 rounded-2xl p-1">
          <button
            onClick={navigatePrev}
            className="p-2 hover:bg-white rounded-xl transition-all text-slate-500 hover:text-amber-600 hover:shadow-sm"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-sm font-black uppercase tracking-widest text-slate-900 min-w-[180px] text-center">
            {navLabel}
          </span>
          <button
            onClick={navigateNext}
            className="p-2 hover:bg-white rounded-xl transition-all text-slate-500 hover:text-amber-600 hover:shadow-sm"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {searchQuery && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
            <SearchIcon className="w-3 h-3" />
            <span className="text-[10px] font-black uppercase tracking-widest">Results for "{searchQuery}"</span>
          </div>
        )}
      </div>

      {viewMode === 'Month' && renderMonthView()}
      {viewMode === 'Week' && renderWeekView()}
      {viewMode === 'Day' && renderDayView()}
    </div>
  );
}
