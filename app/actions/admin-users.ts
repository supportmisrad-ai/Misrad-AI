'use server';

import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import prisma from '@/lib/prisma';
import type { UserRole } from '@/types/social';
import { clerkClient, currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';

const IS_PROD = process.env.NODE_ENV === 'production';
const DEBUG_ADMIN_USERS = process.env.DEBUG_ADMIN_USERS === 'true' && !IS_PROD;

function debugLog(...args: any[]) {
  if (DEBUG_ADMIN_USERS) console.log(...args);
}

function safeErrorLog(message: string, error?: any) {
  if (DEBUG_ADMIN_USERS && error !== undefined) console.error(message, error);
  else console.error(message);
}

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

    const s = search && search.trim() ? search.trim() : '';
    const where = s
      ? {
          OR: [
            { name: { contains: s, mode: 'insensitive' as const } },
            { email: { contains: s, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [total, rows] = await prisma.$transaction([
      prisma.nexusUser.count({ where: where as any }),
      prisma.nexusUser.findMany({
        where: where as any,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
    ]);

    const items = (rows || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      email: m.email || 'אין דוא"ל',
      role: m.role || 'user',
      plan: 'free',
      registeredAt: m.createdAt ? new Date(m.createdAt).toISOString() : null,
      lastActivity: (m.updatedAt || m.createdAt) ? new Date(m.updatedAt || m.createdAt).toISOString() : null,
      isBanned: false,
      avatar: m.avatar || null,
    }));

    return createSuccessResponse({ items, total: total || 0 }) as any;
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת משתמשים');
  }
}

export async function deleteAdminUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck as any;

    const resolvedUserId = String(userId || '').trim();
    if (!resolvedUserId) {
      return createErrorResponse(null, 'חסר מזהה משתמש');
    }

    const existing = await prisma.nexusUser.findUnique({
      where: { id: resolvedUserId },
      select: { id: true, organizationId: true },
    });

    if (!existing?.id) {
      return createErrorResponse(new Error('User not found'), 'משתמש לא נמצא');
    }

    const organizationId = existing.organizationId ? String(existing.organizationId) : '';
    if (!organizationId) {
      return createErrorResponse(null, 'Tenant Isolation lockdown: משתמש ללא organization_id לא ניתן למחיקה דרך Admin');
    }

    await prisma.nexusUser.deleteMany({
      where: { id: resolvedUserId, organizationId },
    });

    try {
      await prisma.social_sync_logs.create({
        data: {
          user_id: adminCheck.userId ? String(adminCheck.userId) : null,
          integration_name: 'admin_users',
          sync_type: 'admin_delete_user',
          status: 'success',
          items_synced: 1,
          started_at: new Date(),
          completed_at: new Date(),
          metadata: {
            action: 'delete_user',
            targetUserId: resolvedUserId,
            organizationId,
          } as any,
        },
      });
    } catch {
    }

    return createSuccessResponse(true) as any;
  } catch (error) {
    return createErrorResponse(error, 'שגיאה במחיקת משתמש');
  }
}

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

    const resolvedUserId = String(userId || '').trim();
    if (!resolvedUserId) {
      return createErrorResponse(null, 'חסר מזהה משתמש');
    }

    const existing = await prisma.nexusUser.findUnique({
      where: { id: resolvedUserId },
      select: { id: true, organizationId: true },
    });

    if (!existing?.id) {
      return createErrorResponse(new Error('User not found'), 'משתמש לא נמצא');
    }

    const organizationId = existing.organizationId ? String(existing.organizationId) : '';
    if (!organizationId) {
      return createErrorResponse(null, 'Tenant Isolation lockdown: משתמש ללא organization_id לא ניתן לעדכון דרך Admin');
    }

    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.email) updateData.email = updates.email;
    if (updates.role) updateData.role = updates.role;
    if (updates.avatar) updateData.avatar = updates.avatar;

    updateData.updatedAt = new Date();

    await prisma.nexusUser.updateMany({
      where: { id: resolvedUserId, organizationId },
      data: updateData,
    });

    try {
      await prisma.social_sync_logs.create({
        data: {
          user_id: adminCheck.userId ? String(adminCheck.userId) : null,
          integration_name: 'admin_users',
          sync_type: 'admin_update_user',
          status: 'success',
          items_synced: 1,
          started_at: new Date(),
          completed_at: new Date(),
          metadata: {
            action: 'update_user',
            targetUserId: resolvedUserId,
            organizationId,
            updates: {
              name: updates.name ?? null,
              email: updates.email ?? null,
              role: updates.role ?? null,
              avatar: updates.avatar ?? null,
            },
          } as any,
        },
      });
    } catch {
    }

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בעדכון פרופיל משתמש');
  }
}

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

    const member = await prisma.nexusUser.findUnique({
      where: { id: String(userId) },
    });

    if (!member?.id) {
      return createErrorResponse(new Error('User not found'), 'משתמש לא נמצא');
    }

    let lastActivityIso: string | null = null;
    try {
      const last = await prisma.social_sync_logs.findFirst({
        where: { user_id: String(userId) },
        orderBy: { started_at: 'desc' },
        select: { started_at: true },
      });
      lastActivityIso = last?.started_at ? new Date(last.started_at).toISOString() : null;
    } catch {
    }

    return createSuccessResponse({
      id: member.id,
      name: member.name,
      email: member.email || '',
      role: member.role as UserRole,
      plan: 'free',
      avatar: member.avatar || null,
      registeredAt: member.createdAt ? new Date(member.createdAt).toISOString() : '',
      lastActivity: lastActivityIso || (member.updatedAt ? new Date(member.updatedAt).toISOString() : (member.createdAt ? new Date(member.createdAt).toISOString() : null)),
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

    const trimmedEmail = userData.email?.trim();
    const trimmedFirstName = userData.firstName?.trim();
    const trimmedLastName = userData.lastName?.trim();

    debugLog('[createUser] Input validation - Raw email:', JSON.stringify(userData.email));
    debugLog('[createUser] Input validation - Trimmed email:', JSON.stringify(trimmedEmail));
    debugLog('[createUser] Input validation - Email type:', typeof trimmedEmail);
    debugLog('[createUser] Input validation - Email length:', trimmedEmail?.length);

    if (!trimmedEmail || !trimmedFirstName) {
      debugLog('[createUser] Validation failed - missing email or firstName');
      return createErrorResponse(null, 'נא למלא אימייל ושם פרטי');
    }

    const emailSchema = z.string().email('כתובת אימייל לא תקינה');
    const emailValidation = emailSchema.safeParse(trimmedEmail);

    debugLog('[createUser] Email Zod validation result:', emailValidation.success);
    debugLog('[createUser] Email Zod validation for:', trimmedEmail);

    if (!emailValidation.success) {
      debugLog('[createUser] Email validation failed:', emailValidation.error.issues);
      const errorMessage = emailValidation.error.issues[0]?.message || 'כתובת אימייל לא תקינה';
      return createErrorResponse(null, errorMessage);
    }

    if (trimmedEmail.length > 255) {
      return createErrorResponse(null, 'כתובת אימייל ארוכה מדי');
    }

    if (trimmedFirstName.length === 0) {
      return createErrorResponse(null, 'שם פרטי לא יכול להיות ריק');
    }
    if (trimmedFirstName.length > 256) {
      return createErrorResponse(null, 'שם פרטי ארוך מדי (מקסימום 256 תווים)');
    }
    if (/^[\d\s\-_]+$/.test(trimmedFirstName)) {
      return createErrorResponse(null, 'שם פרטי חייב להכיל אותיות');
    }

    if (trimmedLastName && trimmedLastName.length > 256) {
      return createErrorResponse(null, 'שם משפחה ארוך מדי (מקסימום 256 תווים)');
    }

    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      safeErrorLog('[createUser] Clerk secret key is missing');
      return createErrorResponse(null, IS_PROD ? 'Clerk לא מוגדר' : 'Clerk לא מוגדר. נא לבדוק את CLERK_SECRET_KEY ב-.env.local');
    }
    if (!clerkSecretKey.startsWith('sk_test_') && !clerkSecretKey.startsWith('sk_live_')) {
      safeErrorLog('[createUser] Clerk secret key format is invalid');
      return createErrorResponse(null, IS_PROD ? 'Clerk לא מוגדר' : 'CLERK_SECRET_KEY לא תקין. נא לבדוק את המפתח ב-Clerk Dashboard');
    }

    const fullName = userData.lastName
      ? `${userData.firstName} ${userData.lastName}`
      : userData.firstName;

    const client = await clerkClient();

    if (!client) {
      safeErrorLog('[createUser] clerkClient() returned null/undefined');
      return createErrorResponse(null, IS_PROD ? 'שגיאה ביצירת משתמש' : 'שגיאה ביצירת Clerk client. נא לבדוק את CLERK_SECRET_KEY');
    }

    try {
      debugLog('[createUser] Checking if user already exists with email:', trimmedEmail);
      const existingUsers = await client.users.getUserList({
        emailAddress: [trimmedEmail],
        limit: 1
      });

      if (existingUsers.data && existingUsers.data.length > 0) {
        const existingUser = existingUsers.data[0];
        debugLog('[createUser] User already exists:', existingUser.id);
        return createErrorResponse(null, 'האימייל כבר קיים במערכת');
      }
      debugLog('[createUser] No existing user found, proceeding with invitation...');
    } catch (checkError: any) {
      debugLog('[createUser] Could not check for existing user, continuing anyway:', checkError.message);
    }

    try {
      const invitationData: any = {
        emailAddress: trimmedEmail,
      };

      try {
        const invitation = await client.invitations.createInvitation({
          emailAddress: trimmedEmail,
          publicMetadata: {
            role: userData.role || 'team_member',
            plan: userData.plan || 'free',
          },
        });

        debugLog('[createUser] Invitation created successfully with metadata!', invitation.id);

        try {
          await prisma.social_sync_logs.create({
            data: {
              user_id: adminCheck.userId ? String(adminCheck.userId) : null,
              integration_name: 'admin_users',
              sync_type: 'admin_invite_user',
              status: 'success',
              items_synced: 1,
              started_at: new Date(),
              completed_at: new Date(),
              metadata: {
                action: 'invite_user',
                email: trimmedEmail,
                invitationId: invitation.id,
                withMetadata: true,
              } as any,
            },
          });
        } catch (logError) {
          safeErrorLog('Error logging invitation action', logError);
        }

        return createSuccessResponse({
          clerkUserId: invitation.id,
          supabaseUserId: '',
          email: trimmedEmail,
        });
      } catch (metadataError: any) {
        debugLog('[createUser] Creating invitation with metadata failed, trying without metadata...', metadataError.message);

        const invitation = await client.invitations.createInvitation({
          emailAddress: trimmedEmail,
        });

        debugLog('[createUser] Invitation created successfully without metadata!', invitation.id);

        try {
          await prisma.social_sync_logs.create({
            data: {
              user_id: adminCheck.userId ? String(adminCheck.userId) : null,
              integration_name: 'admin_users',
              sync_type: 'admin_invite_user',
              status: 'success',
              items_synced: 1,
              started_at: new Date(),
              completed_at: new Date(),
              metadata: {
                action: 'invite_user',
                email: trimmedEmail,
                invitationId: invitation.id,
              } as any,
            },
          });
        } catch (logError) {
          safeErrorLog('Error logging invitation action', logError);
        }
        
        return createSuccessResponse({
          clerkUserId: invitation.id,
          supabaseUserId: '',
          email: trimmedEmail,
        });
      }
    } catch (invitationError: any) {
      if (DEBUG_ADMIN_USERS) {
        console.error('[createUser] ❌ Invitation creation failed:', invitationError);
        console.error('[createUser] Invitation error type:', typeof invitationError);
        console.error('[createUser] Invitation error keys:', Object.keys(invitationError || {}));
        console.error('[createUser] Invitation error details:', JSON.stringify(invitationError, Object.getOwnPropertyNames(invitationError), 2));
      } else {
        console.error('[createUser] Invitation creation failed');
      }
      
      // Extract error message - prioritize detailed error messages
      let errorMessage = 'שגיאה ביצירת הזמנה';
      
      // Check for errors array first (Clerk's standard format)
      if (invitationError?.errors && Array.isArray(invitationError.errors) && invitationError.errors.length > 0) {
        const firstError = invitationError.errors[0];
        if (DEBUG_ADMIN_USERS) console.error('[createUser] First error from array:', JSON.stringify(firstError, null, 2));
        
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
      
      if (DEBUG_ADMIN_USERS) console.error('[createUser] Extracted error message:', errorMessage);
      
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
    safeErrorLog('Error in createUser', error);
    return createErrorResponse(error, 'שגיאה ביצירת משתמש');
  }
}

