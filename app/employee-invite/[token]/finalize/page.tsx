import { redirect } from 'next/navigation';

import { auth, currentUser } from '@clerk/nextjs/server';

import { createServiceRoleClient, createServiceRoleClientScoped } from '@/lib/supabase';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';
import { countOrganizationActiveUsers } from '@/lib/server/seats';
import { getOrCreateSupabaseUserAction } from '@/app/actions/users';

export const dynamic = 'force-dynamic';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

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
  params: Promise<{ token: string }>;
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

  const supabase = createServiceRoleClient({ allowUnscoped: true, reason: 'employee_invite_finalize' });

  const { data: inviteRow, error: inviteError } = await supabase
    .from('nexus_employee_invitation_links')
    .select('*')
    .eq('token', normalizedToken)
    .limit(1)
    .maybeSingle();

  if (inviteError || !inviteRow) {
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

  const organizationId = getString(inviteObj.organization_id);
  if (!organizationId) {
    return <div>הזמנה לא משויכת לארגון</div>;
  }

  const orgScoped = createServiceRoleClientScoped({
    reason: 'employee_invite_finalize_org',
    scopeColumn: 'organization_id',
    scopeId: String(organizationId),
  });

  // Load org module flags (with backwards compatibility for missing columns)
  let org: Record<string, unknown> | null = null;
  try {
    const orgRes = await orgScoped
      .from('organizations')
      .select('id, slug, has_nexus, has_system, has_social, has_finance, has_client, has_operations, seats_allowed')
      .eq('id', organizationId)
      .maybeSingle();

    if (orgRes.error?.code === '42703') {
      throw new Error('[SchemaMismatch] organizations is missing expected columns');
    }
    if (orgRes.error) {
      throw new Error(orgRes.error.message || 'Failed to load organization');
    }
    org = asObject(orgRes.data);
  } catch (e: unknown) {
    if (String((e instanceof Error ? e.message : '') || '').includes('[SchemaMismatch]')) {
      throw e;
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

  if (syncRes.userId) {
    const { data: socialUserRow } = await orgScoped
      .from('social_users')
      .select('id, organization_id')
      .eq('id', syncRes.userId)
      .maybeSingle();

    const socialUserObj = asObject(socialUserRow);
    const currentOrgId = socialUserObj?.organization_id ? String(socialUserObj.organization_id) : null;
    if (currentOrgId && currentOrgId !== organizationId) {
      return <div>המשתמש כבר משויך לארגון אחר</div>;
    }

    if (!currentOrgId) {
      await orgScoped
        .from('social_users')
        .update({ organization_id: organizationId } as unknown as Record<string, unknown>)
        .eq('id', syncRes.userId);
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

  const { data: existingUserRow, error: existingUserError } = await orgScoped
    .from('nexus_users')
    .select('id')
    .eq('email', invitedEmail)
    .limit(1)
    .maybeSingle();

  if (existingUserError?.code === '42703') {
    throw new Error('[SchemaMismatch] nexus_users is missing organization_id');
  }
  if (existingUserError) {
    return <div>{existingUserError.message || 'Failed to load nexus user'}</div>;
  }

  const payload = { ...baseNexusUserPayload, organization_id: organizationId };
  const existingObj = asObject(existingUserRow);
  const existingId = existingObj?.id ? String(existingObj.id) : null;

  const upsertResult = existingId
    ? await orgScoped.from('nexus_users').update(payload).eq('id', existingId)
    : await orgScoped.from('nexus_users').insert(payload).select('id').single();

  const upsertErrorObj = asObject((upsertResult as { error?: unknown }).error);
  if (upsertErrorObj?.code === '42703') {
    throw new Error(`[SchemaMismatch] nexus_users upsert failed: ${String(upsertErrorObj?.message || 'missing column')}`);
  }
  if ((upsertResult as { error?: unknown }).error) {
    return <div>{String(upsertErrorObj?.message || 'Failed to upsert nexus user')}</div>;
  }

  // Mark invite as used (idempotent)
  if (!getBoolean(inviteObj.is_used)) {
    await orgScoped
      .from('nexus_employee_invitation_links')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
        employee_name: getString(inviteObj.employee_name) || fullName || getString(inviteObj.employee_email),
        employee_phone: getString(inviteObj.employee_phone),
      })
      .eq('id', String(inviteObj.id || ''));
  }

  const orgKey = String((org?.slug as unknown) || organizationId);
  redirect(`/w/${encodeURIComponent(orgKey)}/lobby`);
}
