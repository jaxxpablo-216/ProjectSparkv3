import { Outlet, useNavigate, Link } from 'react-router-dom';
import { Zap, LogOut, User, Search as SearchIcon, Shield, X, GripHorizontal, AlertTriangle, Info, Megaphone } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '../lib/utils';
import { useEmployee } from './UserProvider';
import { useReservations } from './ReservationProvider';
import { countdownLabel, tokenBadgeClass } from '../lib/tokenUtils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { CriticalNotice } from '../types';

// ── Draggable Search Results Popup ───────────────────────────────────────────

interface SearchResult {
  id: string;
  office: string;
  station: string | number;
  date: string;
  start: string;
  end: string;
  lobOrDepartment: string;
  requestedBy: string;
  status: string;
}

function SearchPopup({
  query,
  results,
  onClose,
}: {
  query: string;
  results: SearchResult[];
  onClose: () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; originX: number; originY: number }>({
    dragging: false, startX: 0, startY: 0, originX: 0, originY: 0,
  });
  const [pos, setPos] = useState({ x: window.innerWidth / 2 - 280, y: 80 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragState.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
    };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragState.current.dragging) return;
      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;
      setPos({ x: dragState.current.originX + dx, y: dragState.current.originY + dy });
    };
    const onUp = () => { dragState.current.dragging = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const statusColor: Record<string, string> = {
    pending:   'bg-amber-100 text-amber-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    rejected:  'bg-rose-100 text-rose-700',
    blocked:   'bg-slate-100 text-slate-600',
    cancelled: 'bg-slate-100 text-slate-400',
  };

  return (
    <div
      ref={popupRef}
      className="fixed z-[9999] w-[560px] max-w-[95vw] bg-white rounded-3xl shadow-2xl shadow-slate-900/20 border border-slate-100 overflow-hidden"
      style={{ left: pos.x, top: pos.y, userSelect: 'none' }}
    >
      {/* Drag handle header */}
      <div
        onMouseDown={onMouseDown}
        className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-amber-500 to-red-600 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2 text-white">
          <GripHorizontal className="w-4 h-4 opacity-60" />
          <SearchIcon className="w-4 h-4" />
          <span className="text-sm font-black uppercase tracking-widest">Search Results</span>
          <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
            {results.length} match{results.length !== 1 ? 'es' : ''}
          </span>
        </div>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onClose}
          className="p-1 rounded-xl hover:bg-white/20 transition-colors text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Query tag */}
      <div className="px-5 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Keyword:</span>
        <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold rounded-full">{query}</span>
      </div>

      {/* Results */}
      <div className="max-h-[60vh] overflow-y-auto">
        {results.length === 0 ? (
          <div className="py-12 text-center">
            <SearchIcon className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-300">No matches found</p>
            <p className="text-xs text-slate-400 mt-1">Try searching by LOB, station number, date, or employee ID</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-slate-100">
              <tr>
                {['Date', 'Office', 'Station', 'LOB / Dept', 'Requested By', 'Time', 'Status'].map(h => (
                  <th key={h} className="px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-400 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {results.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-3 py-2.5 font-mono font-bold text-slate-700 whitespace-nowrap">{r.date}</td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{r.office}</td>
                  <td className="px-3 py-2.5 font-black text-slate-800 whitespace-nowrap">
                    {typeof r.station === 'number' ? String(r.station).padStart(2, '0') : r.station}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-slate-800 max-w-[120px] truncate">{r.lobOrDepartment}</td>
                  <td className="px-3 py-2.5 text-slate-500 font-mono">{r.requestedBy}</td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{r.start}–{r.end}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn('text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full', statusColor[r.status] ?? 'bg-slate-100 text-slate-500')}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <p className="text-[10px] text-slate-400 font-medium">Drag header to reposition · Click × to close</p>
        <button onClick={onClose} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors">
          Close
        </button>
      </div>
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function Layout() {
  const navigate = useNavigate();
  const { employee, logout } = useEmployee();
  const { reservations } = useReservations();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeQuery, setActiveQuery] = useState('');
  const [viewMode, setViewMode] = useState<'User' | 'Admin'>('User');
  const [, setTick] = useState(0); // forces re-render for live countdown
  const defaultSet = useRef(false);
  const [notice, setNotice] = useState<CriticalNotice | null>(null);

  // Real-time listener for Critical Notice
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.criticalNotice?.active) {
          setNotice(data.criticalNotice as CriticalNotice);
        } else {
          setNotice(null);
        }
      }
    });
    return () => unsub();
  }, []);

  // Re-render every minute so the countdown stays live
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const isAdmin = employee?.role === 'Admin' || employee?.role === 'Manager' || employee?.role === 'Assistant Manager';

  useEffect(() => {
    if (!defaultSet.current && employee) {
      defaultSet.current = true;
      if (employee.role === 'Admin' || employee.role === 'Manager' || employee.role === 'Assistant Manager') {
        setViewMode('Admin');
      }
    }
  }, [employee]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) { toast.error('Enter a keyword to search.'); return; }
    setActiveQuery(q);
    setSearchOpen(true);
  };

  const searchResults: SearchResult[] = searchOpen
    ? reservations.filter(r => {
        const q = activeQuery.toLowerCase();
        return (
          r.lobOrDepartment?.toLowerCase().includes(q) ||
          r.requestedBy?.toLowerCase().includes(q) ||
          String(r.station).toLowerCase().includes(q) ||
          r.date?.includes(q) ||
          r.office?.toLowerCase().includes(q) ||
          r.status?.toLowerCase().includes(q)
        );
      })
    : [];

  if (!employee) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">SPARK</h1>
              <p className="text-[9px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">v3.5 · Station Planning & Reservation Kiosk</p>
            </div>
          </Link>

          {/* Search bar */}
          <div className="flex-1 max-w-md mx-8">
            <div className="flex items-center bg-slate-100 rounded-full border-2 border-transparent focus-within:bg-white focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-500/10 transition-all">
              <SearchIcon className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                placeholder="Search LOB, station, date, employee…"
                className="flex-1 px-3 py-2 bg-transparent text-sm outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              {searchQuery.trim() && (
                <button
                  onClick={handleSearch}
                  className="mr-1 px-3 py-1 bg-gradient-to-br from-amber-500 to-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:opacity-90 transition-all"
                >
                  Search
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <div className="hidden md:flex items-center gap-2 mr-4">
                <button
                  onClick={() => setViewMode('User')}
                  className={cn(
                    "px-4 py-1 border border-red-500 text-sm font-medium transition-all",
                    viewMode === 'User' ? "bg-red-50 text-red-600" : "bg-white text-red-400 opacity-60"
                  )}
                >
                  User
                </button>
                <button
                  onClick={() => setViewMode('Admin')}
                  className={cn(
                    "px-4 py-1 border border-red-500 text-sm font-medium transition-all",
                    viewMode === 'Admin' ? "bg-red-50 text-red-600" : "bg-white text-red-400 opacity-60"
                  )}
                >
                  Admin
                </button>
              </div>
            )}
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-semibold text-slate-900">{employee.firstName} {employee.lastName}</span>
              <span className="text-[10px] text-slate-400">#{employee.employeeId}</span>
              {employee.tokenExpiresAt && (
                <span className={cn('uppercase tracking-widest', tokenBadgeClass(employee.tokenExpiresAt))}>
                  TOKEN {countdownLabel(employee.tokenExpiresAt)}
                </span>
              )}
              <span className={cn(
                'text-[9px] font-black uppercase tracking-widest',
                employee.role === 'Admin'             ? 'text-red-600' :
                employee.role === 'Manager'           ? 'text-purple-600' :
                employee.role === 'Assistant Manager' ? 'text-blue-600' :
                employee.role === 'User'              ? 'text-teal-600' :
                                                        'text-amber-600'
              )}>
                {employee.role}
              </span>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full">
              {(employee.role === 'Admin' || employee.role === 'Manager' || employee.role === 'Assistant Manager') && (
                <Link
                  to="/admin"
                  className={cn(
                    "p-2 rounded-full transition-all hover:bg-white hover:shadow-sm text-slate-600 hover:text-amber-600",
                    window.location.pathname === '/admin' && "bg-white text-amber-600 shadow-sm"
                  )}
                  title="Admin Panel"
                >
                  <Shield className="w-5 h-5" />
                </Link>
              )}
              <Link
                to="/profile"
                className={cn(
                  "p-2 rounded-full transition-all hover:bg-white hover:shadow-sm text-slate-600 hover:text-amber-600",
                  window.location.pathname === '/profile' && "bg-white text-amber-600 shadow-sm"
                )}
                title="Profile"
              >
                <User className="w-5 h-5" />
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 rounded-full transition-all hover:bg-white hover:shadow-sm text-slate-600 hover:text-red-600"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Critical Notice Banner */}
      {notice && (
        <div className={cn(
          'w-full px-4 py-3 flex items-center gap-3',
          notice.type === 'critical' ? 'bg-red-600 text-white' :
          notice.type === 'warning'  ? 'bg-amber-500 text-white' :
                                       'bg-blue-600 text-white'
        )}>
          <div className="max-w-7xl mx-auto w-full flex items-center gap-3">
            {notice.type === 'critical' ? <AlertTriangle className="w-4 h-4 shrink-0" /> :
             notice.type === 'warning'  ? <Megaphone className="w-4 h-4 shrink-0" /> :
                                          <Info className="w-4 h-4 shrink-0" />}
            <p className="text-sm font-bold flex-1">{notice.message}</p>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70 shrink-0">
              {notice.type === 'critical' ? 'Critical Notice' : notice.type === 'warning' ? 'System Notice' : 'Info'}
            </span>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6">
        <Outlet context={{ searchQuery, viewMode }} />
      </main>

      {/* Draggable search results popup */}
      {searchOpen && (
        <SearchPopup
          query={activeQuery}
          results={searchResults}
          onClose={() => { setSearchOpen(false); setSearchQuery(''); }}
        />
      )}
    </div>
  );
}
