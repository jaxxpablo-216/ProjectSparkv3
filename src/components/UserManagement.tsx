import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, onSnapshot, addDoc, updateDoc, doc, Timestamp, query, orderBy
} from 'firebase/firestore';
import { generateToken, daysRemaining, countdownLabel, tokenBadgeClass, isTokenValid } from '../lib/tokenUtils';
import { useEmployee } from './UserProvider';
import { toast } from 'sonner';
import { UserPlus, RefreshCw, Copy, Check, X, UserX } from 'lucide-react';
import type { Employee, EmployeeRole } from '../types';

const ROLES: EmployeeRole[] = ['Supervisor', 'Assistant Manager', 'Manager', 'Admin'];

export default function UserManagement() {
  const { employee: currentUser } = useEmployee();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [tokenModal, setTokenModal] = useState<{ employee: Employee; token: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [issuing, setIssuing] = useState<string | null>(null); // employeeId being issued
  const [deactivating, setDeactivating] = useState<string | null>(null);

  // Add form state
  const [form, setForm] = useState({ employeeId: '', firstName: '', lastName: '', role: 'Supervisor' as EmployeeRole });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() } as Employee)));
    });
    return () => unsub();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId.trim() || !form.firstName.trim() || !form.lastName.trim()) return;
    // Check duplicate
    if (employees.find(e => e.employeeId === form.employeeId.trim())) {
      toast.error('Employee ID already exists.');
      return;
    }
    setAdding(true);
    try {
      await addDoc(collection(db, 'employees'), {
        employeeId: form.employeeId.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role: form.role,
        isActive: true,
        deactivationTagged: false,
        deactivationTaggedBy: null,
        token: null,
        tokenIssuedAt: null,
        tokenExpiresAt: null,
        tokenIssuedBy: null,
        createdAt: Timestamp.now().toDate().toISOString(),
        createdBy: currentUser?.employeeId || 'admin',
      });
      toast.success(`${form.firstName} ${form.lastName} added.`);
      setForm({ employeeId: '', firstName: '', lastName: '', role: 'Supervisor' });
      setShowAddModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add user.');
    } finally {
      setAdding(false);
    }
  };

  const handleIssueToken = async (emp: Employee) => {
    setIssuing(emp.id);
    try {
      const newToken = generateToken();
      const now = new Date();
      const expires = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // +90 days
      await updateDoc(doc(db, 'employees', emp.id), {
        token: newToken,
        tokenIssuedAt: now.toISOString(),
        tokenExpiresAt: expires.toISOString(),
        tokenIssuedBy: currentUser?.employeeId || 'admin',
      });
      const updated = { ...emp, token: newToken, tokenIssuedAt: now.toISOString(), tokenExpiresAt: expires.toISOString() };
      setTokenModal({ employee: updated, token: newToken });
      toast.success('New token issued.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to issue token.');
    } finally {
      setIssuing(null);
    }
  };

  const handleCopyToken = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTagDeactivation = async (emp: Employee) => {
    if (!confirm(`Tag ${emp.firstName} ${emp.lastName} for deactivation? This flags them for Admin review.`)) return;
    setDeactivating(emp.id);
    try {
      await updateDoc(doc(db, 'employees', emp.id), {
        deactivationTagged: true,
        deactivationTaggedBy: currentUser?.employeeId || 'manager',
      });
      toast.success(`${emp.firstName} tagged for deactivation.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to tag user.');
    } finally {
      setDeactivating(null);
    }
  };

  const handleConfirmDeactivation = async (emp: Employee) => {
    if (!confirm(`Deactivate ${emp.firstName} ${emp.lastName}? Their history will be preserved.`)) return;
    try {
      await updateDoc(doc(db, 'employees', emp.id), { isActive: false });
      toast.success(`${emp.firstName} deactivated.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to deactivate.');
    }
  };

  const handleReactivate = async (emp: Employee) => {
    try {
      await updateDoc(doc(db, 'employees', emp.id), {
        isActive: true,
        deactivationTagged: false,
        deactivationTaggedBy: null,
      });
      toast.success(`${emp.firstName} reactivated.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reactivate.');
    }
  };

  const isAdmin = currentUser?.role === 'Admin';
  const isManager = currentUser?.role === 'Manager' || isAdmin;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">User Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">{employees.filter(e => e.isActive).length} active · {employees.filter(e => !e.isActive).length} inactive</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-amber-500 to-red-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-amber-500/20 hover:scale-105 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add User
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Emp #</th>
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Name</th>
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Role</th>
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
                {isAdmin && <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Current Token</th>}
                {isAdmin && <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {employees.map((emp) => {
                const days = daysRemaining(emp.tokenExpiresAt);
                const badgeClass = tokenBadgeClass(emp.tokenExpiresAt);
                const valid = isTokenValid(emp.tokenExpiresAt);
                return (
                  <tr key={emp.id} className={`hover:bg-slate-50/50 transition-colors ${!emp.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700 text-xs">{emp.employeeId}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{emp.firstName} {emp.lastName}</div>
                      {emp.deactivationTagged && emp.isActive && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Tagged for Deactivation</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        emp.role === 'Admin' ? 'bg-red-50 text-red-600' :
                        emp.role === 'Manager' ? 'bg-purple-50 text-purple-600' :
                        emp.role === 'Assistant Manager' ? 'bg-blue-50 text-blue-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>{emp.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        emp.isActive ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'
                      }`}>{emp.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        {emp.token && valid ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded-lg tracking-widest">
                              {emp.token.slice(0, 9)}•••
                            </span>
                            <span className={badgeClass}>
                              {countdownLabel(emp.tokenExpiresAt)}
                            </span>
                          </div>
                        ) : emp.token && !valid ? (
                          <span className="text-[10px] text-red-500 font-bold">Expired</span>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic">No token</span>
                        )}
                      </td>
                    )}
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {emp.isActive && (
                            <button
                              onClick={() => handleIssueToken(emp)}
                              disabled={issuing === emp.id}
                              className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-bold rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                              title="Issue New Token"
                            >
                              <RefreshCw className={`w-3 h-3 ${issuing === emp.id ? 'animate-spin' : ''}`} />
                              {emp.token ? 'Renew' : 'Issue'}
                            </button>
                          )}
                          {emp.isActive && emp.deactivationTagged && (
                            <button
                              onClick={() => handleConfirmDeactivation(emp)}
                              className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold rounded-lg hover:bg-red-100 transition-colors"
                              title="Confirm Deactivation"
                            >
                              <UserX className="w-3 h-3" />
                              Deactivate
                            </button>
                          )}
                          {!emp.isActive && (
                            <button
                              onClick={() => handleReactivate(emp)}
                              className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 border border-green-200 text-[10px] font-bold rounded-lg hover:bg-green-100 transition-colors"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                    {/* Manager-only deactivation tag (non-Admin managers) */}
                    {!isAdmin && isManager && emp.isActive && !emp.deactivationTagged && emp.role !== 'Admin' && emp.employeeId !== currentUser?.employeeId && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleTagDeactivation(emp)}
                          disabled={deactivating === emp.id}
                          className="flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-600 border border-orange-200 text-[10px] font-bold rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50"
                          title="Tag for Deactivation"
                        >
                          <UserX className="w-3 h-3" />
                          Tag
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">No employees yet. Add the first user above.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800">Add New Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">First Name</label>
                  <input
                    type="text" required
                    className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-amber-500 focus:bg-white outline-none text-sm transition-all"
                    placeholder="John"
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Last Name</label>
                  <input
                    type="text" required
                    className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-amber-500 focus:bg-white outline-none text-sm transition-all"
                    placeholder="Doe"
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Employee Number</label>
                <input
                  type="text" required
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-amber-500 focus:bg-white outline-none text-sm font-mono tracking-wider transition-all"
                  placeholder="10042"
                  value={form.employeeId}
                  onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r} type="button"
                      onClick={() => setForm(f => ({ ...f, role: r }))}
                      className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl border-2 transition-all ${
                        form.role === r
                          ? 'bg-amber-50 border-amber-500 text-amber-600'
                          : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200'
                      }`}
                    >{r}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={adding} className="flex-1 py-3 bg-gradient-to-br from-amber-500 to-red-600 text-white font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-all text-sm disabled:opacity-60">
                  {adding ? 'Adding...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Token Issued Modal */}
      {tokenModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-800">Token Issued</h3>
              <button onClick={() => { setTokenModal(null); setCopied(false); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 mb-2">Access Token for {tokenModal.employee.firstName} {tokenModal.employee.lastName}</p>
              <p className="font-mono text-lg font-black text-slate-800 tracking-widest text-center py-2">{tokenModal.token}</p>
              <div className="flex items-center justify-between mt-2 text-[10px] text-amber-700">
                <span>Employee #{tokenModal.employee.employeeId}</span>
                <span>Valid 90 days</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800 block mb-1">Send to employee:</strong>
              Your SPARK access token has been issued.<br/>
              Employee Number: <strong>{tokenModal.employee.employeeId}</strong><br/>
              Token: <strong className="font-mono">{tokenModal.token}</strong><br/>
              Valid for 90 days. Do not share this token with anyone.
            </div>

            <button
              onClick={() => handleCopyToken(`Employee Number: ${tokenModal.employee.employeeId}\nToken: ${tokenModal.token}\nValid for 90 days. Do not share this token with anyone.`)}
              className={`w-full py-3 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-sm rounded-2xl transition-all ${
                copied
                  ? 'bg-green-50 text-green-600 border-2 border-green-200'
                  : 'bg-gradient-to-br from-amber-500 to-red-600 text-white shadow-lg shadow-amber-500/20 hover:scale-[1.02]'
              }`}
            >
              {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy & Send</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
