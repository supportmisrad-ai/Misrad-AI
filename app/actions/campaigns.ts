'use server';

import { createClient } from '@/lib/supabase';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

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

async function resolveFirstExistingTable(
  supabase: ReturnType<typeof createClient>,
  candidates: string[]
): Promise<string | null> {
  for (const table of candidates) {
    const probe = await supabase.from(table).select('id').limit(1);
    if (!probe.error) return table;
    if (isMissingTableError(probe.error)) continue;
    // Any other error means the table likely exists but query failed for another reason (RLS, permissions, etc.)
    return table;
  }
  return null;
}

/**
 * Server Action: Get all campaigns
 */
export async function getCampaigns(
  clientId?: string,
  orgId?: string
): Promise<{ success: boolean; data?: Campaign[]; error?: string }> {
  try {
    const supabase = createClient();
    const organizationId = orgId ? (await requireWorkspaceAccessByOrgSlug(orgId))?.id : null;

    const clientsTable = await resolveFirstExistingTable(supabase, ['clients', 'social_clients']);
    const campaignsTable = await resolveFirstExistingTable(supabase, ['campaigns', 'social_campaigns']);

    if (!campaignsTable) {
      console.warn('[getCampaigns] No campaigns table found in Supabase (campaigns/social_campaigns). Returning empty list.');
      return { success: true, data: [] };
    }

    let allowedClientIds: string[] | null = null;
    if (organizationId && clientsTable) {
      const { data: clients, error: clientsError } = await supabase
        .from(clientsTable)
        .select('id')
        .eq('organization_id', organizationId);

      if (clientsError) {
        if (isMissingTableError(clientsError)) {
          console.warn('[getCampaigns] Clients table missing in Supabase. Returning empty list.');
          return { success: true, data: [] };
        }
        const errInfo = {
          message: clientsError.message,
          code: (clientsError as any).code,
          details: (clientsError as any).details,
          hint: (clientsError as any).hint,
        };
        console.error('Error fetching campaigns clients:', errInfo);
        return {
          success: false,
          error: clientsError.message || 'שגיאה בטעינת לקוחות לקמפיינים',
        };
      }

      allowedClientIds = (clients || []).map((c: any) => String(c.id));

      if (!allowedClientIds.length) {
        return { success: true, data: [] };
      }
    }

    let query = supabase.from(campaignsTable).select('*').order('created_at', { ascending: false });

    if (allowedClientIds) {
      query = query.in('client_id', allowedClientIds);
    }

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        console.warn('[getCampaigns] Campaigns table missing in Supabase. Returning empty list.');
        return { success: true, data: [] };
      }
      const errInfo = {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
      };
      console.error('Error fetching campaigns:', errInfo);
      return {
        success: false,
        error: error.message || 'שגיאה בטעינת קמפיינים',
      };
    }

    const campaigns: Campaign[] = (data || []).map((campaign: any) => ({
      id: campaign.id,
      clientId: campaign.client_id,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      budget: Number(campaign.budget) || 0,
      spent: Number(campaign.spent) || 0,
      roas: Number(campaign.roas) || 0,
      impressions: campaign.impressions,
      clicks: campaign.clicks,
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
  try {
    const supabase = createClient();

    const campaignsTable = await resolveFirstExistingTable(supabase, ['campaigns', 'social_campaigns']);
    if (!campaignsTable) {
      return { success: false, error: 'טבלת קמפיינים לא קיימת במסד הנתונים' };
    }

    const { data, error } = await supabase
      .from(campaignsTable)
      .insert({
        client_id: campaignData.clientId,
        name: campaignData.name,
        status: campaignData.status,
        objective: campaignData.objective,
        budget: campaignData.budget,
        spent: campaignData.spent || 0,
        roas: campaignData.roas || 0,
        impressions: campaignData.impressions,
        clicks: campaignData.clicks,
      })
      .select()
      .single();

    if (error) {
      const errInfo = {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
      };
      console.error('Error creating campaign:', errInfo);
      return {
        success: false,
        error: error.message || 'שגיאה ביצירת קמפיין',
      };
    }

    const campaign: Campaign = {
      id: data.id,
      clientId: data.client_id,
      name: data.name,
      status: data.status,
      objective: data.objective,
      budget: Number(data.budget),
      spent: Number(data.spent),
      roas: Number(data.roas),
      impressions: data.impressions,
      clicks: data.clicks,
    };

    return {
      success: true,
      data: campaign,
    };
  } catch (error: any) {
    console.error('Error in createCampaign:', error);
    return {
      success: false,
      error: error.message || 'שגיאה ביצירת קמפיין',
    };
  }
}

/**
 * Server Action: Update a campaign
 */
export async function updateCampaign(
  campaignId: string,
  updates: Partial<Campaign>
): Promise<{ success: boolean; data?: Campaign; error?: string }> {
  try {
    const supabase = createClient();

    const campaignsTable = await resolveFirstExistingTable(supabase, ['campaigns', 'social_campaigns']);
    if (!campaignsTable) {
      return { success: false, error: 'טבלת קמפיינים לא קיימת במסד הנתונים' };
    }

    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.objective !== undefined) updateData.objective = updates.objective;
    if (updates.budget !== undefined) updateData.budget = updates.budget;
    if (updates.spent !== undefined) updateData.spent = updates.spent;
    if (updates.roas !== undefined) updateData.roas = updates.roas;
    if (updates.impressions !== undefined) updateData.impressions = updates.impressions;
    if (updates.clicks !== undefined) updateData.clicks = updates.clicks;

    const { data, error } = await supabase
      .from(campaignsTable)
      .update(updateData)
      .eq('id', campaignId)
      .select()
      .single();

    if (error) {
      const errInfo = {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
      };
      console.error('Error updating campaign:', errInfo);
      return {
        success: false,
        error: error.message || 'שגיאה בעדכון קמפיין',
      };
    }

    const campaign: Campaign = {
      id: data.id,
      clientId: data.client_id,
      name: data.name,
      status: data.status,
      objective: data.objective,
      budget: Number(data.budget),
      spent: Number(data.spent),
      roas: Number(data.roas),
      impressions: data.impressions,
      clicks: data.clicks,
    };

    return {
      success: true,
      data: campaign,
    };
  } catch (error: any) {
    console.error('Error in updateCampaign:', error);
    return {
      success: false,
      error: error.message || 'שגיאה בעדכון קמפיין',
    };
  }
}

/**
 * Server Action: Delete a campaign
 */
export async function deleteCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const campaignsTable = await resolveFirstExistingTable(supabase, ['campaigns', 'social_campaigns']);
    if (!campaignsTable) {
      return { success: false, error: 'טבלת קמפיינים לא קיימת במסד הנתונים' };
    }

    const { error } = await supabase
      .from(campaignsTable)
      .delete()
      .eq('id', campaignId);

    if (error) {
      const errInfo = {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
      };
      console.error('Error deleting campaign:', errInfo);
      return {
        success: false,
        error: error.message || 'שגיאה במחיקת קמפיין',
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error in deleteCampaign:', error);
    return {
      success: false,
      error: error.message || 'שגיאה במחיקת קמפיין',
    };
  }
}

