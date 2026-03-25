export function generateICS(
  station: number | string, 
  office: string, 
  date: string, 
  start: string, 
  end: string,
  lobOrDepartment: string
) {
  const [startH, startM] = start.split(':');
  const [endH, endM] = end.split(':');
  const dateStr = date.replace(/-/g, '');
  
  const dtStart = `${dateStr}T${startH}${startM}00Z`;
  const dtEnd = `${dateStr}T${endH}${endM}00Z`;
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const stationLabel = typeof station === 'number' ? station.toString().padStart(2, '0') : station;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SPARK Reservation Kiosk//EN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@spark.globalvirtuoso.com`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:SPARK Station ${stationLabel} - ${office}`,
    `DESCRIPTION:SPARK reservation for LOB/Department: ${lobOrDepartment}`,
    `LOCATION:${office}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: SPARK Reservation',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `spark_reservation_${date}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
