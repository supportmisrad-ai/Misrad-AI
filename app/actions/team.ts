'use server';

import { createClient } from '@/lib/supabase';
import type { TeamMember } from '@/types/social';
import { getCurrentUserInfo } from './users';

/**
 * Server Action: Get all team members
 * Filters by organization - only shows team members from user's organization
 * Super admin sees all team members
 */
export async function getTeamMembers(): Promise<{ success: boolean; data?: TeamMember[]; error?: string }> {
  try {
    let supabase;
    try {
      supabase = createClient();
      // Verify client is valid
      if (!supabase || typeof supabase.from !== 'function') {
        throw new Error('Invalid Supabase client returned from createClient()');
      }
    } catch (clientError: any) {
      console.error('[getTeamMembers] Failed to create Supabase client:', clientError);
      console.error('[getTeamMembers] Error details:', {
        message: clientError.message,
        stack: clientError.stack,
      });
      return {
        success: false,
        error: `שגיאה בהתחברות למסד הנתונים: ${clientError.message}`,
      };
    }

    // Get user info (role and organizationId)
    const userInfo = await getCurrentUserInfo();
    if (!userInfo.success) {
      return {
        success: false,
        error: userInfo.error || 'שגיאה בקבלת פרטי משתמש',
      };
    }

    const userRole = userInfo.role;
    const userOrganizationId = userInfo.organizationId;

    let query = supabase
      .from('social_team_members')
      .select(`
        *,
        social_team_member_clients (client_id)
      `)
      .order('created_at', { ascending: false });

    // Filter by organization - super_admin sees all, others see only their organization
    if (userRole === 'super_admin') {
      // Super admin sees all team members - no filter
    } else if (userOrganizationId) {
      // Owner and team_member see only team members from their organization
      query = query.eq('organization_id', userOrganizationId);
    } else {
      // If no organizationId, return empty (user not part of any organization)
      return {
        success: true,
        data: [],
      };
    }

    // Execute the query
    const { data, error } = await query;

    if (error) {
      console.error('[getTeamMembers] Error fetching team members:', error);
      console.error('[getTeamMembers] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      
      // Check if it's an RLS/permission error
      if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('policy')) {
        return {
          success: false,
          error: `שגיאת הרשאות: ${error.message}. ייתכן שצריך לתקן את מדיניות RLS.`,
        };
      }
      
      return {
        success: false,
        error: error.message || 'שגיאה בטעינת חברי צוות',
      };
    }

    const teamMembers: TeamMember[] = (data || []).map((member: any) => ({
      id: member.id,
      userId: member.user_id,
      organizationId: member.organization_id, // Add organizationId
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

    return {
      success: true,
      data: teamMembers,
    };
  } catch (error: any) {
    console.error('Error in getTeamMembers:', error);
    return {
      success: false,
      error: error.message || 'שגיאה בטעינת חברי צוות',
    };
  }
}

