import React, { useState, useMemo } from 'react';
import { cn } from '../lib/utils';
import { OFFICES, Reservation, ReservationStatus, ReservationType, isLCStation, getLCStations } from '../types';
import { useReservations } from './ReservationProvider';
import { useEmployee } from './UserProvider';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, addDays, addMonths, subMonths, addWeeks, subWeeks, parseISO } from 'date-fns';
import { X, Lock, Unlock, Download, User as UserIcon, Calendar, Clock, Briefcase, Wrench, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import ReservationForm from './ReservationForm';
import AdminEditModal from './AdminEditModal';

interface StationGridProps {
  selectedOffice: 'Office #1' | 'Office #2';
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  viewMode?: 'User' | 'Admin';
  viewType: 'Daily' | 'WTD' | 'MTD' | 'All';
  setViewType: (type: 'Daily' | 'WTD' | 'MTD' | 'All') => void;
}

export default function StationGrid({ 
  selectedOffice, 
  selectedDate, 
  setSelectedDate, 
  viewMode = 'User',
  viewType,
  setViewType
}: StationGridProps) {
  const { reservations, blockStation, cancelReservation } = useReservations();
  const { employee } = useEmployee();

  // Unified selection: each cell is {station, date}
  const [selectedCells, setSelectedCells] = useState<Array<{station: number|string, date: string}>>([]);
  // Sortable All-view columns
  const [sortCol, setSortCol] = useState<'date' | 'station' | 'lobOrDepartment' | 'requestedBy' | 'status'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };
  // Legacy alias used by admin block/unblock (daily view only)
  const selectedStations = selectedCells.filter(c => c.date === selectedDate).map(c => c.station);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  // For bulk booking: primary cell + remaining cells passed as bulkCells to the form
  const [activeBookingCell, setActiveBookingCell] = useState<{station: number|string, date: string} | null>(null);
  const [bulkBookingCells, setBulkBookingCells] = useState<Array<{station: number|string, date: string}>>([]);
  const [infoModal, setInfoModal] = useState<Reservation | null>(null);
  const [editModal, setEditModal] = useState<Reservation | null>(null);

  const officeConfig = OFFICES.find(o => o.name === selectedOffice)!;

  const getDayStats = (date: string) => {
    const dayRes = reservations.filter(r => 
      r.office === selectedOffice && 
      r.date === date &&
      r.status !== 'cancelled' &&
      r.status !== 'rejected'
    );
    const confirmed = dayRes.filter(r => r.status === 'confirmed').length;
    const pending = dayRes.filter(r => r.status === 'pending').length;
    const blocked = dayRes.filter(r => r.status === 'blocked').length;
    return { confirmed, pending, blocked, total: dayRes.length };
  };

  const getStationStatus = (station: number | string, date: string = selectedDate): ReservationStatus | 'available' | 'lc' => {
    const res = reservations.find(r =>
      r.office === selectedOffice &&
      r.station === station &&
      r.date === date &&
      r.status !== 'rejected' &&
      r.status !== 'cancelled'
    );

    if (!res) {
      // Unbooked LC station — show as LC Reserved
      if (isLCStation(station, selectedOffice)) return 'lc';
      return 'available';
    }
    return res.status;
  };

  const getStatusColor = (status: ReservationStatus | 'available' | 'lc') => {
    switch (status) {
      case 'available':   return 'bg-blue-500 hover:bg-blue-600';
      case 'pending':     return 'bg-amber-400 hover:bg-amber-500';
      case 'confirmed':   return 'bg-green-600 hover:bg-green-700';
      case 'rejected':    return 'bg-red-600 hover:bg-red-700';
      case 'cancelled':   return 'bg-slate-300 hover:bg-slate-400';
      case 'blocked':     return 'bg-slate-400 hover:bg-slate-500';
      case 'overridden':
      case 'reallocated': return 'bg-indigo-500 hover:bg-indigo-600';
      case 'lc':          return 'bg-violet-600 hover:bg-violet-700';
      default:            return 'bg-blue-500';
    }
  };

  const isCellSelected = (station: number|string, date: string) =>
    selectedCells.some(c => c.station === station && c.date === date);

  const toggleCell = (station: number|string, date: string) => {
    setSelectedCells(prev =>
      isCellSelected(station, date)
        ? prev.filter(c => !(c.station === station && c.date === date))
        : [...prev, { station, date }]
    );
  };

  const openBulkBooking = () => {
    const available = selectedCells.filter(c => getStationStatus(c.station, c.date) === 'available');
    if (available.length === 0) { toast.error('No available stations selected.'); return; }
    const [first, ...rest] = available;
    setActiveBookingCell(first);
    setBulkBookingCells(rest); // remaining cells — form applies same data to all
    setSelectedDate(first.date);
    setIsBookingModalOpen(true);
  };

  const handleBookingSuccess = () => {
    setIsBookingModalOpen(false);
    setActiveBookingCell(null);
    setBulkBookingCells([]);
    setSelectedCells([]);
  };

  const isReadOnly = employee?.role === 'User';

  const handleStationClick = (station: number | string, e: React.MouseEvent, date: string = selectedDate) => {
    // CTRL / CMD — multi-select toggle (read-only users can't select for booking)
    if (e.ctrlKey || e.metaKey) {
      if (isReadOnly) return;
      e.preventDefault();
      toggleCell(station, date);
      return;
    }

    // Single click — clear multi-select, then route
    setSelectedCells([{ station, date }]);
    setSelectedDate(date);

    const res = reservations.find(r =>
      r.office === selectedOffice &&
      r.station === station &&
      r.date === date &&
      r.status !== 'rejected' &&
      r.status !== 'cancelled'
    );

    if (!res) {
      // Read-only users (User role) cannot book
      if (isReadOnly) return;
      // LC station — only Admin/Manager can book
      if (isLCStation(station, selectedOffice)) {
        const isAdminOrManager = employee?.role === 'Admin' || employee?.role === 'Manager' || employee?.role === 'Assistant Manager';
        if (!isAdminOrManager) {
          toast.error('This station is reserved for the Load Control (LC) team.');
          return;
        }
      }
      // Empty slot → booking form
      setActiveBookingCell({ station, date });
      setBulkBookingCells([]);
      setIsBookingModalOpen(true);
      return;
    }

    // Occupied → info modal (read-only users see details but no cancel button)
    setInfoModal(res);
  };

  const handleBlock = async () => {
    for (const { station, date } of selectedCells) {
      const isBlocked = getStationStatus(station, date) === 'blocked';
      if (isBlocked) {
        const res = reservations.find(r =>
          r.office === selectedOffice &&
          r.station === station &&
          r.date === date &&
          r.status === 'blocked'
        );
        if (res) await cancelReservation(res.id);
      } else {
        if (typeof station === 'number') {
          await blockStation(selectedOffice, station, date);
        }
      }
    }
    setSelectedCells([]);
  };

  const hasBlocked = selectedCells.some(c => getStationStatus(c.station, c.date) === 'blocked');
  const hasAvailable = selectedCells.some(c => getStationStatus(c.station, c.date) === 'available');

  const exportToCSV = () => {
    const headers = ['ID', 'Office', 'Station', 'LOB or Department', 'Requested By', 'Date', 'Start', 'End', 'Status', 'Type'];
    const rows = reservations.map(r => [
      r.id, r.office, r.station, r.lobOrDepartment, r.requestedBy, r.date, r.start, r.end, r.status, r.type
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `reservations_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderMonthView = () => {
    const date = parseISO(selectedDate);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const days = eachDayOfInterval({ start, end });

    return (
      <div className="space-y-4">
        {/* Month navigation */}
        <div className="flex items-center gap-2 bg-slate-100 rounded-2xl p-1 w-fit">
          <button
            onClick={() => setSelectedDate(format(subMonths(date, 1), 'yyyy-MM-dd'))}
            className="p-2 hover:bg-white rounded-xl transition-all text-slate-500 hover:text-amber-600 hover:shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-sm font-black uppercase tracking-widest text-slate-900 min-w-[160px] text-center">
            {format(date, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setSelectedDate(format(addMonths(date, 1), 'yyyy-MM-dd'))}
            className="p-2 hover:bg-white rounded-xl transition-all text-slate-500 hover:text-amber-600 hover:shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-2xl overflow-visible">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="bg-slate-50 p-3 text-[10px] font-black uppercase text-slate-400 text-center rounded-tl-2xl first:rounded-tl-2xl">{d}</div>
          ))}
          {Array.from({ length: start.getDay() === 0 ? 6 : start.getDay() - 1 }).map((_, i) => (
            <div key={`blank-${i}`} className="bg-white min-h-[100px]" />
          ))}
          {days.map((day, i) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const stats = getDayStats(dayStr);
            const isSelected = isSameDay(day, parseISO(selectedDate));
            const dayReservations = reservations.filter(r =>
              r.office === selectedOffice && r.date === dayStr &&
              r.status !== 'cancelled' && r.status !== 'rejected'
            ).slice(0, 4);

            return (
              <div key={i} className="relative group">
                <button
                  onClick={() => setSelectedDate(dayStr)}
                  className={cn(
                    "w-full min-h-[100px] bg-white p-2 transition-all text-left flex flex-col items-start",
                    isSelected && "ring-2 ring-amber-500 ring-inset bg-amber-50/30"
                  )}
                >
                  <span className={cn(
                    "text-xs font-black mb-2",
                    isSameDay(day, new Date()) ? "text-amber-600" : "text-slate-400"
                  )}>{format(day, 'd')}</span>

                  <div className="flex flex-wrap gap-1">
                    {stats.total === 0 ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[8px] font-black uppercase">All</span>
                    ) : (
                      <>
                        {stats.confirmed > 0 && <span className="px-1.5 py-0.5 rounded bg-green-600 text-white text-[8px] font-black">{stats.confirmed}</span>}
                        {stats.pending > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-400 text-white text-[8px] font-black">{stats.pending}</span>}
                        {stats.blocked > 0 && <span className="px-1.5 py-0.5 rounded bg-slate-400 text-white text-[8px] font-black">{stats.blocked}</span>}
                      </>
                    )}
                  </div>
                </button>
                {/* Hover tooltip for MTD cells */}
                {stats.total > 0 && (
                  <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-slate-900 text-white rounded-2xl p-3 space-y-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none shadow-2xl shadow-slate-900/40">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/50">{format(day, 'EEEE, MMM d')}</p>
                    <div className="flex gap-2 flex-wrap">
                      {stats.confirmed > 0 && <span className="px-1.5 py-0.5 rounded-md bg-green-600 text-white text-[9px] font-black">{stats.confirmed} confirmed</span>}
                      {stats.pending > 0 && <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-white text-[9px] font-black">{stats.pending} pending</span>}
                      {stats.blocked > 0 && <span className="px-1.5 py-0.5 rounded-md bg-slate-500 text-white text-[9px] font-black">{stats.blocked} blocked</span>}
                    </div>
                    {dayReservations.map(r => (
                      <div key={r.id} className="text-[9px] text-white/70 flex items-center gap-1.5">
                        <span className="font-black text-white">Stn {String(r.station).padStart(2,'0')}</span>
                        <span className="truncate">{r.lobOrDepartment}</span>
                      </div>
                    ))}
                    {stats.total > 4 && <p className="text-[9px] text-white/40">+{stats.total - 4} more</p>}
                    <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="border-t border-slate-100 pt-8">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6">
            Stations for {format(parseISO(selectedDate), 'EEEE, MMMM dd')}
          </h3>
          {renderDayList()}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const date = parseISO(selectedDate);
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

    return (
      <div className="space-y-4">
        {/* Week navigation */}
        <div className="flex items-center gap-2 bg-slate-100 rounded-2xl p-1 w-fit">
          <button
            onClick={() => setSelectedDate(format(subWeeks(date, 1), 'yyyy-MM-dd'))}
            className="p-2 hover:bg-white rounded-xl transition-all text-slate-500 hover:text-amber-600 hover:shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-sm font-black uppercase tracking-widest text-slate-900 min-w-[220px] text-center">
            Week of {format(start, 'MMM dd, yyyy')}
          </span>
          <button
            onClick={() => setSelectedDate(format(addWeeks(date, 1), 'yyyy-MM-dd'))}
            className="p-2 hover:bg-white rounded-xl transition-all text-slate-500 hover:text-amber-600 hover:shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <table className="w-full border-collapse table-fixed">
          <colgroup>
            <col className="w-10" />
            {days.map((_, i) => <col key={i} />)}
          </colgroup>
          <thead>
            <tr>
              <th className="py-2 px-1 text-[9px] font-black uppercase text-slate-400 text-left border-b border-slate-100">Stn</th>
              {days.map(day => (
                <th key={day.toString()} className={cn(
                  "py-2 px-1 text-[9px] font-black uppercase text-center border-b border-slate-100",
                  isSameDay(day, parseISO(selectedDate)) ? "text-amber-600 bg-amber-50/50" : "text-slate-400"
                )}>
                  {format(day, 'EEE')}<br/>{format(day, 'MMM d')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: officeConfig.stations }, (_, i) => i + 1).map(num => (
              <tr key={num}>
                <td className="py-1 px-1 text-[9px] font-black text-slate-500 border-b border-slate-100 text-center">{num.toString().padStart(2, '0')}</td>
                {days.map(day => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const status = getStationStatus(num, dayStr);
                  const reservation = reservations.find(r =>
                    r.office === selectedOffice &&
                    r.station === num &&
                    r.date === dayStr &&
                    r.status !== 'rejected' &&
                    r.status !== 'cancelled'
                  );

                  return (
                    <td key={dayStr} className="py-1 px-0.5 border-b border-slate-100">
                      <div className="relative group">
                        <button
                          onClick={(e) => handleStationClick(num, e, dayStr)}
                          className={cn(
                            "w-full rounded-md text-white transition-all min-h-[36px] flex flex-col items-center justify-center px-0.5",
                            getStatusColor(status),
                            isCellSelected(num, dayStr) && "ring-2 ring-blue-400 ring-offset-1 scale-90"
                          )}
                        >
                          {reservation && (
                            <span className="text-[7px] font-black uppercase leading-tight text-center truncate w-full px-0.5">
                              {reservation.lobOrDepartment}
                            </span>
                          )}
                        </button>
                        {/* Hover tooltip for WTD cells */}
                        <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-44 bg-slate-900 text-white rounded-xl p-2.5 space-y-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none shadow-2xl shadow-slate-900/40">
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Stn {num.toString().padStart(2, '0')} · {dayStr}</p>
                          {reservation ? (
                            <>
                              <p className="text-[10px] font-black text-white">{reservation.lobOrDepartment}</p>
                              <p className="text-[9px] text-white/70">{reservation.start} – {reservation.end}</p>
                              <p className="text-[9px] text-amber-300 capitalize">{status}</p>
                            </>
                          ) : (
                            <p className="text-[9px] text-emerald-400 font-bold">Available</p>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDayList = () => {
    const isAdminViewer = employee?.role === 'Admin' || employee?.role === 'Manager' || employee?.role === 'Assistant Manager';
    const lcStationNums = getLCStations(selectedOffice);
    const regularNums = Array.from({ length: officeConfig.stations }, (_, i) => i + 1)
      .filter(n => !lcStationNums.includes(n));

    const StationCard = ({ num }: { num: number }) => {
      const isLC = lcStationNums.includes(num);
      const status = getStationStatus(num);
      const isSelected = isCellSelected(num, selectedDate);
      const reservation = reservations.find(r =>
        r.office === selectedOffice &&
        r.station === num &&
        r.date === selectedDate &&
        r.status !== 'rejected' &&
        r.status !== 'cancelled'
      );
      return (
        <div className="relative group">
          <button
            onClick={(e) => handleStationClick(num, e)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-2xl text-white transition-all text-left",
              getStatusColor(status),
              isSelected && "ring-4 ring-blue-400 ring-offset-2 scale-[0.97]"
            )}
          >
            <span className="text-sm font-black w-8 shrink-0 opacity-90">
              {num.toString().padStart(2, '0')}
            </span>
            <div className="min-w-0 flex-1">
              {reservation ? (
                <>
                  <p className="text-xs font-black uppercase tracking-tight truncate leading-tight">{reservation.lobOrDepartment}</p>
                  <p className="text-[10px] font-bold opacity-80 leading-tight">{reservation.start}–{reservation.end}</p>
                </>
              ) : isLC ? (
                <p className="text-xs font-black uppercase opacity-80">LC Reserved</p>
              ) : (
                <p className="text-xs font-black uppercase opacity-60">Available</p>
              )}
            </div>
            {isLC && !reservation && (
              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-white/30 shrink-0">LC</span>
            )}
            {reservation && (
              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-white/20 shrink-0">{status}</span>
            )}
          </button>
          {/* Hover Detail Tooltip */}
          {(reservation || isLC) && (
            <div className="absolute z-20 bottom-full left-0 mb-2 w-56 bg-slate-900 text-white rounded-2xl p-3 space-y-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none shadow-2xl shadow-slate-900/40">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/50">
                Station {num.toString().padStart(2, '0')}{isLC ? ' · LC TEAM' : ''}
              </p>
              {reservation ? (
                <>
                  <p className="text-xs font-black text-white">{reservation.lobOrDepartment}</p>
                  <p className="text-[10px] text-white/70">{reservation.start} – {reservation.end}</p>
                  {reservation.equipmentNeeds && (
                    <p className="text-[9px] text-amber-300 font-bold">{reservation.equipmentNeeds}</p>
                  )}
                  {isAdminViewer && (
                    <p className="text-[9px] text-white/50 font-mono">#{reservation.requestedBy}</p>
                  )}
                </>
              ) : (
                <p className="text-[10px] text-violet-300 font-bold">Reserved for Load Control Team</p>
              )}
              <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-slate-900 rotate-45" />
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {regularNums.map(num => <StationCard key={num} num={num} />)}
        </div>

        {lcStationNums.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-violet-100" />
              <span className="text-[10px] font-black uppercase tracking-widest text-violet-600 px-2 py-1 bg-violet-50 rounded-full border border-violet-100">
                LC Team — Load Control ({lcStationNums.length} stations reserved)
              </span>
              <div className="h-px flex-1 bg-violet-100" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lcStationNums.map(num => <StationCard key={num} num={num} />)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDayGrid = () => {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4">
        {Array.from({ length: officeConfig.stations }, (_, i) => i + 1).map(num => {
          const status = getStationStatus(num);
          const isSelected = selectedStations.includes(num);
          const reservation = reservations.find(r => 
            r.office === selectedOffice && 
            r.station === num && 
            r.date === selectedDate &&
            r.status !== 'rejected' &&
            r.status !== 'cancelled'
          );
          
          return (
            <button
              key={num}
              onClick={(e) => handleStationClick(num, e)}
              className={cn(
                "aspect-square rounded-2xl flex flex-col items-center justify-center text-white transition-all p-2 text-center",
                getStatusColor(status),
                isSelected && "ring-4 ring-blue-400 ring-offset-4 scale-95"
              )}
            >
              <span className="text-xl font-black">{num.toString().padStart(2, '0')}</span>
              <span className="text-[8px] font-bold uppercase tracking-widest opacity-80 mt-1 line-clamp-2">
                {reservation?.lobOrDepartment || status}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderAllView = () => {
    const isAdminViewer = employee?.role === 'Admin' || employee?.role === 'Manager' || employee?.role === 'Assistant Manager';
    const officeReservations = reservations
      .filter(r => r.office === selectedOffice)
      .sort((a, b) => {
        const va = String(a[sortCol] ?? '');
        const vb = String(b[sortCol] ?? '');
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      });

    const SortHeader = ({ col, label }: { col: typeof sortCol; label: string }) => (
      <th
        className="p-3 text-[10px] font-black uppercase text-slate-400 text-left border-b border-slate-100 cursor-pointer select-none hover:text-amber-600 transition-colors"
        onClick={() => toggleSort(col)}
      >
        <span className="flex items-center gap-1">
          {label}
          {sortCol === col
            ? sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-amber-500" /> : <ChevronDown className="w-3 h-3 text-amber-500" />
            : <ChevronDown className="w-3 h-3 opacity-20" />}
        </span>
      </th>
    );

    return (
      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6">
          All Reservations — {selectedOffice}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <SortHeader col="date" label="Date" />
                <SortHeader col="station" label="Station" />
                <SortHeader col="lobOrDepartment" label="LOB/Dept" />
                {isAdminViewer && <SortHeader col="requestedBy" label="User" />}
                <SortHeader col="status" label="Status" />
              </tr>
            </thead>
            <tbody>
              {officeReservations.map(res => (
                <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-[10px] font-bold text-slate-600 border-b border-slate-100">{res.date}</td>
                  <td className="p-3 text-[10px] font-black text-slate-900 border-b border-slate-100 uppercase">{res.station}</td>
                  <td className="p-3 text-[10px] font-black text-slate-900 border-b border-slate-100 uppercase">{res.lobOrDepartment}</td>
                  {isAdminViewer && (
                    <td className="p-3 text-[10px] font-bold text-slate-500 border-b border-slate-100 font-mono">#{res.requestedBy}</td>
                  )}
                  <td className="p-3 border-b border-slate-100">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-white",
                      getStatusColor(res.status)
                    )}>
                      {res.status}
                    </span>
                  </td>
                </tr>
              ))}
              {officeReservations.length === 0 && (
                <tr>
                  <td colSpan={isAdminViewer ? 5 : 4} className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                    No reservations found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const isAdmin = (employee?.role === 'Admin' || employee?.role === 'Manager' || employee?.role === 'Assistant Manager') && viewMode === 'Admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex p-1 bg-slate-100 rounded-2xl">
          {(['MTD', 'WTD', 'Daily', 'All'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setViewType(type)}
              className={cn(
                "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                viewType === type ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Book Selected — hidden for read-only User role */}
          {!isReadOnly && selectedCells.length >= 2 && (
            <button
              onClick={openBulkBooking}
              className="px-4 py-2 bg-gradient-to-br from-amber-500 to-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md shadow-amber-500/20 hover:scale-105 transition-all flex items-center gap-2"
            >
              <Calendar className="w-3 h-3" />
              Book Selected ({selectedCells.filter(c => getStationStatus(c.station, c.date) === 'available').length})
            </button>
          )}
          {selectedCells.length >= 1 && (
            <button
              onClick={() => setSelectedCells([])}
              className="px-3 py-2 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all"
            >
              Clear
            </button>
          )}
          {isAdmin && (
            <>
              <button
                onClick={handleBlock}
                disabled={selectedCells.length === 0}
                className={cn(
                  "px-4 py-2 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 flex items-center gap-2",
                  hasBlocked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-800 hover:bg-slate-900"
                )}
              >
                {hasBlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {hasBlocked ? 'Unblock' : 'Block'}
                {selectedCells.length > 0 && ` (${selectedCells.length})`}
              </button>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2"
              >
                <Download className="w-3 h-3" /> Export CSV
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="flex flex-wrap gap-4 mb-8">
          <LegendItem color="bg-blue-500"    label="Available" />
          <LegendItem color="bg-amber-400"   label="Pending" />
          <LegendItem color="bg-green-600"   label="Confirmed" />
          <LegendItem color="bg-red-600"     label="Denied" />
          <LegendItem color="bg-slate-400"   label="Blocked" />
          <LegendItem color="bg-violet-600"  label="LC Reserved" />
          <LegendItem color="bg-indigo-500"  label="Reallocated" />
        </div>

        {viewType === 'Daily' && (
          <div className="flex gap-4 mb-8">
            {selectedOffice === 'Office #1' ? (
              <button
                onClick={(e) => handleStationClick('Boardroom', e)}
                className={cn(
                  "w-48 h-24 rounded-2xl flex flex-col items-center justify-center text-white transition-all",
                  getStatusColor(getStationStatus('Boardroom')),
                  selectedStations.includes('Boardroom') && "ring-4 ring-blue-400 ring-offset-4"
                )}
              >
                <span className="text-xs font-black uppercase tracking-widest">Boardroom</span>
                <span className="text-[10px] opacity-80 font-bold uppercase tracking-tighter mt-1">Office #1</span>
              </button>
            ) : (
              <>
                <button
                  onClick={(e) => handleStationClick('Boardroom', e)}
                  className={cn(
                    "w-48 h-24 rounded-2xl flex flex-col items-center justify-center text-white transition-all",
                    getStatusColor(getStationStatus('Boardroom')),
                    selectedStations.includes('Boardroom') && "ring-4 ring-blue-400 ring-offset-4"
                  )}
                >
                  <span className="text-xs font-black uppercase tracking-widest">Boardroom</span>
                  <span className="text-[10px] opacity-80 font-bold uppercase tracking-tighter mt-1">Office #2</span>
                </button>
                <button
                  onClick={(e) => handleStationClick('Meeting Room', e)}
                  className={cn(
                    "w-48 h-24 rounded-2xl flex flex-col items-center justify-center text-white transition-all",
                    getStatusColor(getStationStatus('Meeting Room')),
                    selectedStations.includes('Meeting Room') && "ring-4 ring-blue-400 ring-offset-4"
                  )}
                >
                  <span className="text-xs font-black uppercase tracking-widest">Meeting Room</span>
                  <span className="text-[10px] opacity-80 font-bold uppercase tracking-tighter mt-1">Office #2</span>
                </button>
              </>
            )}
          </div>
        )}

        {viewType === 'MTD' && renderMonthView()}
        {viewType === 'WTD' && renderWeekView()}
        {viewType === 'Daily' && renderDayList()}
        {viewType === 'All' && renderAllView()}
      </div>

      {/* Info Modal — shown when clicking another user's occupied station */}
      {infoModal && (() => {
        const isITAdmin  = employee?.role === 'Admin';
        const isManager  = employee?.role === 'Manager' || employee?.role === 'Assistant Manager';
        const isOwner    = infoModal.requestedBy === employee?.employeeId;
        const isBlocked  = infoModal.status === 'blocked';
        const canCancel  = (isITAdmin || isManager) && !isBlocked; // master cancel
        const canBlock   = isITAdmin && !isBlocked && typeof infoModal.station === 'number';
        const canUnblock = isITAdmin && isBlocked;
        const canSelfCancel = isOwner && !isBlocked && !canCancel && !isReadOnly &&
          (infoModal.status === 'pending' || infoModal.status === 'confirmed');
        // Privacy: mask employee IDs for non-admin viewers
        const showFullId = isITAdmin || isManager;
        const displayId  = showFullId
          ? infoModal.requestedBy
          : `Emp •••${String(infoModal.requestedBy).slice(-3)}`;

        const handleInfoCancel = async () => {
          await cancelReservation(infoModal.id);
          setInfoModal(null);
        };
        const handleInfoBlock = async () => {
          await cancelReservation(infoModal.id);
          await blockStation(infoModal.office as 'Office #1' | 'Office #2', infoModal.station as number, infoModal.date);
          setInfoModal(null);
        };

        const statusColor: Record<string, string> = {
          pending:   'bg-amber-100 text-amber-700',
          confirmed: 'bg-green-100 text-green-700',
          blocked:   'bg-slate-100 text-slate-600',
          overridden:'bg-blue-100 text-blue-700',
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
              {/* Header */}
              <div className={cn(
                'p-5 flex justify-between items-start',
                isBlocked ? 'bg-slate-700' : 'bg-gradient-to-br from-slate-700 to-slate-900'
              )}>
                <div>
                  <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Station {String(infoModal.station).padStart(2, '0')} — {infoModal.office}</p>
                  <h2 className="text-white text-lg font-black uppercase tracking-tight mt-0.5">
                    {isBlocked ? 'Station Blocked' : isOwner ? 'My Reservation' : 'Reservation Details'}
                  </h2>
                </div>
                <button onClick={() => setInfoModal(null)} className="p-1.5 hover:bg-white/20 rounded-xl transition-all">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Details */}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</span>
                  <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded-full', statusColor[infoModal.status] ?? 'bg-slate-100 text-slate-600')}>
                    {infoModal.status}
                  </span>
                </div>
                {!isBlocked && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><UserIcon className="w-3 h-3" />Requested By</span>
                      <span className="text-xs font-semibold text-slate-700 text-right max-w-[55%] truncate">{displayId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Briefcase className="w-3 h-3" />LOB / Dept</span>
                      <span className="text-xs font-semibold text-slate-700">{infoModal.lobOrDepartment}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Calendar className="w-3 h-3" />Date</span>
                      <span className="text-xs font-semibold text-slate-700">{infoModal.date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Clock className="w-3 h-3" />Time</span>
                      <span className="text-xs font-semibold text-slate-700">{infoModal.start} – {infoModal.end}</span>
                    </div>
                    {infoModal.equipmentNeeds && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Wrench className="w-3 h-3" />Equipment</span>
                        <span className="text-xs font-semibold text-slate-700 text-right max-w-[55%]">{infoModal.equipmentNeeds}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="px-5 pb-5 flex flex-col gap-2">
                {canUnblock && (
                  <button onClick={handleInfoCancel}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors">
                    <Unlock className="w-3.5 h-3.5" /> Unblock Station
                  </button>
                )}
                {(isITAdmin || isManager) && !isBlocked && (infoModal.status === 'confirmed' || infoModal.status === 'pending') && (
                  <button onClick={() => { setInfoModal(null); setEditModal(infoModal); }}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors">
                    Edit / Override
                  </button>
                )}
                {canCancel && (
                  <button onClick={handleInfoCancel}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors">
                    Master Cancel
                  </button>
                )}
                {canSelfCancel && (
                  <button onClick={handleInfoCancel}
                    className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors">
                    Cancel My Reservation
                  </button>
                )}
                {canBlock && (
                  <button onClick={handleInfoBlock}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors">
                    <Lock className="w-3.5 h-3.5" /> Block this Station
                  </button>
                )}
                <button onClick={() => setInfoModal(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest rounded-xl transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Admin Edit/Override Modal */}
      {editModal && (
        <AdminEditModal reservation={editModal} onClose={() => setEditModal(null)} />
      )}

      {/* Booking Modal */}
      {isBookingModalOpen && activeBookingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 bg-gradient-to-br from-amber-500 to-red-600 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black tracking-tight uppercase">
                  {bulkBookingCells.length > 0 ? `Bulk Reservation — ${bulkBookingCells.length + 1} Stations` : 'Complete Reservation'}
                </h2>
                <p className="text-amber-100 text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">
                  {bulkBookingCells.length > 0
                    ? `Stations: ${[activeBookingCell, ...bulkBookingCells].map(c => c.station).join(', ')}`
                    : `Station ${activeBookingCell.station} — ${activeBookingCell.date}`}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsBookingModalOpen(false);
                  setActiveBookingCell(null);
                  setBulkBookingCells([]);
                  setSelectedCells([]);
                  toast.warning('Booking cancelled — no changes were saved.');
                }}
                className="p-2 hover:bg-white/20 rounded-xl transition-all"
                aria-label="Close without saving"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <ReservationForm
                selectedOffice={selectedOffice}
                setSelectedOffice={() => {}}
                selectedDate={activeBookingCell.date}
                setSelectedDate={setSelectedDate}
                initialStation={activeBookingCell.station}
                bulkCells={bulkBookingCells}
                onSuccess={handleBookingSuccess}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-3 h-3 rounded-full", color)} />
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  );
}
