import prisma from '@/lib/prisma';
import { getClientsPage } from '@/app/actions/clients';
import { getTeamMembers } from '@/app/actions/team';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import type { ActivityLog, Client, ClientRequest, Conversation, Idea, ManagerRequest, PostStatus, SocialPlatform, SocialPost, SocialTask, TeamMember } from '@/types/social';
import * as React from 'react';
import { asObject, getErrorMessage } from '@/lib/shared/unknown';
import { ALLOW_SCHEMA_FALLBACKS, isSchemaMismatchError, reportSchemaFallback } from '@/lib/server/schema-fallbacks';
import { createStorageClient } from '@/lib/supabase';
import { resolveStorageUrlsMaybeBatchedServiceRole, resolveStorageUrlsMaybeBatchedWithClient, toSbRefMaybe } from '@/lib/services/operations/storage';

type CacheFn = <Args extends unknown[], R>(fn: (...args: Args) => R) => (...args: Args) => R;
function identityCache<Args extends unknown[], R>(fn: (...args: Args) => R) {
  return fn;
}

const reactCache: unknown = Reflect.get(React, 'cache');
const cache: CacheFn = typeof reactCache === 'function' ? (reactCache as CacheFn) : identityCache;

export type SocialNavigationItem = {
  id: string;
  label: string;
  icon: string;
  view: string;
  section: 'global' | 'client' | 'management' | 'settings' | 'admin';
  order: number;
  isVisible: boolean;
  requiresClient?: boolean;
  requiresRole?: string[] | null;
};

export type SocialInitialData = {
  orgSlug: string;
  clients: Client[];
  team: TeamMember[];
  posts: SocialPost[];
  tasks: SocialTask[];
  clientRequests: ClientRequest[];
  managerRequests: ManagerRequest[];
  conversations: Conversation[];
  ideas: Idea[];
  SquareActivity: ActivityLog[];
  counters: {
    postsTotal: number;
    postsDraft: number;
    postsScheduled: number;
    postsPublished: number;
  };
};

function isMissingRelationOrColumnError(error: unknown): boolean {
  const obj = asObject(error) ?? {};
  const code = String(obj.code ?? '').toLowerCase();
  const message = String(obj.message ?? '').toLowerCase();
  return code === 'p2021' || code === 'p2022' || code === '42p01' || code === '42703' || message.includes('does not exist') || message.includes('relation') || message.includes('column');
}

function getString(value: unknown): string {
  return String(value ?? '');
}

function isNavSection(value: unknown): value is SocialNavigationItem['section'] {
  return value === 'global' || value === 'client' || value === 'management' || value === 'settings' || value === 'admin';
}

function isSocialPlatform(value: unknown): value is SocialPlatform {
  return (
    value === 'facebook' ||
    value === 'instagram' ||
    value === 'linkedin' ||
    value === 'tiktok' ||
    value === 'twitter' ||
    value === 'google' ||
    value === 'whatsapp' ||
    value === 'threads' ||
    value === 'youtube' ||
    value === 'pinterest' ||
    value === 'portal'
  );
}

function isPostStatus(value: unknown): value is PostStatus {
  return (
    value === 'draft' ||
    value === 'internal_review' ||
    value === 'scheduled' ||
    value === 'published' ||
    value === 'failed' ||
    value === 'pending_approval'
  );
}

function toIsoStringOrEmpty(value: unknown): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

function isActivityTargetType(value: unknown): value is ActivityLog['targetType'] {
  return value === 'post' || value === 'client' || value === 'task' || value === 'system';
}

function isSocialTaskPriority(value: unknown): value is SocialTask['priority'] {
  return value === 'high' || value === 'medium' || value === 'low';
}

function isSocialTaskStatus(value: unknown): value is SocialTask['status'] {
  return value === 'todo' || value === 'completed' || value === 'in_progress';
}

function isSocialTaskType(value: unknown): value is SocialTask['type'] {
  return value === 'approval' || value === 'message' || value === 'creative' || value === 'general' || value === 'payment';
}

function isClientRequestType(value: unknown): value is ClientRequest['type'] {
  return value === 'media' || value === 'text' || value === 'campaign';
}

function isClientRequestStatus(value: unknown): value is ClientRequest['status'] {
  return value === 'new' || value === 'processed' || value === 'needs_fix';
}

function isManagerRequestType(value: unknown): value is ManagerRequest['type'] {
  return value === 'media' || value === 'info' || value === 'feedback';
}

function isManagerRequestStatus(value: unknown): value is ManagerRequest['status'] {
  return value === 'pending' || value === 'completed' || value === 'rejected';
}

export async function getSocialNavigationMenu(): Promise<SocialNavigationItem[]> {
  try {
    const data = await prisma.navigationMenu.findMany({
      where: { is_visible: true },
      orderBy: [{ section: 'asc' }, { order: 'asc' }],
    });

    return (data || []).map((item) => {
      let requiresRole: string[] | null = null;
      try {
        const rr = item.requires_role;
        if (rr) {
          const parsed = typeof rr === 'string' ? JSON.parse(rr) : rr;
          requiresRole = Array.isArray(parsed) ? parsed.map((r) => String(r)).filter(Boolean) : null;
        }
      } catch {
        requiresRole = null;
      }

      return {
        id: getString(item.id),
        label: getString(item.label),
        icon: getString(item.icon),
        view: getString(item.view),
        section: isNavSection(item.section) ? item.section : 'global',
        order: Number(item.order || 0),
        isVisible: item.is_visible !== false,
        requiresClient: Boolean(item.requires_client),
        requiresRole,
      };
    });
  } catch (error: unknown) {
    if (isMissingRelationOrColumnError(error) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] social_navigation_menu missing table/column (${getErrorMessage(error) || 'missing relation'})`);
    }

    if (isMissingRelationOrColumnError(error) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'lib/services/social-service.getSocialNavigationMenu',
        reason: 'social_navigation_menu missing table/column (fallback to empty array)',
        error,
      });
    }
    return [];
  }
}

async function getSocialPostsInternal(params: {
  organizationId: string;
  clientId?: string;
}): Promise<SocialPost[]> {
  const organizationId = params.organizationId;

  const posts = (await prisma.socialPost.findMany({
    where: {
      organizationId,
      ...(params.clientId ? { clientId: params.clientId } : {}),
    },
    select: {
      id: true,
      clientId: true,
      content: true,
      media_url: true,
      status: true,
      scheduled_at: true,
      published_at: true,
      createdAt: true,
      postPlatforms: { select: { platform: true } },
    },
    orderBy: { createdAt: 'desc' },
  })) as unknown as Array<{
    id: string;
    clientId: string;
    content: string;
    media_url: string | null;
    status: string | null;
    scheduled_at: Date | null;
    published_at: Date | null;
    createdAt: Date | null;
    postPlatforms?: Array<{ platform: string }>;
  }>;

  const raw = (posts || []).map((post) => {
    const mediaRaw = post.media_url ? String(post.media_url).trim() : '';
    const stableRef = mediaRaw ? (toSbRefMaybe(mediaRaw) || (mediaRaw.startsWith('sb://') ? mediaRaw : null)) : null;
    return {
      id: String(post.id),
      clientId: String(post.clientId),
      content: String(post.content || ''),
      mediaRaw,
      mediaRef: stableRef,
      status: isPostStatus(post.status) ? post.status : 'draft',
      scheduledAt: toIsoStringOrEmpty(post.scheduled_at),
      publishedAt: post.published_at ? toIsoStringOrEmpty(post.published_at) : undefined,
      platforms: (post.postPlatforms || []).map((pp) => pp.platform).filter(isSocialPlatform),
    };
  });

  const ttlSeconds = 60 * 60;
  const refsOrUrls = raw.map((p) => (p.mediaRef ? p.mediaRef : p.mediaRaw ? p.mediaRaw : null));

  let resolved: (string | null)[] = refsOrUrls.map(() => null);
  try {
    const supabase = createStorageClient();
    resolved = await resolveStorageUrlsMaybeBatchedWithClient(supabase, refsOrUrls, ttlSeconds, { organizationId });
  } catch {
    resolved = refsOrUrls.map(() => null);
  }

  return raw.map((p, idx): SocialPost => {
    const rawUrl = p.mediaRaw;
    const url = resolved[idx] || (rawUrl && !rawUrl.startsWith('sb://') ? rawUrl : undefined);
    return {
      id: p.id,
      clientId: p.clientId,
      content: p.content,
      mediaUrl: url,
      mediaRef: p.mediaRef || undefined,
      status: p.status,
      scheduledAt: p.scheduledAt,
      publishedAt: p.publishedAt,
      platforms: p.platforms,
    };
  });
}

export async function getSocialPosts(params: {
  orgSlug: string;
  clientId?: string;
}): Promise<SocialPost[]> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  const organizationId = String(workspace?.id || '').trim();
  if (!organizationId) {
    throw new Error('Missing organizationId');
  }
  return getSocialPostsInternal({ organizationId, clientId: params.clientId });
}

async function getSocialActivityInternal(params: { organizationId: string; limit?: number }): Promise<ActivityLog[]> {
  const organizationId = params.organizationId;

  // NOTE: social_activity_logs is keyed by team_member_id. We don't have org_id on the table,
  // so we join via social_team_members (organization_id) to scope to the workspace.
  const rows = await prisma.activityLog.findMany({
    where: {
      social_team_members: {
        organization_id: organizationId,
      },
    },
    select: {
      id: true,
      team_member_id: true,
      action: true,
      target_id: true,
      target_type: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
    take: Math.max(1, Math.min(200, params.limit ?? 50)),
  });

  return (rows || []).map((row) => ({
    id: String(row.id),
    memberId: String(row.team_member_id),
    action: String(row.action || ''),
    targetId: row.target_id ? String(row.target_id) : '',
    targetType: isActivityTargetType(row.target_type) ? row.target_type : 'system',
    timestamp: String(row.created_at || ''),
  }));
}

export async function getSocialActivity(params: { orgSlug: string; limit?: number }): Promise<ActivityLog[]> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  const organizationId = String(workspace?.id || '').trim();
  if (!organizationId) {
    throw new Error('Missing organizationId');
  }
  return getSocialActivityInternal({ organizationId, limit: params.limit });
}

async function getSocialTasksForOrg(params: { orgSlug: string; organizationId: string }) {
  let rows:
    | {
        id: string;
        client_id: string | null;
        assigned_to: string | null;
        title: string;
        description: string | null;
        due_date: Date;
        priority: string | null;
        status: string | null;
        type: string | null;
      }[]
    | null = null;
  try {
    rows = await prisma.socialMediaTask.findMany({
      where: { organizationId: params.organizationId },
      select: {
        id: true,
        client_id: true,
        assigned_to: true,
        title: true,
        description: true,
        due_date: true,
        priority: true,
        status: true,
        type: true,
      },
      orderBy: { due_date: 'asc' },
    });
  } catch (error: unknown) {
    const errObj = asObject(error);
    const message = typeof errObj?.message === 'string' ? errObj.message : error instanceof Error ? error.message : '';
    if (message.includes('social_tasks.organization_id') && message.toLowerCase().includes('does not exist')) {
      if (!ALLOW_SCHEMA_FALLBACKS) {
        throw new Error(`[SchemaMismatch] social_tasks.organization_id missing column (${message || 'missing column'})`);
      }

      reportSchemaFallback({
        source: 'lib/services/social-service.getSocialTasksForOrg',
        reason: 'social_tasks.organization_id missing column (fallback to empty array)',
        error,
        extras: { organizationId: params.organizationId },
      });
      return [];
    }
    throw error;
  }

  return (rows || []).map((task): SocialTask => ({
    id: String(task.id),
    clientId: task.client_id != null ? String(task.client_id) : '',
    assignedTo: task.assigned_to ?? undefined,
    title: String(task.title || ''),
    description: String(task.description || ''),
    dueDate: toIsoStringOrEmpty(task.due_date),
    priority: isSocialTaskPriority(task.priority) ? task.priority : 'medium',
    status: isSocialTaskStatus(task.status) ? task.status : 'todo',
    type: isSocialTaskType(task.type) ? task.type : 'general',
  }));
}

async function getSocialConversationsForOrg(params: { orgSlug: string; organizationId: string }) {
  let rows:
    | {
        id: string;
        client_id: string;
        platform: unknown;
        user_name: string | null;
        user_avatar: string | null;
        last_message: string | null;
        unread_count: number | null;
        created_at: Date | null;
        updated_at: Date | null;
      }[]
    | null = null;
  try {
    rows = await prisma.socialMediaConversation.findMany({
      where: { organizationId: params.organizationId },
      select: {
        id: true,
        client_id: true,
        platform: true,
        user_name: true,
        user_avatar: true,
        last_message: true,
        unread_count: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { updated_at: 'desc' },
    });
  } catch (error: unknown) {
    const errObj = asObject(error);
    const message = typeof errObj?.message === 'string' ? errObj.message : error instanceof Error ? error.message : '';
    if (message.includes('social_conversations.organization_id') && message.toLowerCase().includes('does not exist')) {
      if (!ALLOW_SCHEMA_FALLBACKS) {
        throw new Error(`[SchemaMismatch] social_conversations.organization_id missing column (${message || 'missing column'})`);
      }

      reportSchemaFallback({
        source: 'lib/services/social-service.getSocialConversationsForOrg',
        reason: 'social_conversations.organization_id missing column (fallback to empty array)',
        error,
        extras: { organizationId: params.organizationId },
      });
      return [];
    }
    throw error;
  }

  return (rows || []).map((conv): Conversation => ({
    id: String(conv.id),
    clientId: String(conv.client_id),
    platform: isSocialPlatform(conv.platform) ? conv.platform : 'portal',
    userName: String(conv.user_name || ''),
    userAvatar: String(conv.user_avatar || ''),
    lastMessage: String(conv.last_message || ''),
    timestamp: toIsoStringOrEmpty(conv.updated_at || conv.created_at),
    unreadCount: conv.unread_count || 0,
    messages: [],
  }));
}

async function getSocialClientRequestsForOrg(params: { organizationId: string }) {
  let rows:
    | {
        id: string;
        client_id: string;
        type: unknown;
        content: string | null;
        media_url: string | null;
        status: unknown;
        created_at: Date | null;
      }[]
    | null = null;
  try {
    rows = await prisma.socialMediaClientRequest.findMany({
      where: { organizationId: params.organizationId },
      select: { id: true, client_id: true, type: true, content: true, media_url: true, status: true, created_at: true },
      orderBy: { created_at: 'desc' },
    });
  } catch (error: unknown) {
    const errObj = asObject(error);
    const message = typeof errObj?.message === 'string' ? errObj.message : error instanceof Error ? error.message : '';
    if (message.includes('social_client_requests.organization_id') && message.toLowerCase().includes('does not exist')) {
      if (!ALLOW_SCHEMA_FALLBACKS) {
        throw new Error(`[SchemaMismatch] social_client_requests.organization_id missing column (${message || 'missing column'})`);
      }

      reportSchemaFallback({
        source: 'lib/services/social-service.getSocialClientRequestsForOrg',
        reason: 'social_client_requests.organization_id missing column (fallback to empty array)',
        error,
        extras: { organizationId: params.organizationId },
      });
      return [];
    }
    throw error;
  }

  const raw = (rows || []).map((req) => {
    const mediaRaw = req.media_url ? String(req.media_url).trim() : '';
    const stableRef = mediaRaw ? (toSbRefMaybe(mediaRaw) || (mediaRaw.startsWith('sb://') ? mediaRaw : null)) : null;
    return {
      id: String(req.id),
      clientId: String(req.client_id),
      type: isClientRequestType(req.type) ? req.type : 'text',
      content: String(req.content || ''),
      mediaRaw,
      mediaRef: stableRef,
      timestamp: toIsoStringOrEmpty(req.created_at),
      status: isClientRequestStatus(req.status) ? req.status : 'new',
    };
  });

  const ttlSeconds = 60 * 60;
  const refsOrUrls = raw.map((r) => (r.mediaRef ? r.mediaRef : r.mediaRaw ? r.mediaRaw : null));

  let resolved: (string | null)[] = refsOrUrls.map(() => null);
  try {
    const supabase = createStorageClient();
    resolved = await resolveStorageUrlsMaybeBatchedWithClient(supabase, refsOrUrls, ttlSeconds, { organizationId: params.organizationId });
  } catch {
    resolved = refsOrUrls.map(() => null);
  }

  return raw.map((r, idx): ClientRequest => {
    const rawUrl = r.mediaRaw;
    const url = resolved[idx] || (rawUrl && !rawUrl.startsWith('sb://') ? rawUrl : undefined);
    return {
      id: r.id,
      clientId: r.clientId,
      type: r.type,
      content: r.content,
      mediaUrl: url,
      mediaRef: r.mediaRef || undefined,
      timestamp: r.timestamp,
      status: r.status,
    };
  });
}

async function getSocialManagerRequestsForOrg(params: { organizationId: string }) {
  let rows:
    | {
        id: string;
        client_id: string;
        title: string | null;
        description: string | null;
        type: unknown;
        status: unknown;
        feedback_from_client: string | null;
        created_at: Date | null;
      }[]
    | null = null;
  try {
    rows = await prisma.socialMediaManagerRequest.findMany({
      where: { organizationId: params.organizationId },
      select: {
        id: true,
        client_id: true,
        title: true,
        description: true,
        type: true,
        status: true,
        feedback_from_client: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  } catch (error: unknown) {
    const errObj = asObject(error);
    const message = typeof errObj?.message === 'string' ? errObj.message : error instanceof Error ? error.message : '';
    if (message.includes('social_manager_requests.organization_id') && message.toLowerCase().includes('does not exist')) {
      if (!ALLOW_SCHEMA_FALLBACKS) {
        throw new Error(`[SchemaMismatch] social_manager_requests.organization_id missing column (${message || 'missing column'})`);
      }

      reportSchemaFallback({
        source: 'lib/services/social-service.getSocialManagerRequestsForOrg',
        reason: 'social_manager_requests.organization_id missing column (fallback to empty array)',
        error,
        extras: { organizationId: params.organizationId },
      });
      return [];
    }
    throw error;
  }

  return (rows || []).map((req): ManagerRequest => ({
    id: String(req.id),
    clientId: String(req.client_id),
    title: String(req.title || ''),
    description: String(req.description || ''),
    type: isManagerRequestType(req.type) ? req.type : 'info',
    status: isManagerRequestStatus(req.status) ? req.status : 'pending',
    createdAt: toIsoStringOrEmpty(req.created_at),
    feedbackFromClient: req.feedback_from_client ?? undefined,
  }));
}

async function getSocialIdeasForOrg(params: { organizationId: string }) {
  let rows:
    | {
        id: string;
        client_id: string;
        text: string | null;
        created_at: Date | null;
      }[]
    | null = null;
  try {
    rows = await prisma.socialMediaIdea.findMany({
      where: { organizationId: params.organizationId },
      select: { id: true, client_id: true, text: true, created_at: true },
      orderBy: { created_at: 'desc' },
    });
  } catch (error: unknown) {
    const errObj = asObject(error);
    const message = typeof errObj?.message === 'string' ? errObj.message : error instanceof Error ? error.message : '';
    if (message.includes('social_ideas.organization_id') && message.toLowerCase().includes('does not exist')) {
      if (!ALLOW_SCHEMA_FALLBACKS) {
        throw new Error(`[SchemaMismatch] social_ideas.organization_id missing column (${message || 'missing column'})`);
      }

      reportSchemaFallback({
        source: 'lib/services/social-service.getSocialIdeasForOrg',
        reason: 'social_ideas.organization_id missing column (fallback to empty array)',
        error,
        extras: { organizationId: params.organizationId },
      });
      return [];
    }
    throw error;
  }

  return (rows || []).map((idea): Idea => ({
    id: String(idea.id),
    clientId: String(idea.client_id),
    text: String(idea.text || ''),
    createdAt: toIsoStringOrEmpty(idea.created_at),
  }));
}

export function getSocialCounters(posts: SocialPost[]) {
  const list = Array.isArray(posts) ? posts : [];
  const statusCount = (s: string) => list.filter((p) => String(p.status || '').toLowerCase() === s).length;

  return {
    postsTotal: list.length,
    postsDraft: statusCount('draft'),
    postsScheduled: statusCount('scheduled'),
    postsPublished: statusCount('published'),
  };
}

async function attachActivePlatforms(clients: Client[]): Promise<Client[]> {
  if (!clients || clients.length === 0) return [];

  const ids = clients.map((c) => c.id).filter(Boolean);
  if (ids.length === 0) return clients;

  try {
    const data = await prisma.socialMediaClientPlatform.findMany({
      where: { client_id: { in: ids } },
      select: { client_id: true, platform: true },
    });

    const byClientId = new Map<string, string[]>();
    for (const row of data || []) {
      const cid = String(row.client_id || '');
      const platform = String(row.platform || '');
      if (!cid || !platform) continue;
      const curr = byClientId.get(cid) ?? [];
      curr.push(platform);
      byClientId.set(cid, curr);
    }

    return clients.map((c) => {
      const existing = Array.isArray(c.activePlatforms) ? c.activePlatforms : [];
      if (existing.length > 0) return c;
      const raw = byClientId.get(String(c.id)) ?? [];
      const normalized = raw.map((p) => String(p)).filter(isSocialPlatform);
      return { ...c, activePlatforms: normalized };
    });
  } catch {
    return clients;
  }
}

export async function getSocialCriticalData(params: {
  orgSlug: string;
  clerkUserId?: string | null;
}): Promise<Pick<SocialInitialData, 'orgSlug' | 'clients' | 'posts' | 'counters'>> {
  // Phase 1: Resolve workspace FIRST — single fast cached call
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  const organizationId = String(workspace?.id || '').trim();
  if (!organizationId) {
    throw new Error('Missing organizationId');
  }

  // Phase 2: Load ONLY critical data for initial render
  // This is the minimal data needed for the dashboard to render
  const [clientsResult, postsResult] = await Promise.all([
    getClientsPage({ orgSlug: params.orgSlug, pageSize: 50 }), // Reduced from 200
    getSocialPostsInternal({ organizationId }),
  ]);

  const clients = clientsResult.success ? clientsResult.data.clients : [];
  const clientsWithPlatforms = await attachActivePlatforms(clients);
  const posts = Array.isArray(postsResult) ? postsResult : [];

  return {
    orgSlug: params.orgSlug,
    clients: clientsWithPlatforms,
    posts,
    counters: getSocialCounters(posts),
  };
}

export const getSocialCriticalDataCached = cache(getSocialCriticalData);

export async function getSocialDeferredData(params: {
  orgSlug: string;
  organizationId: string;
}): Promise<Omit<SocialInitialData, 'orgSlug' | 'clients' | 'posts' | 'counters'>> {
  // Load non-critical data in parallel
  const [
    teamResult,
    activityResult,
    tasks,
    conversations,
    clientRequests,
    managerRequests,
    ideas,
  ] = await Promise.all([
    getTeamMembers(params.orgSlug),
    getSocialActivityInternal({ organizationId: params.organizationId, limit: 50 }),
    getSocialTasksForOrg({ orgSlug: params.orgSlug, organizationId: params.organizationId }),
    getSocialConversationsForOrg({ orgSlug: params.orgSlug, organizationId: params.organizationId }),
    getSocialClientRequestsForOrg({ organizationId: params.organizationId }),
    getSocialManagerRequestsForOrg({ organizationId: params.organizationId }),
    getSocialIdeasForOrg({ organizationId: params.organizationId }),
  ]);

  // Phase 3: Resolve conversation avatars in parallel
  const ttlSeconds = 60 * 60;
  const conversationsArr = Array.isArray(conversations) ? conversations : [];
  const resolvedConversationAvatars = await resolveStorageUrlsMaybeBatchedServiceRole(
    conversationsArr.map((c) => c.userAvatar),
    ttlSeconds,
    { organizationId: params.organizationId }
  );

  const resolvedConversations = conversationsArr.map((c, idx) => {
    const signed = resolvedConversationAvatars[idx] ?? null;
    if (signed) return { ...c, userAvatar: signed };
    if (typeof c.userAvatar === 'string' && c.userAvatar.startsWith('sb://')) {
      return { ...c, userAvatar: '' };
    }
    return c;
  });

  return {
    team: teamResult.success ? (teamResult.data ?? []) : [],
    tasks: Array.isArray(tasks) ? tasks : [],
    conversations: resolvedConversations,
    clientRequests: Array.isArray(clientRequests) ? clientRequests : [],
    managerRequests: Array.isArray(managerRequests) ? managerRequests : [],
    ideas: Array.isArray(ideas) ? ideas : [],
    SquareActivity: Array.isArray(activityResult) ? activityResult : [],
  };
}

export const getSocialDeferredDataCached = cache(getSocialDeferredData);

export async function getSocialInitialData(params: {
  orgSlug: string;
  clerkUserId?: string | null;
}): Promise<SocialInitialData> {
  // Phase 1: Resolve workspace FIRST — single fast cached call
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  const organizationId = String(workspace?.id || '').trim();
  if (!organizationId) {
    throw new Error('Missing organizationId');
  }

  // Phase 2: Run ALL data fetches in a SINGLE parallel batch
  // Previously this was split into 3 sequential phases — now flattened.
  // Internal variants bypass redundant workspace resolution.
  const [
    clientsResult,
    teamResult,
    postsResult,
    activityResult,
    tasks,
    conversations,
    clientRequests,
    managerRequests,
    ideas,
  ] = await Promise.all([
    getClientsPage({ orgSlug: params.orgSlug, pageSize: 50 }), // Reduced from 200 to 50
    getTeamMembers(params.orgSlug),
    getSocialPostsInternal({ organizationId }),
    getSocialActivityInternal({ organizationId, limit: 50 }),
    getSocialTasksForOrg({ orgSlug: params.orgSlug, organizationId }),
    getSocialConversationsForOrg({ orgSlug: params.orgSlug, organizationId }),
    getSocialClientRequestsForOrg({ organizationId }),
    getSocialManagerRequestsForOrg({ organizationId }),
    getSocialIdeasForOrg({ organizationId }),
  ]);

  const clients = clientsResult.success ? clientsResult.data.clients : [];

  // Phase 3: Platform attachment + conversation avatar signing in parallel
  const ttlSeconds = 60 * 60;
  const conversationsArr = Array.isArray(conversations) ? conversations : [];
  const [clientsWithPlatforms, resolvedConversationAvatars] = await Promise.all([
    attachActivePlatforms(clients),
    resolveStorageUrlsMaybeBatchedServiceRole(
      conversationsArr.map((c) => c.userAvatar),
      ttlSeconds,
      { organizationId }
    ),
  ]);
  const resolvedConversations = conversationsArr.map((c, idx) => {
    const signed = resolvedConversationAvatars[idx] ?? null;
    if (signed) return { ...c, userAvatar: signed };
    if (typeof c.userAvatar === 'string' && c.userAvatar.startsWith('sb://')) {
      return { ...c, userAvatar: '' };
    }
    return c;
  });

  return {
    orgSlug: params.orgSlug,
    clients: clientsWithPlatforms,
    team: teamResult.success ? (teamResult.data ?? []) : [],
    posts: Array.isArray(postsResult) ? postsResult : [],
    tasks: Array.isArray(tasks) ? tasks : [],
    conversations: resolvedConversations,
    clientRequests: Array.isArray(clientRequests) ? clientRequests : [],
    managerRequests: Array.isArray(managerRequests) ? managerRequests : [],
    ideas: Array.isArray(ideas) ? ideas : [],
    SquareActivity: Array.isArray(activityResult) ? activityResult : [],
    counters: getSocialCounters(Array.isArray(postsResult) ? postsResult : []),
  };
}

export const getSocialInitialDataCached = cache(getSocialInitialData);
