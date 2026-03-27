/**
 * Email Broadcast System - Types
 * Ultra-perfectionist implementation for MISRAD AI
 */

// Enums - defined locally until Prisma generate runs
export type EmailBroadcastStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'SENDING'
  | 'SENT'
  | 'FAILED'
  | 'CANCELLED';

export type EmailRecipientStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'SENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'OPENED'
  | 'CLICKED'
  | 'BOUNCED'
  | 'FAILED'
  | 'UNSUBSCRIBED'
  | 'SKIPPED';

// ═══════════════════════════════════════════════════════════════════════════════
// Recipient Filters
// ═══════════════════════════════════════════════════════════════════════════════

export type BroadcastRecipientFilter = {
  /** Filter by user roles */
  roles?: string[];
  /** Filter by organization plan type */
  plans?: string[];
  /** Filter by active modules in organization */
  modules?: string[];
  /** Only active users */
  isActive?: boolean;
  /** Only verified emails */
  isEmailVerified?: boolean;
  /** Only users who logged in within X days */
  lastLoginWithinDays?: number;
  /** Only users with/without specific notification preference */
  notificationPreference?: {
    key: string;
    value: boolean;
  };
  /** Specific user IDs (overrides other filters) */
  specificUserIds?: string[];
  /** Exclude specific user IDs */
  excludeUserIds?: string[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// Broadcast Creation
// ═══════════════════════════════════════════════════════════════════════════════

export type CreateBroadcastPayload = {
  /** Email subject line */
  subject: string;
  /** HTML content of the email */
  bodyHtml: string;
  /** Plain text fallback (auto-generated if not provided) */
  bodyText?: string;
  /** Sender name (default: MISRAD AI) */
  fromName?: string;
  /** Sender email (default: newsletter@misrad-ai.com) */
  fromEmail?: string;
  /** Reply-to address */
  replyTo?: string;
  /** Recipient filters */
  recipientFilter: BroadcastRecipientFilter;
  /** Respect user notification preferences (default: true) */
  respectPreferences?: boolean;
  /** Include unsubscribe footer (default: true) */
  includeUnsubscribe?: boolean;
  /** Legal category for compliance */
  legalCategory?: 'marketing' | 'legal' | 'system';
  /** Schedule for later (ISO string) */
  scheduledAt?: string;
};

export type CreateBroadcastResult = {
  success: boolean;
  broadcastId?: string;
  targetCount?: number;
  error?: string;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Broadcast Sending
// ═══════════════════════════════════════════════════════════════════════════════

export type SendBroadcastResult = {
  success: boolean;
  sent: number;
  failed: number;
  skipped: number;
  errors?: string[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// Broadcast Query/Listing
// ═══════════════════════════════════════════════════════════════════════════════

export type BroadcastListItem = {
  id: string;
  subject: string;
  status: EmailBroadcastStatus;
  targetCount: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  legalCategory: string;
  createdAt: Date;
  sentAt?: Date | null;
  scheduledAt?: Date | null;
  createdByName?: string | null;
};

export type BroadcastDetail = BroadcastListItem & {
  bodyHtml: string;
  bodyText?: string | null;
  fromName: string;
  fromEmail: string;
  replyTo?: string | null;
  recipientFilter: BroadcastRecipientFilter;
  failedCount: number;
  bouncedCount: number;
  unsubscribedCount: number;
  errorLog?: unknown;
  recipients?: BroadcastRecipientItem[];
};

export type BroadcastRecipientItem = {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string | null;
  status: EmailRecipientStatus;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  openedAt?: Date | null;
  clickedAt?: Date | null;
  errorMessage?: string | null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Broadcast Actions
// ═══════════════════════════════════════════════════════════════════════════════

export type PreviewBroadcastResult = {
  success: boolean;
  targetUsers?: Array<{
    id: string;
    email: string;
    name?: string;
    role?: string;
    plan?: string;
  }>;
  count?: number;
  error?: string;
};

export type CancelBroadcastResult = {
  success: boolean;
  error?: string;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Stats & Analytics
// ═══════════════════════════════════════════════════════════════════════════════

export type BroadcastStats = {
  total: number;
  byStatus: Record<EmailBroadcastStatus, number>;
  recent: BroadcastListItem[];
};

export type EngagementStats = {
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
};
