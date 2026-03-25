import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

interface ReservationPDFParams {
  userName: string;
  userEmail: string;
  office: string;
  station: number | string;
  date: string;
  start: string;
  end: string;
  lobOrDepartment: string;
  equipmentNeeds: string;
  status: string;
}

export function generateReservationPDF(params: ReservationPDFParams): jsPDF {
  const doc = new jsPDF();
  const now = new Date();
  const pageW = doc.internal.pageSize.getWidth();

  // ── Header bar ──────────────────────────────────────────────
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 0, pageW, 38, 'F');
  doc.setFillColor(214, 70, 18); // red-600
  doc.rect(0, 31, pageW, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('SPARK', 15, 17);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('STATION PLANNING, ALLOCATION & RESERVATION KIOSK', 15, 25);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('RESERVATION CONFIRMATION', 15, 34);

  const genLabel = `Generated: ${format(now, 'MMMM d, yyyy — HH:mm')}`;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(genLabel, pageW - 15, 34, { align: 'right' });

  // ── Requested By ─────────────────────────────────────────────
  let y = 54;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(15, y - 6, pageW - 30, 32, 3, 3, 'F');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('REQUESTED BY', 20, y);

  y += 9;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(params.userName, 20, y);

  y += 7;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(params.userEmail, 20, y);

  // ── Reservation Details ───────────────────────────────────────
  y += 18;

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('RESERVATION DETAILS', 15, y);

  y += 4;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(15, y, pageW - 15, y);

  y += 8;

  const details: [string, string][] = [
    ['Office',          params.office],
    ['Station',         String(params.station)],
    ['Date',            format(new Date(params.date + 'T12:00:00'), 'MMMM d, yyyy (EEEE)')],
    ['Time',            `${params.start} — ${params.end}`],
    ['LOB / Department', params.lobOrDepartment],
    ['Equipment',       params.equipmentNeeds || 'Set 1: Basic'],
    ['Status',          params.status.toUpperCase()],
  ];

  details.forEach(([label, value], i) => {
    const rowY = y + i * 12;

    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, rowY - 5, pageW - 30, 12, 'F');
    }

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(label.toUpperCase(), 20, rowY);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    if (label === 'Status') {
      if (value === 'CONFIRMED')       doc.setTextColor(22, 163, 74);
      else if (value === 'PENDING')    doc.setTextColor(245, 158, 11);
      else                             doc.setTextColor(239, 68, 68);
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setTextColor(15, 23, 42);
    }

    doc.text(value, 95, rowY);
  });

  // ── Footer ───────────────────────────────────────────────────
  y += details.length * 12 + 14;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(15, y, pageW - 15, y);

  y += 9;
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('This is an automatically generated confirmation from SPARK.', pageW / 2, y, { align: 'center' });
  y += 5;
  doc.text('Please retain this document for your records.', pageW / 2, y, { align: 'center' });

  return doc;
}

export function getReservationFilename(userName: string): string {
  const now = new Date();
  const name = (userName || 'user')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh   = String(now.getHours()).padStart(2, '0');
  const min  = String(now.getMinutes()).padStart(2, '0');
  return `${name}_${mm}_${dd}_${yyyy}_${hh}${min}`;
}
