import 'server-only';

import { Prisma } from '@prisma/client';

import { filterSensitiveData, hasPermission, requirePermission } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { resolveWorkspaceCurrentUserForApi } from '@/lib/server/workspaceUser';
import { isUuidLike as isUUID } from '@/lib/server/workspace-access/utils';

import type { User } from '@/types';

import {
  createNexusUserRow,
  deleteNexusUserRowsById,
  findNexusUserRowById,
  listNexusUserRows,
  updateNexusUserRowsById,
} from '@/lib/services/nexus-users-service';

import { asObject, toInputJsonValue } from './utils';
import { mapUserRow } from './mappers';

export async function listNexusUsers(params: {
  orgId: string;
  userId?: string;
  department?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ users: User[]; page: number; pageSize: number; hasMore: boolean }> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;

  const canManageTeam = await hasPermission('manage_team');
  const dbUserObj = asObject(resolved.user) ?? {};
  const dbUserId = String(dbUserObj.id ?? '').trim();
  const myDepartment =
    typeof dbUserObj.department === 'string' && dbUserObj.department.trim() ? String(dbUserObj.department) : null;

  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(200, Math.max(1, Math.floor(params.pageSize ?? 50)));
  const offset = (page - 1) * pageSize;

  let rows: unknown[] = [];
  if (params.userId) {
    const row = await findNexusUserRowById({
      organizationId: workspace.id,
      userId: params.userId,
      ...(params.department ? { department: params.department } : {}),
    });
    rows = row ? [row] : [];
  } else {
    const where: Omit<Prisma.NexusUserWhereInput, 'organizationId'> = {};

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

    rows = await listNexusUserRows({
      organizationId: workspace.id,
      where,
      skip: offset,
      take: pageSize + 1,
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
  }

  const now = new Date();
  const mapped = rows.map((row) => mapUserRow(row, now));

  if (params.userId) {
    const target = mapped[0];
    if (!target) throw new Error('User not found');

    if (String(target.id) !== String(dbUserId) && !canManageTeam) {
      throw new Error('Forbidden');
    }

    const filtered = await filterSensitiveData(target, 'user');
    return { users: [{ ...target, ...filtered }], page, pageSize, hasMore: false };
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
        ...(await filterSensitiveData(u, 'user')),
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

  const createdRow = await createNexusUserRow({
    data: {
      organizationId: workspace.id,
      name: String(body.name),
      role: String(body.role || 'עובד'),
      department: body.department ?? null,
      avatar:
        body.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(String(body.name))}&background=random&color=fff`,
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
      notificationPreferences: toInputJsonValue(
        body.notificationPreferences ?? {
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
        }
      ),
      twoFactorEnabled: false,
      isSuperAdmin: requester.isSuperAdmin ? Boolean(body.isSuperAdmin) : false,
      managerId: body.managerId ?? null,
      managed_department: body.managedDepartment ?? null,
    },
  });

  const created = mapUserRow(createdRow);
  await logAuditEvent('data.write', 'user', {
    resourceId: created.id,
    details: { createdBy: requester.id },
    success: true,
  });

  return created;
}

export async function updateNexusUser(params: {
  orgId: string;
  userId: string;
  updates: Partial<User>;
}): Promise<User> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;
  const requester = resolved.clerkUser;

  await requirePermission('manage_team');

  const updatesObj = asObject(params.updates) ?? {};
  const patch: Record<string, unknown> = {};

  if (updatesObj.notificationPreferences !== undefined) {
    patch.notificationPreferences = toInputJsonValue(updatesObj.notificationPreferences);
  }
  if (updatesObj.uiPreferences !== undefined) {
    patch.uiPreferences = toInputJsonValue(updatesObj.uiPreferences);
  }
  if (updatesObj.targets !== undefined) {
    patch.targets = toInputJsonValue(updatesObj.targets);
  }
  if (updatesObj.pendingReward !== undefined) {
    patch.pendingReward =
      updatesObj.pendingReward == null ? Prisma.DbNull : toInputJsonValue(updatesObj.pendingReward);
  }
  if (updatesObj.billingInfo !== undefined) {
    patch.billingInfo =
      updatesObj.billingInfo == null ? Prisma.DbNull : toInputJsonValue(updatesObj.billingInfo);
  }

  for (const key of Object.keys(updatesObj)) {
    if (
      [
        'notificationPreferences',
        'uiPreferences',
        'targets',
        'pendingReward',
        'billingInfo',
        'tenantId',
        'organizationId',
      ].includes(key)
    )
      continue;
    patch[key] = updatesObj[key];
  }

  const updatedCount = await updateNexusUserRowsById({
    organizationId: workspace.id,
    userId: params.userId,
    data: patch as Prisma.NexusUserUpdateManyMutationInput,
  });
  if (!updatedCount.count) throw new Error('Failed to update user');

  const row = await findNexusUserRowById({ organizationId: workspace.id, userId: params.userId });
  if (!row) throw new Error('Failed to update user');

  const updated = mapUserRow(row);
  await logAuditEvent('data.write', 'user', {
    resourceId: updated.id,
    details: { updatedBy: requester.id, updates: params.updates },
    success: true,
  });

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

  const updatedCount = await updateNexusUserRowsById({
    organizationId: workspace.id,
    userId: dbUserId,
    data: {
      targets: toInputJsonValue(nextTargets),
    },
  });
  if (!updatedCount.count) throw new Error('Failed to update targets');

  const row = await findNexusUserRowById({ organizationId: workspace.id, userId: dbUserId });
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

  const res = await deleteNexusUserRowsById({ organizationId: workspace.id, userId: params.userId });
  if (!res.count) throw new Error('Failed to delete user');

  await logAuditEvent('data.delete', 'user', {
    resourceId: params.userId,
    details: { deletedBy: requester.id },
    success: true,
  });

  return { ok: true };
}

export function assertUuidLikeOrThrow(value: string, field: string): string {
  const v = String(value || '').trim();
  if (!v || !isUUID(v)) {
    throw new Error(`Invalid ${field}`);
  }
  return v;
}

export function toUuidLikeOrNull(value: string | null | undefined): string | null {
  const v = value == null ? '' : String(value).trim();
  if (!v) return null;
  return isUUID(v) ? v : null;
}
