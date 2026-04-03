/**
 * Email Notification Stubs — INACTIVE
 *
 * This module contains the notification logic for SPARK reservation events.
 * All functions are currently INACTIVE (set to no-op) pending the full
 * transition to the GV email environment and SMTP/service configuration.
 *
 * To activate: replace the INACTIVE body with a real HTTP call to your
 * email provider (e.g. SendGrid, Nodemailer, Firebase Extensions: Trigger Email).
 *
 * Do NOT remove this file — the call sites are in place and will go live
 * once the email service is configured.
 */

const EMAIL_ACTIVE = false; // ← flip to true when GV email environment is ready

export interface ReservationEmailPayload {
  to: string;           // recipient email
  employeeName: string;
  employeeId: string;
  office: string;
  station: number | string;
  date: string;
  start: string;
  end: string;
  lobOrDepartment: string;
  status: 'confirmed' | 'rejected' | 'cancelled' | 'pending';
  rejectionReason?: string;
  approvedBy?: string;
}

/**
 * Sends a reservation status notification to the employee.
 * Currently INACTIVE — logs to console only.
 */
export async function sendReservationNotification(payload: ReservationEmailPayload): Promise<void> {
  if (!EMAIL_ACTIVE) {
    console.info('[EMAIL INACTIVE] Would send notification:', payload.status, '→', payload.to);
    return;
  }

  // ── ACTIVE: replace with real email service call ──────────────────────────
  // Example (SendGrid):
  // await fetch('/api/send-email', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     to: payload.to,
  //     subject: buildSubject(payload),
  //     html: buildBody(payload),
  //   }),
  // });
}

/**
 * Sends a rejection alert to the employee when their reservation is denied.
 * Currently INACTIVE — logs to console only.
 */
export async function sendRejectionAlert(payload: ReservationEmailPayload): Promise<void> {
  if (!EMAIL_ACTIVE) {
    console.info('[EMAIL INACTIVE] Would send rejection alert to:', payload.to, '| Reason:', payload.rejectionReason);
    return;
  }

  await sendReservationNotification({ ...payload, status: 'rejected' });
}

/**
 * Sends a confirmation email when a booking is auto-approved.
 * Currently INACTIVE — logs to console only.
 */
export async function sendConfirmationEmail(payload: ReservationEmailPayload): Promise<void> {
  if (!EMAIL_ACTIVE) {
    console.info('[EMAIL INACTIVE] Would send confirmation to:', payload.to);
    return;
  }

  await sendReservationNotification({ ...payload, status: 'confirmed' });
}

/**
 * Sends a cancellation notice to the employee.
 * Currently INACTIVE — logs to console only.
 */
export async function sendCancellationNotice(payload: ReservationEmailPayload): Promise<void> {
  if (!EMAIL_ACTIVE) {
    console.info('[EMAIL INACTIVE] Would send cancellation notice to:', payload.to);
    return;
  }

  await sendReservationNotification({ ...payload, status: 'cancelled' });
}
