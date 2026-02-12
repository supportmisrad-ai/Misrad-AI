'use server';

import prisma from '@/lib/prisma';
import { generateOrgSlug, generateUniqueOrgSlug } from '@/lib/server/orgSlug';
import { DEFAULT_TRIAL_DAYS } from '@/lib/trial';
import { requireAuth } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';

type CreateClientParams = {
  fullName: string;
  email: string;
  sendInviteEmail?: boolean;
};

type CreateClientResult = 
  | { ok: true; clientId: string }
  | { ok: false; error: string };

/**
 * Creates a new client (owner) WITHOUT an organization
 * Organizations are created separately and linked to the client
 * This is the correct flow: Client → Organization(s)
 */
export async function createClient(
  params: CreateClientParams
): Promise<CreateClientResult> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { ok: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    try {
      await requireSuperAdmin();
    } catch {
      return { ok: false, error: 'אין הרשאה (נדרש Super Admin)' };
    }

    const { fullName, email, sendInviteEmail = true } = params;

    // Validate required fields
    if (!fullName?.trim()) {
      return { ok: false, error: 'שם מלא הוא שדה חובה' };
    }

    if (!email?.trim()) {
      return { ok: false, error: 'מייל הוא שדה חובה' };
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes('@')) {
      return { ok: false, error: 'כתובת מייל לא תקינה' };
    }

    // Check if email already exists
    const existingUser = await prisma.organizationUser.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        role: 'owner',
      },
      select: { id: true },
    });

    if (existingUser?.id) {
      return { ok: false, error: `לקוח עם מייל ${normalizedEmail} כבר קיים במערכת` };
    }

    const now = new Date();

    // Create client (owner) WITHOUT organization
    const clerkId = `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const created = await prisma.organizationUser.create({
      data: {
        clerk_user_id: clerkId,
        email: normalizedEmail,
        full_name: fullName.trim(),
        role: 'owner',
        allowed_modules: ['nexus', 'system', 'finance', 'client', 'operations'],
        created_at: now,
        updated_at: now,
      },
      select: { id: true },
    });

    const clientId = String(created.id);

    // TODO: Send invite email if requested
    // For now, admin will need to manually invite the client via Clerk
    
    return {
      ok: true,
      clientId,
    };
  } catch (error) {
    console.error('[createClient] Error:', error);
    
    if (error instanceof Error) {
      return { ok: false, error: `שגיאה: ${error.message}` };
    }
    
    return { ok: false, error: 'שגיאה לא צפויה ביצירת לקוח' };
  }
}

/**
 * Get all clients (owners) with their organizations
 * Using existing admin-organizations action for now
 */
export async function getClients() {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { ok: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    try {
      await requireSuperAdmin();
    } catch {
      return { ok: false, error: 'אין הרשאה (נדרש Super Admin)' };
    }

    // Use existing getOrganizations action which already has the data we need
    const { getOrganizations } = await import('./admin-organizations');
    const result = await getOrganizations({});
    
    if (!result.success) {
      return { ok: false, error: result.error || 'שגיאה בטעינת נתונים' };
    }
    
    return { ok: true, data: result };
  } catch (error) {
    console.error('[getClients] Error:', error);
    return { ok: false, error: 'שגיאה בטעינת לקוחות' };
  }
}
