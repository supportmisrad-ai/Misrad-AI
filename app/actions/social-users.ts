'use server';

import { createClient } from '@/lib/supabase';
import { createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';

/**
 * Get or create user in Supabase social_users table from Clerk user ID
 * This is a Server Action for the Social module that can bypass RLS if needed
 */
export async function getOrCreateSocialSupabaseUserAction(
  clerkUserId: string,
  email?: string,
  fullName?: string,
  imageUrl?: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    let supabase;
    try {
      supabase = createClient();
      // Verify client is valid
      if (!supabase || typeof supabase.from !== 'function') {
        const errorMsg = 'Invalid Supabase client returned from createClient()';
        console.error('[getOrCreateSocialSupabaseUserAction]', errorMsg, {
          hasSupabase: !!supabase,
          hasFrom: supabase ? typeof supabase.from : false,
          supabaseType: typeof supabase,
        });
        return createErrorResponse(new Error(errorMsg), 'Failed to create Supabase client');
      }
    } catch (clientError: any) {
      console.error('[getOrCreateSocialSupabaseUserAction] Failed to create Supabase client:', {
        error: clientError,
        message: clientError?.message,
        stack: clientError?.stack,
        name: clientError?.name,
      });
      return createErrorResponse(
        clientError, 
        clientError?.message || 'Failed to create Supabase client'
      );
    }

    // First, try to find existing user in social_users
    const { data: existingUser, error: findError } = await supabase
      .from('social_users')
      .select('id, avatar_url')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (findError) {
      // If error is "not found" (PGRST116), that's OK - we'll create the user
      if (findError.code !== 'PGRST116') {
        console.error('[getOrCreateSocialSupabaseUserAction] Error finding user:', {
          error: findError,
          code: findError.code,
          message: findError.message,
          details: findError.details,
          hint: findError.hint,
          clerkUserId,
        });
        
        // Check if it's an RLS/permission error
        if (findError.message?.includes('permission') || findError.message?.includes('RLS') || findError.code === '42501') {
          return createErrorResponse(
            new Error('Permission denied - check RLS policies'),
            'שגיאה בהרשאות: נא לוודא שיש SERVICE_ROLE_KEY מוגדר או לבדוק את RLS policies'
          );
        }
        
        return createErrorResponse(
          'Failed to find user', 
          findError.message || 'Unknown error finding user'
        );
      }
      // PGRST116 means "not found" - this is OK, we'll create the user below
      console.log('[getOrCreateSocialSupabaseUserAction] User not found (PGRST116), will create new user');
    }

    if (existingUser && !findError) {
      // Update avatar_url if provided and different
      if (imageUrl && existingUser.avatar_url !== imageUrl) {
        await supabase
          .from('social_users')
          .update({ avatar_url: imageUrl, updated_at: new Date().toISOString() })
          .eq('id', existingUser.id);
      }
      // Return userId directly (not wrapped in data) for consistency with existing code
      return { success: true, userId: existingUser.id };
    }

    // If not found, create new user in social_users
    const { data: newUser, error: createError } = await supabase
      .from('social_users')
      .insert({
        clerk_user_id: clerkUserId,
        email: email,
        full_name: fullName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        role: 'team_member', // Default role for social module
      })
      .select('id')
      .single();

    if (createError || !newUser) {
      const errorDetails = {
        error: createError,
        code: createError?.code,
        message: createError?.message,
        details: createError?.details,
        hint: createError?.hint,
        hasNewUser: !!newUser,
        clerkUserId,
        email,
        fullName,
      };
      console.error('[getOrCreateSocialSupabaseUserAction] Error creating user:', errorDetails);
      
      // Provide more specific error messages
      let errorMessage = createError?.message || 'Unknown error creating user';
      
      // Check for common errors
      if (createError?.code === '23505') { // Unique violation
        errorMessage = 'משתמש עם אותו Clerk ID כבר קיים';
      } else if (createError?.message?.includes('permission') || createError?.message?.includes('RLS') || createError?.code === '42501') {
        errorMessage = 'שגיאה בהרשאות: נא לוודא שיש SERVICE_ROLE_KEY מוגדר או לבדוק את RLS policies';
      } else if (createError?.message?.includes('null value') || createError?.code === '23502') {
        errorMessage = 'שגיאה: שדה חובה חסר בטבלת social_users';
      }
      
      return createErrorResponse(createError || new Error(errorMessage), errorMessage);
    }

    // Return userId directly (not wrapped in data) for consistency with existing code
    return { success: true, userId: newUser.id };
  } catch (error: any) {
    console.error('[getOrCreateSocialSupabaseUserAction] Unexpected error:', {
      error,
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      clerkUserId,
      email,
    });
    return createErrorResponse(
      error, 
      error?.message || 'Failed to get or create user'
    );
  }
}

/**
 * Get user role from social_users table (Server Action - bypasses RLS with SERVICE_ROLE_KEY)
 * Role is stored in social_users table: 'super_admin' | 'owner' | 'team_member'
 */
export async function getSocialUserRoleFromSupabaseAction(
  supabaseUserId: string
): Promise<{ success: boolean; role?: string; organizationId?: string; error?: string }> {
  try {
    const supabase = createClient();
    
    // Verify client is valid
    if (!supabase || typeof supabase.from !== 'function') {
      throw new Error('Invalid Supabase client returned from createClient()');
    }

    // Get role from social_users table
    const { data: user, error } = await supabase
      .from('social_users')
      .select('role, organization_id')
      .eq('id', supabaseUserId)
      .single();

    if (error) {
      console.error('[getSocialUserRoleFromSupabaseAction] Error fetching user:', error);
      // If user not found, default to 'team_member' role (not an error)
      if (error.code === 'PGRST116') {
        return { success: true, role: 'team_member' };
      }
      return createErrorResponse('Failed to fetch user role', error.message);
    }

    if (user?.role) {
      return { 
        success: true, 
        role: user.role,
        organizationId: user.organization_id || undefined
      };
    }

    // Default to 'team_member' if no role found
    return { success: true, role: 'team_member' };
  } catch (error: any) {
    console.error('[getSocialUserRoleFromSupabaseAction] Error getting role:', error);
    return createErrorResponse('Failed to get user role', error?.message);
  }
}
