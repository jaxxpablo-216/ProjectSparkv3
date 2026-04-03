import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import DashboardStats from '../components/DashboardStats';
import StationGrid from '../components/StationGrid';
import HelpModal from '../components/HelpModal';
import RejectionModal from '../components/RejectionModal';
import { useEmployee } from '../components/UserProvider';
import { useReservations } from '../components/ReservationProvider';
import { cn } from '../lib/utils';
import { HelpCircle, CheckCircle2, AlertCircle, Check, X, Clock, Loader2, CalendarDays, MapPin, Zap } from 'lucide-react';
import { toast } from 'sonner';
import GeneralOverview from '../components/GeneralOverview';

export default function Dashboard() {
  const { searchQuery, viewMode } = useOutletContext<{ searchQuery: string, viewMode: 'User' | 'Admin' }>();
  const { employee } = useEmployee();
  const { reservations, updateReservationStatus } = useReservations();
  const [selectedOffice, setSelectedOffice] = useState<'Office #1' | 'Office #2'>('Office #1');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [timeFilter, setTimeFilter] = useState<'MTD' | 'WTD' | 'Daily' | 'All'>('Daily');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{ id: string } | null>(null);

  const isAdmin = employee?.role === 'Admin' || employee?.role === 'Manager' || employee?.role === 'Assistant Manager';

  const pendingAll = reservations.filter(r => r.status === 'pending' && r.type === 'booking');

  // My Bookings — current user's upcoming and recent reservations
  const today = new Date().toISOString().split('T')[0];
  const myBookings = reservations
    .filter(r => r.requestedBy === employee?.employeeId && r.type === 'booking')
    .sort((a, b) => a.date.localeCompare(b.date));
  const myUpcoming = myBookings.filter(r => r.date >= today && r.status !== 'cancelled' && r.status !== 'rejected');
  const myRecent   = myBookings.filter(r => r.date < today).slice(0, 5);

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

  return (
    <div className="space-y-8 pb-12">
      {/* General Dashboard — visible to all roles */}
      <GeneralOverview />

      {/* Header with Help Button */}
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Real-time station monitoring & management</p>
        </div>
        <button 
          onClick={() => setIsHelpOpen(true)}
          className="p-3 bg-amber-50 text-amber-600 rounded-2xl hover:bg-amber-100 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
        >
          <HelpCircle className="w-4 h-4" /> How to use
        </button>
      </div>

      {/* My Bookings — personalized view for all users */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white fill-current" />
          </div>
          <span className="font-black uppercase tracking-widest text-sm text-slate-900">My Bookings</span>
          <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-slate-400">
            {employee?.firstName} {employee?.lastName} · #{employee?.employeeId}
          </span>
        </div>
        <div className="p-6 space-y-6">
          {/* Upcoming */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" /> Upcoming ({myUpcoming.length})
            </p>
            {myUpcoming.length === 0 ? (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No upcoming reservations</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {myUpcoming.map(res => (
                  <div key={res.id} className="p-3 rounded-2xl border border-slate-100 bg-slate-50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                        Stn {String(res.station).padStart(2, '0')} · {res.office}
                      </span>
                      <span className={cn(
                        'text-[8px] font-black uppercase px-2 py-0.5 rounded-full',
                        res.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        res.status === 'pending'   ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-500'
                      )}>{res.status}</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{res.lobOrDepartment}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{res.date} · {res.start}–{res.end}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Recent (past) */}
          {myRecent.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Recent History</p>
              <div className="space-y-2">
                {myRecent.map(res => (
                  <div key={res.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-400 font-mono w-20 shrink-0">{res.date}</span>
                      <span className="text-[10px] font-bold text-slate-600 uppercase">{res.lobOrDepartment}</span>
                      <span className="text-[10px] text-slate-400">Stn {String(res.station).padStart(2, '0')}</span>
                    </div>
                    <span className={cn(
                      'text-[8px] font-black uppercase px-2 py-0.5 rounded-full',
                      res.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      res.status === 'rejected'  ? 'bg-red-100 text-red-600' :
                      res.status === 'cancelled' ? 'bg-slate-100 text-slate-400' :
                      'bg-slate-100 text-slate-500'
                    )}>{res.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Section */}
      {viewMode === 'Admin' && <DashboardStats timeFilter={timeFilter} setTimeFilter={setTimeFilter} />}

      {/* Pending Approvals — Admin only, visible when there are pending requests */}
      {viewMode === 'Admin' && pendingAll.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-orange-50">
            <Clock className="w-5 h-5 text-orange-500" />
            <span className="font-black uppercase tracking-widest text-sm text-slate-900">Pending Approvals</span>
            <span className="ml-1 min-w-[22px] h-5 px-1.5 rounded-full inline-flex items-center justify-center bg-orange-500 text-white text-[10px] font-black">
              {pendingAll.length}
            </span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingAll.map(res => {
              const loading = actionLoading === res.id;
              return (
                <div key={res.id} className="border border-slate-200 rounded-2xl p-4 hover:border-orange-300 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-black text-slate-900 text-sm uppercase tracking-tight">
                        Stn {String(res.station).padStart(2, '0')} — {res.office}
                      </p>
                      <p className="text-xs text-slate-600 font-semibold">{res.lobOrDepartment}</p>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-amber-100 text-amber-700 shrink-0">Pending</span>
                  </div>
                  <p className="text-xs text-slate-500">{res.requestedBy}</p>
                  <p className="text-xs text-slate-500">{res.date} · {res.start}–{res.end}</p>
                  {res.equipmentNeeds && (
                    <p className="text-xs text-amber-700 mt-1">🔧 {res.equipmentNeeds}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleApprove(res.id)}
                      disabled={!!loading}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded-xl flex items-center justify-center gap-1 disabled:opacity-50 transition-colors font-bold"
                    >
                      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3" /> Approve</>}
                    </button>
                    <button
                      onClick={() => setRejectionModal({ id: res.id })}
                      disabled={!!loading}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-2 rounded-xl flex items-center justify-center gap-1 disabled:opacity-50 transition-colors font-bold"
                    >
                      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <><X className="w-3 h-3" /> Reject</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Sidebar: Controls */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Office</label>
                <div className="grid grid-cols-1 gap-2">
                  {(['Office #1', 'Office #2'] as const).map((office) => (
                    <button
                      key={office}
                      onClick={() => setSelectedOffice(office)}
                      className={cn(
                        "w-full px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between",
                        selectedOffice === office 
                          ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                          : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      {office}
                      {selectedOffice === office && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Date</label>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none text-sm font-semibold"
                />
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest leading-relaxed">
                    Hold <span className="text-amber-900 font-black">CTRL</span> to select multiple stations across dates.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Space: Grid */}
          <div className="lg:col-span-9">
            <StationGrid 
              selectedOffice={selectedOffice} 
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              viewMode={viewMode}
              viewType={timeFilter}
              setViewType={setTimeFilter}
            />
          </div>
        </div>
      </div>

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        role={employee?.role || 'Supervisor'}
      />

      {rejectionModal && (
        <RejectionModal
          isOpen
          lobOrDepartment={reservations.find(r => r.id === rejectionModal.id)?.lobOrDepartment || ''}
          onClose={() => setRejectionModal(null)}
          onReject={handleRejectConfirm}
        />
      )}
    </div>
  );
}
