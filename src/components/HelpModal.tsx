import React from 'react';
import { Info, Check, X, Lock, Unlock, ShieldAlert, Download, User, Settings, HelpCircle } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: string;
}

export default function HelpModal({ isOpen, onClose, role }: HelpModalProps) {
  if (!isOpen) return null;

  const isAdmin = role === 'Admin' || role === 'Manager' || role === 'Assistant Manager';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-amber-500" /> How to use the App
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
              <User className="w-4 h-4" /> For Users
            </h3>
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm text-slate-600">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                <p>Click on any <span className="font-black text-emerald-600">GREEN</span> station to start a new reservation.</p>
              </li>
              <li className="flex gap-3 text-sm text-slate-600">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                <p>Use <span className="font-black text-blue-600">Ctrl + Click</span> to select multiple stations or dates simultaneously.</p>
              </li>
              <li className="flex gap-3 text-sm text-slate-600">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                <p>Fill in your LOB or Department, Supervisor, and Manager emails in the booking form.</p>
              </li>
              <li className="flex gap-3 text-sm text-slate-600">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0">4</div>
                <p>Select your equipment needs from the dropdown menu.</p>
              </li>
            </ul>
          </section>

          {isAdmin && (
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-red-600 flex items-center gap-2">
                <Settings className="w-4 h-4" /> For IT Admins & Managers
              </h3>
              <ul className="space-y-3">
                <li className="flex gap-3 text-sm text-slate-600">
                  <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                  <p>Your requests are <span className="font-black text-emerald-600">AUTO-APPROVED</span>. Regular users go into pending.</p>
                </li>
                <li className="flex gap-3 text-sm text-slate-600">
                  <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                  <p>Use the <span className="font-black text-slate-900">BLOCK</span> button to mark stations as unavailable (Grey).</p>
                </li>
                <li className="flex gap-3 text-sm text-slate-600">
                  <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                  <p>Click <span className="font-black text-emerald-600">EXPORT CSV</span> to download all reservation data for review.</p>
                </li>
                <li className="flex gap-3 text-sm text-slate-600">
                  <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-black shrink-0">4</div>
                  <p>Access the <span className="font-black text-amber-500">APPROVALS</span> section to review, approve, or reject user requests with notes.</p>
                </li>
              </ul>
            </section>
          )}

          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Color Legend</h4>
            <div className="grid grid-cols-2 gap-4">
              <LegendItem color="bg-emerald-500" label="Available" />
              <LegendItem color="bg-amber-400" label="Requested" />
              <LegendItem color="bg-rose-500" label="Booked" />
              <LegendItem color="bg-slate-400" label="Unavailable" />
              <LegendItem color="bg-blue-500" label="Reallocated" />
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-8 py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  );
}
