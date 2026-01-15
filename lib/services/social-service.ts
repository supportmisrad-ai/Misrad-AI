import { createClient } from '@/lib/supabase';
import { getClients as getCanonicalClients } from '@/app/actions/clients';
import { getTeamMembers } from '@/app/actions/team';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import type { ActivityLog, ClientRequest, Conversation, Idea, ManagerRequest, SocialPost, SocialTask } from '@/types/social';
import { cache } from 'react';

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
  clients: any[];
  team: any[];
  posts: any[];
  tasks: any[];
  clientRequests: any[];
  managerRequests: any[];
  conversations: any[];
  ideas: any[];
  activity: ActivityLog[];
  counters: {
    postsTotal: number;
    postsDraft: number;
    postsScheduled: number;
    postsPublished: number;
  };
};

export async function getSocialNavigationMenu(): Promise<SocialNavigationItem[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('navigation_menu')
      .select('*')
      .eq('is_visible', true)
      .order('section', { ascending: true })
      .order('order', { ascending: true });

    if (error) {
      return [];
    }

    return (data || []).map((item: any) => {
      let requiresRole: string[] | null = null;
      try {
        if (item.requires_role) {
          requiresRole = typeof item.requires_role === 'string' ? JSON.parse(item.requires_role) : item.requires_role;
        }
      } catch {
        requiresRole = null;
      }

      return {
        id: String(item.id),
        label: String(item.label),
        icon: String(item.icon),
        view: String(item.view),
        section: item.section as any,
        order: Number(item.order || 0),
        isVisible: item.is_visible !== false,
        requiresClient: Boolean(item.requires_client),
        requiresRole,
      };
    });
  } catch {
    return [];
  }
}

export async function getSocialPosts(params: {
  orgSlug: string;
  clientId?: string;
}): Promise<SocialPost[]> {
  const supabase = createClient();
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  const organizationId = workspace?.id;

  let query = supabase
    .from('social_posts')
    .select(
      `
        id,
        client_id,
        content,
        media_url,
        status,
        scheduled_at,
        published_at,
        created_at,
        social_post_platforms (platform),
        clients!inner (organization_id)
      `
    )
    .order('created_at', { ascending: false });

  if (organizationId) {
    query = query.eq('clients.organization_id', organizationId);
  }
  if (params.clientId) {
    query = query.eq('client_id', params.clientId);
  }

  const { data, error } = await query;
  if (error) {
    return [];
  }

  return (data || []).map((post: any) => ({
    id: post.id,
    clientId: post.client_id,
    content: post.content,
    mediaUrl: post.media_url || undefined,
    status: post.status,
    scheduledAt: post.scheduled_at,
    publishedAt: post.published_at || undefined,
    platforms: (post.social_post_platforms || []).map((pp: any) => pp.platform),
    createdAt: post.created_at,
  }));
}

export async function getSocialActivity(params: { orgSlug: string; limit?: number }): Promise<ActivityLog[]> {
  const supabase = createClient();
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  const organizationId = workspace?.id;

  // NOTE: social_activity_logs is keyed by team_member_id. We don't have org_id on the table,
  // so we join via social_team_members (organization_id) to scope to the workspace.
  const { data, error } = await supabase
    .from('social_activity_logs')
    .select(
      `
        id,
        team_member_id,
        action,
        target_id,
        target_type,
        created_at,
        social_team_members!inner (organization_id)
      `
    )
    .eq('social_team_members.organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 50);

  if (error) {
    return [];
  }

  return (data || []).map((row: any) => ({
    id: String(row.id),
    memberId: String(row.team_member_id),
    action: String(row.action || ''),
    targetId: String(row.target_id || ''),
    targetType: (row.target_type || 'system') as any,
    timestamp: String(row.created_at || ''),
  }));
}

async function getSocialTasksForOrg(params: { orgSlug: string; organizationId: string }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('social_tasks')
    .select(
      `
        id,
        client_id,
        assigned_to,
        title,
        description,
        due_date,
        priority,
        status,
        type,
        clients!inner (organization_id)
      `
    )
    .eq('clients.organization_id', params.organizationId)
    .order('due_date', { ascending: true });

  if (error) return [];

  return (data || []).map((task: any): SocialTask => ({
    id: String(task.id),
    clientId: String(task.client_id),
    assignedTo: task.assigned_to ?? undefined,
    title: String(task.title || ''),
    description: task.description ?? undefined,
    dueDate: task.due_date ?? undefined,
    priority: task.priority as any,
    status: task.status as any,
    type: task.type as any,
  }));
}

async function getSocialConversationsForOrg(params: { orgSlug: string; organizationId: string }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('social_conversations')
    .select(
      `
        id,
        client_id,
        platform,
        user_name,
        user_avatar,
        last_message,
        unread_count,
        created_at,
        updated_at,
        clients!inner (organization_id)
      `
    )
    .eq('clients.organization_id', params.organizationId)
    .order('updated_at', { ascending: false });

  if (error) return [];

  return (data || []).map((conv: any): Conversation => ({
    id: String(conv.id),
    clientId: String(conv.client_id),
    platform: conv.platform as any,
    userName: String(conv.user_name || ''),
    userAvatar: conv.user_avatar ?? undefined,
    lastMessage: conv.last_message ?? undefined,
    timestamp: (conv.updated_at || conv.created_at) ?? undefined,
    unreadCount: conv.unread_count || 0,
    messages: (conv.social_messages || []).map((msg: any) => ({
      id: String(msg.id),
      sender: msg.sender as any,
      text: msg.content ?? msg.text ?? '',
      content: msg.content ?? undefined,
      timestamp: msg.created_at,
      attachments: msg.attachments || [],
      isMe: msg.is_me || false,
    })),
  }));
}

async function getSocialClientRequestsForOrg(params: { organizationId: string }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('social_client_requests')
    .select(
      `
        id,
        client_id,
        type,
        content,
        media_url,
        status,
        created_at,
        clients!inner (organization_id)
      `
    )
    .eq('clients.organization_id', params.organizationId)
    .order('created_at', { ascending: false });

  if (error) return [];

  return (data || []).map((req: any): ClientRequest => ({
    id: String(req.id),
    clientId: String(req.client_id),
    type: req.type as any,
    content: String(req.content || ''),
    mediaUrl: req.media_url ?? undefined,
    timestamp: req.created_at,
    status: req.status as any,
  }));
}

async function getSocialManagerRequestsForOrg(params: { organizationId: string }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('social_manager_requests')
    .select(
      `
        id,
        client_id,
        title,
        description,
        type,
        status,
        created_at,
        manager_comment,
        clients!inner (organization_id)
      `
    )
    .eq('clients.organization_id', params.organizationId)
    .order('created_at', { ascending: false });

  if (error) return [];

  return (data || []).map((req: any): ManagerRequest => ({
    id: String(req.id),
    clientId: String(req.client_id),
    title: String(req.title || ''),
    description: String(req.description || ''),
    type: req.type as any,
    status: req.status as any,
    createdAt: req.created_at,
    managerComment: req.manager_comment ?? undefined,
  }));
}

async function getSocialIdeasForOrg(params: { organizationId: string }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('social_ideas')
    .select(
      `
        id,
        client_id,
        text,
        created_at,
        clients!inner (organization_id)
      `
    )
    .eq('clients.organization_id', params.organizationId)
    .order('created_at', { ascending: false });

  if (error) return [];

  return (data || []).map((idea: any): Idea => ({
    id: String(idea.id),
    clientId: String(idea.client_id),
    text: String(idea.text || ''),
    createdAt: idea.created_at,
  }));
}

export function getSocialCounters(posts: SocialPost[]) {
  const list = Array.isArray(posts) ? posts : [];
  const statusCount = (s: string) => list.filter((p: any) => String(p.status || '').toLowerCase() === s).length;

  return {
    postsTotal: list.length,
    postsDraft: statusCount('draft'),
    postsScheduled: statusCount('scheduled'),
    postsPublished: statusCount('published'),
  };
}

async function attachActivePlatforms(clients: any[]): Promise<any[]> {
  if (!clients || clients.length === 0) return [];

  const ids = clients.map((c: any) => c.id).filter(Boolean);
  if (ids.length === 0) return clients;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('social_client_active_platforms')
      .select('client_id, platform')
      .in('client_id', ids);

    if (error) {
      return clients;
    }

    const byClientId = new Map<string, string[]>();
    for (const row of data || []) {
      const cid = String((row as any).client_id || '');
      const platform = String((row as any).platform || '');
      if (!cid || !platform) continue;
      const curr = byClientId.get(cid) ?? [];
      curr.push(platform);
      byClientId.set(cid, curr);
    }

    return clients.map((c: any) => ({
      ...c,
      activePlatforms: Array.isArray(c.activePlatforms) && c.activePlatforms.length > 0
        ? c.activePlatforms
        : (byClientId.get(String(c.id)) ?? []),
    }));
  } catch {
    return clients;
  }
}

export async function getSocialInitialData(params: {
  orgSlug: string;
  clerkUserId?: string | null;
}): Promise<SocialInitialData> {
  const workspacePromise = requireWorkspaceAccessByOrgSlug(params.orgSlug);

  const [workspace, clientsResult, teamResult, postsResult, activityResult] = await Promise.all([
    workspacePromise,
    getCanonicalClients(undefined, params.orgSlug),
    getTeamMembers(),
    getSocialPosts({ orgSlug: params.orgSlug }),
    getSocialActivity({ orgSlug: params.orgSlug, limit: 50 }),
  ]);

  const organizationId = workspace?.id ? String(workspace.id) : '';

  const [tasks, conversations, clientRequests, managerRequests, ideas] = await Promise.all([
    organizationId ? getSocialTasksForOrg({ orgSlug: params.orgSlug, organizationId }) : Promise.resolve([]),
    organizationId ? getSocialConversationsForOrg({ orgSlug: params.orgSlug, organizationId }) : Promise.resolve([]),
    organizationId ? getSocialClientRequestsForOrg({ organizationId }) : Promise.resolve([]),
    organizationId ? getSocialManagerRequestsForOrg({ organizationId }) : Promise.resolve([]),
    organizationId ? getSocialIdeasForOrg({ organizationId }) : Promise.resolve([]),
  ]);

  const clients = clientsResult.success && clientsResult.data ? clientsResult.data : [];
  const clientsWithPlatforms = await attachActivePlatforms(clients);

  return {
    orgSlug: params.orgSlug,
    clients: clientsWithPlatforms,
    team: teamResult.success && teamResult.data ? teamResult.data : [],
    posts: Array.isArray(postsResult) ? postsResult : [],
    tasks: Array.isArray(tasks) ? tasks : [],
    conversations: Array.isArray(conversations) ? conversations : [],
    clientRequests: Array.isArray(clientRequests) ? clientRequests : [],
    managerRequests: Array.isArray(managerRequests) ? managerRequests : [],
    ideas: Array.isArray(ideas) ? ideas : [],
    activity: Array.isArray(activityResult) ? activityResult : [],
    counters: getSocialCounters(Array.isArray(postsResult) ? postsResult : []),
  };
}

export const getSocialInitialDataCached = cache(getSocialInitialData);
