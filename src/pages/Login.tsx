import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Hash, Key, Users, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useEmployee } from '../components/UserProvider';

type Tab = 'staff' | 'privileged';

export default function Login() {
  const [tab, setTab]           = useState<Tab>('staff');
  const [employeeId, setEmployeeId] = useState('');
  const [token, setToken]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login, loginWithId }  = useEmployee();
  const navigate                = useNavigate();

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId.trim()) return;
    setLoading(true);
    try {
      await loginWithId(employeeId);
      toast.success('Welcome! Access granted.');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Access denied. Please contact your IT/Admin.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrivilegedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId.trim() || !token.trim()) return;
    setLoading(true);
    try {
      await login(employeeId, token);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Please contact your IT/Admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-amber-500/10 overflow-hidden border border-white/50">

        {/* Header */}
        <div className="p-8 text-center bg-gradient-to-br from-amber-500 to-red-600 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
          </div>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md mb-4 shadow-xl border border-white/30">
            <Zap className="w-8 h-8 fill-current" />
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-1">SPARK</h1>
          <p className="text-amber-100 text-xs font-bold uppercase tracking-widest opacity-80">Station Planning & Reservation Kiosk</p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-black uppercase tracking-widest border border-white/30">v3.5</span>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => { setTab('staff'); setEmployeeId(''); setToken(''); }}
            className={cn(
              'flex-1 py-4 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all',
              tab === 'staff'
                ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/40'
                : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <Users className="w-4 h-4" /> Staff Access
          </button>
          <button
            onClick={() => { setTab('privileged'); setEmployeeId(''); setToken(''); }}
            className={cn(
              'flex-1 py-4 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all',
              tab === 'privileged'
                ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/40'
                : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <ShieldCheck className="w-4 h-4" /> Privileged Access
          </button>
        </div>

        {/* Staff Access Tab — EMP# only */}
        {tab === 'staff' && (
          <div className="p-8">
            <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest leading-relaxed">
                General access — enter your Employee Number to view availability and make reservations.
              </p>
            </div>
            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Employee Number (EMP#)</label>
                <div className="relative group">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none text-sm font-mono tracking-wider"
                    placeholder="e.g. 10042"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-slate-400 ml-1">Your EMP# is used for activity tracking and audit purposes.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all mt-2 disabled:opacity-60 disabled:scale-100"
              >
                {loading ? 'Verifying…' : 'Access App'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400 font-medium">
                By continuing, you agree to Global Virtuoso IT policies.
              </p>
              <p className="text-[10px] text-slate-300 mt-1">
                General accounts are provisioned by IT/Admin only.
              </p>
            </div>
          </div>
        )}

        {/* Privileged Access Tab — EMP# + Token */}
        {tab === 'privileged' && (
          <div className="p-8">
            <div className="mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest leading-relaxed">
                For Supervisors, Managers, and Admins. Requires a valid access token issued by IT.
              </p>
            </div>
            <form onSubmit={handlePrivilegedSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Employee Number</label>
                <div className="relative group">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm font-mono tracking-wider"
                    placeholder="e.g. 10042"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Access Token</label>
                <div className="relative group">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm font-mono tracking-widest uppercase"
                    placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                    value={token}
                    onChange={(e) => setToken(e.target.value.toUpperCase())}
                  />
                </div>
                <p className="text-[10px] text-slate-400 ml-1">Token issued by IT/Admin. Contact your administrator if you have not received one.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-br from-indigo-600 to-blue-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all mt-2 disabled:opacity-60 disabled:scale-100"
              >
                {loading ? 'Verifying…' : 'Sign In'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400 font-medium">
                By continuing, you agree to Global Virtuoso IT policies.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
