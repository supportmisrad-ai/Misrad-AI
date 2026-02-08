import { redirect } from 'next/navigation';

import { auth, currentUser } from '@clerk/nextjs/server';

import prisma from '@/lib/prisma';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';
import { countOrganizationActiveUsers } from '@/lib/server/seats';
import { getOrCreateSupabaseUserAction } from '@/app/actions/users';
import type { Prisma } from '@prisma/client';
import { asObject } from '@/lib/shared/unknown';

export const dynamic = 'force-dynamic';

const ALLOW_SCHEMA_FALLBACKS = String(process.env.MISRAD_ALLOW_SCHEMA_FALLBACKS || '').toLowerCase() === 'true';

function getString(value: unknown): string | null {
  if (value == null) return null;
  return String(value);
}

function getBoolean(value: unknown): boolean {
  return Boolean(value);
}

function getNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export default async function EmployeeInviteFinalizePage({
  params,
}: {
  params: Promise<{ token: string }> | { token: string };
}) {
  const { token } = await params;

  if (!token) {
    return <div>Token is required</div>;
  }

  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    return <div>Token is required</div>;
  }
  if (normalizedToken.length < 16 || normalizedToken.length > 256) {
    return <div>Token is required</div>;
  }
  if (!/^[A-Za-z0-9_-]+$/.test(normalizedToken)) {
    return <div>Token is required</div>;
  }

  const { userId } = await auth();
  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(`/employee-invite/${encodeURIComponent(token)}/finalize`)}`);
  }

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ? String(user.emailAddresses[0].emailAddress) : null;
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || null;
  const imageUrl = user?.imageUrl ? String(user.imageUrl) : null;

  if (!email) {
    return <div>User email not found</div>;
  }

  const inviteRow = await prisma.nexus_employee_invitation_links.findUnique({
    where: { token: normalizedToken },
  });

  if (!inviteRow) {
    return <div>קישור הזמנה לא נמצא</div>;
  }

  const inviteObj = asObject(inviteRow) ?? {};

  if (!getBoolean(inviteObj.is_active)) {
    return <div>קישור זה לא פעיל</div>;
  }

  if (getBoolean(inviteObj.is_used)) {
    return <div>קישור זה כבר נוצל</div>;
  }

  if (inviteObj.expires_at) {
    const expiresAt = new Date(String(inviteObj.expires_at));
    if (expiresAt < new Date()) {
      return <div>קישור זה פג תוקף</div>;
    }
  }

  const inviteEmailRaw = getString(inviteObj.employee_email);
  const inviteEmail = inviteEmailRaw ? inviteEmailRaw.trim().toLowerCase() : '';
  const userEmailLower = String(email).trim().toLowerCase();
  if (inviteEmail && inviteEmail !== userEmailLower) {
    return <div>האימייל לא תואם להזמנה</div>;
  }

  const organizationId = getString(inviteRow.organizationId ?? inviteObj.organization_id);
  if (!organizationId) {
    return <div>הזמנה לא משויכת לארגון</div>;
  }

  // Load org module flags (with backwards compatibility for missing columns)
  let org: Record<string, unknown> | null = null;
  try {
    const orgRow = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        slug: true,
        has_nexus: true,
        has_system: true,
        has_social: true,
        has_finance: true,
        has_client: true,
        has_operations: true,
        seats_allowed: true,
      },
    });
    org = asObject(orgRow);
  } catch (e: unknown) {
    const errObj = asObject(e) ?? {};
    const code = typeof errObj.code === 'string' ? String(errObj.code) : '';
    const msg = typeof errObj.message === 'string' ? String(errObj.message) : '';
    if (!ALLOW_SCHEMA_FALLBACKS && (code === 'P2021' || code === 'P2022' || msg.toLowerCase().includes('does not exist'))) {
      throw new Error(`[SchemaMismatch] organization flags query failed (${msg || code || 'missing relation'})`);
    }
    org = null;
  }

  if (!org) {
    return <div>ארגון לא נמצא</div>;
  }

  const flags = await getSystemFeatureFlags();
  const caps = computeWorkspaceCapabilities({
    entitlements: {
      nexus: getBoolean(org?.has_nexus),
      system: getBoolean(org?.has_system),
      social: getBoolean(org?.has_social),
      finance: getBoolean(org?.has_finance),
      client: getBoolean(org?.has_client),
      operations: getBoolean(org?.has_operations),
    },
    fullOfficeRequiresFinance: Boolean(flags.fullOfficeRequiresFinance),
    seatsAllowedOverride: getNumber(org?.seats_allowed),
  });

  if (!caps.isTeamManagementEnabled) {
    return <div>ניהול צוות זמין רק עם מודול Nexus</div>;
  }

  const activeUsers = await countOrganizationActiveUsers(String(organizationId));
  if (activeUsers >= caps.seatsAllowed) {
    return <div>{`הגעתם למכסת המשתמשים (${activeUsers} מתוך ${caps.seatsAllowed}). לא ניתן להשלים הרשמה`}</div>;
  }

  // Ensure user exists in social_users and is attached to the invited org.
  const syncRes = await getOrCreateSupabaseUserAction(
    userId,
    email,
    fullName || undefined,
    imageUrl || undefined,
    `employee-invite:${normalizedToken}`
  );

  if (!syncRes.success) {
    return <div>{syncRes.error || 'Failed to sync user'}</div>;
  }

  {
    const socialUserRow = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: userId },
      select: { id: true, organization_id: true },
    });

    const socialUserId = socialUserRow?.id ? String(socialUserRow.id) : null;
    const currentOrgId = socialUserRow?.organization_id ? String(socialUserRow.organization_id) : null;
    if (currentOrgId && currentOrgId !== organizationId) {
      return <div>המשתמש כבר משויך לארגון אחר</div>;
    }

    if (socialUserId && !currentOrgId) {
      await prisma.organizationUser.update({
        where: { clerk_user_id: userId },
        data: { organization_id: organizationId },
      });
    }
  }

  // Upsert into nexus_users (employee directory). Some schemas might have tenant scoping columns.
  const invitedEmail = inviteEmail ? inviteEmail : email.trim().toLowerCase();

  const baseNexusUserPayload: Record<string, unknown> = {
    name: getString(inviteObj.employee_name) || fullName || invitedEmail,
    email: invitedEmail,
    phone: getString(inviteObj.employee_phone),
    department: getString(inviteObj.department),
    role: getString(inviteObj.role) || 'עובד',
    payment_type: getString(inviteObj.payment_type),
    hourly_rate: getNumber(inviteObj.hourly_rate),
    monthly_salary: getNumber(inviteObj.monthly_salary),
    commission_pct: getNumber(inviteObj.commission_pct),
    manager_id: getString(inviteObj.created_by),
    is_super_admin: false,
  };

  const existing = await prisma.nexusUser.findFirst({
    where: { organizationId, email: invitedEmail },
    select: { id: true },
  });

  const nexusPayload: Prisma.NexusUserUncheckedCreateInput & Prisma.NexusUserUncheckedUpdateInput = {
    organizationId,
    name: getString(inviteObj.employee_name) || fullName || invitedEmail,
    email: invitedEmail,
    phone: getString(inviteObj.employee_phone),
    department: getString(inviteObj.department),
    role: getString(inviteObj.role) || 'עובד',
    paymentType: getString(inviteObj.payment_type),
    hourlyRate: getNumber(inviteObj.hourly_rate),
    monthlySalary: getNumber(inviteObj.monthly_salary),
    commissionPct: getNumber(inviteObj.commission_pct),
    managerId: getString(inviteObj.created_by),
    isSuperAdmin: false,
    updatedAt: new Date(),
  };

  if (existing?.id) {
    await prisma.nexusUser.update({
      where: { id: String(existing.id) },
      data: nexusPayload,
    });
  } else {
    await prisma.nexusUser.create({
      data: {
        ...nexusPayload,
        createdAt: new Date(),
      },
    });
  }

  // Mark invite as used (idempotent)
  if (!getBoolean(inviteObj.is_used)) {
    await prisma.nexus_employee_invitation_links.update({
      where: { id: String(inviteRow.id) },
      data: {
        is_used: true,
        used_at: new Date(),
        employee_name: getString(inviteObj.employee_name) || fullName || getString(inviteObj.employee_email),
        employee_phone: getString(inviteObj.employee_phone),
        updated_at: new Date(),
      },
    });
  }

  const orgKey = String((org?.slug as unknown) || organizationId);
  redirect(`/w/${encodeURIComponent(orgKey)}/lobby`);
}
