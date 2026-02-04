'use server';

import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase';
import { currentUser } from '@clerk/nextjs/server';
import prisma, { executeRawOrgScoped } from '@/lib/prisma';
import { resolveWorkspaceCurrentUserForApi } from '@/lib/server/workspaceUser';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { Prisma } from '@prisma/client';
import {
  canAccessResource,
  filterSensitiveData,
  hasPermission,
  requirePermission,
} from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { getOwnedTenant, isTenantAdmin } from '@/lib/auth';
import { getBaseUrl } from '@/lib/utils';
import { sendEmployeeInvitationEmail } from '@/lib/email';
import type { Task, User, TimeEntry } from '../../types';

type ClerkUserContext = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isSuperAdmin: boolean;
};

function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

const PRESENCE_TTL_MS = 2 * 60 * 1000;

function parseLastSeenToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function isUserOnlineFromRow(row: Record<string, unknown>, now = new Date()): boolean {
  const lastSeenRaw = row.last_seen_at ?? row.lastSeenAt;
  const lastSeen = parseLastSeenToDate(lastSeenRaw);
  if (!lastSeen) {
    // Fallback for legacy rows.
    return Boolean(row.online ?? false);
  }
  return now.getTime() - lastSeen.getTime() <= PRESENCE_TTL_MS;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : '';
}

export async function listNexusTasksByOrgSlug(params: {
  orgSlug: string;
  taskId?: string;
  assigneeId?: string;
  status?: string;
  leadId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ tasks: Task[]; page: number; pageSize: number; hasMore: boolean }> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  return listNexusTasks({
    orgId: workspace.id,
    taskId: params.taskId,
    assigneeId: params.assigneeId,
    status: params.status,
    leadId: params.leadId,
    page: params.page,
    pageSize: params.pageSize,
  });
}

export async function createNexusTaskByOrgSlug(params: {
  orgSlug: string;
  input: Omit<Task, 'id'> & { leadId?: string | null };
}): Promise<Task> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  return createNexusTask({ orgId: workspace.id, input: params.input });
}

export async function updateNexusTaskByOrgSlug(params: {
  orgSlug: string;
  taskId: string;
  updates: Partial<Task>;
}): Promise<Task> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  return updateNexusTask({ orgId: workspace.id, taskId: params.taskId, updates: params.updates });
}

function parseJson(value: unknown) {
  if (!value) return undefined;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function toNumberMaybe(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  const obj = asObject(value);
  const maybeToNumber = obj?.toNumber;
  if (typeof maybeToNumber === 'function') {
    try {
      const n = (maybeToNumber as () => unknown).call(value);
      return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function toIsoStringMaybe(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === 'string' && value.trim()) return value;
  return undefined;
}

function toDateOnlyStringMaybe(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'string' && value.trim()) return value;
  return undefined;
}

function toTimeHHmmStringMaybe(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const hh = String(value.getUTCHours()).padStart(2, '0');
    const mm = String(value.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  if (typeof value === 'string' && value.trim()) {
    const s = value.trim();
    const m = s.match(/^(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : s;
  }
  return undefined;
}

function parseDateOnlyToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
}

function parseTimeHHmmToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const hh = String(Math.max(0, Math.min(23, Number(m[1])))).padStart(2, '0');
  const mm = String(Math.max(0, Math.min(59, Number(m[2])))).padStart(2, '0');
  return new Date(`1970-01-01T${hh}:${mm}:00.000Z`);
}

function mapUserRow(row: unknown): User {
  const obj = asObject(row) ?? {};
  const now = new Date();
  const isDev = process.env.NODE_ENV !== 'production';
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

function toTaskDto(row: unknown): Task {
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
    completionDetails: obj.completion_details ?? obj.completionDetails ?? undefined,
    department: obj.department ?? undefined,
  } as Task;
}

function mapTimeEntryRow(row: unknown): TimeEntry {
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

export async function getNexusMe(params: { orgId: string }): Promise<{
  user: User | null;
  clerkUser: ClerkUserContext | null;
  tenant: { id: string; name: string; ownerEmail: string } | null;
  isTenantAdmin: boolean;
  matched: boolean;
}> {
  const orgId = String(params.orgId || '').trim();
  if (!orgId) {
    return { user: null, clerkUser: null, tenant: null, isTenantAdmin: false, matched: false };
  }

  const resolved = await resolveWorkspaceCurrentUserForApi(orgId);

  const normalizeJson = (value: unknown): Record<string, unknown> => {
    const obj = asObject(value);
    return obj ?? {};
  };

  let profileRow: unknown = null;
  try {
    profileRow = await prisma.profile.findFirst({
      where: {
        organizationId: resolved.workspace.id,
        clerkUserId: resolved.clerkUser.id,
      },
    });
  } catch {
    // ignore
  }

  const profileObj = asObject(profileRow) ?? {};

  const nexusUserObj = asObject(resolved.user) ?? {};
  const now = new Date();
  const canonicalUser: User = {
    id: String(nexusUserObj.id ?? ''),
    name: String(profileObj.full_name ?? nexusUserObj.name ?? ''),
    role: String(profileObj.role ?? nexusUserObj.role ?? resolved.clerkUser.role ?? 'עובד'),
    department: typeof nexusUserObj.department === 'string' ? nexusUserObj.department : undefined,
    avatar: String(profileObj.avatar_url ?? nexusUserObj.avatar ?? ''),
    online: isUserOnlineFromRow(nexusUserObj, now),
    capacity: Number(nexusUserObj.capacity ?? 0),
    email: String(profileObj.email ?? nexusUserObj.email ?? resolved.clerkUser.email ?? ''),
    phone: typeof profileObj.phone === 'string' ? profileObj.phone : undefined,
    location: typeof profileObj.location === 'string' ? profileObj.location : undefined,
    bio: typeof profileObj.bio === 'string' ? profileObj.bio : undefined,
    targets: normalizeJson(nexusUserObj.targets) as unknown as User['targets'],
    notificationPreferences: normalizeJson(
      profileObj.notification_preferences ?? nexusUserObj.notificationPreferences
    ) as unknown as User['notificationPreferences'],
    uiPreferences: normalizeJson(profileObj.ui_preferences ?? nexusUserObj.uiPreferences) as unknown as User['uiPreferences'],
    twoFactorEnabled: Boolean(profileObj.two_factor_enabled ?? nexusUserObj.twoFactorEnabled ?? false),
    isSuperAdmin: Boolean(
      nexusUserObj.is_super_admin ?? nexusUserObj.isSuperAdmin ?? resolved.clerkUser.isSuperAdmin
    ),
    isTenantAdmin: Boolean(nexusUserObj.isTenantAdmin ?? false),
    organizationId: resolved.workspace.id,
    tenantId: resolved.workspace.id,
    billingInfo: normalizeJson(profileObj.billing_info ?? nexusUserObj.billingInfo) as unknown as User['billingInfo'],
  };

  let tenant: unknown = null;
  let tenantAdminStatus = false;
  try {
    tenant = await getOwnedTenant();
    tenantAdminStatus = await isTenantAdmin(String(asObject(tenant)?.id ?? ''));
  } catch {
    tenant = null;
    tenantAdminStatus = false;
  }

  const tenantObj = asObject(tenant);

  return {
    user: canonicalUser,
    clerkUser: resolved.clerkUser as ClerkUserContext,
    tenant: tenantObj
      ? {
          id: String(tenantObj.id ?? ''),
          name: String(tenantObj.name ?? ''),
          ownerEmail: String(tenantObj.ownerEmail ?? ''),
        }
      : null,
    isTenantAdmin: tenantAdminStatus,
    matched: true,
  };
}

export async function updateNexusPresenceHeartbeat(params: {
  orgId: string;
}): Promise<{
  ok: true;
  serverTime: string;
  debug?: { workspaceId: string; userId: string; usedFallback: boolean; updatedCount: number };
}> {
  // Fast path: try to get workspace and user info with minimal DB calls
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgId);
    
    const clerk = await currentUser();
    const clerkUserId = clerk?.id || null;
    if (!clerkUserId) {
      throw new Error('Unauthorized');
    }

    const now = new Date();
    const isDev = process.env.NODE_ENV !== 'production';

    // Try direct update first - this is the most common case
    try {
      const result = await prisma.nexusUser.update({
        where: {
          id: clerkUserId,
          organizationId: workspace.id,
        },
        data: {
          online: true,
          lastSeenAt: now,
        },
        select: { id: true },
      });
      
      return {
        ok: true,
        serverTime: now.toISOString(),
        ...(isDev
          ? { debug: { workspaceId: workspace.id, userId: clerkUserId, usedFallback: false, updatedCount: result ? 1 : 0 } }
          : {}),
      };
    } catch (updateError) {
      // If direct update fails, fall back to the full resolution logic
      const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
      const dbUser = asObject(resolved.user) ?? {};
      const dbUserId = String(dbUser.id ?? '').trim();
      if (!dbUserId) throw new Error('User not found');

      const updateData = { online: true } as any;
      updateData.lastSeenAt = now;

      let updatedCount: { count: number } | null = null;
      let usedFallback = false;
      try {
        // Use update instead of updateMany for better performance
        const result = await prisma.nexusUser.update({
          where: {
            id: dbUserId,
            organizationId: workspace.id,
          },
          data: updateData,
          select: { id: true },
        });
        updatedCount = { count: result ? 1 : 0 };
      } catch {
        // If the DB isn't migrated yet (missing last_seen_at), fall back to legacy behavior.
        usedFallback = true;
        updatedCount = await prisma.nexusUser.updateMany({
          where: {
            id: dbUserId,
            organizationId: workspace.id,
          },
          data: {
            online: true,
          },
        });
      }
      if (!updatedCount?.count) {
        throw new Error(
          isDev
            ? `Failed to update presence (userId=${dbUserId} workspaceId=${workspace.id} orgId=${params.orgId} usedFallback=${usedFallback})`
            : 'Failed to update presence'
        );
      }
      return {
        ok: true,
        serverTime: now.toISOString(),
        ...(isDev
          ? { debug: { workspaceId: workspace.id, userId: dbUserId, usedFallback, updatedCount: updatedCount.count } }
          : {}),
      };
    }
  } catch (error) {
    // If anything fails, fall back to the original implementation
    const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
    const workspace = resolved.workspace;

    const dbUser = asObject(resolved.user) ?? {};
    const dbUserId = String(dbUser.id ?? '').trim();
    if (!dbUserId) throw new Error('User not found');

    const now = new Date();
    const isDev = process.env.NODE_ENV !== 'production';

    const updateData = { online: true } as any;
    updateData.lastSeenAt = now;

    let updatedCount: { count: number } | null = null;
    let usedFallback = false;
    try {
      // Use update instead of updateMany for better performance
      const result = await prisma.nexusUser.update({
        where: {
          id: dbUserId,
          organizationId: workspace.id,
        },
        data: updateData,
        select: { id: true },
      });
      updatedCount = { count: result ? 1 : 0 };
    } catch {
      // If the DB isn't migrated yet (missing last_seen_at), fall back to legacy behavior.
      usedFallback = true;
      updatedCount = await prisma.nexusUser.updateMany({
        where: {
          id: dbUserId,
          organizationId: workspace.id,
        },
        data: {
          online: true,
        },
      });
    }
    if (!updatedCount?.count) {
      throw new Error(
        isDev
          ? `Failed to update presence (userId=${dbUserId} workspaceId=${workspace.id} orgId=${params.orgId} usedFallback=${usedFallback})`
          : 'Failed to update presence'
      );
    }
    return {
      ok: true,
      serverTime: now.toISOString(),
      ...(isDev
        ? { debug: { workspaceId: workspace.id, userId: dbUserId, usedFallback, updatedCount: updatedCount.count } }
        : {}),
    };
  }
}

export async function sendNexusUserInvitation(params: {
  orgId: string;
  email: string;
  userId?: string | null;
  userName?: string | null;
  department?: string | null;
  role?: string | null;
}): Promise<{ success: true; signupUrl: string; emailSent: boolean }> {
  const orgId = String(params.orgId || '').trim();
  if (!orgId) throw new Error('Missing orgId');

  await resolveWorkspaceCurrentUserForApi(orgId);
  await requirePermission('manage_team');

  const email = String(params.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email address');
  }

  const resolved = await resolveWorkspaceCurrentUserForApi(orgId);
  const workspace = resolved.workspace;

  const loadUserInWorkspaceByEmail = async (workspaceId: string, userEmail: string) => {
    return prisma.nexusUser.findFirst({
      where: {
        organizationId: workspaceId,
        email: userEmail,
      },
      select: { id: true, name: true, department: true, role: true },
    });
  };

  const loadUserInWorkspaceById = async (workspaceId: string, id: string) => {
    return prisma.nexusUser.findFirst({
      where: {
        organizationId: workspaceId,
        id,
      },
      select: { id: true, name: true, department: true, role: true },
    });
  };

  const currentUser = await loadUserInWorkspaceByEmail(workspace.id, String(resolved.clerkUser.email || '').trim().toLowerCase());
  if (!currentUser) {
    throw new Error('User not found');
  }

  type InvitedUserRow = Awaited<ReturnType<typeof loadUserInWorkspaceById>>;
  let invitedUser: InvitedUserRow = null;
  if (params.userId) {
    invitedUser = await loadUserInWorkspaceById(workspace.id, String(params.userId));
  }

  const baseUrl = getBaseUrl();
  const signupUrl = `${baseUrl}/login?mode=sign-up&email=${encodeURIComponent(email)}&invited=true`;

  const emailResult = await sendEmployeeInvitationEmail(
    email,
    params.userName || invitedUser?.name || null,
    params.department || invitedUser?.department || 'כללי',
    params.role || invitedUser?.role || 'עובד',
    signupUrl,
    currentUser.name || null
  );

  return {
    success: true,
    signupUrl,
    emailSent: Boolean(emailResult.success),
  };
}

function parseSbRef(ref: string): { bucket: string; path: string } | null {
  const s = String(ref || '').trim();
  if (!s.startsWith('sb://')) return null;
  const rest = s.slice('sb://'.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  const bucket = rest.slice(0, slash).trim();
  const path = rest.slice(slash + 1);
  if (!bucket || !path) return null;
  return { bucket, path };
}

function assertStoragePathScoped(params: {
  rawRef: string;
  path: string;
  organizationId: string;
  orgSlug?: string | null;
}) {
  const orgId = String(params.organizationId || '').trim();
  if (!orgId) {
    throw new Error('[TenantIsolation] Missing organizationId for storage scope validation.');
  }

  const segments = String(params.path || '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!segments.length || segments[0] !== orgId) {
    throw new Error(
      `[TenantIsolation] Storage ref blocked: path must start with organizationId. expected=${orgId} ref=${params.rawRef}`
    );
  }

  if (params.orgSlug) {
    const slug = String(params.orgSlug).trim();
    if (slug && !segments.includes(slug)) {
      throw new Error(
        `[TenantIsolation] Storage ref blocked: orgSlug not present in path. expectedSlug=${slug} ref=${params.rawRef}`
      );
    }
  }
}

async function resolveStorageUrlMaybe(
  refOrUrl: string | null | undefined,
  ttlSeconds: number,
  scope: { organizationId: string; orgSlug?: string | null }
): Promise<string | null> {
  const raw = refOrUrl === null || refOrUrl === undefined ? '' : String(refOrUrl).trim();
  if (!raw) return null;
  const parsed = parseSbRef(raw);
  if (!parsed) return raw;

  try {
    assertStoragePathScoped({
      rawRef: raw,
      path: parsed.path,
      organizationId: scope.organizationId,
      orgSlug: scope.orgSlug,
    });
    const supabase = createClient();
    const { data, error } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, ttlSeconds);
    if (error || !data?.signedUrl) return null;
    return String(data.signedUrl);
  } catch {
    return null;
  }
}

function normalizeMessagesForStorage(messages: unknown): Prisma.InputJsonValue {
  const list: unknown[] = Array.isArray(messages) ? messages : [];
  if (!Array.isArray(messages)) return messages as Prisma.InputJsonValue;
  return list.map((m) => {
    const msgObj = asObject(m);
    if (!msgObj) return m;

    const attachmentObj = asObject(msgObj.attachment);
    if (!attachmentObj) return m;

    const ref = typeof attachmentObj.ref === 'string' ? String(attachmentObj.ref).trim() : '';
    const url = typeof attachmentObj.url === 'string' ? String(attachmentObj.url).trim() : '';
    const stable = ref || url;
    if (!stable) return m;

    return {
      ...msgObj,
      attachment: {
        name: attachmentObj.name,
        type: attachmentObj.type,
        url: stable,
      },
    };
  }) as Prisma.InputJsonValue;
}

async function resolveTaskAttachmentsForResponse(task: Task, scope: { organizationId: string; orgSlug?: string | null }): Promise<Task> {
  const ttlSeconds = 60 * 60;
  const taskObj = asObject(task) ?? {};
  const messages: unknown[] = Array.isArray(taskObj.messages) ? (taskObj.messages as unknown[]) : [];

  const resolvedMessages = await Promise.all(
    messages.map(async (m) => {
      const msgObj = asObject(m);
      if (!msgObj) return m;

      const attachmentObj = asObject(msgObj.attachment);
      if (!attachmentObj) return m;

      const ref =
        typeof attachmentObj.url === 'string' && String(attachmentObj.url).trim().startsWith('sb://')
          ? String(attachmentObj.url).trim()
          : typeof attachmentObj.ref === 'string'
            ? String(attachmentObj.ref).trim()
            : null;

      if (!ref || !ref.startsWith('sb://')) return m;

      const signed = await resolveStorageUrlMaybe(ref, ttlSeconds, scope);
      return {
        ...msgObj,
        attachment: {
          ...attachmentObj,
          ref,
          url: signed || ref,
        },
      };
    })
  );

  return {
    ...task,
    messages: resolvedMessages as unknown as Task['messages'],
  } as Task;
}

export async function listNexusTasks(params: {
  orgId: string;
  taskId?: string;
  assigneeId?: string;
  status?: string;
  leadId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ tasks: Task[]; page: number; pageSize: number; hasMore: boolean }> {
  const { orgId, taskId, assigneeId, status } = params;
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(200, Math.max(1, Math.floor(params.pageSize ?? 50)));
  const offset = (page - 1) * pageSize;
  const take = pageSize + 1;

  const resolved = await resolveWorkspaceCurrentUserForApi(orgId);
  const workspace = resolved.workspace;
  const dbUser = asObject(resolved.user) ?? {};
  const dbUserId = String(dbUser.id ?? '').trim();

  await requirePermission('view_crm');

  const isManager = await hasPermission('manage_team');

  const where: Prisma.NexusTaskWhereInput = { organizationId: workspace.id };

  if (taskId) {
    where.id = taskId;
  }

  if (status) {
    where.status = status;
  } else if (!taskId) {
    where.status = { notIn: ['Done', 'done'] };
  }

  if (assigneeId) {
    where.OR = [{ assigneeId }, { assigneeIds: { has: assigneeId } }];
  } else if (!taskId && !isManager && dbUserId) {
    where.OR = [{ assigneeId: dbUserId }, { assigneeIds: { has: dbUserId } }, { creatorId: dbUserId }];
  }

  const rows = await prisma.nexusTask.findMany({
    where,
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    skip: offset,
    take,
  });

  const hasMore = rows.length > pageSize;
  const trimmed = hasMore ? rows.slice(0, pageSize) : rows;

  const tasks = await Promise.all(
    trimmed.map((row) => resolveTaskAttachmentsForResponse(toTaskDto(row), { organizationId: workspace.id, orgSlug: workspace.slug }))
  );

  logAuditEvent('data.read', 'task', { success: true }).catch(() => null);

  return { tasks, page, pageSize, hasMore };
}

export async function createNexusTask(params: {
  orgId: string;
  input: (Omit<Task, 'id'> & { leadId?: string | null }) & { id?: string | null };
}): Promise<Task> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;
  const user = resolved.clerkUser;
  const dbUser = asObject(resolved.user) ?? {};
  const dbUserId = String(dbUser.id ?? '').trim();

  await requirePermission('view_crm');

  const body = params.input;
  if (!body?.title) throw new Error('Title is required');

  const creatorId = typeof body.creatorId === 'string' && isUUID(body.creatorId) ? body.creatorId : dbUserId;

  const assigneeIdsRaw = Array.isArray(body.assigneeIds) ? body.assigneeIds : [];
  const assigneeIds = assigneeIdsRaw.filter((id): id is string => typeof id === 'string' && isUUID(id));
  let assigneeId = typeof body.assigneeId === 'string' && isUUID(body.assigneeId) ? body.assigneeId : undefined;

  if (assigneeId && !assigneeIds.includes(assigneeId)) assigneeIds.push(assigneeId);
  if (!assigneeIds.length) {
    assigneeIds.push(dbUserId);
    assigneeId = dbUserId;
  }

  const ensuredTaskId = typeof body.id === 'string' && String(body.id).trim() ? String(body.id).trim() : randomUUID();

  const createdRow = await prisma.nexusTask.create({
    data: {
      id: ensuredTaskId,
      organizationId: workspace.id,
      title: String(body.title),
      description: body.description ? String(body.description) : null,
      status: String(body.status || 'Todo'),
      priority: body.priority ? String(body.priority) : null,
      assigneeIds,
      assigneeId: assigneeId || null,
      creatorId: creatorId || null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      createdAt: typeof body.createdAt === 'string' ? new Date(body.createdAt) : new Date(),
      dueDate: parseDateOnlyToDate(body.dueDate) ?? null,
      dueTime: parseTimeHHmmToDate(body.dueTime) ?? null,
      timeSpent: Number(body.timeSpent ?? 0),
      estimatedTime: body.estimatedTime ?? null,
      approvalStatus: body.approvalStatus ?? null,
      isTimerRunning: Boolean(body.isTimerRunning),
      messages: normalizeMessagesForStorage(body.messages || []),
      clientId: body.clientId ?? null,
      isPrivate: Boolean(body.isPrivate),
      audioUrl: body.audioUrl ?? null,
      snoozeCount: body.snoozeCount ?? 0,
      isFocus: Boolean(body.isFocus),
      completionDetails:
        body.completionDetails == null ? Prisma.DbNull : (body.completionDetails as unknown as Prisma.InputJsonValue),
      department: body.department ?? user.role ?? null,
    },
  });

  const createdTask = await resolveTaskAttachmentsForResponse(toTaskDto(createdRow), { organizationId: workspace.id, orgSlug: workspace.slug });

  logAuditEvent('data.write', 'task', { resourceId: createdTask.id, details: { createdBy: user.id } }).catch(() => null);

  try {
    const recipients = assigneeIds.filter((assignee: string) => assignee !== creatorId);
    for (const recipientId of recipients) {
      await executeRawOrgScoped(prisma, {
        organizationId: workspace.id,
        reason: 'nexus_task_notification_assigned',
        query: `
          insert into misrad_notifications (organization_id, recipient_id, type, text, is_read, created_at, updated_at)
          values ($1::uuid, $2::uuid, $3::text, $4::text, false, now(), now())
        `,
        values: [String(workspace.id), String(recipientId), 'TASK', `שויכת למשימה: ${createdTask.title}`],
      });
    }
  } catch {
    // ignore
  }

  return createdTask;
}

export async function updateNexusTask(params: { orgId: string; taskId: string; updates: Partial<Task> }): Promise<Task> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;
  const user = resolved.clerkUser;

  const taskId = String(params.taskId || '').trim();
  if (!taskId) throw new Error('Task ID is required');

  const isSuperAdmin = user?.isSuperAdmin === true;
  const canAccess = isSuperAdmin ? true : await canAccessResource('task', taskId, 'write', { organizationId: workspace.id });
  if (!canAccess) throw new Error('Forbidden');

  const existingRow = await prisma.nexusTask.findFirst({
    where: {
      id: taskId,
      organizationId: workspace.id,
    },
  });
  if (!existingRow) throw new Error('Task not found');

  const existingTask = toTaskDto(existingRow);

  const updates = params.updates;
  const patch: Prisma.NexusTaskUpdateManyMutationInput = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.priority !== undefined) patch.priority = updates.priority == null ? null : String(updates.priority);
  if (updates.assigneeIds !== undefined) patch.assigneeIds = updates.assigneeIds;
  if (updates.assigneeId !== undefined) patch.assigneeId = updates.assigneeId ?? null;
  if (updates.creatorId !== undefined) patch.creatorId = updates.creatorId;
  if (updates.tags !== undefined) patch.tags = updates.tags;
  if (updates.dueDate !== undefined) patch.dueDate = parseDateOnlyToDate(updates.dueDate) ?? null;
  if (updates.dueTime !== undefined) patch.dueTime = parseTimeHHmmToDate(updates.dueTime) ?? null;
  if (updates.timeSpent !== undefined) patch.timeSpent = Number(updates.timeSpent ?? 0);
  if (updates.estimatedTime !== undefined) patch.estimatedTime = updates.estimatedTime ?? null;
  if (updates.approvalStatus !== undefined) patch.approvalStatus = updates.approvalStatus ?? null;
  if (updates.isTimerRunning !== undefined) patch.isTimerRunning = Boolean(updates.isTimerRunning);
  if (updates.messages !== undefined) patch.messages = normalizeMessagesForStorage(updates.messages);
  if (updates.clientId !== undefined) patch.clientId = updates.clientId ?? null;
  if (updates.isPrivate !== undefined) patch.isPrivate = Boolean(updates.isPrivate);
  if (updates.audioUrl !== undefined) patch.audioUrl = updates.audioUrl ?? null;
  if (updates.snoozeCount !== undefined) patch.snoozeCount = updates.snoozeCount ?? 0;
  if (updates.isFocus !== undefined) patch.isFocus = Boolean(updates.isFocus);
  if (updates.completionDetails !== undefined) {
    patch.completionDetails =
      updates.completionDetails == null
        ? Prisma.DbNull
        : (updates.completionDetails as unknown as Prisma.InputJsonValue);
  }
  if (updates.department !== undefined) patch.department = updates.department ?? null;

  const updatedCount = await prisma.nexusTask.updateMany({
    where: {
      id: taskId,
      organizationId: workspace.id,
    },
    data: patch,
  });
  if (!updatedCount.count) throw new Error('Failed to update task');

  const updatedRow = await prisma.nexusTask.findFirst({
    where: { id: taskId, organizationId: workspace.id },
  });
  if (!updatedRow) throw new Error('Failed to update task');

  const updated = await resolveTaskAttachmentsForResponse(toTaskDto(updatedRow), { organizationId: workspace.id, orgSlug: workspace.slug });

  await logAuditEvent('data.write', 'task', { resourceId: taskId, details: { updatedBy: user.id, updates: params.updates } });

  try {
    if (updates.assigneeIds && Array.isArray(updates.assigneeIds)) {
      const oldAssignees = existingTask.assigneeIds || [];
      const newAssignees = updates.assigneeIds.filter((id: string) => !oldAssignees.includes(id));

      for (const recipientId of newAssignees) {
        await executeRawOrgScoped(prisma, {
          organizationId: workspace.id,
          reason: 'nexus_task_notification_assigned_update',
          query: `
            insert into misrad_notifications (organization_id, recipient_id, type, text, is_read, created_at, updated_at)
            values ($1::uuid, $2::uuid, $3::text, $4::text, false, now(), now())
          `,
          values: [String(workspace.id), String(recipientId), 'TASK', `שויכת למשימה: ${updated.title}`],
        });
      }
    }

    if (updates.status && updates.status !== existingTask.status) {
      const importantStatuses = ['Done', 'Waiting for Review'];
      if (importantStatuses.includes(updates.status) && existingTask.creatorId && existingTask.creatorId !== user.id) {
        await executeRawOrgScoped(prisma, {
          organizationId: workspace.id,
          reason: 'nexus_task_notification_status',
          query: `
            insert into misrad_notifications (organization_id, recipient_id, type, text, is_read, created_at, updated_at)
            values ($1::uuid, $2::uuid, $3::text, $4::text, false, now(), now())
          `,
          values: [
            String(workspace.id),
            String(existingTask.creatorId),
            'TASK',
            `סטטוס משימה השתנה ל-${updates.status}: ${updated.title}`,
          ],
        });
      }
    }
  } catch {
    // ignore
  }

  return updated;
}

export async function voidNexusTimeEntry(params: { orgId: string; entryId: string; reason: string }): Promise<TimeEntry> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;
  const dbUser = asObject(resolved.user) ?? {};
  const dbUserId = String(dbUser.id ?? '').trim();

  const canManageTeam = await hasPermission('manage_team');

  const entryId = String(params.entryId || '').trim();
  if (!entryId) throw new Error('Entry ID is required');

  const entryRow = await prisma.nexusTimeEntry.findFirst({
    where: {
      id: entryId,
      organizationId: workspace.id,
    },
  });
  const entry = entryRow ? mapTimeEntryRow(entryRow) : null;
  if (!entry) throw new Error('Entry not found');
  if (!entryRow) throw new Error('Entry not found');

  if (entry.userId !== dbUserId && !canManageTeam) {
    throw new Error('Forbidden');
  }

  const reason = String(params.reason || '').trim();
  if (!reason) throw new Error('Reason is required');

  const nowIso = new Date();
  const updatedCount = await prisma.nexusTimeEntry.updateMany({
    where: { id: entryId, organizationId: workspace.id },
    data: {
      voidReason: reason,
      voidedBy: dbUserId,
      voidedAt: nowIso,
    },
  });
  if (!updatedCount.count) throw new Error('Failed to void time entry');

  const updatedRow = await prisma.nexusTimeEntry.findFirst({
    where: { id: entryId, organizationId: workspace.id },
  });
  if (!updatedRow) throw new Error('Failed to void time entry');

  const updated = mapTimeEntryRow(updatedRow);
  logAuditEvent('data.write', 'time_entry', { resourceId: entryId, details: { action: 'void' }, success: true }).catch(() => null);

  return updated;
}

export async function deleteNexusTask(params: { orgId: string; taskId: string }): Promise<{ ok: true }> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;
  const user = resolved.clerkUser;

  await requirePermission('view_crm');

  const taskId = String(params.taskId || '').trim();
  if (!taskId) throw new Error('Task ID is required');

  const isSuperAdmin = user?.isSuperAdmin === true;
  const canAccess = isSuperAdmin ? true : await canAccessResource('task', taskId, 'write', { organizationId: workspace.id });
  if (!canAccess) throw new Error('Forbidden');

  const res = await prisma.nexusTask.deleteMany({
    where: {
      id: taskId,
      organizationId: workspace.id,
    },
  });
  if (!res.count) throw new Error('Failed to delete task');

  logAuditEvent('data.delete', 'task', { resourceId: taskId, details: { organizationId: workspace.id }, success: true }).catch(() => null);

  return { ok: true };
}

export async function listNexusUsers(params: {
  orgId: string;
  userId?: string;
  department?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ users: User[]; page: number; pageSize: number; hasMore: boolean }> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;
  const authUser = resolved.clerkUser;

  const canManageTeam = await hasPermission('manage_team');
  const dbUserObj = asObject(resolved.user) ?? {};
  const dbUserId = String(dbUserObj.id ?? '').trim();
  const myDepartment = typeof dbUserObj.department === 'string' && dbUserObj.department.trim() ? String(dbUserObj.department) : null;

  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(200, Math.max(1, Math.floor(params.pageSize ?? 50)));
  const offset = (page - 1) * pageSize;
  const endInclusive = offset + pageSize;

  let rows: unknown[] = [];
  if (params.userId) {
    const row = await prisma.nexusUser.findFirst({
      where: {
        id: params.userId,
        organizationId: workspace.id,
        ...(params.department ? { department: params.department } : {}),
      },
    });
    rows = row ? [row] : [];
  } else {
    const where: Prisma.NexusUserWhereInput = {
      organizationId: workspace.id,
    };

    if (canManageTeam) {
      if (params.department) {
        where.department = params.department;
      }
    } else {
      // Scope employees to their own department (or just themselves if no department is set).
      if (myDepartment) {
        where.department = myDepartment;
      } else if (dbUserId) {
        where.id = dbUserId;
      }
    }

    const found = await prisma.nexusUser.findMany({
      where,
      skip: offset,
      take: endInclusive - offset + 1,
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        avatar: true,
        online: true,
        lastSeenAt: true,
        capacity: true,
        location: true,
        bio: true,
        paymentType: true,
        hourlyRate: true,
        monthlySalary: true,
        commissionPct: true,
        bonusPerTask: true,
        accumulatedBonus: true,
        streakDays: true,
        weeklyScore: true,
        pendingReward: true,
        targets: true,
        notificationPreferences: true,
        twoFactorEnabled: true,
        isSuperAdmin: true,
        billingInfo: true,
        createdAt: true,
        updatedAt: true,
        managerId: true,
        roleId: true,
        managed_department: true,
        uiPreferences: true,
      },
    });
    rows = Array.isArray(found) ? found : [];
  }

  const mapped = rows.map(mapUserRow);

  if (params.userId) {
    const target = mapped[0];
    if (!target) throw new Error('User not found');

    if (String(target.id) !== String(dbUserId) && !canManageTeam) {
      throw new Error('Forbidden');
    }

    const filtered = await filterSensitiveData(target as unknown as Record<string, unknown>, 'user');
    return { users: [{ ...target, ...(filtered as Partial<User>) }], page, pageSize, hasMore: false };
  }

  let filteredUsers: User[];
  if (!canManageTeam) {
    filteredUsers = mapped.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      avatar: u.avatar,
      online: u.online,
      capacity: u.capacity || 0,
    }));
  } else {
    filteredUsers = await Promise.all(
      mapped.map(async (u) => ({
        ...u,
        ...((await filterSensitiveData(u as unknown as Record<string, unknown>, 'user')) as Partial<User>),
      }))
    );
  }

  const hasMore = rows.length > pageSize;
  const trimmed = hasMore ? filteredUsers.slice(0, pageSize) : filteredUsers;

  logAuditEvent('data.read', 'user', { success: true }).catch(() => null);

  return { users: trimmed, page, pageSize, hasMore };
}

export async function createNexusUser(params: { orgId: string; input: Omit<User, 'id'> }): Promise<User> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;
  const requester = resolved.clerkUser;

  await requirePermission('manage_team');

  const body = params.input;
  if (!body?.name || !body?.email) throw new Error('Name and email are required');

  if (body.isSuperAdmin && !requester.isSuperAdmin) {
    throw new Error('Forbidden - Only Super Admins can create Super Admin users');
  }

  const createdRow = await prisma.nexusUser.create({
    data: {
      organizationId: workspace.id,
      name: String(body.name),
      role: String(body.role || 'עובד'),
      department: body.department ?? null,
      avatar: body.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(String(body.name))}&background=random&color=fff`,
      online: false,
      capacity: Number(body.capacity ?? 0),
      email: String(body.email),
      phone: body.phone ?? null,
      location: body.location ?? null,
      bio: body.bio ?? null,
      paymentType: body.paymentType ?? null,
      hourlyRate: body.hourlyRate ?? null,
      monthlySalary: body.monthlySalary ?? null,
      commissionPct: body.commissionPct ?? null,
      bonusPerTask: body.bonusPerTask ?? null,
      accumulatedBonus: 0,
      streakDays: 0,
      weeklyScore: null,
      notificationPreferences: (body.notificationPreferences ?? {
        emailNewTask: true,
        browserPush: true,
        morningBrief: true,
        soundEffects: false,
        marketing: true,
        pushBehavior: 'vibrate_sound',
        pushCategories: {
          alerts: true,
          tasks: true,
          events: true,
          system: true,
          marketing: false,
        },
      }) as unknown as Prisma.InputJsonValue,
      twoFactorEnabled: false,
      isSuperAdmin: requester.isSuperAdmin ? Boolean(body.isSuperAdmin) : false,
    },
  });

  const created = mapUserRow(createdRow);
  await logAuditEvent('data.write', 'user', { resourceId: created.id, details: { createdBy: requester.id }, success: true });

  return created;
}

export async function updateNexusUser(params: { orgId: string; userId: string; updates: Partial<User> }): Promise<User> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;
  const requester = resolved.clerkUser;

  await requirePermission('manage_team');

  const updatesObj = asObject(params.updates) ?? {};
  const patch: Record<string, unknown> = {};

  if (updatesObj.notificationPreferences !== undefined) {
    patch.notificationPreferences = updatesObj.notificationPreferences as unknown as Prisma.InputJsonValue;
  }
  if (updatesObj.uiPreferences !== undefined) {
    patch.uiPreferences = updatesObj.uiPreferences as unknown as Prisma.InputJsonValue;
  }
  if (updatesObj.targets !== undefined) {
    patch.targets = updatesObj.targets as unknown as Prisma.InputJsonValue;
  }
  if (updatesObj.pendingReward !== undefined) {
    patch.pendingReward =
      updatesObj.pendingReward == null
        ? Prisma.DbNull
        : (updatesObj.pendingReward as unknown as Prisma.InputJsonValue);
  }
  if (updatesObj.billingInfo !== undefined) {
    patch.billingInfo =
      updatesObj.billingInfo == null
        ? Prisma.DbNull
        : (updatesObj.billingInfo as unknown as Prisma.InputJsonValue);
  }

  for (const key of Object.keys(updatesObj)) {
    if (
      ['notificationPreferences', 'uiPreferences', 'targets', 'pendingReward', 'billingInfo', 'tenantId', 'organizationId'].includes(
        key
      )
    )
      continue;
    patch[key] = updatesObj[key];
  }

  const updatedCount = await prisma.nexusUser.updateMany({
    where: {
      id: params.userId,
      organizationId: workspace.id,
    },
    data: patch as Prisma.NexusUserUpdateManyMutationInput,
  });
  if (!updatedCount.count) throw new Error('Failed to update user');

  const row = await prisma.nexusUser.findFirst({
    where: {
      id: params.userId,
      organizationId: workspace.id,
    },
  });
  if (!row) throw new Error('Failed to update user');

  const updated = mapUserRow(row);
  await logAuditEvent('data.write', 'user', { resourceId: updated.id, details: { updatedBy: requester.id, updates: params.updates }, success: true });

  return updated;
}

export async function updateNexusMyTargets(params: { orgId: string; targets: User['targets'] }): Promise<User> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;
  const requester = resolved.clerkUser;

  const dbUser = asObject(resolved.user) ?? {};
  const dbUserId = String(dbUser.id ?? '').trim();
  if (!dbUserId) throw new Error('User not found');

  const targetsObj = asObject(params.targets) ?? {};

  const tasksMonthRaw = targetsObj.tasksMonth;
  const tasksMonthNumber =
    typeof tasksMonthRaw === 'number'
      ? tasksMonthRaw
      : typeof tasksMonthRaw === 'string' && tasksMonthRaw.trim()
        ? Number(tasksMonthRaw)
        : NaN;

  if (!Number.isFinite(tasksMonthNumber)) throw new Error('Missing tasksMonth');

  const leadsMonthRaw = targetsObj.leadsMonth;
  const leadsMonthNumber =
    typeof leadsMonthRaw === 'number'
      ? leadsMonthRaw
      : typeof leadsMonthRaw === 'string' && leadsMonthRaw.trim()
        ? Number(leadsMonthRaw)
        : undefined;

  const nextTargets: Record<string, unknown> = {
    tasksMonth: Math.max(0, Math.floor(tasksMonthNumber)),
  };
  if (leadsMonthRaw !== undefined) {
    nextTargets.leadsMonth =
      leadsMonthNumber === undefined || !Number.isFinite(leadsMonthNumber)
        ? 0
        : Math.max(0, Math.floor(leadsMonthNumber));
  }

  const updatedCount = await prisma.nexusUser.updateMany({
    where: {
      id: dbUserId,
      organizationId: workspace.id,
    },
    data: {
      targets: nextTargets as unknown as Prisma.InputJsonValue,
    },
  });
  if (!updatedCount.count) throw new Error('Failed to update targets');

  const row = await prisma.nexusUser.findFirst({
    where: {
      id: dbUserId,
      organizationId: workspace.id,
    },
  });
  if (!row) throw new Error('Failed to update targets');

  const updated = mapUserRow(row);
  await logAuditEvent('data.write', 'user', {
    resourceId: updated.id,
    details: { updatedBy: requester.id, updates: { targets: nextTargets } },
    success: true,
  });

  return updated;
}

export async function deleteNexusUser(params: { orgId: string; userId: string }): Promise<{ ok: true }> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;
  const requester = resolved.clerkUser;

  await requirePermission('manage_team');

  const res = await prisma.nexusUser.deleteMany({
    where: {
      id: params.userId,
      organizationId: workspace.id,
    },
  });
  if (!res.count) throw new Error('Failed to delete user');

  await logAuditEvent('data.delete', 'user', { resourceId: params.userId, details: { deletedBy: requester.id }, success: true });

  return { ok: true };
}

export async function listNexusTimeEntries(params: {
  orgId: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  includeVoided?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{ timeEntries: TimeEntry[]; page: number; pageSize: number; hasMore: boolean }> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;
  const dbUser = asObject(resolved.user) ?? {};
  const dbUserId = String(dbUser.id ?? '').trim();

  const canManageTeam = await hasPermission('manage_team');

  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(200, Math.max(1, Math.floor(params.pageSize ?? 50)));

  const requestedUserId = params.userId ? (isUUID(params.userId) ? params.userId : null) : null;
  if (params.userId && !requestedUserId) throw new Error('Invalid userId');

  if (requestedUserId && requestedUserId !== dbUserId && !canManageTeam) {
    throw new Error('Forbidden');
  }

  const queryUserId = requestedUserId ? requestedUserId : canManageTeam ? undefined : dbUserId;

  const offset = (page - 1) * pageSize;
  const take = pageSize + 1;

  const where: Prisma.NexusTimeEntryWhereInput = { organizationId: workspace.id };
  if (queryUserId) where.userId = queryUserId;
  if (params.dateFrom || params.dateTo) {
    const dateFilter: Prisma.DateTimeFilter<'NexusTimeEntry'> = {};
    if (params.dateFrom) {
      const d = parseDateOnlyToDate(params.dateFrom);
      if (d) dateFilter.gte = d;
    }
    if (params.dateTo) {
      const d = parseDateOnlyToDate(params.dateTo);
      if (d) dateFilter.lte = d;
    }
    if (Object.keys(dateFilter).length) where.date = dateFilter;
  }
  if (!params.includeVoided) where.voidedAt = null;

  const rows = await prisma.nexusTimeEntry.findMany({
    where,
    orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    skip: offset,
    take,
  });

  const hasMore = rows.length > pageSize;
  const trimmed = hasMore ? rows.slice(0, pageSize) : rows;

  const timeEntries = trimmed.map(mapTimeEntryRow);

  logAuditEvent('data.read', 'time_entry', { success: true }).catch(() => null);

  return { timeEntries, page, pageSize, hasMore };
}

export async function createNexusTimeEntry(params: { orgId: string; input: Partial<TimeEntry> & { userId?: string } }): Promise<TimeEntry> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;
  const dbUser = asObject(resolved.user) ?? {};
  const dbUserId = String(dbUser.id ?? '').trim();
  const requester = resolved.clerkUser;

  const canManageTeam = await hasPermission('manage_team');

  const body = params.input;
  const requestedUserId = typeof body.userId === 'string' && isUUID(body.userId) ? body.userId : null;
  if (requestedUserId && requestedUserId !== dbUserId && !canManageTeam) {
    throw new Error('Forbidden');
  }

  const userId = requestedUserId || dbUserId;
  const now = new Date();
  const start = typeof body?.startTime === 'string' ? new Date(body.startTime) : now;
  const end = typeof body?.endTime === 'string' && body.endTime ? new Date(body.endTime) : null;
  const date = parseDateOnlyToDate(body?.date) ?? new Date(start.toISOString().slice(0, 10) + 'T00:00:00.000Z');
  const durationMinutes =
    typeof body?.durationMinutes === 'number'
      ? body.durationMinutes
      : end && end.getTime() > start.getTime()
        ? Math.round((end.getTime() - start.getTime()) / 60000)
        : 0;

  const createdRow = await prisma.nexusTimeEntry.create({
    data: {
      organizationId: workspace.id,
      userId,
      startTime: start,
      endTime: end,
      date,
      durationMinutes,
    },
  });

  const entry = mapTimeEntryRow(createdRow);
  await logAuditEvent('data.write', 'time_entry', { resourceId: entry.id, details: { createdBy: requester.id }, success: true });

  return entry;
}

export async function updateNexusTimeEntry(params: {
  orgId: string;
  entryId: string;
  endTime?: string;
  updates?: Partial<TimeEntry> & { userId?: string };
}): Promise<TimeEntry> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;
  const dbUser = asObject(resolved.user) ?? {};
  const dbUserId = String(dbUser.id ?? '').trim();
  const requester = resolved.clerkUser;

  const canManageTeam = await hasPermission('manage_team');

  const entryId = String(params.entryId || '').trim();
  if (!entryId) throw new Error('Entry ID is required');

  const entryRow = await prisma.nexusTimeEntry.findFirst({
    where: {
      id: entryId,
      organizationId: workspace.id,
    },
  });
  const entry = entryRow ? mapTimeEntryRow(entryRow) : null;
  if (!entry) throw new Error('Entry not found');
  if (!entryRow) throw new Error('Entry not found');

  if (entry.userId !== dbUserId && !canManageTeam) {
    throw new Error('Forbidden');
  }

  const updates = params.updates || {};
  const patch: Record<string, unknown> = {};

  if (updates.userId !== undefined) {
    if (!canManageTeam) throw new Error('Forbidden');
    patch.userId = String(updates.userId);
  }

  if (updates.date !== undefined) {
    patch.date = parseDateOnlyToDate(updates.date) ?? null;
  }

  if (updates.startTime !== undefined) {
    patch.startTime = updates.startTime ? new Date(String(updates.startTime)) : null;
  }

  const resolvedEndTime = updates.endTime !== undefined
    ? (updates.endTime ? String(updates.endTime) : null)
    : (typeof params.endTime === 'string' ? params.endTime : undefined);

  if (resolvedEndTime !== undefined) {
    patch.endTime = resolvedEndTime ? new Date(String(resolvedEndTime)) : null;
  }

  const effectiveStart = patch.startTime ?? entryRow.startTime;
  const effectiveEnd = patch.endTime !== undefined ? patch.endTime : entryRow.endTime;
  if (effectiveEnd) {
    const startTimeMs = new Date(String(effectiveStart)).getTime();
    const endTimeMs = new Date(String(effectiveEnd)).getTime();
    patch.durationMinutes = endTimeMs > startTimeMs ? Math.round((endTimeMs - startTimeMs) / 60000) : 0;
  } else {
    patch.durationMinutes = 0;
  }

  const updatedCount = await prisma.nexusTimeEntry.updateMany({
    where: {
      id: entryId,
      organizationId: workspace.id,
    },
    data: patch as Prisma.NexusTimeEntryUpdateManyMutationInput,
  });
  if (!updatedCount.count) throw new Error('Failed to update time entry');

  const updatedRow = await prisma.nexusTimeEntry.findFirst({
    where: { id: entryId, organizationId: workspace.id },
  });
  if (!updatedRow) throw new Error('Failed to update time entry');

  const updated = mapTimeEntryRow(updatedRow);

  await logAuditEvent('data.write', 'time_entry', { resourceId: entryId, details: { updatedBy: requester.id }, success: true });

  return updated;
}

export async function deleteNexusTimeEntry(params: { orgId: string; entryId: string }): Promise<{ ok: true }> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;
  const dbUser = asObject(resolved.user) ?? {};
  const dbUserId = String(dbUser.id ?? '').trim();
  const requester = resolved.clerkUser;

  const canManageTeam = await hasPermission('manage_team');

  const entryId = String(params.entryId || '').trim();
  if (!entryId) throw new Error('Entry ID is required');

  const entryRow = await prisma.nexusTimeEntry.findFirst({
    where: {
      id: entryId,
      organizationId: workspace.id,
    },
  });
  const entry = entryRow ? mapTimeEntryRow(entryRow) : null;
  if (!entry) throw new Error('Entry not found');

  if (entry.userId !== dbUserId && !canManageTeam) {
    throw new Error('Forbidden');
  }

  const res = await prisma.nexusTimeEntry.deleteMany({
    where: {
      id: entryId,
      organizationId: workspace.id,
    },
  });
  if (!res.count) throw new Error('Failed to delete time entry');

  await logAuditEvent('data.delete', 'time_entry', { resourceId: entryId, details: { deletedBy: requester.id }, success: true });

  return { ok: true };
}
