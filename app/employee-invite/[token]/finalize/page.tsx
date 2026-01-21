import { redirect } from 'next/navigation';

import { auth, currentUser } from '@clerk/nextjs/server';

import { createServiceRoleClient } from '@/lib/supabase';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';
import { getOrCreateSupabaseUserAction } from '@/app/actions/users';

export const dynamic = 'force-dynamic';

export default async function EmployeeInviteFinalizePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!token) {
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

  const supabase = createServiceRoleClient();

  const { data: inviteRow, error: inviteError } = await supabase
    .from('nexus_employee_invitation_links')
    .select('*')
    .eq('token', token)
    .limit(1)
    .maybeSingle();

  if (inviteError || !inviteRow) {
    return <div>קישור הזמנה לא נמצא</div>;
  }

  if (!(inviteRow as any).is_active) {
    return <div>קישור זה לא פעיל</div>;
  }

  if ((inviteRow as any).expires_at) {
    const expiresAt = new Date(String((inviteRow as any).expires_at));
    if (expiresAt < new Date()) {
      return <div>קישור זה פג תוקף</div>;
    }
  }

  const organizationId = (inviteRow as any).organization_id as string | null;
  if (!organizationId) {
    return <div>הזמנה לא משויכת לארגון</div>;
  }

  // Load org module flags (with backwards compatibility for missing columns)
  let org: any = null;
  try {
    const orgWithSeats = await supabase
      .from('organizations')
      .select('id, slug, has_nexus, has_system, has_social, has_finance, has_client, has_operations, seats_allowed')
      .eq('id', organizationId)
      .maybeSingle();

    if (orgWithSeats.error?.code === '42703') {
      const orgWithoutSeats = await supabase
        .from('organizations')
        .select('id, slug, has_nexus, has_system, has_social, has_finance, has_client')
        .eq('id', organizationId)
        .maybeSingle();
      org = orgWithoutSeats.data as any;
    } else {
      org = orgWithSeats.data as any;
    }
  } catch {
    org = null;
  }

  const flags = await getSystemFeatureFlags();
  const caps = computeWorkspaceCapabilities({
    entitlements: {
      nexus: (org as any)?.has_nexus ?? true,
      system: (org as any)?.has_system ?? false,
      social: (org as any)?.has_social ?? false,
      finance: (org as any)?.has_finance ?? false,
      client: (org as any)?.has_client ?? false,
      operations: (org as any)?.has_operations ?? false,
    },
    fullOfficeRequiresFinance: Boolean(flags.fullOfficeRequiresFinance),
    seatsAllowedOverride: (org as any)?.seats_allowed ?? null,
  });

  if (!caps.isTeamManagementEnabled) {
    return <div>ניהול צוות זמין רק עם מודול Nexus</div>;
  }

  // Ensure user exists in social_users and is attached to the invited org.
  const syncRes = await getOrCreateSupabaseUserAction(
    userId,
    email,
    fullName || undefined,
    imageUrl || undefined,
    String((org as any)?.slug || organizationId)
  );

  if (!syncRes.success) {
    return <div>{syncRes.error || 'Failed to sync user'}</div>;
  }

  // Upsert into nexus_users (employee directory). Some schemas might have tenant scoping columns.
  const invitedEmail = (inviteRow as any).employee_email ? String((inviteRow as any).employee_email).trim().toLowerCase() : email.trim().toLowerCase();

  const baseNexusUserPayload: any = {
    name: (inviteRow as any).employee_name || fullName || invitedEmail,
    email: invitedEmail,
    phone: (inviteRow as any).employee_phone || null,
    department: (inviteRow as any).department || null,
    role: (inviteRow as any).role || 'עובד',
    payment_type: (inviteRow as any).payment_type || null,
    hourly_rate: (inviteRow as any).hourly_rate || null,
    monthly_salary: (inviteRow as any).monthly_salary || null,
    commission_pct: (inviteRow as any).commission_pct || null,
    manager_id: (inviteRow as any).created_by || null,
    is_super_admin: false,
  };

  const tryUpsertWithScope = async (scope: Record<string, any>) => {
    const { data: existing } = await supabase
      .from('nexus_users')
      .select('id')
      .eq('email', invitedEmail)
      .limit(1)
      .maybeSingle();

    if ((existing as any)?.id) {
      return await supabase
        .from('nexus_users')
        .update({ ...baseNexusUserPayload, ...scope })
        .eq('id', (existing as any).id);
    }

    return await supabase
      .from('nexus_users')
      .insert({ ...baseNexusUserPayload, ...scope })
      .select('id')
      .single();
  };

  let upsertResult = await tryUpsertWithScope({ tenant_id: organizationId });
  if (upsertResult.error?.code === '42703') {
    upsertResult = await tryUpsertWithScope({ organization_id: organizationId });
  }
  if (upsertResult.error?.code === '42703') {
    upsertResult = await tryUpsertWithScope({});
  }

  if (upsertResult.error) {
    return <div>{upsertResult.error.message || 'Failed to upsert nexus user'}</div>;
  }

  // Mark invite as used (idempotent)
  if (!(inviteRow as any).is_used) {
    await supabase
      .from('nexus_employee_invitation_links')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
        employee_name: (inviteRow as any).employee_name || fullName || (inviteRow as any).employee_email || null,
        employee_phone: (inviteRow as any).employee_phone || null,
      })
      .eq('id', (inviteRow as any).id);
  }

  const orgKey = String((org as any)?.slug || organizationId);
  redirect(`/w/${encodeURIComponent(orgKey)}/lobby`);
}
