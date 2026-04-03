import { useMemo } from 'react';
import { useReservations } from './ReservationProvider';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { OFFICES, getLCStations } from '../types';

const TODAY = new Date().toISOString().split('T')[0];

interface OfficeStats {
  name: 'Office #1' | 'Office #2';
  total: number;
  lcReserved: number;
  bookable: number;
  confirmed: number;
  pending: number;
  blocked: number;
  available: number;
  occupancyPct: number; // confirmed + pending out of bookable
}

function useOfficeStats(): OfficeStats[] {
  const { reservations } = useReservations();

  return useMemo(() => {
    return OFFICES.map(office => {
      const name = office.name as 'Office #1' | 'Office #2';
      const lcStations = getLCStations(name);
      const total = office.stations;
      const lcReserved = lcStations.length;
      const bookable = total - lcReserved;

      const todayRes = reservations.filter(
        r => r.office === name && r.date === TODAY && r.status !== 'cancelled' && r.status !== 'rejected'
      );

      const confirmed = todayRes.filter(r => r.status === 'confirmed').length;
      const pending   = todayRes.filter(r => r.status === 'pending').length;
      const blocked   = todayRes.filter(r => r.status === 'blocked').length;
      const occupied  = confirmed + pending + blocked;
      const available = Math.max(0, bookable - occupied);
      const occupancyPct = bookable > 0 ? Math.round(((confirmed + pending) / bookable) * 100) : 0;

      return { name, total, lcReserved, bookable, confirmed, pending, blocked, available, occupancyPct };
    });
  }, [reservations]);
}

function OccupancyBar({ pct, confirmed, pending }: { pct: number; confirmed: number; pending: number }) {
  const total = confirmed + pending;
  const confirmedPct = total > 0 ? Math.round((confirmed / (confirmed + pending)) * pct) : pct;
  const pendingPct   = pct - confirmedPct;

  return (
    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
      <div
        className="h-full bg-green-600 transition-all duration-700 rounded-l-full"
        style={{ width: `${confirmedPct}%` }}
      />
      <div
        className="h-full bg-amber-400 transition-all duration-700"
        style={{ width: `${pendingPct}%` }}
      />
    </div>
  );
}

interface OfficeCardProps {
  stats: OfficeStats;
}

function OfficeCard({ stats }: OfficeCardProps) {
  const items = [
    { label: 'Available',   value: stats.available,  color: 'text-blue-600',   bg: 'bg-blue-50',   dot: 'bg-blue-500' },
    { label: 'Confirmed',   value: stats.confirmed,  color: 'text-green-700',  bg: 'bg-green-50',  dot: 'bg-green-600' },
    { label: 'Pending',     value: stats.pending,    color: 'text-amber-700',  bg: 'bg-amber-50',  dot: 'bg-amber-400' },
    { label: 'Blocked',     value: stats.blocked,    color: 'text-slate-600',  bg: 'bg-slate-50',  dot: 'bg-slate-400' },
    { label: 'LC Reserved', value: stats.lcReserved, color: 'text-violet-700', bg: 'bg-violet-50', dot: 'bg-violet-600' },
  ];

  return (
    <div className="flex-1 min-w-0 space-y-4">
      {/* Office label + occupancy % */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">{stats.name}</span>
        <span className={cn(
          'text-[10px] font-black uppercase px-2.5 py-1 rounded-full',
          stats.occupancyPct >= 90 ? 'bg-red-100 text-red-700' :
          stats.occupancyPct >= 60 ? 'bg-amber-100 text-amber-700' :
                                     'bg-green-100 text-green-700'
        )}>
          {stats.occupancyPct}% occupied
        </span>
      </div>

      {/* Occupancy bar */}
      <OccupancyBar pct={stats.occupancyPct} confirmed={stats.confirmed} pending={stats.pending} />

      {/* Station count caption */}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {stats.bookable} bookable stations · {stats.total} total
      </p>

      {/* RAG breakdown */}
      <div className="grid grid-cols-2 gap-2">
        {items.map(item => (
          <div key={item.label} className={cn('flex items-center gap-2 px-3 py-2 rounded-xl', item.bg)}>
            <span className={cn('w-2 h-2 rounded-full shrink-0', item.dot)} />
            <span className={cn('text-[11px] font-black', item.color)}>{item.value}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GeneralOverview() {
  const officeStats = useOfficeStats();
  const { reservations } = useReservations();

  const totalBookable = officeStats.reduce((s, o) => s + o.bookable, 0);
  const totalOccupied = officeStats.reduce((s, o) => s + o.confirmed + o.pending, 0);
  const totalAvailable = officeStats.reduce((s, o) => s + o.available, 0);
  const overallPct = totalBookable > 0 ? Math.round((totalOccupied / totalBookable) * 100) : 0;

  // Last 5 confirmed bookings today (for the activity strip)
  const recentToday = reservations
    .filter(r => r.date === TODAY && r.status === 'confirmed' && r.type === 'booking')
    .slice(0, 5);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/50">General Dashboard</p>
          <h2 className="text-white text-base font-black uppercase tracking-tight mt-0.5">
            Today's Overview
          </h2>
          <p className="text-white/40 text-[10px] font-bold mt-0.5">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        {/* Overall occupancy pill */}
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">All Offices</p>
          <div className={cn(
            'px-4 py-2 rounded-2xl text-center',
            overallPct >= 90 ? 'bg-red-600'    :
            overallPct >= 60 ? 'bg-amber-500'  :
                               'bg-green-600'
          )}>
            <p className="text-2xl font-black text-white leading-none">{overallPct}%</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/70 mt-0.5">Occupancy</p>
          </div>
        </div>
      </div>

      {/* Office breakdown */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {officeStats.map((stats, i) => (
            <div key={stats.name} className="flex-1 flex gap-6 min-w-0">
              {i > 0 && <div className="hidden md:block w-px bg-slate-100 shrink-0" />}
              <OfficeCard stats={stats} />
            </div>
          ))}
        </div>

        {/* Summary row */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-black text-blue-600">{totalAvailable}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Stations Free</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-green-600">{totalOccupied}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Stations Booked</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-slate-700">{totalBookable}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Total Bookable</p>
          </div>
        </div>

        {/* Recent confirmed activity strip */}
        {recentToday.length > 0 && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Confirmed Today</p>
            <div className="flex flex-wrap gap-2">
              {recentToday.map(r => (
                <div key={r.id} className="px-3 py-1.5 bg-green-50 border border-green-100 rounded-xl flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600 shrink-0" />
                  <span className="text-[10px] font-black text-green-800">
                    Stn {String(r.station).padStart(2, '0')} · {r.office.replace('Office ', 'O')}
                  </span>
                  <span className="text-[10px] text-green-600 font-bold">{r.lobOrDepartment}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
