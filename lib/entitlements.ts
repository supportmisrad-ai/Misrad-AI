import { redirect } from 'next/navigation';

export type AccessLevel = 
  | 'full'           // Active or Trial
  | 'archive'        // Expired but within 30 days (Read-only)
  | 'blocked'        // Expired > 30 days
  | 'none';

export interface Entitlements {
  canView: boolean;
  canEdit: boolean;
  canUseAI: boolean;
  canExport: boolean;
  canInvite: boolean;
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  daysSinceExpired: number;
  banner?: {
    type: 'warning' | 'error' | 'info';
    message: string;
    action?: { label: string; href: string };
  };
}

/**
 * Centralized entitlement logic for Misrad-AI.
 * Professional, direct, and Israeli-tailored messaging.
 */
export function getEntitlements(
  status: string | null,
  plan: string | null,
  expiredAt: Date | null
): Entitlements {
  const now = new Date();
  const daysSinceExpired = expiredAt 
    ? Math.floor((now.getTime() - new Date(expiredAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const currentStatus = (status || 'expired') as Entitlements['status'];

  // Case 1: Active or Trial - Full Access
  if (currentStatus === 'active' || currentStatus === 'trial') {
    return {
      canView: true,
      canEdit: true,
      canUseAI: true,
      canExport: true,
      canInvite: true,
      status: currentStatus,
      daysSinceExpired: 0,
    };
  }

  // Case 2: Expired - Archive Mode (Up to 30 days)
  if (currentStatus === 'expired' && daysSinceExpired <= 30) {
    return {
      canView: true,
      canEdit: false,
      canUseAI: false,
      canExport: true,
      canInvite: false,
      status: 'expired',
      daysSinceExpired,
      banner: {
        type: 'error',
        message: 'תקופת הניסיון הסתיימה. המידע שלך שמור בבטחה במצב "ארכיון" (צפייה וייצוא בלבד).',
        action: { label: 'שדרג עכשיו להמשך עבודה', href: '/workspaces/onboarding' }
      }
    };
  }

  // Case 3: Blocked - No Access
  return {
    canView: false,
    canEdit: false,
    canUseAI: false,
    canExport: false,
    canInvite: false,
    status: currentStatus,
    daysSinceExpired,
    banner: {
      type: 'error',
      message: 'הגישה לארגון נחסמה עקב סיום תקופת הניסיון. צור קשר עם התמיכה לשחזור גישה.',
      action: { label: 'צור קשר', href: 'mailto:support@misrad-ai.com' }
    }
  };
}

/**
 * Server-side helper to ensure access.
 */
export function validateAccess(entitlements: Entitlements, mode: 'view' | 'edit' = 'view') {
  if (mode === 'view' && !entitlements.canView) {
    redirect('/app/trial-expired');
  }
  if (mode === 'edit' && !entitlements.canEdit) {
    return false;
  }
  return true;
}
