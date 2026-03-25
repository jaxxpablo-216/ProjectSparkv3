export type UserRole = 'User' | 'IT Admin' | 'Manager';

// New role system for v3
export type EmployeeRole = 'Supervisor' | 'Assistant Manager' | 'Manager' | 'Admin';

export interface Employee {
  id: string; // Firestore doc ID
  employeeId: string; // e.g. "10042"
  firstName: string;
  lastName: string;
  role: EmployeeRole;
  isActive: boolean;
  deactivationTagged: boolean;
  deactivationTaggedBy?: string | null;
  token?: string | null; // current valid token string
  tokenIssuedAt?: string | null;
  tokenExpiresAt?: string | null;
  tokenIssuedBy?: string | null;
  createdAt: string;
  createdBy?: string | null;
}

export type SparkRole = EmployeeRole; // alias for new system

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'rejected' | 'blocked' | 'overridden' | 'cancelled' | 'reallocated';
export type ReservationType = 'booking' | 'block' | 'boardroom' | 'meeting';

export type EquipmentSet = 'Set 1: Basic' | 'Set 2: Need 1 Monitor' | 'Set 3: Need 2 Monitors';

export interface Reservation {
  id: string;
  office: 'Office #1' | 'Office #2';
  lobOrDepartment: string;
  requestedBy: string;
  notifyEmail: string;
  station: number | string; // number for station, string for boardroom/meeting
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string;   // HH:MM
  status: ReservationStatus;
  type: ReservationType;
  equipmentNeeds?: EquipmentSet | string;
  supervisorEmail?: string;
  managerEmail?: string;
  rejectionReason?: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  cancelledBy?: string;
  cancelledAt?: string;
}

export interface OfficeConfig {
  name: string;
  stations: number;
}

export const OFFICES: OfficeConfig[] = [
  { name: 'Office #1', stations: 15 },
  { name: 'Office #2', stations: 30 },
];

export const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'
];
