import type { ClientStatus, PostStatus, OnboardingStatus } from '@/types/social';

/** Hebrew labels for ClientStatus values */
const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  Active: 'פעיל',
  Paused: 'מושהה',
  Archived: 'בארכיון',
  'Pending Payment': 'ממתין לתשלום',
  Onboarding: 'בתהליך קליטה',
  Overdue: 'בפיגור',
};

/** Hebrew labels for PostStatus values */
const POST_STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'טיוטה',
  internal_review: 'בבדיקה פנימית',
  scheduled: 'מתוזמן',
  published: 'פורסם',
  failed: 'נכשל',
  pending_approval: 'ממתין לאישור',
};

/** Hebrew labels for OnboardingStatus values */
const ONBOARDING_STATUS_LABELS: Record<OnboardingStatus, string> = {
  invited: 'ממתין להקמה',
  completed: 'הושלם',
};

/** Get Hebrew label for a client status. Falls back to the raw value if unknown. */
export function getClientStatusLabel(status: ClientStatus | string | null | undefined): string {
  if (!status) return '—';
  return CLIENT_STATUS_LABELS[status as ClientStatus] ?? status;
}

/** Get Hebrew label for a post status. Falls back to the raw value if unknown. */
export function getPostStatusLabel(status: PostStatus | string | null | undefined): string {
  if (!status) return '—';
  return POST_STATUS_LABELS[status as PostStatus] ?? status;
}

/** Get Hebrew label for an onboarding status. Falls back to the raw value if unknown. */
export function getOnboardingStatusLabel(status: OnboardingStatus | string | null | undefined): string {
  if (!status) return '—';
  return ONBOARDING_STATUS_LABELS[status as OnboardingStatus] ?? status;
}

/** CSS color class for client status badge */
export function getClientStatusColor(status: ClientStatus | string | null | undefined): string {
  const s = String(status || '').toLowerCase();
  if (s === 'active') return 'bg-green-50 text-green-600';
  if (s === 'paused') return 'bg-amber-50 text-amber-600';
  if (s === 'archived') return 'bg-slate-100 text-slate-500';
  if (s === 'pending payment') return 'bg-orange-50 text-orange-600';
  if (s === 'onboarding') return 'bg-blue-50 text-blue-600';
  if (s === 'overdue') return 'bg-red-50 text-red-600';
  return 'bg-slate-100 text-slate-600';
}

/** Dot color for client status */
export function getClientStatusDotColor(status: ClientStatus | string | null | undefined): string {
  const s = String(status || '').toLowerCase();
  if (s === 'active') return 'bg-green-500';
  if (s === 'overdue') return 'bg-red-500';
  if (s === 'onboarding') return 'bg-blue-500';
  if (s === 'paused') return 'bg-amber-500';
  return 'bg-slate-400';
}
