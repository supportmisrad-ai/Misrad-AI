'use server';

import { currentUser } from '@clerk/nextjs/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase';
import { createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getBaseUrl } from '@/lib/utils';
import { sendOrganizationWelcomeEmail } from '@/lib/email';

/**
 * Get or create user in Supabase users table from Clerk user ID
 * This is a Server Action that can bypass RLS if needed
 */
export async function getOrCreateSupabaseUserAction(
  clerkUserId: string,
  email?: string,
  fullName?: string,
  imageUrl?: string,
  preferredOrganizationKey?: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const preferredKeyRaw = preferredOrganizationKey ? String(preferredOrganizationKey).trim() : '';
    const isOrgInviteMode = preferredKeyRaw.toLowerCase().startsWith('invite:');

    let supabase;
    try {
      supabase = createClient();
      // Verify client is valid
      if (!supabase || typeof supabase.from !== 'function') {
        const errorMsg = 'Invalid Supabase client returned from createClient()';
        console.error('[getOrCreateSupabaseUserAction]', errorMsg, {
          hasSupabase: !!supabase,
          hasFrom: supabase ? typeof supabase.from : false,
          supabaseType: typeof supabase,
        });
        return createErrorResponse(new Error(errorMsg), 'Failed to create Supabase client');
      }
    } catch (clientError: any) {
      console.error('[getOrCreateSupabaseUserAction] Failed to create Supabase client:', {
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

    // First, try to find existing user
    const { data: existingUser, error: findError } = await supabase
      .from('social_users')
      .select('id, avatar_url, organization_id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (findError) {
      // If error is "not found" (PGRST116), that's OK - we'll create the user
      if (findError.code !== 'PGRST116') {
        console.error('[getOrCreateSupabaseUserAction] Error finding user:', {
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
      console.log('[getOrCreateSupabaseUserAction] User not found (PGRST116), will create new user');
    }

    if (existingUser && !findError) {
      // Update avatar_url if provided and different
      if (imageUrl && existingUser.avatar_url !== imageUrl) {
        await supabase
          .from('social_users')
          .update({ avatar_url: imageUrl })
          .eq('id', existingUser.id);
      }

      // Special mode: when preferred key is invite:<token>, the webhook will create the organization.
      if (!existingUser.organization_id && isOrgInviteMode) {
        return { success: true, userId: existingUser.id };
      }

      // If user has no organization but we got a preferred organization from invite flow -> attach and skip provisioning
      if (!existingUser.organization_id && preferredKeyRaw) {
        const orgKey = preferredKeyRaw;
        const { data: targetOrg } = await supabase
          .from('organizations')
          .select('id')
          .or(`id.eq.${orgKey},slug.eq.${orgKey}`)
          .maybeSingle();

        if (targetOrg?.id) {
          await supabase
            .from('social_users')
            .update({ organization_id: targetOrg.id } as any)
            .eq('id', existingUser.id);
        }
      }

      // Auto-provision organization if missing
      if (!existingUser.organization_id) {
        const orgName = fullName || email || 'Organization';
        const slugBase = String(orgName ?? '')
          .trim()
          .toLowerCase()
          .replace(/['\"`]/g, '')
          .replace(/[^a-z0-9\u0590-\u05FF]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 64);

        // Try create new org with default unlocked rooms
        const { data: createdOrg, error: createdOrgError } = await supabase
          .from('organizations')
          .insert({
            name: orgName,
            slug: slugBase || null,
            owner_id: existingUser.id,
            has_nexus: true,
            has_system: false,
            has_social: false,
            has_finance: false,
            has_client: false,
          } as any)
          .select('id, slug')
          .single();

        let organizationId: string | undefined = createdOrg?.id;
        let organizationSlug: string | undefined = createdOrg?.slug ?? undefined;

        // If unique violation (owner already has an org), fetch it
        if (!organizationId && createdOrgError) {
          const { data: existingOrg } = await supabase
            .from('organizations')
            .select('id, slug')
            .eq('owner_id', existingUser.id)
            .single();
          organizationId = existingOrg?.id;
          organizationSlug = existingOrg?.slug ?? undefined;

          // Best effort: ensure defaults
          if (organizationId) {
            await supabase
              .from('organizations')
              .update({
                has_nexus: true,
                has_system: false,
                has_social: false,
                has_finance: false,
                has_client: false,
              } as any)
              .eq('id', organizationId);
          }
        }

        if (organizationId) {
          await supabase
            .from('social_users')
            .update({ organization_id: organizationId } as any)
            .eq('id', existingUser.id);

          // Best-effort: send welcome email with portal link
          try {
            const ownerEmail = email ? String(email) : null;
            if (ownerEmail) {
              const baseUrl = getBaseUrl();
              const portalKey = organizationSlug || organizationId;
              const portalUrl = `${baseUrl}/w/${encodeURIComponent(String(portalKey))}`;
              await sendOrganizationWelcomeEmail({
                ownerEmail,
                organizationName: orgName,
                ownerName: fullName ? String(fullName) : null,
                portalUrl,
              });
            }
          } catch (e) {
            console.error('[getOrCreateSupabaseUserAction] welcome email failed (ignored)', e);
          }
        }
      }

      // Return userId directly (not wrapped in data) for consistency with existing code
      return { success: true, userId: existingUser.id };
    }

    // If not found, create new user
    const { data: newUser, error: createError } = await supabase
      .from('social_users')
      .insert({
        clerk_user_id: clerkUserId,
        email: email,
        full_name: fullName,
        avatar_url: imageUrl,
        role: 'team_member',
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
      console.error('[getOrCreateSupabaseUserAction] Error creating user:', errorDetails);
      
      // Provide more specific error messages
      let errorMessage = createError?.message || 'Unknown error creating user';
      
      // Check for common errors
      if (createError?.code === '23505') { // Unique violation
        errorMessage = 'משתמש עם אותו Clerk ID כבר קיים';
      } else if (createError?.message?.includes('permission') || createError?.message?.includes('RLS') || createError?.code === '42501') {
        errorMessage = 'שגיאה בהרשאות: נא לוודא שיש SERVICE_ROLE_KEY מוגדר או לבדוק את RLS policies';
      } else if (createError?.message?.includes('null value') || createError?.code === '23502') {
        errorMessage = 'שגיאה: שדה חובה חסר בטבלת users';
      }
      
      return createErrorResponse(createError || new Error(errorMessage), errorMessage);
    }

    // Special mode: when preferred key is invite:<token>, the webhook will create the organization.
    if (isOrgInviteMode) {
      return { success: true, userId: newUser.id };
    }

    // If invited to an existing organization, attach and skip auto-provisioning
    if (preferredKeyRaw) {
      const orgKey = preferredKeyRaw;
      const { data: targetOrg } = await supabase
        .from('organizations')
        .select('id')
        .or(`id.eq.${orgKey},slug.eq.${orgKey}`)
        .maybeSingle();

      if (targetOrg?.id) {
        await supabase
          .from('social_users')
          .update({ organization_id: targetOrg.id } as any)
          .eq('id', newUser.id);

        return { success: true, userId: newUser.id };
      }
    }

    // Auto-provision organization for new users
    try {
      const orgName = fullName || email || 'Organization';
      const slugBase = String(orgName ?? '')
        .trim()
        .toLowerCase()
        .replace(/['"`]/g, '')
        .replace(/[^a-z0-9\u0590-\u05FF]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 64);
      const { data: createdOrg, error: createdOrgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          slug: slugBase || null,
          owner_id: newUser.id,
          has_nexus: true,
          has_system: false,
          has_social: false,
          has_finance: false,
          has_client: false,
        } as any)
        .select('id, slug')
        .single();

      const organizationId = createdOrg?.id;
      const organizationSlug = createdOrg?.slug ?? undefined;

      if (organizationId) {
        await supabase
          .from('social_users')
          .update({ organization_id: organizationId } as any)
          .eq('id', newUser.id);

        // Best-effort: send welcome email with portal link
        try {
          const ownerEmail = email ? String(email) : null;
          if (ownerEmail) {
            const baseUrl = getBaseUrl();
            const portalKey = organizationSlug || organizationId;
            const portalUrl = `${baseUrl}/w/${encodeURIComponent(String(portalKey))}`;
            const signInUrl = `${baseUrl}/sign-in?redirect_url=${encodeURIComponent(portalUrl)}`;
            await sendOrganizationWelcomeEmail({
              ownerEmail,
              organizationName: orgName,
              ownerName: fullName ? String(fullName) : null,
              portalUrl: signInUrl,
            });
          }
        } catch (e) {
          console.error('[getOrCreateSupabaseUserAction] welcome email failed (ignored)', e);
        }
      } else if (createdOrgError) {
        // If org already exists for this owner, link to it
        const { data: existingOrg } = await supabase
          .from('organizations')
          .select('id, slug')
          .eq('owner_id', newUser.id)
          .single();

        if (existingOrg?.id) {
          await supabase
            .from('organizations')
            .update({
              has_nexus: true,
              has_system: false,
              has_social: false,
              has_finance: false,
              has_client: false,
            } as any)
            .eq('id', existingOrg.id);
          await supabase
            .from('social_users')
            .update({ organization_id: existingOrg.id } as any)
            .eq('id', newUser.id);

          // Best-effort: send welcome email with portal link
          try {
            const ownerEmail = email ? String(email) : null;
            if (ownerEmail) {
              const baseUrl = getBaseUrl();
              const portalKey = existingOrg.slug || existingOrg.id;
              const portalUrl = `${baseUrl}/w/${encodeURIComponent(String(portalKey))}`;
              const signInUrl = `${baseUrl}/sign-in?redirect_url=${encodeURIComponent(portalUrl)}`;
              await sendOrganizationWelcomeEmail({
                ownerEmail,
                organizationName: orgName,
                ownerName: fullName ? String(fullName) : null,
                portalUrl: signInUrl,
              });
            }
          } catch (e) {
            console.error('[getOrCreateSupabaseUserAction] welcome email failed (ignored)', e);
          }
        }
      }
    } catch {
      // Best-effort provisioning
    }

    // Return userId directly (not wrapped in data) for consistency with existing code
    return { success: true, userId: newUser.id };
  } catch (error: any) {
    console.error('[getOrCreateSupabaseUserAction] Unexpected error:', {
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

export async function provisionCurrentUserWorkspaceAction(): Promise<{
  success: boolean;
  organizationKey?: string;
  error?: string;
}> {
  try {
    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return createErrorResponse('Not authenticated');
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress
      ? String(user.emailAddresses[0].emailAddress)
      : undefined;
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || undefined;
    const imageUrl = user?.imageUrl ? String(user.imageUrl) : undefined;

    const syncRes = await getOrCreateSupabaseUserAction(clerkUserId, email, fullName, imageUrl);
    if (!syncRes.success || !syncRes.userId) {
      return createErrorResponse(syncRes.error || 'Failed to sync user');
    }

    const supabase = createServiceRoleClient();

    const { data: socialUser } = await supabase
      .from('social_users')
      .select('id, organization_id')
      .eq('id', syncRes.userId)
      .maybeSingle();

    let organizationId = (socialUser as any)?.organization_id as string | null;
    if (!organizationId) {

      const orgName = fullName || email || 'Organization';
      const slugBase = String(orgName ?? '')
        .trim()
        .toLowerCase()
        .replace(/['"`]/g, '')
        .replace(/[^a-z0-9\u0590-\u05FF]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 64);

      const { data: createdOrg, error: createdOrgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          slug: slugBase || null,
          owner_id: syncRes.userId,
          has_nexus: true,
          has_system: false,
          has_social: false,
          has_finance: false,
          has_client: false,
        } as any)
        .select('id')
        .single();

      if (createdOrgError || !createdOrg?.id) {
        return createErrorResponse(
          createdOrgError || 'Failed to create organization',
          createdOrgError?.message || 'לא הצלחנו ליצור עסק חדש. נא נסה שוב או פנה לתמיכה.'
        );
      }

      organizationId = createdOrg.id;

      const { error: linkError } = await supabase
        .from('social_users')
        .update({ organization_id: organizationId } as any)
        .eq('id', syncRes.userId);

      if (linkError) {
        return createErrorResponse(
          linkError,
          linkError?.message || 'העסק נוצר אך לא הצלחנו לשייך אותו למשתמש. נא נסה שוב.'
        );
      }
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('id, slug')
      .eq('id', organizationId)
      .maybeSingle();

    const organizationKey = String((org as any)?.slug || (org as any)?.id || organizationId);
    return createSuccessResponse({ organizationKey });
  } catch (error: any) {
    return createErrorResponse(error, error?.message || 'Failed to provision workspace');
  }
}

/**
 * Get current user's Supabase ID
 */
export async function getCurrentSupabaseUserId(): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return createErrorResponse('Not authenticated');
    }

    const result = await getOrCreateSupabaseUserAction(clerkUserId);
    return result;
  } catch (error: any) {
    console.error('Error in getCurrentSupabaseUserId:', error);
    return createErrorResponse('Failed to get user ID', error?.message);
  }
}

/**
 * Get current user info including role and organizationId
 */
export async function getCurrentUserInfo(): Promise<{
  success: boolean;
  userId?: string;
  role?: string;
  organizationId?: string;
  error?: string;
}> {
  try {
    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return createErrorResponse('Not authenticated');
    }

    const userResult = await getOrCreateSupabaseUserAction(clerkUserId);
    if (!userResult.success || !userResult.userId) {
      return createErrorResponse('Failed to get user', userResult.error);
    }

    const roleResult = await getUserRoleFromSupabaseAction(userResult.userId);
    if (!roleResult.success) {
      return createErrorResponse('Failed to get user role', roleResult.error);
    }

    return {
      success: true,
      userId: userResult.userId,
      role: roleResult.role,
      organizationId: roleResult.organizationId,
    };
  } catch (error: any) {
    console.error('Error in getCurrentUserInfo:', error);
    return createErrorResponse('Failed to get user info', error?.message);
  }
}

/**
 * Get user role from users table (Server Action - bypasses RLS with SERVICE_ROLE_KEY)
 * Role is now stored directly in the users table: 'super_admin' | 'owner' | 'team_member'
 */
export async function getUserRoleFromSupabaseAction(
  supabaseUserId: string
): Promise<{ success: boolean; role?: string; organizationId?: string; error?: string }> {
  try {
    const supabase = createClient();
    
    // Verify client is valid
    if (!supabase || typeof supabase.from !== 'function') {
      throw new Error('Invalid Supabase client returned from createClient()');
    }

    // Get role from users table (now role is stored directly in users)
    const { data: user, error } = await supabase
      .from('social_users')
      .select('role, organization_id')
      .eq('id', supabaseUserId)
      .single();

    if (error) {
      console.error('[getUserRoleFromSupabaseAction] Error fetching user:', error);
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
    console.error('[getUserRoleFromSupabaseAction] Error getting role:', error);
    return createErrorResponse('Failed to get user role', error?.message);
  }
}
