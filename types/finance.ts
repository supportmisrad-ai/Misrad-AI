import { LucideIcon } from 'lucide-react';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded';

export type IntegrationType = 'green_invoice' | 'morning' | 'none';

export interface Invoice {
  id: string;
  number: string;
  clientName: string;
  clientEmail?: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  description?: string;
  items?: InvoiceItem[];
  taxRate?: number;
  notes?: string;
  externalId?: string; // ID from Green Invoice/Morning
  integrationType?: IntegrationType;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export interface FinancialReport {
  id: string;
  name: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  invoices: Invoice[];
  createdAt: Date;
}

export interface Integration {
  id: string;
  type: IntegrationType;
  name: string;
  isConnected: boolean;
  isActive: boolean;
  connectedAt?: Date;
  lastSync?: Date;
  settings?: Record<string, any>;
}

export interface GreenInvoiceIntegration extends Integration {
  type: 'green_invoice';
  apiKey?: string;
  accountId?: string;
}

export interface MorningIntegration extends Integration {
  type: 'morning';
  apiKey?: string;
  accountId?: string;
}

