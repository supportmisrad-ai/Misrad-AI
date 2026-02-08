import type { Task, User, TimeEntry } from '@/types';

import {
  asObject,
  isUserOnlineFromRow,
  parseJson,
  toDateOnlyStringMaybe,
  toIsoStringMaybe,
  toNumberMaybe,
  toTimeHHmmStringMaybe,
} from './utils.pure';

export function mapUserRow(row: unknown, now: Date = new Date()): User {
  const obj = asObject(row) ?? {};
  const organizationId =
    (obj.organization_id ?? obj.organizationId ?? obj.tenant_id ?? obj.tenantId) == null
      ? undefined
      : String(obj.organization_id ?? obj.organizationId ?? obj.tenant_id ?? obj.tenantId);
  return {
    id: String(obj.id ?? ''),
    name: String(obj.name ?? obj.full_name ?? obj.fullName ?? obj.email ?? ''),
    role: String(obj.role ?? 'עובד'),
    department: obj.department == null ? undefined : String(obj.department),
    avatar: String(obj.avatar ?? obj.avatar_url ?? obj.avatarUrl ?? ''),
    online: isUserOnlineFromRow(obj, now),
    capacity: Number(obj.capacity ?? 0),
    email: obj.email == null ? undefined : String(obj.email),
    phone: obj.phone == null ? undefined : String(obj.phone),
    location: obj.location == null ? undefined : String(obj.location),
    bio: obj.bio == null ? undefined : String(obj.bio),
    paymentType: obj.payment_type ?? obj.paymentType,
    hourlyRate: toNumberMaybe(obj.hourly_rate ?? obj.hourlyRate),
    monthlySalary: toNumberMaybe(obj.monthly_salary ?? obj.monthlySalary),
    commissionPct: obj.commission_pct ?? obj.commissionPct,
    bonusPerTask: toNumberMaybe(obj.bonus_per_task ?? obj.bonusPerTask),
    accumulatedBonus: toNumberMaybe(obj.accumulated_bonus ?? obj.accumulatedBonus),
    streakDays: obj.streak_days ?? obj.streakDays,
    weeklyScore: toNumberMaybe(obj.weekly_score ?? obj.weeklyScore),
    notificationPreferences: parseJson(obj.notification_preferences ?? obj.notificationPreferences),
    uiPreferences: parseJson(obj.ui_preferences ?? obj.uiPreferences),
    targets: parseJson(obj.targets),
    pendingReward: parseJson(obj.pending_reward ?? obj.pendingReward),
    billingInfo: parseJson(obj.billing_info ?? obj.billingInfo),
    twoFactorEnabled: Boolean(obj.two_factor_enabled ?? obj.twoFactorEnabled ?? false),
    isSuperAdmin: Boolean(obj.is_super_admin ?? obj.isSuperAdmin ?? false),
    managerId: obj.manager_id ?? obj.managerId ?? undefined,
    managedDepartment: obj.managed_department ?? obj.managedDepartment ?? undefined,
    organizationId,
    tenantId: organizationId,
  } as User;
}

export function toTaskDto(row: unknown): Task {
  const obj = asObject(row) ?? {};
  return {
    id: String(obj.id ?? ''),
    title: String(obj.title ?? ''),
    description: obj.description ? String(obj.description) : '',
    status: String(obj.status ?? ''),
    priority: (obj.priority ?? 'Low') as Task['priority'],
    assigneeIds: (obj.assignee_ids ?? obj.assigneeIds ?? []) as string[],
    assigneeId:
      obj.assignee_id === null || obj.assigneeId === null
        ? null
        : (obj.assignee_id ?? obj.assigneeId ?? undefined),
    creatorId: obj.creator_id ?? obj.creatorId ?? undefined,
    tags: (obj.tags || []) as string[],
    createdAt: toIsoStringMaybe(obj.created_at ?? obj.createdAt) ?? new Date().toISOString(),
    dueDate: toDateOnlyStringMaybe(obj.due_date ?? obj.dueDate) ?? undefined,
    dueTime: toTimeHHmmStringMaybe(obj.due_time ?? obj.dueTime) ?? undefined,
    timeSpent: (obj.time_spent ?? obj.timeSpent ?? 0) as number,
    estimatedTime: obj.estimated_time ?? obj.estimatedTime ?? undefined,
    approvalStatus: obj.approval_status ?? obj.approvalStatus ?? undefined,
    isTimerRunning: Boolean(obj.is_timer_running ?? obj.isTimerRunning),
    messages: (() => {
      const v = obj.messages;
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') {
        try {
          return JSON.parse(v);
        } catch {
          return [];
        }
      }
      return v ?? [];
    })(),
    clientId: obj.client_id ?? obj.clientId ?? undefined,
    isPrivate: obj.is_private ?? obj.isPrivate ?? undefined,
    audioUrl: obj.audio_url ?? obj.audioUrl ?? undefined,
    snoozeCount: obj.snooze_count ?? obj.snoozeCount ?? undefined,
    isFocus: obj.is_focus ?? obj.isFocus ?? undefined,
    completionDetails: parseJson(obj.completion_details ?? obj.completionDetails),
    department: obj.department ?? undefined,
  } as Task;
}

export function mapTimeEntryRow(row: unknown): TimeEntry {
  const obj = asObject(row) ?? {};
  return {
    id: String(obj.id ?? ''),
    userId: String(obj.user_id ?? obj.userId ?? ''),
    startTime: toIsoStringMaybe(obj.start_time ?? obj.startTime) ?? '',
    endTime: toIsoStringMaybe(obj.end_time ?? obj.endTime),
    date: toDateOnlyStringMaybe(obj.date) ?? String(obj.date ?? ''),
    durationMinutes: Number(obj.duration_minutes ?? obj.durationMinutes ?? 0),
    voidReason: obj.void_reason ?? obj.voidReason ?? null,
    voidedBy: obj.voided_by ?? obj.voidedBy ?? null,
    voidedAt: toIsoStringMaybe(obj.voided_at ?? obj.voidedAt),
  } as TimeEntry;
}
