/**
 * Team and user types
 */

export type TeamUserRole = 'admin' | 'manager' | 'team_member' | 'מנכ"ל' | 'מנהל' | 'רכז' | 'עובד' | 'מכירות';

export interface User {
  id: string;
  name: string;
  email: string;
  role: TeamUserRole;
  avatar?: string;
  phone?: string;
  department?: string;
  position?: string;
  commissionPct?: number;
  pendingReward?: boolean;
  organizationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'Todo' | 'In Progress' | 'Done' | 'Canceled';
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: string;
  assigneeIds?: string[];
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimeEntry {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  description?: string;
  startLat?: number;
  startLng?: number;
  startAccuracy?: number | null;
  startCity?: string;
  endLat?: number;
  endLng?: number;
  endAccuracy?: number | null;
  endCity?: string;
  note?: string | null;
  voidReason?: string | null;
  voidedBy?: string | null;
  voidedAt?: string;
  createdAt?: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  createdAt?: string;
}

export interface TeamEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  location?: string;
  required_attendees?: string[];
  optional_attendees?: string[];
  created_by?: string;
  createdAt?: string;
}

export enum LeadStatus {
  NEW = 'חדש',
  CONTACTED = 'נוצר קשר',
  QUALIFIED = 'מוכשר',
  PROPOSAL = 'הצעה',
  NEGOTIATION = 'משא ומתן',
  WON = 'זכה',
  LOST = 'אבד',
}

export interface Lead {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  status: LeadStatus;
  value: number;
  assignedTo?: string;
  createdAt?: string;
  updatedAt?: string;
}
