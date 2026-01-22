import { supabase, isSupabaseConfigured } from '../supabase';
import type { Client, SocialPost, SocialTask, TeamMember, ClientRequest, ManagerRequest, Conversation, Idea } from '@/types/social';

// ============================================
// CLIENTS
// ============================================

export async function fetchClients(userId?: string): Promise<Client[]> {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase not configured, returning empty array');
    return [];
  }

  try {
    // Client-side list for legacy Social UI: read from client_clients and map via metadata.
    // Note: This assumes RLS allows the authenticated user to read their org's client_clients.
    const { data, error } = await supabase
      .from('client_clients')
      .select('id, organization_id, full_name, phone, email, notes, metadata, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error in fetchClients:', error);
      throw error;
    }

    // Transform client_clients rows to legacy Client shape.
    return (data || []).map((row: any) => {
      const md = row.metadata ?? {};
      const name = md.name ?? row.full_name ?? '';
      const companyName = md.companyName ?? name;

      return {
        id: row.id,
        name,
        companyName,
        businessId: md.businessId ?? undefined,
        phone: row.phone ?? undefined,
        email: row.email ?? undefined,
        avatar: md.avatar ?? `https://i.pravatar.cc/150?u=${encodeURIComponent(row.id)}`,
        brandVoice: md.brandVoice ?? '',
        dna: md.dna ?? {
          brandSummary: '',
          voice: { formal: 50, funny: 50, length: 50 },
          vocabulary: { loved: [], forbidden: [] },
          colors: { primary: '#1e293b', secondary: '#334155' },
        },
        credentials: md.credentials ?? [],
        postingRhythm: md.postingRhythm ?? '',
        status: md.status as any,
        activePlatforms: md.activePlatforms ?? [],
        quotas: md.quotas ?? [],
        onboardingStatus: md.onboardingStatus as any,
        invitationToken: md.invitationToken,
        portalToken: md.portalToken ?? '',
        color: md.color ?? '',
        plan: md.plan as any,
        monthlyFee: md.monthlyFee,
        nextPaymentDate: md.nextPaymentDate,
        nextPaymentAmount: md.nextPaymentAmount,
        paymentStatus: md.paymentStatus,
        autoRemindersEnabled: md.autoRemindersEnabled ?? false,
        savedCardThumbnail: md.savedCardThumbnail,
        businessMetrics: md.businessMetrics ?? {
          timeSpentMinutes: 0,
          expectedHours: 0,
          punctualityScore: 100,
          responsivenessScore: 100,
          revisionCount: 0,
        },
        internalNotes: md.internalNotes ?? row.notes ?? undefined,
        organizationId: row.organization_id,
      } as any;
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return [];
  }
}

export async function fetchActivePlatforms(clientId: string): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('social_client_active_platforms')
      .select('platform')
      .eq('client_id', clientId);

    if (error) throw error;
    return (data || []).map((item: any) => item.platform);
  } catch (error) {
    console.error('Error fetching active platforms:', error);
    return [];
  }
}

// ============================================
// CAMPAIGNS
// ============================================

export async function fetchCampaigns(clientId?: string): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  try {
    let query = supabase.from('social_campaigns').select('*');
    
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((campaign: any) => ({
      id: campaign.id,
      clientId: campaign.client_id,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      budget: Number(campaign.budget),
      spent: Number(campaign.spent),
      roas: Number(campaign.roas),
      impressions: campaign.impressions,
      clicks: campaign.clicks,
    }));
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return [];
  }
}

// ============================================
// POSTS
// ============================================

export async function fetchPosts(clientId?: string): Promise<SocialPost[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  try {
    let query = supabase
      .from('social_posts')
      .select(`
        *,
        post_platforms (platform),
        post_comments (*)
      `);

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((post: any) => ({
      id: post.id,
      clientId: post.client_id,
      content: post.content,
      mediaUrl: post.media_url,
      platforms: (post.post_platforms || []).map((p: any) => p.platform),
      status: post.status as any,
      scheduledAt: post.scheduled_at,
      publishedAt: post.published_at,
      isLate: post.is_late || false,
      createdBy: post.created_by,
      internalComments: (post.post_comments || []).map((comment: any) => ({
        id: comment.id,
        memberId: comment.team_member_id,
        text: comment.text,
        timestamp: comment.created_at,
      })),
    }));
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

// ============================================
// TASKS
// ============================================

export async function fetchTasks(clientId?: string): Promise<SocialTask[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  try {
    let query = supabase.from('social_tasks').select('*');

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((task: any) => ({
      id: task.id,
      clientId: task.client_id,
      assignedTo: task.assigned_to,
      title: task.title,
      description: task.description,
      dueDate: task.due_date,
      priority: task.priority as any,
      status: task.status as any,
      type: task.type as any,
    }));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

// ============================================
// CONVERSATIONS
// ============================================

export async function fetchConversations(clientId?: string): Promise<Conversation[]> {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase not configured, returning empty conversations array');
    return [];
  }

  try {
    let query = supabase
      .from('conversations')
      .select(`
        *,
        messages (*)
      `);

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error fetching conversations:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      // If it's a permission error (RLS), return empty array instead of crashing
      if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('policy')) {
        console.warn('RLS policy may be blocking conversations access. Returning empty array.');
        return [];
      }
      throw error;
    }

    if (!data) {
      console.warn('No conversations data returned from Supabase');
      return [];
    }

    return (data || []).map((conv: any) => ({
      id: conv.id,
      clientId: conv.client_id,
      platform: conv.platform as any,
      userName: conv.user_name,
      userAvatar: conv.user_avatar,
      lastMessage: conv.last_message,
      timestamp: conv.updated_at || conv.created_at,
      unreadCount: conv.unread_count || 0,
      messages: (conv.messages || []).map((msg: any) => ({
        id: msg.id,
        sender: msg.sender,
        text: msg.text,
        timestamp: msg.created_at,
        isMe: msg.is_me || false,
      })),
    }));
  } catch (error: any) {
    console.error('Error fetching conversations:', {
      error: error?.message || error,
      stack: error?.stack,
      name: error?.name,
    });
    // Return empty array to prevent app crash
    return [];
  }
}

// ============================================
// IDEAS
// ============================================

export async function fetchIdeas(clientId: string): Promise<Idea[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error in fetchIdeas:', error);
      return [];
    }

    return (data || []).map((idea: any) => ({
      id: idea.id,
      clientId: idea.client_id,
      text: idea.text,
      createdAt: idea.created_at,
    }));
  } catch (error) {
    console.error('Error fetching ideas:', error);
    return [];
  }
}

// ============================================
// REQUESTS
// ============================================

export async function fetchClientRequests(clientId?: string): Promise<ClientRequest[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  try {
    let query = supabase.from('client_requests').select('*');

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((req: any) => ({
      id: req.id,
      clientId: req.client_id,
      type: req.type as any,
      content: req.content,
      mediaUrl: req.media_url,
      timestamp: req.created_at,
      status: req.status as any,
      managerComment: req.manager_comment,
    }));
  } catch (error) {
    console.error('Error fetching client requests:', error);
    return [];
  }
}

export async function fetchManagerRequests(clientId?: string): Promise<ManagerRequest[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  try {
    let query = supabase.from('manager_requests').select('*');

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((req: any) => ({
      id: req.id,
      clientId: req.client_id,
      title: req.title,
      description: req.description,
      status: req.status as any,
      type: req.type as any,
      createdAt: req.created_at,
      feedbackFromClient: req.feedback_from_client,
    }));
  } catch (error) {
    console.error('Error fetching manager requests:', error);
    return [];
  }
}

// ============================================
// TEAM MEMBERS
// ============================================

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase not configured, returning empty team members array');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('social_team_members')
      .select(`
        *,
        social_team_member_clients (client_id)
      `);

    if (error) {
      console.error('Supabase error fetching team members:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      // If it's a permission error (RLS), return empty array instead of crashing
      if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('policy')) {
        console.warn('RLS policy may be blocking team members access. Returning empty array.');
        return [];
      }
      throw error;
    }

    if (!data) {
      console.warn('No team members data returned from Supabase');
      return [];
    }

    return (data || []).map((member: any) => ({
      id: member.id,
      organizationId: member.organization_id || '00000000-0000-0000-0000-000000000001',
      name: member.name,
      role: member.role as any,
      memberType: member.member_type as any,
      avatar: member.avatar,
      assignedClients: (member.social_team_member_clients || []).map((tmc: any) => tmc.client_id),
      activeTasksCount: member.active_tasks_count || 0,
      capacityScore: member.capacity_score || 0,
      hourlyRate: member.hourly_rate ? Number(member.hourly_rate) : undefined,
      monthlySalary: member.monthly_salary ? Number(member.monthly_salary) : undefined,
    }));
  } catch (error: any) {
    console.error('Error fetching team members:', {
      error: error?.message || error,
      stack: error?.stack,
      name: error?.name,
    });
    // Return empty array to prevent app crash
    return [];
  }
}

