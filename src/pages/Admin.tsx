import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Check, X, Trash2, Download, Lock, Clock, Building2, Loader2, Activity, CheckCircle, XCircle, Ban, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useReservations } from '../components/ReservationProvider';
import { useEmployee } from '../components/UserProvider';
import ReservationForm from '../components/ReservationForm';
import CalendarView from '../components/CalendarView';
import RejectionModal from '../components/RejectionModal';
import BlockModal from '../components/BlockModal';
import UserManagement from '../components/UserManagement';

export default function Admin() {
  const { searchQuery } = useOutletContext<{ searchQuery: string }>();
  const { reservations, updateReservationStatus, cancelReservation, blockStation } = useReservations();
  const { employee } = useEmployee();

  const [activeTab,      setActiveTab]      = useState<'Dashboard' | 'Office #1' | 'Office #2' | 'Activity Log' | 'Users'>('Dashboard');
  const [selectedOffice, setSelectedOffice] = useState<'Office #1' | 'Office #2'>('Office #1');
  const [selectedDate,   setSelectedDate]   = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode,       setViewMode]       = useState<'Month' | 'Week' | 'Day'>('Month');
  const [rejectionModal, setRejectionModal] = useState<{ id: string } | null>(null);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [actionLoading,  setActionLoading]  = useState<string | null>(null);

  // ── Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const bookings = reservations.filter(r => r.type === 'booking');
    const o1 = reservations.filter(r => r.office === 'Office #1');
    const o2 = reservations.filter(r => r.office === 'Office #2');
    return {
      total:     bookings.length,
      pending:   bookings.filter(r => r.status === 'pending').length,
      confirmed: bookings.filter(r => r.status === 'confirmed').length,
      office1: {
        pending:   o1.filter(r => r.status === 'pending'   && r.type === 'booking').length,
        confirmed: o1.filter(r => r.status === 'confirmed' && r.type === 'booking').length,
        rejected:  o1.filter(r => r.status === 'rejected'  && r.type === 'booking').length,
      },
      office2: {
        pending:   o2.filter(r => r.status === 'pending'   && r.type === 'booking').length,
        confirmed: o2.filter(r => r.status === 'confirmed' && r.type === 'booking').length,
        rejected:  o2.filter(r => r.status === 'rejected'  && r.type === 'booking').length,
      },
    };
  }, [reservations]);

  // ── Action handlers ────────────────────────────────────────────────────
  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await updateReservationStatus(id, 'confirmed', undefined, employee?.employeeId || undefined);
    } catch {
      toast.error('Failed to approve reservation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = (id: string) => {
    setRejectionModal({ id });
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectionModal) return;
    const id = rejectionModal.id;
    setRejectionModal(null);
    setActionLoading(id);
    try {
      await updateReservationStatus(id, 'rejected', reason, employee?.employeeId || undefined);
    } catch {
      toast.error('Failed to reject reservation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this reservation? This cannot be undone.')) return;
    setActionLoading(id);
    try {
      await cancelReservation(id);
    } catch {
      toast.error('Failed to cancel reservation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Office', 'LOB/Department', 'Station', 'Date', 'Start', 'End', 'Status', 'Type', 'Equipment'];
    const rows = reservations.map(r => [
      r.id, r.office, r.lobOrDepartment, r.station,
      r.date, r.start, r.end, r.status, r.type, r.equipmentNeeds || 'None',
    ]);
    const csv  = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `spark_reservations_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV exported');
  };

  // ── Status badge ───────────────────────────────────────────────────────
  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, string> = {
      pending:   'bg-orange-100 text-orange-700',
      confirmed: 'bg-green-100 text-green-700',
      rejected:  'bg-red-100 text-red-700',
      blocked:   'bg-slate-100 text-slate-600',
      cancelled: 'bg-slate-100 text-slate-500',
    };
    const labels: Record<string, string> = {
      pending: 'Pending', confirmed: 'Approved', rejected: 'Rejected',
      blocked: 'Blocked', cancelled: 'Cancelled',
    };
    return (
      <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold', map[status] ?? 'bg-slate-100 text-slate-500')}>
        {labels[status] ?? status}
      </span>
    );
  };

  // ── Approval tab (2-column) ────────────────────────────────────────────
  const renderApprovals = (office: 'Office #1' | 'Office #2') => {
    const isBlue   = office === 'Office #1';
    const accent   = isBlue ? { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' }
                             : { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' };
    const pending  = reservations.filter(r => r.office === office && r.status === 'pending' && r.type === 'booking');
    const allForOffice = reservations
      .filter(r => r.office === office && r.type === 'booking' && r.status !== 'cancelled')
      .slice(0, 30);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Pending Approvals ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className={cn('px-5 py-3 border-b flex items-center gap-2', accent.bg, accent.border)}>
            <Clock className={cn('w-5 h-5', accent.text)} />
            <span className="font-semibold text-slate-900 text-sm">{office} — Pending Approvals</span>
            <span className={cn('ml-auto text-sm font-bold', pending.length > 0 ? 'text-orange-600' : 'text-gray-400')}>
              {pending.length > 0
                ? <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-[11px] font-bold">{pending.length}</span>
                : <span className="text-xs opacity-60">(0)</span>
              }
            </span>
          </div>

          <div className="p-5 space-y-3 max-h-[600px] overflow-y-auto">
            {pending.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">No pending reservations for {office}</p>
            ) : (
              pending.map(res => {
                const loading = actionLoading === res.id;
                return (
                  <div key={res.id} className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors">
                    <p className="font-medium text-gray-900">
                      Stn {String(res.station).padStart(2, '0')}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{res.lobOrDepartment}</p>
                    <p className="text-sm text-gray-600">By: {res.requestedBy}</p>
                    <p className="text-sm text-gray-600">{res.date} &bull; {res.start} &ndash; {res.end}</p>

                    {res.equipmentNeeds && (
                      <div className="mt-1.5 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                        <p className="text-xs text-amber-800">Equipment: {res.equipmentNeeds}</p>
                      </div>
                    )}
                    {res.supervisorEmail && (
                      <p className="text-xs text-gray-400 mt-1">Supervisor: {res.supervisorEmail}</p>
                    )}

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleApprove(res.id)}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded-lg flex items-center justify-center gap-1 disabled:opacity-50 transition-colors"
                      >
                        {loading
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <><Check className="w-4 h-4" /> Approve</>
                        }
                      </button>
                      <button
                        onClick={() => handleReject(res.id)}
                        disabled={loading}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2 rounded-lg flex items-center justify-center gap-1 disabled:opacity-50 transition-colors"
                      >
                        {loading
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <><X className="w-4 h-4" /> Reject</>
                        }
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: All Reservations ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className={cn('px-5 py-3 border-b flex items-center gap-2', accent.bg, accent.border)}>
            <Building2 className={cn('w-5 h-5', accent.text)} />
            <span className="font-semibold text-slate-900 text-sm">{office} — All Reservations</span>
          </div>

          <div className="p-5 space-y-2 max-h-[600px] overflow-y-auto">
            {allForOffice.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">No reservations for {office}</p>
            ) : (
              allForOffice.map(res => (
                <div key={res.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        Stn {String(res.station).padStart(2, '0')}
                        <span className="ml-2 text-xs text-gray-500 font-normal">{res.lobOrDepartment}</span>
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">{res.date} &bull; {res.start} &ndash; {res.end}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">{res.requestedBy}</p>
                      {res.equipmentNeeds && (
                        <p className="text-[10px] text-amber-700 mt-0.5">🔧 {res.equipmentNeeds}</p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={res.status} />
                      {res.status === 'confirmed' && (
                        <button
                          onClick={() => handleCancel(res.id)}
                          disabled={actionLoading === res.id}
                          title="Cancel reservation"
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        >
                          {actionLoading === res.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      )}
                    </div>
                  </div>

                  {res.status === 'rejected' && res.rejectionReason && (
                    <div className="mt-1.5 bg-red-50 border border-red-100 rounded px-2 py-1">
                      <p className="text-[10px] text-red-700">Reason: {res.rejectionReason}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Activity Log (IT Admin only) ──────────────────────────────────────
  const renderActivityLog = () => {
    const actionConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
      confirmed:  { label: 'Approved',          icon: <CheckCircle  className="w-4 h-4" />, color: 'text-green-600',  bg: 'bg-green-50  border-green-200'  },
      rejected:   { label: 'Rejected',           icon: <XCircle      className="w-4 h-4" />, color: 'text-red-600',    bg: 'bg-red-50    border-red-200'    },
      cancelled:  { label: 'Cancelled',          icon: <Ban          className="w-4 h-4" />, color: 'text-slate-500',  bg: 'bg-slate-50  border-slate-200'  },
      pending:    { label: 'Submitted',          icon: <Clock        className="w-4 h-4" />, color: 'text-amber-600',  bg: 'bg-amber-50  border-amber-200'  },
      blocked:    { label: 'Station Blocked',    icon: <Lock         className="w-4 h-4" />, color: 'text-slate-600',  bg: 'bg-slate-100 border-slate-300'  },
      overridden: { label: 'Override Applied',   icon: <ShieldOff    className="w-4 h-4" />, color: 'text-blue-600',   bg: 'bg-blue-50   border-blue-200'   },
    };

    const getTimestamp = (r: typeof reservations[0]): string => {
      if (r.status === 'cancelled'  && r.cancelledAt)  return r.cancelledAt;
      if (r.status === 'confirmed'  && r.approvedAt)   return r.approvedAt;
      if (r.status === 'rejected'   && r.approvedAt)   return r.approvedAt;
      return r.createdAt;
    };

    const getActor = (r: typeof reservations[0]): string | null => {
      if (r.status === 'cancelled')  return r.cancelledBy || null;
      if (r.status === 'confirmed' || r.status === 'rejected') return r.approvedBy || null;
      return null;
    };

    const sorted = [...reservations].sort((a, b) =>
      getTimestamp(b).localeCompare(getTimestamp(a))
    );

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-slate-50">
          <Activity className="w-5 h-5 text-slate-500" />
          <span className="font-semibold text-slate-900">Activity Log</span>
          <span className="ml-auto text-xs text-slate-400 font-semibold">{sorted.length} entries</span>
        </div>

        <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
          {sorted.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No activity recorded yet.</p>
          ) : (
            sorted.map(r => {
              const cfg   = actionConfig[r.status] ?? actionConfig['pending'];
              const ts    = getTimestamp(r);
              const actor = getActor(r);
              const date  = new Date(ts);
              const dateStr  = format(date, 'MMM dd, yyyy');
              const timeStr  = format(date, 'HH:mm');

              return (
                <div key={r.id} className={cn('flex items-start gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors')}>
                  {/* Icon */}
                  <div className={cn('mt-0.5 w-8 h-8 rounded-full border flex items-center justify-center shrink-0', cfg.bg, cfg.color)}>
                    {cfg.icon}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-xs font-black uppercase tracking-widest', cfg.color)}>{cfg.label}</span>
                      <span className="text-xs font-semibold text-slate-700">
                        Stn {String(r.station).padStart(2, '0')} — {r.office}
                      </span>
                      {r.type !== 'block' && (
                        <span className="text-xs text-slate-500">{r.lobOrDepartment}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {r.date} · {r.start}–{r.end}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Requested by: <span className="font-semibold">{r.requestedBy}</span>
                      {actor && <> · Actioned by: <span className="font-semibold">{actor}</span></>}
                    </p>
                    {r.status === 'rejected' && r.rejectionReason && (
                      <p className="text-[11px] text-red-600 mt-0.5 italic">Reason: {r.rejectionReason}</p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-semibold text-slate-500">{dateStr}</p>
                    <p className="text-[11px] text-slate-400">{timeStr}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // ── Dashboard stats panel ──────────────────────────────────────────────
  const renderStats = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Requests',    value: stats.total,     color: 'bg-slate-50 text-slate-900 border-slate-100' },
          { label: 'Pending Approvals', value: stats.pending,   color: 'bg-amber-50 text-amber-600 border-amber-100' },
          { label: 'Confirmed Bookings',value: stats.confirmed, color: 'bg-green-50 text-green-600 border-green-100' },
        ].map((s, i) => (
          <div key={i} className={cn('p-6 rounded-3xl border-2 shadow-sm', s.color)}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{s.label}</p>
            <h3 className="text-4xl font-black tracking-tight">{s.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { name: 'Office #1', s: stats.office1, color: 'blue' },
          { name: 'Office #2', s: stats.office2, color: 'purple' },
        ].map((o, i) => (
          <div key={i} className={cn('p-6 rounded-3xl border-2 shadow-sm bg-white',
            o.color === 'blue' ? 'border-blue-100' : 'border-purple-100')}>
            <h3 className={cn('text-lg font-black uppercase tracking-tight mb-4',
              o.color === 'blue' ? 'text-blue-600' : 'text-purple-600')}>{o.name}</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Pending',   value: o.s.pending },
                { label: 'Confirmed', value: o.s.confirmed },
                { label: 'Rejected',  value: o.s.rejected },
              ].map((s, j) => (
                <div key={j} className="text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
                  <p className="text-xl font-black text-slate-900">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={() => setBlockModalOpen(true)}
          className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
          <Lock className="w-4 h-4" /> Block Station
        </button>
        <button onClick={handleExportCSV}
          className="flex-1 py-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:border-slate-200 transition-all">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>
    </div>
  );

  // ── Tab pending badge ──────────────────────────────────────────────────
  const PendingBadge = ({ count, color }: { count: number; color: string }) =>
    count > 0 ? (
      <span className={cn('min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[8px] font-black text-white', color)}>
        {count}
      </span>
    ) : (
      <span className="text-xs opacity-60">({count})</span>
    );

  // ── Main render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* Tab bar */}
      <div className="flex p-1 bg-slate-200 rounded-2xl max-w-2xl">
        {[
          { id: 'Dashboard', label: 'Dashboard & Book', activeColor: 'text-amber-600' },
          { id: 'Office #1', label: 'Office #1 Approvals', activeColor: 'text-blue-600', count: stats.office1.pending, badgeColor: 'bg-blue-500' },
          { id: 'Office #2', label: 'Office #2 Approvals', activeColor: 'text-purple-600', count: stats.office2.pending, badgeColor: 'bg-purple-500' },
          ...(employee?.role === 'Admin' ? [{ id: 'Activity Log', label: 'Activity Log', activeColor: 'text-slate-700' }] : []),
          ...(employee?.role === 'Admin' ? [{ id: 'Users', label: 'Users', activeColor: 'text-emerald-600' }] : []),
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex-1 py-3 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2',
              activeTab === tab.id ? 'bg-white shadow-sm ' + tab.activeColor : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <PendingBadge count={tab.count} color={tab.badgeColor!} />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Dashboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 space-y-6">
            {renderStats()}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="p-6 bg-gradient-to-br from-amber-500 to-red-600 text-white">
                <h2 className="text-xl font-black tracking-tight uppercase">Quick Book</h2>
                <p className="text-amber-100 text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">Admin Auto-Approval Enabled</p>
              </div>
              <div className="p-6">
                <ReservationForm
                  selectedOffice={selectedOffice}
                  setSelectedOffice={setSelectedOffice}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-black tracking-tight uppercase text-slate-900">Global Calendar</h2>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                    Viewing {selectedOffice} — {selectedDate}
                  </p>
                </div>
                <div className="flex p-1 bg-slate-200 rounded-2xl">
                  {(['Month', 'Week', 'Day'] as const).map(mode => (
                    <button key={mode} onClick={() => setViewMode(mode)}
                      className={cn('px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all',
                        viewMode === mode ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6">
                <CalendarView viewMode={viewMode} selectedOffice={selectedOffice} selectedDate={selectedDate} searchQuery={searchQuery} />
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'Activity Log' ? (
        renderActivityLog()
      ) : activeTab === 'Users' ? (
        <UserManagement />
      ) : (
        renderApprovals(activeTab as 'Office #1' | 'Office #2')
      )}

      {/* Pending approvals summary always visible on Dashboard tab */}
      {activeTab === 'Dashboard' && (stats.office1.pending > 0 || stats.office2.pending > 0) && (
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            Pending Approvals
            <span className="ml-1 min-w-[20px] h-5 px-1.5 rounded-full inline-flex items-center justify-center bg-orange-500 text-white text-[10px] font-black">
              {stats.office1.pending + stats.office2.pending}
            </span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(['Office #1', 'Office #2'] as const).map(office => {
              const pending = reservations.filter(r => r.office === office && r.status === 'pending' && r.type === 'booking');
              if (pending.length === 0) return null;
              const accent = office === 'Office #1'
                ? { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' }
                : { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' };
              return (
                <div key={office} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className={cn('px-5 py-3 border-b flex items-center gap-2', accent.bg, accent.border)}>
                    <Clock className={cn('w-4 h-4', accent.text)} />
                    <span className="font-semibold text-slate-900 text-sm">{office} — Pending</span>
                    <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-[11px] font-bold">{pending.length}</span>
                  </div>
                  <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                    {pending.map(res => {
                      const loading = actionLoading === res.id;
                      return (
                        <div key={res.id} className="border border-gray-200 rounded-lg p-3 hover:border-orange-300 transition-colors">
                          <p className="font-medium text-gray-900 text-sm">Stn {String(res.station).padStart(2, '0')} — {res.lobOrDepartment}</p>
                          <p className="text-xs text-gray-500">{res.requestedBy}</p>
                          <p className="text-xs text-gray-500">{res.date} · {res.start}–{res.end}</p>
                          {res.equipmentNeeds && (
                            <p className="text-xs text-amber-700 mt-1">🔧 {res.equipmentNeeds}</p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleApprove(res.id)}
                              disabled={loading}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-1.5 rounded-lg flex items-center justify-center gap-1 disabled:opacity-50 transition-colors"
                            >
                              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3" /> Approve</>}
                            </button>
                            <button
                              onClick={() => handleReject(res.id)}
                              disabled={loading}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 rounded-lg flex items-center justify-center gap-1 disabled:opacity-50 transition-colors"
                            >
                              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <><X className="w-3 h-3" /> Reject</>}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modals (always rendered so they work from any tab) ── */}
      {rejectionModal && (
        <RejectionModal
          isOpen
          lobOrDepartment={reservations.find(r => r.id === rejectionModal.id)?.lobOrDepartment || ''}
          onClose={() => setRejectionModal(null)}
          onReject={handleRejectConfirm}
        />
      )}

      {blockModalOpen && (
        <BlockModal
          isOpen
          onClose={() => setBlockModalOpen(false)}
          onBlock={async (office, station, date) => {
            try {
              await blockStation(office, station, date);
              setBlockModalOpen(false);
            } catch {
              toast.error('Failed to block station');
            }
          }}
        />
      )}
    </div>
  );
}
