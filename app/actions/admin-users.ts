'use server';



import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/server/logger';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { UserRole } from '@/types/social';
import { clerkClient, currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';
import { withPrismaTenantIsolationOverride, withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

import { asObject, getUnknownErrorMessageOrUnexpected as getUnknownErrorMessage } from '@/lib/shared/unknown';
const IS_PROD = process.env.NODE_ENV === 'production';
const DEBUG_ADMIN_USERS = process.env.DEBUG_ADMIN_USERS === 'true' && !IS_PROD;


function toJson(value: unknown): Prisma.InputJsonValue {
  if (value == null) return {};
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((v) => toJson(v));
  }

  const obj = asObject(value);
  if (!obj) return {};

  const out: Record<string, Prisma.InputJsonValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = toJson(v);
  }
  return out;
}

function debugLog(...args: unknown[]) {
  if (DEBUG_ADMIN_USERS) logger.debug('admin-users', args.map(String).join(' '));
}

function safeErrorLog(message: string, error?: unknown) {
  logger.error('admin-users', message, error);
}

async function requireSuperAdminOrFail(): Promise<{ success: true; userId: string } | { success: false; error: string }> {
  const authCheck = await requireAuth();
  if (!authCheck.success) return { success: false, error: authCheck.error || 'נדרשת התחברות' };
  const u = await currentUser();
  const publicMetadata = asObject((u as { publicMetadata?: unknown } | null)?.publicMetadata);
  const isSuperAdmin = Boolean(publicMetadata?.isSuperAdmin);
  if (!isSuperAdmin) {
    return { success: false, error: createErrorResponse('Forbidden', 'אין הרשאה').error || 'אין הרשאה' };
  }
  return { success: true, userId: String(authCheck.userId || '') };
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
}): Promise<{ success: boolean; data?: { items: Array<{ id: string; name: string; email: string; role: string; plan: 'free'; registeredAt: string | null; lastActivity: string | null; isBanned: false; avatar: string | null }>; total: number }; error?: string }> {
  return await withTenantIsolationContext(
    { suppressReporting: true, reason: 'admin_users_page_load', source: 'admin-users-page' },
    async () => {
      try {
        const adminCheck = await requireSuperAdminOrFail();
        if (!adminCheck.success) return adminCheck;

        const parsed = listUsersSchema.safeParse({
          limit: params?.limit,
          offset: params?.offset,
          search: params?.search,
        });
        const limitRaw = parsed.success ? parsed.data.limit : 25;
        const offsetRaw = parsed.success ? parsed.data.offset : 0;
        const limit = Math.max(1, Math.min(200, Math.floor(Number(limitRaw ?? 25))));
        const offset = Math.max(0, Math.floor(Number(offsetRaw ?? 0)));
        const search = parsed.success ? parsed.data.search : undefined;

        const s = search && search.trim() ? search.trim() : '';
        const where: Prisma.OrganizationUserWhereInput = s
          ? {
              OR: [
                { full_name: { contains: s, mode: 'insensitive' } },
                { email: { contains: s, mode: 'insensitive' } },
              ],
            }
          : {};

        const overrideOpts = { suppressReporting: true, reason: 'admin_users_page_list_all', source: 'admin-users-page', mode: 'global_admin' as const, isSuperAdmin: true };

        const total = await prisma.organizationUser.count(
          withPrismaTenantIsolationOverride({ where }, overrideOpts)
        );

        const rows = await prisma.organizationUser.findMany(
          withPrismaTenantIsolationOverride({
            where,
            orderBy: { created_at: 'desc' as const },
            skip: offset,
            take: limit,
            select: { id: true, full_name: true, email: true, role: true, created_at: true, updated_at: true, organization_id: true, clerk_user_id: true },
          }, overrideOpts)
        );

        const items = (rows || []).map((m) => {
          const last = m.updated_at ?? m.created_at;
          const isPending = String(m.clerk_user_id || '').startsWith('pending_');
          return {
            id: String(m.id),
            name: String(m.full_name || m.email || ''),
            email: m.email ? String(m.email) : 'אין דוא"ל',
            role: isPending ? `${String(m.role || 'user')} (ממתין)` : String(m.role || 'user'),
            plan: 'free' as const,
            registeredAt: m.created_at ? new Date(m.created_at).toISOString() : null,
            lastActivity: last ? new Date(last).toISOString() : null,
            isBanned: false as const,
            avatar: null,
          };
        });

        return createSuccessResponse({ items, total: total || 0 });
      } catch (error) {
        return createErrorResponse(error, 'שגיאה בטעינת משתמשים');
      }
    }
  );
}

export async function deleteAdminUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck;

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
      await prisma.socialMediaSyncLog.create({
        data: {
          user_id: adminCheck.userId ? String(adminCheck.userId) : null,
          integration_name: 'admin_users',
          sync_type: 'admin_delete_user',
          status: 'success',
          items_synced: 1,
          started_at: new Date(),
          completed_at: new Date(),
          metadata: toJson({ action: 'delete_user', targetUserId: resolvedUserId, organizationId }),
        },
      });
    } catch {
    }

    revalidatePath('/', 'layout');

    return createSuccessResponse(true);
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
    if (!adminCheck.success) return adminCheck;

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

    const updateData: Prisma.NexusUserUpdateManyMutationInput = { updatedAt: new Date() };
    if (updates.name) updateData.name = updates.name;
    if (updates.email) updateData.email = updates.email;
    if (updates.role) updateData.role = updates.role;
    if (updates.avatar) updateData.avatar = updates.avatar;

    await prisma.nexusUser.updateMany({
      where: { id: resolvedUserId, organizationId },
      data: updateData,
    });

    try {
      await prisma.socialMediaSyncLog.create({
        data: {
          user_id: adminCheck.userId ? String(adminCheck.userId) : null,
          integration_name: 'admin_users',
          sync_type: 'admin_update_user',
          status: 'success',
          items_synced: 1,
          started_at: new Date(),
          completed_at: new Date(),
          metadata: toJson({
            action: 'update_user',
            targetUserId: resolvedUserId,
            organizationId,
            updates: {
              name: updates.name ?? null,
              email: updates.email ?? null,
              role: updates.role ?? null,
              avatar: updates.avatar ?? null,
            },
          }),
        },
      });
    } catch {
    }

    revalidatePath('/', 'layout');

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
    if (!adminCheck.success) return adminCheck;

    const member = await prisma.nexusUser.findUnique({
      where: { id: String(userId) },
    });

    if (!member?.id) {
      return createErrorResponse(new Error('User not found'), 'משתמש לא נמצא');
    }

    let lastActivityIso: string | null = null;
    try {
      const last = await prisma.socialMediaSyncLog.findFirst({
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
    if (!adminCheck.success) return adminCheck;

    // ✅ SECURITY FIX: Store admin context explicitly to prevent session confusion
    const adminUserId = adminCheck.userId;
    const adminUser = await currentUser();
    const adminEmail = adminUser?.emailAddresses?.[0]?.emailAddress;

    const trimmedEmail = userData.email?.trim();
    const trimmedFirstName = userData.firstName?.trim();
    const trimmedLastName = userData.lastName?.trim();

    // ✅ SECURITY CHECK: Prevent creating user with admin's own email
    if (trimmedEmail && adminEmail && trimmedEmail.toLowerCase() === adminEmail.toLowerCase()) {
      debugLog('[createUser] Validation failed - cannot create user with admin email');
      return createErrorResponse(null, 'לא ניתן ליצור משתמש עם כתובת האימייל של האדמין');
    }

    // ✅ AUDIT LOG: Track admin user creation
    debugLog('[createUser] Admin context:', {
      adminUserId,
      adminEmail,
      targetEmail: trimmedEmail,
      targetName: trimmedFirstName,
      timestamp: new Date().toISOString(),
    });

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
    } catch (checkError: unknown) {
      debugLog('[createUser] Could not check for existing user, continuing anyway:', getUnknownErrorMessage(checkError));
    }

    try {
      const invitationData = {
        emailAddress: trimmedEmail,
      };
      void invitationData;

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
          await prisma.socialMediaSyncLog.create({
            data: {
              user_id: adminCheck.userId ? String(adminCheck.userId) : null,
              integration_name: 'admin_users',
              sync_type: 'admin_invite_user',
              status: 'success',
              items_synced: 1,
              started_at: new Date(),
              completed_at: new Date(),
              metadata: toJson({ action: 'invite_user', email: trimmedEmail, invitationId: invitation.id, withMetadata: true }),
            },
          });
        } catch (logError) {
          safeErrorLog('Error logging invitation action', logError);
        }

        revalidatePath('/', 'layout');

        return createSuccessResponse({
          clerkUserId: invitation.id,
          supabaseUserId: '',
          email: trimmedEmail,
        });
      } catch (metadataError: unknown) {
        debugLog('[createUser] Creating invitation with metadata failed, trying without metadata...', getUnknownErrorMessage(metadataError));

        const invitation = await client.invitations.createInvitation({
          emailAddress: trimmedEmail,
        });

        debugLog('[createUser] Invitation created successfully without metadata!', invitation.id);

        try {
          await prisma.socialMediaSyncLog.create({
            data: {
              user_id: adminCheck.userId ? String(adminCheck.userId) : null,
              integration_name: 'admin_users',
              sync_type: 'admin_invite_user',
              status: 'success',
              items_synced: 1,
              started_at: new Date(),
              completed_at: new Date(),
              metadata: toJson({ action: 'invite_user', email: trimmedEmail, invitationId: invitation.id }),
            },
          });
        } catch (logError) {
          safeErrorLog('Error logging invitation action', logError);
        }
        
        revalidatePath('/', 'layout');
        
        return createSuccessResponse({
          clerkUserId: invitation.id,
          supabaseUserId: '',
          email: trimmedEmail,
        });
      }
    } catch (invitationError: unknown) {
      if (DEBUG_ADMIN_USERS) {
        logger.error('createUser', '❌ Invitation creation failed:', invitationError);
        logger.error('createUser', 'Invitation error type:', typeof invitationError);
        const obj = asObject(invitationError) ?? {};
        logger.error('createUser', 'Invitation error keys:', Object.keys(obj));
        logger.error('createUser', 'Invitation error details:', JSON.stringify(obj, Object.getOwnPropertyNames(obj), 2));
      } else {
        logger.error('createUser', 'Invitation creation failed');
      }
      
      // Extract error message - prioritize detailed error messages
      let errorMessage = 'שגיאה ביצירת הזמנה';

      const invitationErrObj = asObject(invitationError) ?? {};
      
      // Check for errors array first (Clerk's standard format)
      const errorsVal = invitationErrObj.errors;
      if (Array.isArray(errorsVal) && errorsVal.length > 0) {
        const firstErrorObj = asObject(errorsVal[0]) ?? {};
        if (DEBUG_ADMIN_USERS) logger.error('createUser', 'First error from array:', JSON.stringify(firstErrorObj, null, 2));

        const longMessage = firstErrorObj.longMessage;
        const message = firstErrorObj.message;
        const metaObj = asObject(firstErrorObj.meta);
        const param = metaObj?.param;
        const reason = metaObj?.reason;
        const code = firstErrorObj.code;

        if (typeof longMessage === 'string' && longMessage) {
          errorMessage = longMessage;
        } else if (typeof message === 'string' && message) {
          errorMessage = message;
        } else if (typeof param === 'string' && typeof reason === 'string' && (param || reason)) {
          errorMessage = `${param}: ${reason}`;
        } else if (typeof reason === 'string' && reason) {
          errorMessage = reason;
        } else if (typeof code === 'string' && code) {
          errorMessage = code;
        }
      } else if (typeof invitationErrObj.message === 'string') {
        errorMessage = invitationErrObj.message;
      } else if (typeof invitationErrObj.statusText === 'string') {
        errorMessage = invitationErrObj.statusText;
      } else if (invitationErrObj.status != null) {
        errorMessage = `HTTP ${String(invitationErrObj.status)}: ${errorMessage}`;
      }
      
      if (DEBUG_ADMIN_USERS) logger.error('createUser', 'Extracted error message:', errorMessage);
      
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
  } catch (error: unknown) {
    safeErrorLog('Error in createUser', error);
    return createErrorResponse(error, 'שגיאה ביצירת משתמש');
  }
}

