'use server';

import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import prisma from '@/lib/prisma';

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

function isMissingTableError(err: any) {
  const msg = String(err?.message || '').toLowerCase();
  const code = String((err as any)?.code || '').toUpperCase();
  return (
    msg.includes('could not find the table') ||
    msg.includes('does not exist') ||
    code === '42P01' ||
    code === 'PGRST205'
  );
}

/**
 * Server Action: Get all campaigns
 */
export async function getCampaigns(
  clientId?: string,
  orgId?: string
): Promise<{ success: boolean; data?: Campaign[]; error?: string }> {
  try {
    const organizationId = orgId ? (await requireWorkspaceAccessByOrgSlug(orgId))?.id : null;

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
      } catch (clientsError: any) {
        if (isMissingTableError(clientsError)) {
          return { success: false, error: 'טבלת clients לא קיימת במסד הנתונים (מצב חירום: אין Fallback)' };
        }
        const errInfo = {
          message: clientsError?.message,
          code: (clientsError as any)?.code,
          details: (clientsError as any)?.details,
          hint: (clientsError as any)?.hint,
        };
        console.error('Error fetching campaigns clients:', errInfo);
        return {
          success: false,
          error: clientsError?.message || 'שגיאה בטעינת לקוחות לקמפיינים',
        };
      }

      allowedClientIds = (clients || []).map((c: any) => String(c.id));

      if (!allowedClientIds.length) {
        return { success: true, data: [] };
      }
    }

    let data: any[] = [];
    try {
      const where: any = {};
      if (allowedClientIds) {
        where.client_id = { in: allowedClientIds };
      }
      if (clientId) {
        where.client_id = String(clientId);
      }

      data = await prisma.social_campaigns.findMany({
        where,
        orderBy: { created_at: 'desc' },
      });
    } catch (error: any) {
      if (isMissingTableError(error)) {
        return { success: false, error: 'טבלת campaigns לא קיימת במסד הנתונים (מצב חירום: אין Fallback)' };
      }
      const errInfo = {
        message: error?.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
      };
      console.error('Error fetching campaigns:', errInfo);
      return {
        success: false,
        error: error?.message || 'שגיאה בטעינת קמפיינים',
      };
    }

    const campaigns: Campaign[] = (data || []).map((campaign: any) => ({
      id: String(campaign.id),
      clientId: String(campaign.client_id),
      name: String(campaign.name),
      status: (campaign.status ? String(campaign.status) : 'active') as any,
      objective: (campaign.objective ? String(campaign.objective) : 'awareness') as any,
      budget: Number(campaign.budget) || 0,
      spent: Number(campaign.spent) || 0,
      roas: Number(campaign.roas) || 0,
      impressions: campaign.impressions == null ? undefined : Number(campaign.impressions),
      clicks: campaign.clicks == null ? undefined : Number(campaign.clicks),
    }));

    return {
      success: true,
      data: campaigns,
    };
  } catch (error: any) {
    console.error('Error in getCampaigns:', error);
    return {
      success: false,
      error: error.message || 'שגיאה בטעינת קמפיינים',
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

