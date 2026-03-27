/**
 * Voicenter Reseller Module Types
 * 
 * Types for the Voicenter Partner/Reseller integration including:
 * - TelephonySubAccount - Voicenter sub-accounts under the master reseller account
 * - TelephonyExtension - Individual extensions (שלוחות) within sub-accounts
 * - TelephonyUsageRecord - CDR and usage tracking for billing
 * - VoicenterProvisioningRequest - API requests to Voicenter BSS
 * - VoicenterApiResponse - Standard API response wrapper
 */

// ============================================================================
// ENUMS
// ============================================================================

export type TelephonyAccountStatus = 'active' | 'suspended' | 'cancelled' | 'pending' | 'trial';
export type TelephonyExtensionStatus = 'active' | 'inactive' | 'busy' | 'offline' | 'dnd';
export type TelephonyExtensionType = 'user' | 'ivr' | 'queue' | 'conference' | 'fax' | 'voicemail';
export type TelephonyProvisioningStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'rollback';
export type TelephonyBillingCycle = 'monthly' | 'quarterly' | 'yearly';
export type TelephonyCallDirection = 'inbound' | 'outbound' | 'internal';
export type TelephonyCallStatus = 'answered' | 'missed' | 'voicemail' | 'busy' | 'failed' | 'no_answer';

// ============================================================================
// CORE TELEPHONY SUB-ACCOUNT (תת-חשבון Voicenter)
// ============================================================================

export interface TelephonySubAccount {
  id: string;
  voicenterAccountId: string;           // Voicenter's internal account ID
  organizationId: string;                // Link to MISRAD AI Organization
  organizationSlug: string;
  
  // Account Details
  accountName: string;                   // Display name
  accountNumber: string;                 // Voicenter account number (e.g., "12345")
  resellerId: string;                    // Our reseller account ID in Voicenter
  
  // Status & Lifecycle
  status: TelephonyAccountStatus;
  trialEndsAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Billing Configuration
  billingCycle: TelephonyBillingCycle;
  monthlyPlanFee: number;                // Base plan fee in ILS
  markupPercentage: number;              // Reseller markup %
  
  // Voicenter Credentials (encrypted at rest)
  apiToken?: string | null;               // API access token
  webToken?: string | null;             // Web interface token
  
  // Configuration
  maxExtensions: number;                 // License limit
  currentExtensions: number;             // Actual count
  
  // CDR & Webhook Settings
  cdrWebhookUrl?: string | null;
  screenPopEnabled: boolean;
  
  // Metadata
  metadata?: Record<string, unknown>;
  notes?: string | null;
}

// ============================================================================
// TELEPHONY EXTENSION (שלוחה)
// ============================================================================

export interface TelephonyExtension {
  id: string;
  subAccountId: string;                  // Link to TelephonySubAccount
  organizationId: string;
  
  // Extension Details
  extensionNumber: string;               // e.g., "101", "102"
  extensionName: string;                 // Display name
  extensionType: TelephonyExtensionType;
  
  // Voicenter Integration
  voicenterExtensionId: string;        // Voicenter's internal ID
  voicenterUserId?: string | null;     // If linked to a user
  
  // User Association (optional - for user extensions)
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  assignedUserEmail?: string | null;
  
  // SIP/Registration
  sipUsername?: string | null;
  sipPassword?: string | null;           // Encrypted
  sipServer?: string | null;
  
  // Status
  status: TelephonyExtensionStatus;
  isRegistered: boolean;
  lastRegisteredAt?: Date | null;
  
  // Call Handling
  forwardNumber?: string | null;         // Call forwarding
  voicemailEnabled: boolean;
  voicemailPin?: string | null;          // Encrypted
  
  // Provisioning
  provisionedAt?: Date | null;
  provisionedBy?: string | null;
  
  // Device Info
  deviceType?: string | null;            // "softphone", "deskphone", "web", "mobile"
  deviceModel?: string | null;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// TELEPHONY USAGE & CDR (שימוש ודוחות)
// ============================================================================

export interface TelephonyUsageRecord {
  id: string;
  subAccountId: string;
  organizationId: string;
  extensionId?: string | null;
  
  // Call Details (CDR)
  callId: string;                        // Unique call identifier
  sessionId?: string | null;            // Voicenter session ID
  
  // Participants
  callerNumber: string;                  // From
  callerName?: string | null;
  calleeNumber: string;                  // To
  calleeName?: string | null;
  
  // Call Metadata
  direction: TelephonyCallDirection;
  status: TelephonyCallStatus;
  startedAt: Date;
  answeredAt?: Date | null;
  endedAt?: Date | null;
  
  // Duration
  durationSeconds: number;               // Total call duration
  talkTimeSeconds: number;             // Actual talk time
  ringTimeSeconds: number;             // Time ringing
  
  // Recording
  recordingUrl?: string | null;
  recordingDuration?: number | null;
  
  // Cost & Billing
  costPerMinute: number;                // Base cost from Voicenter
  markupPercentage: number;             // Applied markup
  billedAmount: number;                 // Final amount charged
  currency: string;                      // "ILS"
  
  // Disposition
  disposition?: string | null;          // Call outcome
  hangupCause?: string | null;          // Technical hangup reason
  
  // AI Analysis (optional enrichment)
  analyzedByAi: boolean;
  aiSentiment?: 'positive' | 'negative' | 'neutral' | null;
  aiNotes?: string | null;
  
  // Raw CDR Data
  rawCdrData?: Record<string, unknown>;  // Original CDR from Voicenter
  
  createdAt: Date;
}

// ============================================================================
// PROVISIONING & API
// ============================================================================

export interface VoicenterProvisioningRequest {
  id: string;
  subAccountId: string;
  requestType: 'create_account' | 'create_extension' | 'update_extension' | 'delete_extension' | 'suspend_account' | 'resume_account';
  
  // Request Payload
  payload: Record<string, unknown>;
  
  // Status Tracking
  status: TelephonyProvisioningStatus;
  attempts: number;
  maxAttempts: number;
  
  // Voicenter API Response
  voicenterRequestId?: string | null;
  voicenterResponse?: Record<string, unknown> | null;
  errorMessage?: string | null;
  
  // Retry Logic
  nextAttemptAt?: Date | null;
  
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
}

export interface VoicenterApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId: string;
  timestamp: Date;
}

// ============================================================================
// BILLING & INVOICING
// ============================================================================

export interface TelephonyMonthlyBilling {
  id: string;
  subAccountId: string;
  organizationId: string;
  billingPeriod: string;                 // "YYYY-MM"
  
  // Summary
  totalCalls: number;
  totalDuration: number;                 // in seconds
  totalInbound: number;
  totalOutbound: number;
  
  // Charges
  basePlanFee: number;
  usageCharges: number;
  markupAmount: number;
  totalAmount: number;
  
  // Status
  invoiced: boolean;
  invoiceId?: string | null;
  paid: boolean;
  paidAt?: Date | null;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// DASHBOARD & ANALYTICS
// ============================================================================

export interface TelephonyDashboardStats {
  // Account Overview
  totalSubAccounts: number;
  activeSubAccounts: number;
  trialSubAccounts: number;
  suspendedSubAccounts: number;
  
  // Extensions
  totalExtensions: number;
  activeExtensions: number;
  
  // Usage (Current Period)
  totalCallsToday: number;
  totalCallsThisMonth: number;
  totalDurationThisMonth: number;         // seconds
  
  // Financial
  projectedRevenueThisMonth: number;    // ILS
  outstandingBalance: number;             // ILS
  
  // Trends
  callsTrend: number;                   // % change from last period
  revenueTrend: number;                 // % change from last period
}

export interface TelephonySubAccountSummary {
  id: string;
  accountName: string;
  organizationSlug: string;
  organizationName: string;
  status: TelephonyAccountStatus;
  
  // Counts
  extensionCount: number;
  activeExtensions: number;
  
  // Usage
  callsThisMonth: number;
  durationThisMonth: number;
  
  // Financial
  monthlyPlanFee: number;
  currentUsageCharges: number;
  totalMonthlyCost: number;
  
  // Lifecycle
  trialEndsAt?: Date | null;
  createdAt: Date;
}

// ============================================================================
// FORM INPUTS & DTOs
// ============================================================================

export interface CreateSubAccountInput {
  organizationId: string;
  accountName: string;
  billingCycle?: TelephonyBillingCycle;
  monthlyPlanFee?: number;
  markupPercentage?: number;
  maxExtensions?: number;
  trialDays?: number;
}

export interface UpdateSubAccountInput {
  accountName?: string;
  status?: TelephonyAccountStatus;
  billingCycle?: TelephonyBillingCycle;
  monthlyPlanFee?: number;
  markupPercentage?: number;
  maxExtensions?: number;
  notes?: string;
}

export interface CreateExtensionInput {
  subAccountId: string;
  extensionNumber: string;
  extensionName: string;
  extensionType?: TelephonyExtensionType;
  assignedUserId?: string;
  voicemailEnabled?: boolean;
  deviceType?: string;
}

export interface UpdateExtensionInput {
  extensionName?: string;
  status?: TelephonyExtensionStatus;
  assignedUserId?: string | null;
  forwardNumber?: string | null;
  voicemailEnabled?: boolean;
  deviceType?: string;
}

export interface ExtensionBulkCreateInput {
  subAccountId: string;
  startNumber: number;                   // e.g., 100
  count: number;                         // e.g., 10 (creates 100-109)
  extensionType?: TelephonyExtensionType;
  prefix?: string;                       // e.g., "Sales-"
}

// ============================================================================
// VOICENTER API SPECIFIC TYPES
// ============================================================================

export interface VoicenterCreateAccountPayload {
  CompanyName: string;
  Email: string;
  Phone: string;
  MaxChannels: number;
  PackageId?: string;
}

export interface VoicenterCreateExtensionPayload {
  AccountId: string;
  ExtensionNumber: string;
  ExtensionName: string;
  ExtensionType: string;
  Password?: string;
  Email?: string;
}

export interface VoicenterCdrPayload {
  CallID: string;
  SessionID: string;
  Caller: string;
  Callee: string;
  Direction: 'inbound' | 'outbound';
  StartTime: string;
  AnswerTime?: string;
  EndTime?: string;
  Duration: number;
  TalkTime: number;
  Status: string;
  RecordingURL?: string;
}

// ============================================================================
// UI COMPONENT PROPS
// ============================================================================

export interface TelephonyAccountCardProps {
  account: TelephonySubAccountSummary;
  onViewDetails: (id: string) => void;
  onManageExtensions: (id: string) => void;
  onSuspend: (id: string) => void;
}

export interface TelephonyExtensionRowProps {
  extension: TelephonyExtension;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
}

export interface TelephonyUsageChartProps {
  data: {
    date: string;
    calls: number;
    duration: number;
    cost: number;
  }[];
  period: '7d' | '30d' | '90d' | '1y';
}
