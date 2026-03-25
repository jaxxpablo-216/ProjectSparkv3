import { useState } from 'react';
import { XCircle, X } from 'lucide-react';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReject: (reason: string) => void;
  lobOrDepartment: string;
}

export default function RejectionModal({ isOpen, onClose, onReject, lobOrDepartment }: RejectionModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onReject(reason);
    setReason('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
        <div className="p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mx-auto mb-6">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black tracking-tight uppercase text-slate-900 mb-2">Reject Reservation</h2>
          <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
            Please provide a reason for rejecting the reservation for <span className="font-bold text-slate-900">{lobOrDepartment}</span>.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Rejection Reason</label>
              <textarea
                required
                placeholder="e.g. Station maintenance or conflict with priority booking..."
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all outline-none text-sm font-semibold min-h-[120px]"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 bg-slate-100 text-slate-600 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-4 bg-red-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all"
              >
                Reject
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
