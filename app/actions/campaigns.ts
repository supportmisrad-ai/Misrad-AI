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

    let query = supabase
      .from('campaigns')
      .select('*, clients!inner (organization_id)')
      .order('created_at', { ascending: false });

    if (organizationId) {
      query = query.eq('clients.organization_id', organizationId);
    }

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching campaigns:', error);
      return {
        success: false,
        error: error.message,
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

    const { data, error } = await supabase
      .from('campaigns')
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
      console.error('Error creating campaign:', error);
      return {
        success: false,
        error: error.message,
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
      .from('campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .select()
      .single();

    if (error) {
      console.error('Error updating campaign:', error);
      return {
        success: false,
        error: error.message,
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

    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId);

    if (error) {
      console.error('Error deleting campaign:', error);
      return {
        success: false,
        error: error.message,
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

