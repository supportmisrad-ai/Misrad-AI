import 'server-only';

import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase';
import { requireWorkspaceAccessByOrgSlug, requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

function normalizeRoleFromClerk(clerk: any): string {
  const roleFromClerk =
    clerk?.publicMetadata?.role ?? clerk?.privateMetadata?.role ?? clerk?.unsafeMetadata?.role ?? null;
  return typeof roleFromClerk === 'string' ? roleFromClerk : (roleFromClerk as any)?.role ?? 'עובד';
}

async function ensureProfileRow(params: {
  organizationId: string;
  clerkUserId: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: string | null;
}) {
  const supabase = createClient();

  const { data: existing, error: existingError } = await supabase
    .from('profiles')
    .select('*')
    .eq('organization_id', params.organizationId)
    .eq('clerk_user_id', params.clerkUserId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.id) {
    // Best-effort: backfill role if missing.
    if (params.role && !(existing as any)?.role) {
      try {
        const updateRow: any = {
          updated_at: new Date().toISOString(),
          role: params.role,
        };

        let updateError: any = null;
        const res = await supabase
          .from('profiles')
          .update(updateRow)
          .eq('id', (existing as any).id)
          .eq('organization_id', params.organizationId)
          .eq('clerk_user_id', params.clerkUserId);
        updateError = (res as any).error;

        // Backwards compatible: if role column doesn't exist yet, ignore.
        if (updateError?.message) {
          const msg = String(updateError.message).toLowerCase();
          if (msg.includes('column') && msg.includes('role')) {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }
    return existing;
  }

  const insertRow: any = {
    organization_id: params.organizationId,
    clerk_user_id: params.clerkUserId,
    email: params.email,
    full_name: params.fullName,
    role: params.role,
    avatar_url: params.avatarUrl,
    notification_preferences: {},
    two_factor_enabled: false,
    ui_preferences: { profileCompleted: false },
    social_profile: {},
    billing_info: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let created: any = null;
  let createError: any = null;

  const attemptInsert = async (row: any) => {
    const res = await supabase.from('profiles').insert(row).select('*').single();
    created = res.data as any;
    createError = res.error as any;
  };

  await attemptInsert(insertRow);

  // Backwards compatible: if role column doesn't exist yet, retry without it.
  if (createError?.message) {
    const msg = String(createError.message).toLowerCase();
    if (msg.includes('column') && msg.includes('role')) {
      const { role: _ignored, ...withoutRole } = insertRow;
      await attemptInsert(withoutRole);
    }
  }

  // Concurrency-safe: if another request created the profile row first, re-fetch and return it.
  if (createError) {
    const msg = String((createError as any)?.message || '').toLowerCase();
    const code = String((createError as any)?.code || '');
    if (code === '23505' || msg.includes('duplicate key')) {
      const { data: existingAfter, error: existingAfterError } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', params.organizationId)
        .eq('clerk_user_id', params.clerkUserId)
        .maybeSingle();

      if (existingAfterError) {
        throw new Error(existingAfterError.message);
      }
      if (existingAfter?.id) {
        return existingAfter;
      }
    }
  }

  if (createError) {
    throw new Error(createError.message);
  }

  return created;
}

async function findNexusUserByEmail(params: { email: string; organizationId?: string | null }) {
  const supabase = createClient();

  const queryFirst = async (queryFactory: (opts: { withOrder: boolean }) => any) => {
    const attempt = async (withOrder: boolean) => {
      const res = await queryFactory({ withOrder });
      const error = (res as any)?.error;
      const data = (res as any)?.data as any[] | null;

      if ((error as any)?.code === '42703') {
        return { data: null as any, error: null as any, missingColumn: true };
      }

      if (error) {
        return { data: null as any, error, missingColumn: false };
      }

      const rows = Array.isArray(data) ? data : [];
      if (rows.length > 1) {
        console.warn('[nexus_users] duplicate rows for email', {
          organizationId: params.organizationId ?? null,
          ids: rows.map((r) => r?.id).filter(Boolean),
        });
      }

      return { data: rows[0] ?? null, error: null as any, missingColumn: false };
    };

    const withOrder = await attempt(true);
    if (withOrder.missingColumn) {
      return attempt(false);
    }
    return withOrder;
  };

  const tryScoped = async (columnName: 'tenant_id' | 'organization_id') => {
    const { data, error, missingColumn } = await queryFirst(({ withOrder }) => {
      let q = supabase
        .from('nexus_users')
        .select('*')
        .eq('email', params.email)
        .eq(columnName, params.organizationId)
        .limit(2);

      if (withOrder) {
        q = q.order('updated_at', { ascending: false }).order('created_at', { ascending: false });
      }

      return q;
    });

    if (missingColumn) {
      return null;
    }
    if (error) {
      throw new Error(error.message);
    }
    return data;
  };

  if (params.organizationId) {
    const byTenant = await tryScoped('tenant_id');
    if (byTenant?.id) return byTenant;

    const byOrg = await tryScoped('organization_id');
    if (byOrg?.id) return byOrg;
  }

  const { data, error } = await queryFirst(({ withOrder }) => {
    let q = supabase.from('nexus_users').select('*').eq('email', params.email).limit(2);
    if (withOrder) {
      q = q.order('updated_at', { ascending: false }).order('created_at', { ascending: false });
    }
    return q;
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function ensureNexusUserRow(params: {
  organizationId?: string | null;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
}) {
  const supabase = createClient();

  const existing = await findNexusUserByEmail({ email: params.email, organizationId: params.organizationId });
  if (existing?.id) {
    return existing;
  }

  const insertRow: any = {
    name: params.name,
    role: params.role || 'עובד',
    avatar: params.avatarUrl || null,
    online: true,
    capacity: 0,
    email: params.email,
    is_super_admin: params.isSuperAdmin,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: created, error: createError } = await supabase
    .from('nexus_users')
    .insert(insertRow)
    .select('*')
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return created;
}

export async function resolveWorkspaceCurrentUserForUi(orgSlug: string) {
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
  return resolveWorkspaceCurrentUserForUiWithWorkspaceId(workspace.id);
}

export async function resolveWorkspaceCurrentUserForUiWithWorkspaceId(workspaceId: string) {
  const clerk = await currentUser();
  const clerkUserId = clerk?.id || null;
  if (!clerkUserId) {
    throw new Error('Unauthorized');
  }

  const email = clerk?.primaryEmailAddress?.emailAddress ?? null;
  if (!email) {
    throw new Error('User email not found');
  }

  const role = normalizeRoleFromClerk(clerk);
  const name = clerk?.fullName ?? clerk?.username ?? email.split('@')[0] ?? 'User';
  const avatarUrl = clerk?.imageUrl ?? null;
  const isSuperAdmin = Boolean((clerk as any)?.publicMetadata?.isSuperAdmin);

  const profileRow = await ensureProfileRow({
    organizationId: workspaceId,
    clerkUserId,
    email,
    fullName: clerk?.fullName ?? null,
    avatarUrl,
    role,
  });

  const nexusUser = await ensureNexusUserRow({
    organizationId: workspaceId,
    email: String(email).trim().toLowerCase(),
    name,
    role,
    avatarUrl,
    isSuperAdmin,
  });

  return {
    id: String(nexusUser.id),
    profileId: String((profileRow as any)?.id || ''),
    name: String(nexusUser.name || name),
    role: String(nexusUser.role || role || 'עובד'),
    avatar: String((nexusUser as any).avatar || avatarUrl || ''),
    online: true,
    capacity: Number((nexusUser as any).capacity || 0),
    email: String((nexusUser as any).email || email),
    phone: (profileRow as any)?.phone != null ? String((profileRow as any).phone) : null,
    isSuperAdmin: Boolean((nexusUser as any).is_super_admin ?? (nexusUser as any).isSuperAdmin ?? isSuperAdmin),
    tenantId: workspaceId,
  };
}

export async function resolveWorkspaceCurrentUserForApi(orgHeaderValue: string) {
  const workspace = await requireWorkspaceAccessByOrgSlugApi(orgHeaderValue);

  const clerk = await currentUser();
  const clerkUserId = clerk?.id || null;
  if (!clerkUserId) {
    throw new Error('Unauthorized');
  }

  const email = clerk?.primaryEmailAddress?.emailAddress ?? null;
  if (!email) {
    throw new Error('User email not found');
  }

  const role = normalizeRoleFromClerk(clerk);
  const name = clerk?.fullName ?? clerk?.username ?? email.split('@')[0] ?? 'User';
  const avatarUrl = clerk?.imageUrl ?? null;
  const isSuperAdmin = Boolean((clerk as any)?.publicMetadata?.isSuperAdmin);

  await ensureProfileRow({
    organizationId: workspace.id,
    clerkUserId,
    email,
    fullName: clerk?.fullName ?? null,
    avatarUrl,
    role,
  });

  const nexusUser = await ensureNexusUserRow({
    organizationId: workspace.id,
    email: String(email).trim().toLowerCase(),
    name,
    role,
    avatarUrl,
    isSuperAdmin,
  });

  return {
    user: nexusUser,
    workspace,
    clerkUser: {
      id: clerkUserId,
      email,
      firstName: clerk?.firstName ?? null,
      lastName: clerk?.lastName ?? null,
      role,
      isSuperAdmin,
    },
  };
}
