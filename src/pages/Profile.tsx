import { User, Hash, Shield, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useEmployee } from '../components/UserProvider';
import { format } from 'date-fns';
import { daysRemaining, tokenBadgeClass, isTokenValid } from '../lib/tokenUtils';

export default function Profile() {
  const { employee } = useEmployee();

  if (!employee) return null;

  const days = daysRemaining(employee.tokenExpiresAt);
  const badgeClass = tokenBadgeClass(employee.tokenExpiresAt);
  const valid = isTokenValid(employee.tokenExpiresAt);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="h-32 bg-gradient-to-br from-amber-500 to-red-600 relative">
          <div className="absolute -bottom-12 left-8 p-1 bg-white rounded-3xl shadow-xl">
            <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <User className="w-12 h-12" />
            </div>
          </div>
        </div>

        <div className="pt-16 pb-8 px-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">{employee.firstName} {employee.lastName}</h2>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Hash className="w-4 h-4" />
                <span className="text-sm font-semibold font-mono">#{employee.employeeId}</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-600">
                <Shield className="w-4 h-4" />
                <span className={cn(
                  'text-xs font-black uppercase tracking-widest',
                  employee.role === 'Admin' ? 'text-red-600' :
                  employee.role === 'Manager' ? 'text-purple-600' :
                  employee.role === 'Assistant Manager' ? 'text-blue-600' :
                  'text-amber-600'
                )}>{employee.role}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Member since {format(new Date(employee.createdAt), 'MMMM yyyy')}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black tracking-tight uppercase text-slate-900">Access Token</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Token Status</span>
              {valid ? (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-widest rounded-full">Active</span>
              ) : (
                <span className="px-3 py-1 bg-red-100 text-red-600 text-[9px] font-black uppercase tracking-widest rounded-full">Expired / Not Issued</span>
              )}
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Days Remaining</span>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${badgeClass}`}>
                {days !== null ? `${days} day${days !== 1 ? 's' : ''}` : '—'}
              </span>
            </div>
            {employee.tokenExpiresAt && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Expires On</span>
                <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">
                  {format(new Date(employee.tokenExpiresAt), 'MMM dd, yyyy')}
                </span>
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              Contact your IT/Admin to renew your access token before it expires.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black tracking-tight uppercase text-slate-900">Account Status</h3>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Account Active</span>
              <span className={cn(
                'px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full',
                employee.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              )}>{employee.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Role</span>
              <span className={cn(
                'px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full',
                employee.role === 'Admin' ? 'bg-red-50 text-red-600' :
                employee.role === 'Manager' ? 'bg-purple-50 text-purple-600' :
                employee.role === 'Assistant Manager' ? 'bg-blue-50 text-blue-600' :
                'bg-amber-50 text-amber-600'
              )}>{employee.role}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Employee #</span>
              <span className="text-[10px] font-black text-slate-900 font-mono tracking-widest">#{employee.employeeId}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
