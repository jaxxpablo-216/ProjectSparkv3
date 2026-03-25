import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Hash, Key } from 'lucide-react';
import { toast } from 'sonner';
import { useEmployee } from '../components/UserProvider';

export default function Login() {
  const [employeeId, setEmployeeId] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useEmployee();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-amber-500/10 overflow-hidden border border-white/50 backdrop-blur-sm">
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
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-black uppercase tracking-widest border border-white/30">v3.0 Beta</span>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Employee Number</label>
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
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Access Token</label>
              <div className="relative group">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                <input
                  type="text"
                  required
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none text-sm font-mono tracking-widest uppercase"
                  placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                />
              </div>
              <p className="text-[10px] text-slate-400 ml-1">Token provided by IT/Admin. Contact your administrator if you have not received one.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-br from-amber-500 to-red-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 disabled:opacity-60 disabled:scale-100"
            >
              {loading ? 'Verifying...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">
              By continuing, you agree to Global Virtuoso IT policies.
            </p>
            <p className="text-[10px] text-slate-300 mt-1 font-medium">
              New users are registered by IT/Admin only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
