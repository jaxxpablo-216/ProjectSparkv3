import { useMemo, useState } from 'react';
import { useReservations } from './ReservationProvider';
import { cn } from '../lib/utils';
import { 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  CalendarDays
} from 'lucide-react';
import { 
  startOfMonth, 
  startOfWeek, 
  startOfDay, 
  isAfter, 
  parseISO 
} from 'date-fns';

interface DashboardStatsProps {
  timeFilter: 'MTD' | 'WTD' | 'Daily' | 'All';
  setTimeFilter: (filter: 'MTD' | 'WTD' | 'Daily' | 'All') => void;
}

export default function DashboardStats({ timeFilter, setTimeFilter }: DashboardStatsProps) {
  const { reservations } = useReservations();

  const filteredReservations = useMemo(() => {
    const now = new Date();
    let startDate: Date | null = null;

    if (timeFilter === 'MTD') startDate = startOfMonth(now);
    if (timeFilter === 'WTD') startDate = startOfWeek(now);
    if (timeFilter === 'Daily') startDate = startOfDay(now);

    if (!startDate) return reservations;

    return reservations.filter(r => {
      const resDate = parseISO(r.date);
      return isAfter(resDate, startDate!) || resDate.getTime() === startDate!.getTime();
    });
  }, [reservations, timeFilter]);

  const getStats = (resList = filteredReservations) => {
    const total = resList.length;
    const pending = resList.filter(r => r.status === 'pending').length;
    const confirmed = resList.filter(r => r.status === 'confirmed').length;
    const rejected = resList.filter(r => r.status === 'rejected').length;
    const overrides = resList.filter(r => r.status === 'overridden').length;
    const blocked = resList.filter(r => r.status === 'blocked').length;
    const cancelled = resList.filter(r => r.status === 'cancelled').length;

    return { total, pending, confirmed, rejected, overrides, blocked, cancelled };
  };

  const overall = getStats();
  const office1 = getStats(filteredReservations.filter(r => r.office === 'Office #1'));
  const office2 = getStats(filteredReservations.filter(r => r.office === 'Office #2'));

  const StatCard = ({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: string }) => (
    <div className={cn("bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4", color)}>
      <div className="p-3 rounded-xl bg-current bg-opacity-10">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
        <p className="text-xl font-black">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Real-time Statistics
        </h2>
        <div className="flex p-1 bg-slate-100 rounded-xl">
          {(['MTD', 'WTD', 'Daily', 'All'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={cn(
                "px-4 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all",
                timeFilter === filter ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {/* Row 1: Primary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Requests" value={overall.total} icon={CalendarDays} color="text-slate-600" />
          <StatCard label="Total Pending" value={overall.pending} icon={Clock} color="text-amber-500" />
          <StatCard label="Total Confirmed" value={overall.confirmed} icon={CheckCircle2} color="text-emerald-500" />
          <StatCard label="Total Rejected" value={overall.rejected} icon={XCircle} color="text-rose-500" />
        </div>

        {/* Row 2: Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Overrides" value={overall.overrides} icon={AlertTriangle} color="text-indigo-500" />
          <StatCard label="Total Blocked" value={overall.blocked} icon={BarChart3} color="text-slate-400" />
          <StatCard label="Total Cancelled" value={overall.cancelled} icon={XCircle} color="text-slate-300" />
          <StatCard label="Active Users" value={new Set(filteredReservations.map(r => r.requestedBy)).size} icon={BarChart3} color="text-blue-500" />
        </div>

        {/* Row 3: Per Office Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          {[
            { label: 'Office #1', stats: office1, accent: 'text-blue-600' },
            { label: 'Office #2', stats: office2, accent: 'text-purple-600' },
          ].map(({ label, stats, accent }) => (
            <div key={label} className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
              <h3 className={cn("text-sm font-black uppercase tracking-widest mb-4", accent)}>{label}</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'Pending',   val: stats.pending,   color: 'text-amber-500',  bg: 'bg-amber-50'  },
                  { key: 'Confirmed', val: stats.confirmed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { key: 'Rejected',  val: stats.rejected,  color: 'text-rose-500',   bg: 'bg-rose-50'   },
                  { key: 'Overrides', val: stats.overrides, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                ].map(({ key, val, color, bg }) => (
                  <div key={key} className={cn("p-3 rounded-2xl border border-white flex items-center gap-3", bg)}>
                    <p className={cn("text-2xl font-black leading-none", color)}>{val}</p>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 leading-tight">{key}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
