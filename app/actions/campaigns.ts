'use server';

import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import prisma from '@/lib/prisma';
import * as Sentry from '@sentry/nextjs';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { asObject, getErrorMessage } from '@/lib/shared/unknown';
export interface Campaign {
  id: string;
  clientId: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  objective: 'sales' | 'traffic' | 'awareness' | 'engagement';
  budget: number;
  spent: number;
  roas: number;
  impressions?: number;
  clicks?: number;
}


function captureActionException(error: unknown, context: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    scope.setTag('layer', 'server_action');
    scope.setTag('domain', 'campaigns');
    for (const [k, v] of Object.entries(context)) {
      scope.setExtra(k, v);
    }
    Sentry.captureException(error);
  });
}

function isMissingTableError(err: unknown) {
  const msg = getErrorMessage(err).toLowerCase();
  const code = String(asObject(err)?.code || '').toUpperCase();
  return (
    msg.includes('could not find the table') ||
    msg.includes('does not exist') ||
    code === '42P01' ||
    code === 'PGRST205'
  );
}

const CampaignsInputSchema = z.object({
  clientId: z.string().optional(),
  orgId: z.string().optional(),
});

function isCampaignStatus(value: unknown): value is Campaign['status'] {
  return value === 'active' || value === 'paused' || value === 'completed';
}

function isCampaignObjective(value: unknown): value is Campaign['objective'] {
  return value === 'sales' || value === 'traffic' || value === 'awareness' || value === 'engagement';
}

/**
 * Server Action: Get all campaigns
 */
export async function getCampaigns(
  clientId?: string,
  orgId?: string
): Promise<{ success: boolean; data?: Campaign[]; error?: string }> {
  try {
    const parsed = CampaignsInputSchema.safeParse({ clientId, orgId });
    if (!parsed.success) {
      captureActionException(parsed.error, { action: 'getCampaigns', stage: 'validate_input' });
      return { success: false, error: 'קלט לא תקין לטעינת קמפיינים' };
    }

    const organizationId = parsed.data.orgId ? (await requireWorkspaceAccessByOrgSlug(parsed.data.orgId))?.id : null;

    if (!organizationId) {
      return { success: false, error: 'חסר orgSlug לטעינת קמפיינים' };
    }

    let allowedClientIds: string[] | null = null;
    {
      let clients: Array<{ id: string }> = [];
      try {
        clients = await prisma.clients.findMany({
          where: { organization_id: String(organizationId) },
          select: { id: true },
        });
      } catch (clientsError: unknown) {
        if (isMissingTableError(clientsError)) {
          captureActionException(clientsError, { action: 'getCampaigns', stage: 'fetch_clients', reason: 'missing_table' });
          return { success: false, error: 'טבלת clients לא קיימת במסד הנתונים (מצב חירום: אין Fallback)' };
        }
        const obj = asObject(clientsError);
        const errInfo = {
          message: getErrorMessage(clientsError),
          code: obj?.code,
          details: obj?.details,
          hint: obj?.hint,
        };
        captureActionException(clientsError, { action: 'getCampaigns', stage: 'fetch_clients', ...errInfo });
        return {
          success: false,
          error: getErrorMessage(clientsError) || 'שגיאה בטעינת לקוחות לקמפיינים',
        };
      }

      allowedClientIds = (clients || []).map((c) => String(c.id));

      if (!allowedClientIds.length) {
        return { success: true, data: [] };
      }
    }

    let data: Array<{
      id: string;
      client_id: string;
      name: string;
      status: string | null;
      objective: string | null;
      budget: Prisma.Decimal | number | null;
      spent: Prisma.Decimal | number | null;
      roas: Prisma.Decimal | number | null;
      impressions: number | null;
      clicks: number | null;
    }> = [];
    try {
      const where: Prisma.SocialMediaCampaignWhereInput = {};
      if (allowedClientIds) {
        where.client_id = { in: allowedClientIds };
      }
      if (parsed.data.clientId) {
        where.client_id = String(parsed.data.clientId);
      }

      data = await prisma.socialMediaCampaign.findMany({
        where,
        select: {
          id: true,
          client_id: true,
          name: true,
          status: true,
          objective: true,
          budget: true,
          spent: true,
          roas: true,
          impressions: true,
          clicks: true,
        },
        orderBy: { created_at: 'desc' },
        take: 100,
      });
    } catch (error: unknown) {
      if (isMissingTableError(error)) {
        captureActionException(error, { action: 'getCampaigns', stage: 'fetch_campaigns', reason: 'missing_table' });
        return { success: false, error: 'טבלת campaigns לא קיימת במסד הנתונים (מצב חירום: אין Fallback)' };
      }
      const obj = asObject(error);
      const errInfo = {
        message: getErrorMessage(error),
        code: obj?.code,
        details: obj?.details,
        hint: obj?.hint,
      };
      captureActionException(error, { action: 'getCampaigns', stage: 'fetch_campaigns', ...errInfo });
      return {
        success: false,
        error: getErrorMessage(error) || 'שגיאה בטעינת קמפיינים',
      };
    }

    const toNumber = (v: Prisma.Decimal | number | null | undefined) => {
      if (v == null) return 0;
      if (v instanceof Prisma.Decimal) return v.toNumber();
      return Number(v) || 0;
    };

    const campaigns: Campaign[] = (data || []).map((campaign) => {
      const statusRaw = campaign.status ? String(campaign.status) : 'active';
      const objectiveRaw = campaign.objective ? String(campaign.objective) : 'awareness';

      return {
        id: String(campaign.id),
        clientId: String(campaign.client_id),
        name: String(campaign.name),
        status: isCampaignStatus(statusRaw) ? statusRaw : 'active',
        objective: isCampaignObjective(objectiveRaw) ? objectiveRaw : 'awareness',
        budget: toNumber(campaign.budget),
        spent: toNumber(campaign.spent),
        roas: toNumber(campaign.roas),
        impressions: campaign.impressions == null ? undefined : Number(campaign.impressions),
        clicks: campaign.clicks == null ? undefined : Number(campaign.clicks),
      };
    });

    return {
      success: true,
      data: campaigns,
    };
  } catch (error: unknown) {
    captureActionException(error, { action: 'getCampaigns', stage: 'outer' });
    return {
      success: false,
      error: getErrorMessage(error) || 'שגיאה בטעינת קמפיינים',
    };
  }
}

/**
 * Server Action: Create a new campaign
 */
export async function createCampaign(
  campaignData: Omit<Campaign, 'id'>
): Promise<{ success: boolean; data?: Campaign; error?: string }> {
  return { success: false, error: 'יצירת קמפיין חסומה זמנית (Tenant Isolation lockdown)' };
}

/**
 * Server Action: Update a campaign
 */
export async function updateCampaign(
  campaignId: string,
  updates: Partial<Campaign>
): Promise<{ success: boolean; data?: Campaign; error?: string }> {
  return { success: false, error: 'עדכון קמפיין חסום זמנית (Tenant Isolation lockdown)' };
}

/**
 * Server Action: Delete a campaign
 */
export async function deleteCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'מחיקת קמפיין חסומה זמנית (Tenant Isolation lockdown)' };
}

