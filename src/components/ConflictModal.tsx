import { AlertTriangle, X } from 'lucide-react';
import { Reservation } from '../types';

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOverride: () => void;
  conflict: Reservation;
}

export default function ConflictModal({ isOpen, onClose, onOverride, conflict }: ConflictModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
        <div className="p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mx-auto mb-6">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black tracking-tight uppercase text-slate-900 mb-2">Conflict Detected</h2>
          <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
            Station {conflict.station} is already booked by <span className="font-bold text-slate-900">{conflict.lobOrDepartment}</span> on this date and time.
          </p>
          
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left mb-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Conflicting Reservation</p>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-black text-slate-900">{conflict.lobOrDepartment}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{conflict.start} – {conflict.end}</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-widest rounded-full">
                {conflict.status}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-slate-100 text-slate-600 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onOverride}
              className="flex-1 py-4 bg-gradient-to-br from-amber-500 to-red-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 transition-all"
            >
              Override
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
