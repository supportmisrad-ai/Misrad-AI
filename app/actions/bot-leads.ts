'use server';

import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/server/logger';

// Types for Bot Leads
export interface BotLeadDTO {
  id: string;
  phone: string;
  alternative_phone: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  business_type: string | null;
  email: string | null;
  industry: string | null;
  org_size: string | null;
  source: string | null;
  campaign: string | null;
  status: string;
  priority: string | null;
  lead_score: number;
  lead_quality: string | null;
  stage: string | null;
  assigned_to: string | null;
  next_action: string | null;
  next_action_date: Date | null;
  pain_point: string | null;
  selected_plan: string | null;
  plan_price: number | null;
  coupon_code: string | null;
  has_media: boolean;
  tags: string[];
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  last_interaction: Date;
  conversation_count: number;
}

export interface GetBotLeadsParams {
  status?: string;
  priority?: string;
  assignedTo?: string;
  campaign?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetBotLeadsResult {
  leads: BotLeadDTO[];
  total: number;
  hasMore: boolean;
}

/**
 * Get bot leads with filtering and pagination
 */
export async function getBotLeads(params: GetBotLeadsParams = {}): Promise<GetBotLeadsResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const {
      status,
      priority,
      assignedTo,
      campaign,
      search,
      page = 1,
      pageSize = 50,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (priority && priority !== 'all') {
      where.priority = priority;
    }

    if (assignedTo && assignedTo !== 'all') {
      where.assigned_to = assignedTo;
    }

    if (campaign && campaign !== 'all') {
      where.campaign = campaign;
    }

    if (search) {
      where.OR = [
        { phone: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { business_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get leads with conversation count
    const leads = await prisma.$queryRaw<BotLeadDTO[]>`
      SELECT 
        l.*,
        COUNT(c.id)::int as conversation_count
      FROM bot_leads_extended l
      LEFT JOIN bot_conversations_extended c ON c.lead_id = l.id
      ${where.status ? `WHERE l.status = ${where.status}` : ''}
      ${where.priority ? `AND l.priority = ${where.priority}` : ''}
      GROUP BY l.id
      ORDER BY l.${sortBy} ${sortOrder}
      LIMIT ${pageSize}
      OFFSET ${skip}
    `;

    // Get total count
    const [{ count }] = await prisma.$queryRaw<[{ count: bigint }]> `
      SELECT COUNT(*) as count
      FROM bot_leads_extended l
      ${where.status ? `WHERE l.status = ${where.status}` : ''}
      ${where.priority ? `AND l.priority = ${where.priority}` : ''}
    `;

    const total = Number(count);

    return {
      leads,
      total,
      hasMore: skip + leads.length < total,
    };
  } catch (error) {
    logger.error('bot-leads', 'Failed to get bot leads', error);
    throw new Error('Failed to fetch leads');
  }
}

/**
 * Get a single lead by ID with conversations
 */
export async function getBotLeadById(leadId: string): Promise<{
  lead: BotLeadDTO | null;
  conversations: Array<{
    id: string;
    direction: string;
    message: string;
    rule_id: string | null;
    variables: any;
    created_at: Date;
  }>;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const lead = await prisma.$queryRaw<BotLeadDTO[]>`
      SELECT 
        l.*,
        COUNT(c.id)::int as conversation_count
      FROM bot_leads_extended l
      LEFT JOIN bot_conversations_extended c ON c.lead_id = l.id
      WHERE l.id = ${leadId}
      GROUP BY l.id
    `;

    const conversations = await prisma.$queryRaw<[]> `
      SELECT id, direction, message, rule_id, variables, created_at
      FROM bot_conversations_extended
      WHERE lead_id = ${leadId}
      ORDER BY created_at DESC
    `;

    return {
      lead: lead[0] || null,
      conversations: conversations || [],
    };
  } catch (error) {
    logger.error('bot-leads', `Failed to get lead ${leadId}`, error);
    throw new Error('Failed to fetch lead');
  }
}

/**
 * Update lead status
 */
export async function updateBotLeadStatus(
  leadId: string,
  status: string
): Promise<void> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    await prisma.$executeRaw `
      UPDATE bot_leads_extended
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${leadId}
    `;
  } catch (error) {
    logger.error('bot-leads', `Failed to update lead ${leadId} status`, error);
    throw new Error('Failed to update lead status');
  }
}

/**
 * Update lead assignment
 */
export async function updateBotLeadAssignment(
  leadId: string,
  assignedTo: string | null
): Promise<void> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    await prisma.$executeRaw `
      UPDATE bot_leads_extended
      SET assigned_to = ${assignedTo}, updated_at = NOW()
      WHERE id = ${leadId}
    `;
  } catch (error) {
    logger.error('bot-leads', `Failed to assign lead ${leadId}`, error);
    throw new Error('Failed to assign lead');
  }
}

/**
 * Get analytics for bot leads
 */
export async function getBotLeadsAnalytics(): Promise<{
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  totalConversations: number;
  avgLeadScore: number;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const [stats] = await prisma.$queryRaw<[]> `
      SELECT 
        COUNT(*)::int as total_leads,
        COUNT(CASE WHEN status = 'new' THEN 1 END)::int as new_leads,
        COUNT(CASE WHEN status IN ('qualified', 'demo_scheduled', 'demo_completed') THEN 1 END)::int as qualified_leads,
        COUNT(CASE WHEN status = 'customer' THEN 1 END)::int as converted_leads,
        COALESCE(AVG(lead_score), 0)::float as avg_lead_score
      FROM bot_leads_extended
    `;

    const [convoStats] = await prisma.$queryRaw<[]> `
      SELECT COUNT(*)::int as total_conversations
      FROM bot_conversations_extended
    `;

    return {
      totalLeads: stats?.total_leads || 0,
      newLeads: stats?.new_leads || 0,
      qualifiedLeads: stats?.qualified_leads || 0,
      convertedLeads: stats?.converted_leads || 0,
      totalConversations: convoStats?.total_conversations || 0,
      avgLeadScore: Math.round(stats?.avg_lead_score || 0),
    };
  } catch (error) {
    logger.error('bot-leads', 'Failed to get analytics', error);
    throw new Error('Failed to fetch analytics');
  }
}

/**
 * Get available campaigns for filtering
 */
export async function getBotLeadCampaigns(): Promise<string[]> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const campaigns = await prisma.$queryRaw<[{ campaign: string }]> `
      SELECT DISTINCT campaign
      FROM bot_leads_extended
      WHERE campaign IS NOT NULL
      ORDER BY campaign
    `;

    return campaigns.map((c) => c.campaign).filter(Boolean);
  } catch (error) {
    logger.error('bot-leads', 'Failed to get campaigns', error);
    return [];
  }
}
