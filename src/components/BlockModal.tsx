import { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { OFFICES } from '../types';
import { cn } from '../lib/utils';

interface BlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBlock: (office: string, station: number, date: string) => void;
}

export default function BlockModal({ isOpen, onClose, onBlock }: BlockModalProps) {
  const [office, setOffice] = useState<'Office #1' | 'Office #2'>('Office #1');
  const [station, setStation] = useState<number | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!station) return;
    onBlock(office, station, date);
    onClose();
  };

  const officeConfig = OFFICES.find(o => o.name === office)!;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black tracking-tight uppercase text-slate-900">Block Station</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Select Office</label>
              <div className="grid grid-cols-2 gap-2">
                {OFFICES.map((o) => (
                  <button
                    key={o.name}
                    type="button"
                    onClick={() => { setOffice(o.name as any); setStation(null); }}
                    className={cn(
                      "py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border-2 transition-all",
                      office === o.name 
                        ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/10" 
                        : "bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200"
                    )}
                  >
                    {o.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Select Date</label>
              <input
                type="date"
                required
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-slate-900 transition-all outline-none text-sm font-semibold"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Select Station</label>
              <div className={cn(
                "grid gap-2 max-h-[160px] overflow-y-auto p-1",
                office === 'Office #1' ? "grid-cols-5" : "grid-cols-6"
              )}>
                {Array.from({ length: officeConfig.stations }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setStation(num)}
                    className={cn(
                      "aspect-square rounded-xl text-[10px] font-black transition-all border-2",
                      station === num 
                        ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/10" 
                        : "bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-200"
                    )}
                  >
                    {num.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 bg-slate-100 text-slate-600 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all"
              >
                Block
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
