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

/** @deprecated Prefer listNexusTasks with orgId. Kept for system module callers that only have orgSlug. */
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
  return listNexusTasks({ ...params, orgId: workspace.id });
}

/** @deprecated Prefer createNexusTask with orgId. */
export async function createNexusTaskByOrgSlug(params: {
  orgSlug: string;
  input: Omit<Task, 'id'> & { leadId?: string | null };
}): Promise<Task> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  return createNexusTask({ orgId: workspace.id, input: params.input });
}

/** @deprecated Prefer updateNexusTask with orgId. */
export async function updateNexusTaskByOrgSlug(params: {
  orgSlug: string;
  taskId: string;
  updates: Partial<Task>;
}): Promise<Task> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  return updateNexusTask({ orgId: workspace.id, taskId: params.taskId, updates: params.updates });
}

export async function listNexusTasks(params: {
  orgId: string;
  taskId?: string;
  assigneeId?: string;
  status?: string;
  leadId?: string;
  module?: string;
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
  const result = await createNexusTaskInternal(params);
  return result;
}

export async function updateNexusTask(params: { orgId: string; taskId: string; updates: Partial<Task> }): Promise<Task> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  const result = await updateNexusTaskInternal(params);
  // No revalidatePath — client manages optimistic state; broad revalidation causes bounce-back race conditions
  return result;
}

export async function deleteNexusTask(params: { orgId: string; taskId: string }): Promise<{ ok: true }> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  const result = await deleteNexusTaskInternal(params);
  // No revalidatePath — client manages optimistic state; broad revalidation causes bounce-back race conditions
  return result;
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
  const result = await sendNexusUserInvitationImpl(params);
  return result;
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
  const result = await createNexusUserImpl(params);
  return result;
}

export async function updateNexusUser(params: { orgId: string; userId: string; updates: Partial<User> }): Promise<User> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  const result = await updateNexusUserImpl(params);
  return result;
}

export async function updateNexusMyTargets(params: { orgId: string; targets: User['targets'] }): Promise<User> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  const result = await updateNexusMyTargetsImpl(params);
  return result;
}

export async function deleteNexusUser(params: { orgId: string; userId: string }): Promise<{ ok: true }> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  const result = await deleteNexusUserImpl(params);
  return result;
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
  const result = await createNexusTimeEntryImpl(params);
  return result;
}

export async function updateNexusTimeEntry(params: {
  orgId: string;
  entryId: string;
  endTime?: string;
  updates?: Partial<TimeEntry> & { userId?: string };
}): Promise<TimeEntry> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  const result = await updateNexusTimeEntryImpl(params);
  return result;
}

export async function deleteNexusTimeEntry(params: { orgId: string; entryId: string }): Promise<{ ok: true }> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  const result = await deleteNexusTimeEntryImpl(params);
  return result;
}

export async function voidNexusTimeEntry(params: { orgId: string; entryId: string; reason: string }): Promise<TimeEntry> {
  await requireWorkspaceAccessForOrgId(params.orgId);
  const result = await voidNexusTimeEntryImpl(params);
  return result;
}
