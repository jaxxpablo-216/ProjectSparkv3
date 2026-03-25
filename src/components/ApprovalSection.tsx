import React, { useState } from 'react';
import { useReservations } from './ReservationProvider';
import { useEmployee } from './UserProvider';
import { Reservation } from '../types';
import { format } from 'date-fns';
import { Check, X, MessageSquare, Clock, User } from 'lucide-react';
import { toast } from 'sonner';

interface ApprovalSectionProps {
  office: 'Office #1' | 'Office #2';
}

export default function ApprovalSection({ office }: ApprovalSectionProps) {
  const { reservations, updateReservationStatus } = useReservations();
  const { employee } = useEmployee();
  const [rejectionNotes, setRejectionNotes] = useState<{ [key: string]: string }>({});
  const [showRejectionModal, setShowRejectionModal] = useState<string | null>(null);

  const pendingReservations = reservations.filter(r => r.office === office && r.status === 'pending');

  const handleApprove = async (id: string) => {
    try {
      await updateReservationStatus(id, 'confirmed', undefined, employee?.employeeId || undefined);
    } catch {
      toast.error('Failed to approve reservation');
    }
  };

  const handleReject = async (id: string) => {
    const reason = rejectionNotes[id];
    if (!reason) {
      toast.warning('Please provide a reason for rejection');
      return;
    }
    try {
      await updateReservationStatus(id, 'rejected', reason);
      setShowRejectionModal(null);
    } catch {
      toast.error('Failed to reject reservation');
      setShowRejectionModal(null);
    }
  };

  if (pendingReservations.length === 0) {
    return (
      <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">No pending approvals for {office}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-500" /> Pending Approvals — {office}
      </h3>
      
      <div className="grid grid-cols-1 gap-4">
        {pendingReservations.map(res => (
          <div key={res.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xs font-black text-slate-600 border border-slate-100">
                {res.station}
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{res.lobOrDepartment}</h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <User className="w-3 h-3" /> {res.requestedBy}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {res.date} — {res.start} to {res.end}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleApprove(res.id)}
                className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
              >
                <Check className="w-4 h-4" /> Approve
              </button>
              <button 
                onClick={() => setShowRejectionModal(res.id)}
                className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
              >
                <X className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 mb-2">Rejection Reason</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Please explain why this reservation is being rejected.</p>
            
            <textarea
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all outline-none text-sm font-semibold min-h-[120px] mb-6"
              placeholder="e.g. Station maintenance, double booking..."
              value={rejectionNotes[showRejectionModal] || ''}
              onChange={(e) => setRejectionNotes({ ...rejectionNotes, [showRejectionModal]: e.target.value })}
            />

            <div className="flex gap-3">
              <button 
                onClick={() => setShowRejectionModal(null)}
                className="flex-1 py-4 bg-slate-100 text-slate-500 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleReject(showRejectionModal)}
                className="flex-1 py-4 bg-rose-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
