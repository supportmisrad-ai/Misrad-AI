'use server';

import { auth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
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

    // Build where clause dynamically
    const where: Prisma.BotLeadWhereInput = {};

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

    // Get leads with conversation count using Prisma ORM
    const [leads, total] = await Promise.all([
      prisma.botLead.findMany({
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
      prisma.botLead.count({ where }),
    ]);

    // Transform to DTO with conversation count
    const leadsWithCount: BotLeadDTO[] = leads.map((lead: { id: string; phone: string; alternativePhone: string | null; name: string | null; firstName: string | null; lastName: string | null; businessName: string | null; businessType: string | null; email: string | null; emailValidated: boolean | null; industry: string | null; subIndustry: string | null; orgSize: string | null; employeeCount: number | null; annualRevenue: string | null; yearsInBusiness: string | null; website: string | null; linkedinCompany: string | null; facebookPage: string | null; instagramHandle: string | null; address: string | null; city: string | null; region: string | null; country: string | null; zipCode: string | null; latitude: number | null; longitude: number | null; locationName: string | null; locationType: string | null; serviceArea: string | null; timezone: string | null; preferredLanguage: string | null; communicationPref: string | null; bestTimeToCall: string | null; source: string | null; medium: string | null; campaign: string | null; campaignId: string | null; referrerName: string | null; referrerCode: string | null; landingPage: string | null; utmSource: string | null; utmMedium: string | null; utmCampaign: string | null; couponCode: string | null; couponType: string | null; discountAmount: number | null; discountPercent: number | null; hasMedia: boolean | null; mediaType: string | null; imageUrl: string | null; buttonClicked: string | null; qrScanned: boolean | null; selectedPlan: string | null; planPrice: number | null; painPoint: string | null; painLevel: string | null; budgetRange: string | null; urgencyLevel: string | null; status: string; priority: string | null; leadScore: number | null; leadQuality: string | null; stage: string | null; assignedTo: string | null; nextAction: string | null; nextActionDate: Date | null; firstContactDate: Date | null; lastActivityDate: Date | null; demoScheduledDate: Date | null; trialStartDate: Date | null; closedDate: Date | null; tags: string[]; notes: string | null; customFields: Prisma.JsonValue | null; createdAt: Date; updatedAt: Date; lastInteraction: Date; _count: { conversations: number }; organizationId: string | null }) => ({
        ...lead,
        conversation_count: lead._count.conversations,
        // Map snake_case fields
        alternative_phone: lead.alternativePhone,
        first_name: lead.firstName,
        last_name: lead.lastName,
        business_name: lead.businessName,
        business_type: lead.businessType,
        email_validated: lead.emailValidated,
        sub_industry: lead.subIndustry,
        org_size: lead.orgSize,
        employee_count: lead.employeeCount,
        annual_revenue: lead.annualRevenue,
        years_in_business: lead.yearsInBusiness,
        linkedin_company: lead.linkedinCompany,
        facebook_page: lead.facebookPage,
        instagram_handle: lead.instagramHandle,
        zip_code: lead.zipCode,
        location_name: lead.locationName,
        location_type: lead.locationType,
        service_area: lead.serviceArea,
        preferred_language: lead.preferredLanguage,
        communication_pref: lead.communicationPref,
        best_time_to_call: lead.bestTimeToCall,
        campaign_id: lead.campaignId,
        referrer_name: lead.referrerName,
        referrer_code: lead.referrerCode,
        landing_page: lead.landingPage,
        utm_source: lead.utmSource,
        utm_medium: lead.utmMedium,
        utm_campaign: lead.utmCampaign,
        coupon_code: lead.couponCode,
        coupon_type: lead.couponType,
        discount_amount: lead.discountAmount,
        discount_percent: lead.discountPercent,
        has_media: lead.hasMedia,
        media_type: lead.mediaType,
        image_url: lead.imageUrl,
        button_clicked: lead.buttonClicked,
        qr_scanned: lead.qrScanned,
        selected_plan: lead.selectedPlan,
        plan_price: lead.planPrice,
        pain_point: lead.painPoint,
        pain_level: lead.painLevel,
        budget_range: lead.budgetRange,
        urgency_level: lead.urgencyLevel,
        lead_score: lead.leadScore,
        lead_quality: lead.leadQuality,
        assigned_to: lead.assignedTo,
        next_action: lead.nextAction,
        next_action_date: lead.nextActionDate,
        first_contact_date: lead.firstContactDate,
        last_activity_date: lead.lastActivityDate,
        demo_scheduled_date: lead.demoScheduledDate,
        trial_start_date: lead.trialStartDate,
        closed_date: lead.closedDate,
        custom_fields: lead.customFields,
        created_at: lead.createdAt,
        updated_at: lead.updatedAt,
        last_interaction: lead.lastInteraction,
        organization_id: lead.organizationId,
      })),

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

    const [stats] = await prisma.$queryRaw<[{ total_leads: number; new_leads: number; qualified_leads: number; converted_leads: number; avg_lead_score: number }]> `
      SELECT 
        COUNT(*)::int as total_leads,
        COUNT(CASE WHEN status = 'new' THEN 1 END)::int as new_leads,
        COUNT(CASE WHEN status IN ('qualified', 'demo_scheduled', 'demo_completed') THEN 1 END)::int as qualified_leads,
        COUNT(CASE WHEN status = 'customer' THEN 1 END)::int as converted_leads,
        COALESCE(AVG(lead_score), 0)::float as avg_lead_score
      FROM bot_leads_extended
    `;

    const [convoStats] = await prisma.$queryRaw<[{ total_conversations: number }]> `
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

    return campaigns.map((c: { campaign: string }) => c.campaign).filter(Boolean);
  } catch (error) {
    logger.error('bot-leads', 'Failed to get campaigns', error);
    return [];
  }
}
