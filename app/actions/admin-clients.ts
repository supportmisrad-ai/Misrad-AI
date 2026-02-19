'use server';


import { logger } from '@/lib/server/logger';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import { generateOrgSlug, generateUniqueOrgSlug } from '@/lib/server/orgSlug';
import { requireAuth } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';
import { getBaseUrl } from '@/lib/utils';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

type CreateClientParams = {
  fullName: string;
  email: string;
  sendInviteEmail?: boolean;
};

type CreateClientResult =
  | { ok: true; invitationToken: string; signupUrl: string }
  | { ok: false; error: string };

async function generateUniqueInviteToken(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const token = randomBytes(16).toString('hex').toUpperCase().slice(0, 32);
    const existing = await prisma.organization_signup_invitations.findFirst({
      where: { token },
      select: { id: true },
    });
    if (!existing) return token;
  }
  throw new Error('Failed to generate unique invite token');
}

/**
 * Creates a pending invitation for a new client (owner).
 * When the client signs up via Google or email/password using the invite link,
 * the Clerk webhook automatically picks up the invitation by email and provisions
 * their organization correctly — no orphaned "pending_xxx" records.
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

    // Check if a real (non-pending) user already exists with this email
    const existingUser = await prisma.organizationUser.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      select: { id: true, clerk_user_id: true },
    });

    if (existingUser?.id && !String(existingUser.clerk_user_id || '').startsWith('pending_')) {
      return { ok: false, error: `משתמש עם מייל ${normalizedEmail} כבר קיים במערכת` };
    }

    // Check if there's already an active unused invitation for this email
    const existingInvite = await prisma.organization_signup_invitations.findFirst({
      where: {
        owner_email: normalizedEmail,
        is_active: true,
        is_used: false,
      },
      select: { id: true, token: true, desired_slug: true },
    });

    if (existingInvite?.id) {
      const baseUrl = getBaseUrl();
      const token = String(existingInvite.token);
      const signupUrl = `${baseUrl}/login?mode=sign-up&invite=${encodeURIComponent(token)}&redirect=${encodeURIComponent('/workspaces/onboarding')}`;
      return { ok: true, invitationToken: token, signupUrl };
    }

    // Generate a unique slug from the owner's name
    const slugBase = generateOrgSlug(fullName.trim());
    const desiredSlug = slugBase ? await generateUniqueOrgSlug(slugBase) : await generateUniqueOrgSlug('org');

    // Derive organization name from owner's full name
    const orgName = fullName.trim();

    const token = await generateUniqueInviteToken();
    const now = new Date();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

    await withTenantIsolationContext(
      {
        suppressReporting: true,
        reason: 'admin_create_client_invitation',
        source: 'admin-clients',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () =>
        await prisma.organization_signup_invitations.create({
          data: {
            token,
            owner_email: normalizedEmail,
            organization_name: orgName,
            desired_slug: desiredSlug,
            is_used: false,
            is_active: true,
            created_at: now,
            updated_at: now,
            expires_at: expiresAt,
            metadata: { owner_full_name: fullName.trim() },
          },
        })
    );

    const baseUrl = getBaseUrl();
    const signupUrl = `${baseUrl}/login?mode=sign-up&invite=${encodeURIComponent(token)}&redirect=${encodeURIComponent('/workspaces/onboarding')}`;

    if (sendInviteEmail) {
      try {
        const { sendTenantInvitationEmail } = await import('@/lib/email');
        await sendTenantInvitationEmail(normalizedEmail, orgName, signupUrl, { ownerName: fullName.trim() });
      } catch (emailErr) {
        logger.error('createClient', 'Failed to send invite email (ignored):', emailErr);
      }
    }

    return { ok: true, invitationToken: token, signupUrl };
  } catch (error) {
    logger.error('createClient', 'Error:', error);

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
    logger.error('getClients', 'Error:', error);
    return { ok: false, error: 'שגיאה בטעינת לקוחות' };
  }
}
