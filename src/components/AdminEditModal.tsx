import { useState } from 'react';
import { X, Save, UserCog, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Reservation, TIME_SLOTS, EquipmentSet, LOB_OPTIONS } from '../types';
import { useReservations } from './ReservationProvider';
import { useEmployee } from './UserProvider';

interface AdminEditModalProps {
  reservation: Reservation;
  onClose: () => void;
}

export default function AdminEditModal({ reservation, onClose }: AdminEditModalProps) {
  const { updateReservation } = useReservations();
  const { employee } = useEmployee();

  const [requestedBy,    setRequestedBy]    = useState(reservation.requestedBy);
  const [lobSelection,   setLobSelection]   = useState(
    LOB_OPTIONS.includes(reservation.lobOrDepartment as any) ? reservation.lobOrDepartment : 'Other'
  );
  const [lobOther,       setLobOther]       = useState(
    LOB_OPTIONS.includes(reservation.lobOrDepartment as any) ? '' : reservation.lobOrDepartment
  );
  const [date,           setDate]           = useState(reservation.date);
  const [start,          setStart]          = useState(reservation.start);
  const [equipmentNeeds, setEquipmentNeeds] = useState<EquipmentSet | string>(reservation.equipmentNeeds || 'Set 1: Basic');
  const [saving,         setSaving]         = useState(false);

  const lobOrDepartment = lobSelection === 'Other' ? lobOther : lobSelection;

  const endTime = (() => {
    const [h, m] = start.split(':').map(Number);
    return `${(h + 9).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  })();

  const handleSave = async () => {
    if (!requestedBy.trim() || !lobOrDepartment.trim() || !date || !start) return;
    setSaving(true);
    try {
      await updateReservation(reservation.id, {
        requestedBy: requestedBy.trim(),
        lobOrDepartment,
        date,
        start,
        end: endTime,
        equipmentNeeds: equipmentNeeds as EquipmentSet,
      }, employee?.employeeId);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-between">
          <div>
            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">
              Admin Override — Station {String(reservation.station).padStart(2, '0')} · {reservation.office}
            </p>
            <h2 className="text-white text-lg font-black uppercase tracking-tight mt-0.5 flex items-center gap-2">
              <UserCog className="w-5 h-5" /> Edit Reservation
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl transition-all">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Reassign Employee */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Booked For (Employee ID)
            </label>
            <input
              type="text"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              placeholder="Employee ID"
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-semibold font-mono"
            />
          </div>

          {/* LOB / Department */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">LOB or Department</label>
            <select
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-semibold"
              value={lobSelection}
              onChange={(e) => { setLobSelection(e.target.value); setLobOther(''); }}
            >
              {LOB_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {lobSelection === 'Other' && (
              <input
                type="text"
                placeholder="Specify department…"
                className="w-full px-4 py-3 bg-slate-50 border-2 border-indigo-200 rounded-2xl focus:bg-white focus:border-indigo-400 outline-none text-sm font-semibold mt-2"
                value={lobOther}
                onChange={(e) => setLobOther(e.target.value)}
              />
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-semibold"
            />
          </div>

          {/* Time Slot */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Start Time → End Time (9-hr shift)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map((time) => {
                const [h, m] = time.split(':').map(Number);
                const endH = (h + 9).toString().padStart(2, '0');
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setStart(time)}
                    className={cn(
                      'py-2.5 px-1 rounded-xl text-[9px] font-black uppercase tracking-tighter border-2 transition-all',
                      start === time
                        ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-indigo-200'
                    )}
                  >
                    {time} – {endH}:{m.toString().padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Equipment */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Equipment Needs</label>
            <select
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-400 outline-none text-sm font-semibold"
              value={equipmentNeeds}
              onChange={(e) => setEquipmentNeeds(e.target.value as EquipmentSet)}
            >
              <option value="Set 1: Basic">Set 1: Basic</option>
              <option value="Set 2: Need 1 Monitor">Set 2: Need 1 Monitor</option>
              <option value="Set 3: Need 2 Monitors">Set 3: Need 2 Monitors</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !requestedBy.trim() || !lobOrDepartment.trim()}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Override
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest rounded-2xl transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
