/**
 * Admin panel types
 */

export type TenantStatus = 'Active' | 'Trial' | 'Provisioning' | 'Churned' | 'Suspended';

export type ModuleId = 'crm' | 'team' | 'finance' | 'social' | 'content';

export interface Tenant {
  id: string;
  name: string;
  ownerEmail?: string;
  status: TenantStatus;
  modules: ModuleId[];
  usersCount?: number;
  mrr?: number;
  logo?: string;
  region?: string;
  plan?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type { Product } from '../types';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'waiting_for_customer' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
  closed_at?: string;
  sla_deadline?: string;
  first_response_at?: string;
  reporter_id?: string;
  assigned_to?: string;
}

export interface SupportTicketEvent {
  id: string;
  ticket_id: string;
  action: string;
  content?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface TicketAttendance {
  user_id?: string;
  userId?: string;
  status: 'attending' | 'not_attending' | 'maybe';
}
