'use server';

import { auth } from '@clerk/nextjs/server';
import { Prisma, $Enums } from '@prisma/client';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/server/logger';

// Types for Bot Leads - ALL 70+ fields from schema
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
  email_validated: boolean | null;
  industry: string | null;
  sub_industry: string | null;
  org_size: string | null;
  employee_count: number | null;
  annual_revenue: string | null;
  years_in_business: string | null;
  website: string | null;
  linkedin_company: string | null;
  facebook_page: string | null;
  instagram_handle: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  location_type: string | null;
  service_area: string | null;
  timezone: string | null;
  preferred_language: string | null;
  communication_pref: string | null;
  best_time_to_call: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  campaign_id: string | null;
  referrer_name: string | null;
  referrer_code: string | null;
  landing_page: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  coupon_code: string | null;
  coupon_type: string | null;
  discount_amount: number | null;
  discount_percent: number | null;
  has_media: boolean | null;
  media_type: string | null;
  image_url: string | null;
  button_clicked: string | null;
  qr_scanned: boolean | null;
  selected_plan: string | null;
  plan_price: number | null;
  pain_point: string | null;
  pain_level: string | null;
  budget_range: string | null;
  urgency_level: string | null;
  status: string;
  priority: string | null;
  lead_score: number | null;
  lead_quality: string | null;
  stage: string | null;
  assigned_to: string | null;
  next_action: string | null;
  next_action_date: Date | null;
  first_contact_date: Date | null;
  last_activity_date: Date | null;
  demo_scheduled_date: Date | null;
  trial_start_date: Date | null;
  closed_date: Date | null;
  tags: string[];
  notes: string | null;
  custom_fields: any | null;
  created_at: Date;
  updated_at: Date;
  last_interaction: Date;
  conversation_count: number;
  organization_id: string | null;
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
 * Get bot leads with filtering and pagination using Prisma ORM
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

    // Build where clause dynamically using snake_case field names
    const where: Prisma.BotLeadExtendedWhereInput = {};

    if (status && status !== 'all') {
      where.status = status as $Enums.BotLeadStatus;
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

    // Get leads with conversation count using Prisma ORM
    const [leads, total] = await Promise.all([
      prisma.botLeadExtended.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: { conversations: true },
          },
        },
      }),
      prisma.botLeadExtended.count({ where }),
    ]);

    // Transform to DTO with conversation count
    const leadsWithCount: BotLeadDTO[] = leads.map((lead: any) => {
       
      const { _count, ...leadData } = lead;
      return {
        ...leadData,
        latitude: lead.latitude ? parseFloat(lead.latitude.toString()) : null,
        longitude: lead.longitude ? parseFloat(lead.longitude.toString()) : null,
        discount_amount: lead.discount_amount ? parseFloat(lead.discount_amount.toString()) : null,
        plan_price: lead.plan_price ? parseFloat(lead.plan_price.toString()) : null,
        conversation_count: _count?.conversations ?? 0,
      } as BotLeadDTO;
    });

    return {
      leads: leadsWithCount,
      total,
      hasMore: skip + leadsWithCount.length < total,
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

    // Use Prisma ORM instead of raw SQL
    const lead = await prisma.botLeadExtended.findUnique({
      where: { id: leadId },
      include: {
        _count: {
          select: { conversations: true },
        },
      },
    });

    const conversations = await prisma.botConversation.findMany({
      where: { lead_id: leadId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        direction: true,
        message: true,
        rule_id: true,
        variables: true,
        created_at: true,
      },
    });

    return {
      lead: lead
        ? {
            ...lead,
            latitude: lead.latitude ? parseFloat(lead.latitude.toString()) : null,
            longitude: lead.longitude ? parseFloat(lead.longitude.toString()) : null,
            discount_amount: lead.discount_amount ? parseFloat(lead.discount_amount.toString()) : null,
            plan_price: lead.plan_price ? parseFloat(lead.plan_price.toString()) : null,
            conversation_count: lead._count?.conversations ?? 0,
          }
        : null,
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
export async function updateBotLeadStatus(leadId: string, status: string): Promise<void> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    await prisma.botLeadExtended.update({
      where: { id: leadId },
      data: {
        status: status as $Enums.BotLeadStatus,
        updated_at: new Date(),
      },
    });
  } catch (error) {
    logger.error('bot-leads', `Failed to update lead ${leadId} status`, error);
    throw new Error('Failed to update lead status');
  }
}

/**
 * Update lead assignment
 */
export async function updateBotLeadAssignment(leadId: string, assignedTo: string | null): Promise<void> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    await prisma.botLeadExtended.update({
      where: { id: leadId },
      data: {
        assigned_to: assignedTo,
        updated_at: new Date(),
      },
    });
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

    // Use Prisma ORM aggregation instead of raw SQL
    const [totalLeads, newLeads, qualifiedLeads, convertedLeads, avgResult, totalConversations] =
      await Promise.all([
        prisma.botLeadExtended.count(),
        prisma.botLeadExtended.count({ where: { status: 'new' } }),
        prisma.botLeadExtended.count({
          where: {
            status: {
              in: ['qualified', 'demo_booked', 'trial'] as $Enums.BotLeadStatus[],
            },
          },
        }),
        prisma.botLeadExtended.count({ where: { status: 'customer' } }),
        prisma.botLeadExtended.aggregate({
          _avg: { lead_score: true },
        }),
        prisma.botConversation.count(),
      ]);

    return {
      totalLeads,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      totalConversations,
      avgLeadScore: Math.round(avgResult?._avg?.lead_score ?? 0),
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

    const campaigns = await prisma.botLeadExtended.findMany({
      where: { campaign: { not: null } },
      distinct: ['campaign'],
      select: { campaign: true },
      orderBy: { campaign: 'asc' },
    });

    return campaigns.map((c: { campaign: string | null }) => c.campaign).filter((c): c is string => Boolean(c));
  } catch (error) {
    logger.error('bot-leads', 'Failed to get campaigns', error);
    return [];
  }
}
