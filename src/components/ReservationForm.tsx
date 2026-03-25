import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { OFFICES, TIME_SLOTS, EquipmentSet } from '../types';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isPast } from 'date-fns';
import { ChevronLeft, ChevronRight, FileText, Download, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';
import { useReservations } from './ReservationProvider';
import { useEmployee } from './UserProvider';
import { calculateEndTime, checkOverlap } from '../lib/validation';
import { generateICS } from '../lib/calendar-generator';
import { generateReservationPDF, getReservationFilename } from '../lib/pdf-generator';

interface ReservationFormProps {
  selectedOffice: 'Office #1' | 'Office #2';
  setSelectedOffice: (office: 'Office #1' | 'Office #2') => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  initialStation?: number | string | null;
  /** Additional station+date combos for bulk booking — same form data is applied to all */
  bulkCells?: { station: number | string; date: string }[];
  onSuccess?: () => void;
}

export default function ReservationForm({
  selectedOffice,
  setSelectedOffice,
  selectedDate,
  setSelectedDate,
  initialStation = null,
  bulkCells,
  onSuccess,
}: ReservationFormProps) {
  const { createReservation, reservations } = useReservations();
  const { employee } = useEmployee();
  const [selectedStation, setSelectedStation] = useState<number | string | null>(initialStation);

  useEffect(() => {
    if (initialStation !== null) setSelectedStation(initialStation);
  }, [initialStation]);

  const [selectedTime, setSelectedTime]           = useState<string | null>(null);
  const [lobOrDepartment, setLobOrDepartment]     = useState('');
  const [equipmentNeeds, setEquipmentNeeds]       = useState<EquipmentSet>('Set 1: Basic');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfReady, setPdfReady]         = useState<{ doc: any; filename: string } | null>(null);

  const handleOfficeChange = (office: 'Office #1' | 'Office #2') => {
    setSelectedOffice(office);
    setSelectedStation(null);
  };

  const handleDateChange = (date: Date) => {
    if (isPast(date) && !isSameDay(date, new Date())) return;
    if (date > addMonths(new Date(), 3)) return;
    setSelectedDate(format(date, 'yyyy-MM-dd'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStation || !selectedTime || !lobOrDepartment) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    const endTime = calculateEndTime(selectedTime);

    // ── Conflict check ────────────────────────────────────────
    const existingConflict = reservations.find(r =>
      r.office === selectedOffice &&
      r.station === selectedStation &&
      r.date === selectedDate &&
      r.status !== 'rejected' &&
      r.status !== 'cancelled' &&
      checkOverlap(r.start, r.end, selectedTime, endTime)
    );

    if (existingConflict) {
      if (employee?.role === 'Admin' || employee?.role === 'Manager' || employee?.role === 'Assistant Manager') {
        const confirmOverride = window.confirm(`Station is already reserved by ${existingConflict.requestedBy}. Do you want to override?`);
        if (!confirmOverride) { setIsSubmitting(false); return; }
      } else {
        toast.error('Station is already booked or blocked for this time slot');
        setIsSubmitting(false);
        return;
      }
    }

    // ── Step 1: Firestore writes ────────────────────────────────
    // Primary station + all bulk cells (same form data)
    const allCells = [
      { station: selectedStation, date: selectedDate },
      ...(bulkCells ?? []),
    ];

    try {
      await Promise.all(allCells.map(cell =>
        createReservation({
          office:          selectedOffice,
          lobOrDepartment,
          requestedBy:     employee?.employeeId || '',
          notifyEmail:     'ithelpdesk@globalvirtuoso.com',
          station:         cell.station,
          date:            cell.date,
          start:           selectedTime,
          end:             endTime,
          type:            'booking',
          equipmentNeeds,
        })
      ));
    } catch (error) {
      console.error('Reservation write failed:', error);
      toast.error('Failed to submit reservation. Please try again.');
      setIsSubmitting(false);
      return;
    }

    // Capture current values before state reset (state is async, but capture for PDF use)
    const capturedStation   = selectedStation;
    const capturedDate      = selectedDate;
    const capturedTime      = selectedTime;
    const capturedLob       = lobOrDepartment;
    const capturedEquipment = equipmentNeeds;

    // Reset form immediately after successful write
    setSelectedStation(null);
    setSelectedTime(null);
    setLobOrDepartment('');
    setEquipmentNeeds('Set 1: Basic');
    setIsSubmitting(false);

    // ── Step 2: ICS + PDF — generate & auto-download BEFORE closing modal ──
    try {
      const isAutoApproved = employee?.role === 'Admin' || employee?.role === 'Manager' || employee?.role === 'Assistant Manager';
      const userName = `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || 'User';
      const filename = getReservationFilename(userName || employee?.employeeId || 'user');

      // Primary station PDF
      if (isAutoApproved && capturedStation) {
        generateICS(capturedStation, selectedOffice, capturedDate, capturedTime, endTime, capturedLob);
      }
      const primaryDoc = generateReservationPDF({
        userName,
        userEmail:       employee?.employeeId || '',
        office:          selectedOffice,
        station:         capturedStation,
        date:            capturedDate,
        start:           capturedTime,
        end:             endTime,
        lobOrDepartment: capturedLob,
        equipmentNeeds:  capturedEquipment,
        status:          isAutoApproved ? 'confirmed' : 'pending',
      });
      primaryDoc.save(`${filename}.pdf`);

      // Additional PDFs for bulk cells
      if (bulkCells && bulkCells.length > 0) {
        for (const cell of bulkCells) {
          const bulkDoc = generateReservationPDF({
            userName,
            userEmail:       employee?.employeeId || '',
            office:          selectedOffice,
            station:         cell.station,
            date:            cell.date,
            start:           capturedTime,
            end:             endTime,
            lobOrDepartment: capturedLob,
            equipmentNeeds:  capturedEquipment,
            status:          isAutoApproved ? 'confirmed' : 'pending',
          });
          bulkDoc.save(`${filename}_stn${cell.station}.pdf`);
        }
      }

      toast.success(`Reservation submitted! ${bulkCells && bulkCells.length > 0 ? `${bulkCells.length + 1} PDFs downloaded.` : 'PDF downloaded.'}`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.warning('Reservation submitted — PDF generation failed. Please contact IT.');
    }

    // Close modal after PDF is done
    onSuccess?.();
  };

  const officeConfig = OFFICES.find(o => o.name === selectedOffice)!;
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end:   endOfMonth(currentMonth),
  });

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Office Selection */}
        <div className="space-y-3">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">1. Select Office</label>
          <div className="grid grid-cols-2 gap-3">
            {OFFICES.map((office) => (
              <button
                key={office.name}
                type="button"
                onClick={() => handleOfficeChange(office.name as any)}
                className={cn(
                  "p-4 rounded-2xl border-2 text-left transition-all group relative overflow-hidden",
                  selectedOffice === office.name
                    ? "bg-amber-50 border-amber-500 shadow-lg shadow-amber-500/10"
                    : "bg-slate-50 border-slate-100 hover:border-slate-200"
                )}
              >
                <div className={cn(
                  "absolute top-0 right-0 w-16 h-16 -translate-y-1/2 translate-x-1/2 rounded-full blur-2xl opacity-20",
                  selectedOffice === office.name ? "bg-amber-500" : "bg-slate-300"
                )} />
                <h3 className={cn(
                  "text-sm font-black uppercase tracking-tight",
                  selectedOffice === office.name ? "text-amber-600" : "text-slate-600"
                )}>{office.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{office.stations} Stations</p>
              </button>
            ))}
          </div>
        </div>

        {/* Date Selection */}
        <div className="space-y-3">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">2. Select Date</label>
          <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">{format(currentMonth, 'MMMM yyyy')}</h4>
              <div className="flex gap-1">
                <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                  className="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-amber-600">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-amber-600">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                <span key={d} className="text-[10px] font-black uppercase text-slate-400">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, i) => {
                const isSelected = isSameDay(day, new Date(selectedDate));
                const isToday    = isSameDay(day, new Date());
                const isDisabled = (isPast(day) && !isToday) || day > addMonths(new Date(), 3);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleDateChange(day)}
                    className={cn(
                      "aspect-square rounded-xl text-[10px] font-black transition-all flex items-center justify-center",
                      isDisabled ? "text-slate-200 cursor-not-allowed" : "hover:scale-110",
                      isSelected ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30" :
                      isToday    ? "border-2 border-amber-500 text-amber-600"
                                 : "text-slate-600 hover:bg-white hover:text-amber-600"
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Time Selection */}
        <div className="space-y-3">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">3. Select Time Slot</label>
          <div className="grid grid-cols-3 gap-2">
            {TIME_SLOTS.map((time) => {
              const [h, m] = time.split(':').map(Number);
              const endH   = (h + 9).toString().padStart(2, '0');
              const range  = `${time} – ${endH}:${m.toString().padStart(2, '0')}`;
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  className={cn(
                    "py-3 px-1 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all border-2",
                    selectedTime === time
                      ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/30"
                      : "bg-slate-50 border-slate-100 text-slate-600 hover:border-amber-200 hover:text-amber-600"
                  )}
                >
                  {range}
                </button>
              );
            })}
          </div>
        </div>

        {/* Additional Info */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">LOB or Department</label>
            <input
              type="text"
              required
              placeholder="e.g. IT / Operations"
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none text-sm font-semibold"
              value={lobOrDepartment}
              onChange={(e) => setLobOrDepartment(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Equipment Needs</label>
            <select
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none text-sm font-semibold"
              value={equipmentNeeds}
              onChange={(e) => setEquipmentNeeds(e.target.value as EquipmentSet)}
            >
              <option value="Set 1: Basic">Set 1: Basic</option>
              <option value="Set 2: Need 1 Monitor">Set 2: Need 1 Monitor</option>
              <option value="Set 3: Need 2 Monitors">Set 3: Need 2 Monitors</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-br from-amber-500 to-red-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Reservation'
            )}
          </button>
        </div>
      </form>

      {/* PDF Ready Modal */}
      {pdfReady && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl text-center space-y-5 relative">
            {/* Dismiss X */}
            <button
              onClick={() => setPdfReady(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8 text-amber-500" />
            </div>

            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Reservation Submitted</h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Your confirmation PDF is ready. Open it in a new tab or save it to your device.
              </p>
            </div>

            {/* Filename */}
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 rounded-xl py-2 px-3">
              {pdfReady.filename}.pdf
            </p>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => {
                  const url = pdfReady.doc.output('bloburl');
                  window.open(url, '_blank');
                }}
                className="flex-1 py-4 bg-slate-100 text-slate-700 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all text-[10px] flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" /> Open PDF
              </button>
              <button
                onClick={() => {
                  pdfReady.doc.save(`${pdfReady.filename}.pdf`);
                  setPdfReady(null);
                }}
                className="flex-1 py-4 bg-gradient-to-br from-amber-500 to-red-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all text-[10px] flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
