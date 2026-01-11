'use server';

import { createClient } from '@/lib/supabase';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { translateError } from '@/lib/errorTranslations';
import type { UserRole } from '@/types/social';
import { clerkClient, currentUser } from '@clerk/nextjs/server';
import { getOrCreateSupabaseUserAction } from './users';
import { z } from 'zod';

async function requireSuperAdminOrFail() {
  const authCheck = await requireAuth();
  if (!authCheck.success) return authCheck as any;
  const u = await currentUser();
  const isSuperAdmin = Boolean((u as any)?.publicMetadata?.isSuperAdmin);
  if (!isSuperAdmin) {
    return createErrorResponse('Forbidden', 'אין הרשאה');
  }
  return { success: true, userId: authCheck.userId } as const;
}

const listUsersSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
  search: z.string().optional(),
});

export async function getAdminUsersPage(params?: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<{ success: boolean; data?: { items: any[]; total: number }; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck as any;

    const parsed = listUsersSchema.safeParse({
      limit: params?.limit,
      offset: params?.offset,
      search: params?.search,
    });
    const limit = parsed.success ? parsed.data.limit : 25;
    const offset = parsed.success ? parsed.data.offset : 0;
    const search = parsed.success ? parsed.data.search : undefined;

    const supabase = createClient();
    let query = supabase
      .from('nexus_users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search && search.trim()) {
      const s = search.trim();
      query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%`);
    }

    const { data, error, count } = await query;
    if (error) {
      return createErrorResponse(error, 'שגיאה בטעינת משתמשים');
    }

    const items = (data || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      email: m.email || 'אין דוא"ל',
      role: m.role || 'user',
      plan: 'free',
      registeredAt: m.created_at,
      lastActivity: m.updated_at || m.created_at,
      isBanned: false,
      avatar: m.avatar || null,
    }));

    return createSuccessResponse({ items, total: count || 0 }) as any;
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת משתמשים');
  }
}

/**
 * Update user profile (admin only)
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    email?: string;
    role?: UserRole;
    plan?: 'free' | 'pro';
    avatar?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck as any;

    const supabase = createClient();

    // Update nexus_users table
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.email) updateData.email = updates.email;
    if (updates.role) updateData.role = updates.role;
    if (updates.avatar) updateData.avatar = updates.avatar;
    
    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('nexus_users')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      return createErrorResponse(error, 'שגיאה בעדכון פרופיל משתמש');
    }

    // Log the action
    await supabase.from('activity_logs').insert({
      user_id: adminCheck.userId,
      action: `עדכון פרופיל משתמש: ${userId}`,
      created_at: new Date().toISOString(),
    });

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בעדכון פרופיל משתמש');
  }
}

/**
 * Get user details for editing
 */
export async function getUserDetails(
  userId: string
): Promise<{
  success: boolean;
  data?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    plan: 'free' | 'pro';
    avatar: string | null;
    registeredAt: string;
    lastActivity: string | null;
  };
  error?: string;
}> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck as any;

    const supabase = createClient();

    const { data: member, error } = await supabase
      .from('nexus_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !member) {
      return createErrorResponse(error, 'משתמש לא נמצא');
    }

    // Get last activity
    const { data: lastActivity } = await supabase
      .from('activity_logs')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return createSuccessResponse({
      id: member.id,
      name: member.name,
      email: member.email || '',
      role: member.role as UserRole,
      plan: 'free',
      avatar: member.avatar || null,
      registeredAt: member.created_at,
      lastActivity: lastActivity?.created_at || null,
    });
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת פרטי משתמש');
  }
}

/**
 * Create a new user (admin only)
 * Creates user in Clerk and then in Supabase
 */
export async function createUser(
  userData: {
    email: string;
    firstName: string;
    lastName?: string;
    password?: string;
    role?: UserRole;
    plan?: 'free' | 'pro';
  }
): Promise<{
  success: boolean;
  data?: {
    clerkUserId: string;
    supabaseUserId: string;
    email: string;
  };
  error?: string;
}> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck as any;

    // Validate input - trim and check
    const trimmedEmail = userData.email?.trim();
    const trimmedFirstName = userData.firstName?.trim();
    const trimmedLastName = userData.lastName?.trim();
    
    // Debug logging
    console.log('[createUser] Input validation - Raw email:', JSON.stringify(userData.email));
    console.log('[createUser] Input validation - Trimmed email:', JSON.stringify(trimmedEmail));
    console.log('[createUser] Input validation - Email type:', typeof trimmedEmail);
    console.log('[createUser] Input validation - Email length:', trimmedEmail?.length);
    
    if (!trimmedEmail || !trimmedFirstName) {
      console.log('[createUser] Validation failed - missing email or firstName');
      return createErrorResponse(null, 'נא למלא אימייל ושם פרטי');
    }

    // Validate email format using Zod (more reliable than regex)
    const emailSchema = z.string().email('כתובת אימייל לא תקינה');
    const emailValidation = emailSchema.safeParse(trimmedEmail);
    
    console.log('[createUser] Email Zod validation result:', emailValidation.success);
    console.log('[createUser] Email Zod validation for:', trimmedEmail);
    
    if (!emailValidation.success) {
      console.log('[createUser] Email validation failed:', emailValidation.error.issues);
      const errorMessage = emailValidation.error.issues[0]?.message || 'כתובת אימייל לא תקינה';
      return createErrorResponse(null, errorMessage);
    }
    
    // Validate email length (Clerk has limits)
    if (trimmedEmail.length > 255) {
      return createErrorResponse(null, 'כתובת אימייל ארוכה מדי');
    }
    
    // Validate firstName length (Clerk requires at least 1 character, max 256)
    if (trimmedFirstName.length === 0) {
      return createErrorResponse(null, 'שם פרטי לא יכול להיות ריק');
    }
    if (trimmedFirstName.length > 256) {
      return createErrorResponse(null, 'שם פרטי ארוך מדי (מקסימום 256 תווים)');
    }
    // Validate firstName doesn't contain only special characters or numbers
    if (/^[\d\s\-_]+$/.test(trimmedFirstName)) {
      return createErrorResponse(null, 'שם פרטי חייב להכיל אותיות');
    }
    
    // Validate lastName length if provided
    if (trimmedLastName && trimmedLastName.length > 256) {
      return createErrorResponse(null, 'שם משפחה ארוך מדי (מקסימום 256 תווים)');
    }

      // Verify Clerk is configured
      const clerkSecretKey = process.env.CLERK_SECRET_KEY;
      if (!clerkSecretKey) {
        console.error('[createUser] ❌ CLERK_SECRET_KEY is missing!');
        return createErrorResponse(null, 'Clerk לא מוגדר. נא לבדוק את CLERK_SECRET_KEY ב-.env.local');
      }
      if (!clerkSecretKey.startsWith('sk_test_') && !clerkSecretKey.startsWith('sk_live_')) {
        console.error('[createUser] ❌ CLERK_SECRET_KEY format is invalid!');
        return createErrorResponse(null, 'CLERK_SECRET_KEY לא תקין. נא לבדוק את המפתח ב-Clerk Dashboard');
      }
      
      const fullName = userData.lastName 
        ? `${userData.firstName} ${userData.lastName}` 
        : userData.firstName;

      // Create user in Clerk
      const client = await clerkClient();
      
      // Verify client was created successfully
      if (!client) {
        console.error('[createUser] ❌ clerkClient() returned null/undefined!');
        return createErrorResponse(null, 'שגיאה ביצירת Clerk client. נא לבדוק את CLERK_SECRET_KEY');
      }
      
    // Check if user already exists with this email BEFORE creating invitation
    try {
      console.log('[createUser] Checking if user already exists with email:', trimmedEmail);
      const existingUsers = await client.users.getUserList({ 
        emailAddress: [trimmedEmail],
        limit: 1 
      });
      
      if (existingUsers.data && existingUsers.data.length > 0) {
        const existingUser = existingUsers.data[0];
        console.log('[createUser] User already exists:', existingUser.id);
        return createErrorResponse(null, 'האימייל כבר קיים במערכת');
         }
      console.log('[createUser] No existing user found, proceeding with invitation...');
    } catch (checkError: any) {
      // If check fails, continue anyway - maybe API doesn't support this query
      console.log('[createUser] Could not check for existing user, continuing anyway:', checkError.message);
    }
    
    // Use Invitations API - it's more reliable and works better with "Verify at sign-up"
    // This sends an invitation email to the user, and they create their own account
    console.log('[createUser] Using Invitations API to invite user:', trimmedEmail);
    try {
      // Clerk Invitations API - minimal data needed
      const invitationData: any = {
        emailAddress: trimmedEmail,
      };
      
      // Only add publicMetadata if it's supported (some Clerk instances may not support it)
      // Try with publicMetadata first, if it fails we'll try without it
      try {
        const invitation = await client.invitations.createInvitation({
          emailAddress: trimmedEmail,
          publicMetadata: {
            role: userData.role || 'team_member',
            plan: userData.plan || 'free',
          },
        });
        
        console.log('[createUser] ✅ Invitation created successfully with metadata!', invitation.id);
      
        // Log the action
        try {
          const supabase = createClient();
          await supabase.from('activity_logs').insert({
            user_id: adminCheck.userId,
            action: `שליחת הזמנה למשתמש חדש: ${trimmedEmail}`,
            created_at: new Date().toISOString(),
          });
        } catch (logError) {
          console.error('Error logging invitation action:', logError);
        }
        
        return createSuccessResponse({
          clerkUserId: invitation.id,
          supabaseUserId: '',
          email: trimmedEmail,
        });
      } catch (metadataError: any) {
        // If publicMetadata fails, try without it
        console.log('[createUser] Creating invitation with metadata failed, trying without metadata...', metadataError.message);
        
        const invitation = await client.invitations.createInvitation({
          emailAddress: trimmedEmail,
        });
        
        console.log('[createUser] ✅ Invitation created successfully without metadata!', invitation.id);
        
        // Log the action
        try {
          const supabase = createClient();
          await supabase.from('activity_logs').insert({
            user_id: adminCheck.userId,
            action: `שליחת הזמנה למשתמש חדש: ${trimmedEmail}`,
            created_at: new Date().toISOString(),
          });
        } catch (logError) {
          console.error('Error logging invitation action:', logError);
        }
        
        return createSuccessResponse({
          clerkUserId: invitation.id,
          supabaseUserId: '',
          email: trimmedEmail,
        });
      }
    } catch (invitationError: any) {
      console.error('[createUser] ❌ Invitation creation failed:', invitationError);
      console.error('[createUser] Invitation error type:', typeof invitationError);
      console.error('[createUser] Invitation error keys:', Object.keys(invitationError || {}));
      console.error('[createUser] Invitation error details:', JSON.stringify(invitationError, Object.getOwnPropertyNames(invitationError), 2));
      
      // Extract error message - prioritize detailed error messages
      let errorMessage = 'שגיאה ביצירת הזמנה';
      
      // Check for errors array first (Clerk's standard format)
      if (invitationError?.errors && Array.isArray(invitationError.errors) && invitationError.errors.length > 0) {
        const firstError = invitationError.errors[0];
        console.error('[createUser] First error from array:', JSON.stringify(firstError, null, 2));
        
        if (firstError?.longMessage) {
          errorMessage = firstError.longMessage;
        } else if (firstError?.message) {
          errorMessage = firstError.message;
        } else if (firstError?.meta?.param && firstError?.meta?.reason) {
            errorMessage = `${firstError.meta.param}: ${firstError.meta.reason}`;
        } else if (firstError?.meta?.reason) {
            errorMessage = firstError.meta.reason;
        } else if (firstError?.code) {
          errorMessage = firstError.code;
        }
      } else if (invitationError?.message) {
        errorMessage = invitationError.message;
      } else if (invitationError?.statusText) {
        errorMessage = invitationError.statusText;
      } else if (invitationError?.status) {
        errorMessage = `HTTP ${invitationError.status}: ${errorMessage}`;
      }
      
      console.error('[createUser] Extracted error message:', errorMessage);
      
      // Translate common errors to Hebrew
      const errorLower = errorMessage.toLowerCase();
      if (errorLower.includes('pending invitations') || (errorLower.includes('duplicate') && errorLower.includes('invitation'))) {
        errorMessage = 'יש כבר הזמנה ממתינה לאימייל הזה. נא לבדוק את תיבת הדואר או לנסות עם אימייל אחר';
      } else if (errorLower.includes('already') && errorLower.includes('exists') && !errorLower.includes('invitation')) {
        errorMessage = 'האימייל כבר קיים במערכת';
      } else if (errorLower.includes('invalid') && errorLower.includes('email')) {
        errorMessage = 'כתובת אימייל לא תקינה';
      } else if (errorLower.includes('bad request') || errorLower.includes('400')) {
        // For 400 errors, if we have a detailed message, use it; otherwise show generic
        if (!errorLower.includes('bad request') && errorMessage !== 'שגיאה ביצירת הזמנה') {
          // Keep the detailed error message
        } else {
          errorMessage = `שגיאה: ${errorMessage}`;
    }
      }
      
      return createErrorResponse(invitationError, errorMessage);
    }
  } catch (error: any) {
    console.error('Error in createUser:', error);
    return createErrorResponse(error, 'שגיאה ביצירת משתמש');
  }
}

