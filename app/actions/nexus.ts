'use server';

import { requireWorkspaceAccessByOrgSlug, requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { currentUser } from '@clerk/nextjs/server';
import type { Task, User, TimeEntry } from '@/types';

import {
  createNexusTask as createNexusTaskInternal,
  deleteNexusTask as deleteNexusTaskInternal,
  listNexusTasks as listNexusTasksInternal,
  updateNexusTask as updateNexusTaskInternal,
} from './nexus/_internal/tasks';

import { getNexusMe as getNexusMeImpl } from './nexus/_internal/me';
import { updateNexusPresenceHeartbeat as updateNexusPresenceHeartbeatImpl } from './nexus/_internal/presence';
import { sendNexusUserInvitation as sendNexusUserInvitationImpl } from './nexus/_internal/invitations';

import {
  listNexusUsers as listNexusUsersImpl,
  createNexusUser as createNexusUserImpl,
  updateNexusUser as updateNexusUserImpl,
  updateNexusMyTargets as updateNexusMyTargetsImpl,
  deleteNexusUser as deleteNexusUserImpl,
} from './nexus/_internal/users';

import {
  listNexusTimeEntries as listNexusTimeEntriesImpl,
  createNexusTimeEntry as createNexusTimeEntryImpl,
  updateNexusTimeEntry as updateNexusTimeEntryImpl,
  deleteNexusTimeEntry as deleteNexusTimeEntryImpl,
  voidNexusTimeEntry as voidNexusTimeEntryImpl,
} from './nexus/_internal/time-entries';

type ClerkUserContext = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isSuperAdmin: boolean;
};

async function requireWorkspaceAccessForOrgId(orgId: string) {
  const normalized = String(orgId || '').trim();
  if (!normalized) throw new Error('Missing orgId');
  return requireWorkspaceAccessByOrgSlugApi(normalized);
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
  return listNexusTasksInternal({
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
  return createNexusTaskInternal({ orgId: workspace.id, input: params.input });
}

export async function updateNexusTaskByOrgSlug(params: {
  orgSlug: string;
  taskId: string;
  updates: Partial<Task>;
}): Promise<Task> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  return updateNexusTaskInternal({ orgId: workspace.id, taskId: params.taskId, updates: params.updates });
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
  await requireWorkspaceAccessForOrgId(params.orgId);
  return listNexusTasksInternal(params);
}

export async function createNexusTask(params: {
  orgId: string;
  input: (Omit<Task, 'id'> & { leadId?: string | null }) & { id?: string | null };
}): Promise<Task> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  return createNexusTaskInternal(params);
}

export async function updateNexusTask(params: { orgId: string; taskId: string; updates: Partial<Task> }): Promise<Task> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  return updateNexusTaskInternal(params);
}

export async function deleteNexusTask(params: { orgId: string; taskId: string }): Promise<{ ok: true }> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  return deleteNexusTaskInternal(params);
}

export async function getNexusMe(params: { orgId: string }): Promise<{
  user: User | null;
  clerkUser: ClerkUserContext | null;
  tenant: { id: string; name: string; ownerEmail: string } | null;
  isTenantAdmin: boolean;
  matched: boolean;
}> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  return getNexusMeImpl(params);
}

export async function updateNexusPresenceHeartbeat(params: {
  orgId: string;
}): Promise<{
  ok: true;
  serverTime: string;
  debug?: { workspaceId: string; userId: string; usedFallback: boolean; updatedCount: number };
}> {
  const workspace = await requireWorkspaceAccessForOrgId(params.orgId);
  const clerk = await currentUser();
  const clerkUserId = clerk?.id || null;
  if (!clerkUserId) throw new Error('Unauthorized');
  const emailRaw = clerk?.primaryEmailAddress?.emailAddress ?? null;
  const email = emailRaw ? String(emailRaw).trim().toLowerCase() : '';
  return updateNexusPresenceHeartbeatImpl({
    orgId: params.orgId,
    _prevalidated: { workspaceId: workspace.id, clerkUserId, email },
  });
}

export async function sendNexusUserInvitation(params: {
  orgId: string;
  email: string;
  userId?: string | null;
  userName?: string | null;
  department?: string | null;
  role?: string | null;
}): Promise<{ success: true; signupUrl: string; emailSent: boolean }> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  return sendNexusUserInvitationImpl(params);
}

export async function listNexusUsers(params: {
  orgId: string;
  userId?: string;
  department?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ users: User[]; page: number; pageSize: number; hasMore: boolean }> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  return listNexusUsersImpl(params);
}

export async function createNexusUser(params: { orgId: string; input: Omit<User, 'id'> }): Promise<User> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  return createNexusUserImpl(params);
}

export async function updateNexusUser(params: { orgId: string; userId: string; updates: Partial<User> }): Promise<User> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  return updateNexusUserImpl(params);
}

export async function updateNexusMyTargets(params: { orgId: string; targets: User['targets'] }): Promise<User> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  return updateNexusMyTargetsImpl(params);
}

export async function deleteNexusUser(params: { orgId: string; userId: string }): Promise<{ ok: true }> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  return deleteNexusUserImpl(params);
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
  await requireWorkspaceAccessForOrgId(params.orgId);
  return listNexusTimeEntriesImpl(params);
}

export async function createNexusTimeEntry(params: {
  orgId: string;
  input: Partial<TimeEntry> & { userId?: string };
}): Promise<TimeEntry> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  return createNexusTimeEntryImpl(params);
}

export async function updateNexusTimeEntry(params: {
  orgId: string;
  entryId: string;
  endTime?: string;
  updates?: Partial<TimeEntry> & { userId?: string };
}): Promise<TimeEntry> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  return updateNexusTimeEntryImpl(params);
}

export async function deleteNexusTimeEntry(params: { orgId: string; entryId: string }): Promise<{ ok: true }> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  return deleteNexusTimeEntryImpl(params);
}

export async function voidNexusTimeEntry(params: { orgId: string; entryId: string; reason: string }): Promise<TimeEntry> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  return voidNexusTimeEntryImpl(params);
}
