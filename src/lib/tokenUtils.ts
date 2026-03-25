// Generates a secure 20-character token formatted as XXXX-XXXX-XXXX-XXXX-XXXX (5 groups of 4)
// Uses Web Crypto for cryptographic randomness
export function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  const array = new Uint8Array(20);
  crypto.getRandomValues(array);
  const raw = Array.from(array).map(b => chars[b % chars.length]).join('');
  return `${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}-${raw.slice(16,20)}`;
}

// Returns milliseconds remaining. Returns 0 if expired or no expiry.
export function msRemaining(tokenExpiresAt: string | null | undefined): number {
  if (!tokenExpiresAt) return 0;
  return Math.max(0, new Date(tokenExpiresAt).getTime() - Date.now());
}

// Returns days remaining (ceil). Returns null if no expiry.
export function daysRemaining(tokenExpiresAt: string | null | undefined): number | null {
  if (!tokenExpiresAt) return null;
  const ms = msRemaining(tokenExpiresAt);
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// Human-readable countdown label: "45d", "23h", "Expired"
export function countdownLabel(tokenExpiresAt: string | null | undefined): string {
  if (!tokenExpiresAt) return '';
  const ms = msRemaining(tokenExpiresAt);
  if (ms <= 0) return 'Expired';
  const hours = ms / (1000 * 60 * 60);
  if (hours < 24) return `${Math.ceil(hours)}h`;
  return `${Math.ceil(hours / 24)}d`;
}

// Returns true if token is still valid (not expired)
export function isTokenValid(tokenExpiresAt: string | null | undefined): boolean {
  if (!tokenExpiresAt) return false;
  return new Date(tokenExpiresAt).getTime() > Date.now();
}

// Token expiry badge classes based on time remaining
export function tokenBadgeClass(tokenExpiresAt: string | null | undefined): string {
  const ms = msRemaining(tokenExpiresAt);
  if (!tokenExpiresAt || ms <= 0) return 'text-slate-400 text-[9px]';
  const hours = ms / (1000 * 60 * 60);
  if (hours < 24)
    return 'text-[9px] font-black text-red-600 animate-pulse bg-red-100 px-1.5 py-0.5 rounded';
  if (hours < 24 * 5)
    return 'text-[9px] font-bold text-yellow-600 animate-pulse bg-yellow-100 px-1.5 py-0.5 rounded';
  return 'text-[9px] text-slate-400';
}
