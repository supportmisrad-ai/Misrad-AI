import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { WebhookEvent } from '@clerk/nextjs/server';
import crypto from 'crypto';
import { createServiceRoleClient, createServiceRoleClientScoped } from '@/lib/supabase';
import { ensureProfileForClerkUserInOrganizationAction, getOrCreateSupabaseUserFromClerkWebhookAction } from '@/lib/services/auth/clerk-webhook';
import { DEFAULT_TRIAL_DAYS } from '@/lib/trial';
import { generateOrgSlug } from '@/lib/server/orgSlug';
import { reportSchemaFallback } from '@/lib/server/schema-fallbacks';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { withWebhookGlobalAdminContext } from '@/lib/api-webhook-guard';

import { asObject } from '@/lib/shared/unknown';
const IS_PROD = process.env.NODE_ENV === 'production';

const ALLOW_SCHEMA_FALLBACKS = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';

async function POSTHandler(req: Request) {
  // Get the Svix headers for verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Error occured -- no svix headers' }, { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const webhookSecret =
    process.env.CLERK_WEBHOOK_SECRET ||
    // Backwards compatibility / common typo
    process.env.CLERK_WEB_HOOK_SECRET ||
    '';

  if (!webhookSecret) {
    if (!IS_PROD) {
      console.error('[clerk-webhook] Missing webhook secret.');
    } else {
      console.error('[clerk-webhook] Webhook secret is not configured');
    }
    return NextResponse.json({ error: 'Webhook secret is not configured' }, { status: 500 });
  }

  const wh = new Webhook(webhookSecret);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    if (!IS_PROD) console.error('Error verifying webhook:', err);
    else console.error('Error verifying webhook');
    return NextResponse.json({ error: 'Error occured' }, { status: 400 });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    try {
      // Type guard to check if data is a user object
      if (!('id' in evt.data)) {
        return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
      }

      const userObj = asObject(evt.data);
      if (!userObj) {
        return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
      }

      const id = typeof userObj.id === 'string' ? userObj.id : null;
      if (!id) {
        return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
      }

      const emailAddressesValue = userObj.email_addresses;
      const emailAddresses = Array.isArray(emailAddressesValue) ? emailAddressesValue : [];
      const firstEmailObj = asObject(emailAddresses[0]) ?? {};
      const primaryEmail = typeof firstEmailObj.email_address === 'string' ? String(firstEmailObj.email_address) : undefined;

      const first_name = typeof userObj.first_name === 'string' ? userObj.first_name : undefined;
      const last_name = typeof userObj.last_name === 'string' ? userObj.last_name : undefined;
      const image_url = typeof userObj.image_url === 'string' ? userObj.image_url : undefined;
      const publicMetadata = asObject(userObj.public_metadata) ?? {};

      let orgSignupInvite: Record<string, unknown> | null = null;

      // Preferred org can be provided by app flow via Clerk public metadata.
      // Fallback for employee-invite flow: infer org by matching a recently completed invite for this email.
      let preferredOrgKey = typeof publicMetadata.orgSlug === 'string' ? String(publicMetadata.orgSlug) : undefined;
      if (!preferredOrgKey && primaryEmail) {
        const supabase = createServiceRoleClient({ allowUnscoped: true, reason: 'clerk_webhook_invite_lookup' });
        const nowIso = new Date().toISOString();

        // Organization signup invite flow (Super Admin creates a pending invite by email)
        try {
          const { data: inviteRow, error: inviteError } = await supabase
            .from('organization_signup_invitations')
            .select('id, token, owner_email, organization_name, desired_slug, created_at, expires_at')
            .eq('owner_email', String(primaryEmail).trim().toLowerCase())
            .eq('is_active', true)
            .eq('is_used', false)
            .or(`expires_at.is.null,expires_at.gte.${nowIso}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const inviteObj = asObject(inviteRow);
          const inviteToken = typeof inviteObj?.token === 'string' ? inviteObj.token : null;
          if (!inviteError && inviteToken) {
            orgSignupInvite = inviteObj;
            preferredOrgKey = `invite:${String(inviteToken)}`;
          }
        } catch {
          // ignore
        }

        // First preference: an active, unused invite for this email (prevents auto-provisioning wrong org)
        const { data: activeInviteRow } = await supabase
          .from('nexus_employee_invitation_links')
          .select('organization_id, token, created_at')
          .eq('employee_email', primaryEmail)
          .eq('is_active', true)
          .eq('is_used', false)
          .or(`expires_at.is.null,expires_at.gte.${nowIso}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const activeInviteObj = asObject(activeInviteRow) ?? {};
        const activeInviteOrgId = typeof activeInviteObj.organization_id === 'string' ? activeInviteObj.organization_id : null;
        const activeInviteToken = typeof activeInviteObj.token === 'string' ? activeInviteObj.token : null;
        if (activeInviteOrgId && activeInviteToken) {
          preferredOrgKey = `employee-invite:${String(activeInviteToken)}`;
        }

        // Fallback: a recently used invite for this email (backwards compatibility)
        if (!preferredOrgKey) {
          const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
          const { data: usedInviteRow } = await supabase
            .from('nexus_employee_invitation_links')
            .select('organization_id, token, used_at, is_used')
            .eq('employee_email', primaryEmail)
            .eq('is_used', true)
            .gte('used_at', cutoff)
            .order('used_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const usedInviteObj = asObject(usedInviteRow) ?? {};
          const usedInviteOrgId = typeof usedInviteObj.organization_id === 'string' ? usedInviteObj.organization_id : null;
          const usedInviteToken = typeof usedInviteObj.token === 'string' ? usedInviteObj.token : null;
          if (usedInviteOrgId && usedInviteToken) {
            preferredOrgKey = `employee-invite:${String(usedInviteToken)}`;
          }
        }
      }

      // Get or create user in Supabase and sync profile image
      const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
      const internalCallToken = crypto
        .createHmac('sha256', webhookSecret)
        .update(`${svix_id}.${svix_timestamp}.${bodyHash}`)
        .digest('hex');

      const result = await getOrCreateSupabaseUserFromClerkWebhookAction({
        clerkUserId: id,
        email: primaryEmail,
        fullName: first_name && last_name ? `${first_name} ${last_name}` : first_name || undefined,
        imageUrl: image_url || undefined,
        preferredOrganizationKey: preferredOrgKey,
        svixId: svix_id,
        svixTimestamp: svix_timestamp,
        bodyHash,
        internalCallToken,
      });

      // ✅ AUDIT LOG: Track user sync for debugging user data issues
      if (!IS_PROD) {
        console.log('[Clerk Webhook] User sync result:', {
          clerkUserId: id,
          email: primaryEmail,
          providedName: first_name && last_name ? `${first_name} ${last_name}` : first_name,
          success: result.success,
          userId: result.userId,
          timestamp: new Date().toISOString(),
        });
      }

      if (!result.success) {
        if (!IS_PROD) console.error('Error syncing user profile:', result.error);
        else console.error('Error syncing user profile');
        return NextResponse.json({ error: 'Error syncing user profile' }, { status: 500 });
      }

      // Also update social_team_members table if user exists there
      if (result.userId) {
        const supabase = createServiceRoleClient({ allowUnscoped: true, reason: 'clerk_webhook_team_member_sync' });

        // If we have a pending org signup invite for this email, create/link org with exact name+slug
        const orgInviteToken = typeof orgSignupInvite?.token === 'string' ? orgSignupInvite.token : null;
        if (orgInviteToken) {
          try {
            const nowIso = new Date().toISOString();
            const desiredSlugRaw = typeof orgSignupInvite?.desired_slug === 'string' ? String(orgSignupInvite.desired_slug) : null;
            const desiredSlug = desiredSlugRaw ? generateOrgSlug(desiredSlugRaw) : null;
            const orgName = typeof orgSignupInvite?.organization_name === 'string' ? String(orgSignupInvite.organization_name) : null;

            if (desiredSlug && orgName) {
              const { data: socialUserRow } = await supabase
                .from('organization_users')
                .select('id, organization_id')
                .eq('id', result.userId)
                .maybeSingle();

              const socialUserObj = asObject(socialUserRow) ?? {};
              let orgId: string | null = typeof socialUserObj.organization_id === 'string' ? socialUserObj.organization_id : null;

              if (!orgId) {
                const { data: existingOrgRow, error: existingOrgError } = await supabase
                  .from('organizations')
                  .select('id')
                  .eq('slug', desiredSlug)
                  .maybeSingle();

                if (!existingOrgError && existingOrgRow?.id) {
                  orgId = String(existingOrgRow.id);
                }
              }

              if (!orgId) {
                const { data: createdOrg, error: createOrgError } = await supabase
                  .from('organizations')
                  .insert({
                    name: orgName,
                    slug: desiredSlug,
                    owner_id: result.userId,
                    has_nexus: true,
                    has_social: false,
                    has_system: false,
                    has_finance: false,
                    has_client: false,
                    has_operations: false,
                    subscription_status: 'trial',
                    trial_start_date: nowIso,
                    trial_days: DEFAULT_TRIAL_DAYS,
                    created_at: nowIso,
                    updated_at: nowIso,
                  } satisfies Record<string, unknown>)
                  .select('id')
                  .single();

                if (!createOrgError && createdOrg?.id) {
                  orgId = String(createdOrg.id);
                }
              }

              if (orgId) {
                const scoped = createServiceRoleClientScoped({
                  reason: 'clerk_webhook_sync_user_scoped',
                  scopeColumn: 'organization_id',
                  scopeId: orgId,
                });

                await scoped
                  .from('organization_users')
                  .update({ organization_id: orgId, updated_at: nowIso } satisfies Record<string, unknown>)
                  .eq('id', result.userId);

                await supabase
                  .from('organization_signup_invitations')
                  .update({
                    is_used: true,
                    used_at: nowIso,
                    used_by_user_id: result.userId,
                    used_by_clerk_user_id: id,
                    organization_id: orgId,
                    updated_at: nowIso,
                  } satisfies Record<string, unknown>)
                  .eq('token', String(orgInviteToken));

                try {
                  await ensureProfileForClerkUserInOrganizationAction({
                    clerkUserId: id,
                    organizationId: orgId,
                    role: 'owner',
                    email: primaryEmail,
                    fullName: first_name && last_name ? `${first_name} ${last_name}` : first_name || undefined,
                    imageUrl: image_url || undefined,
                  });
                } catch {
                  // ignore
                }
              }
            }
          } catch (e) {
            if (!IS_PROD) console.error('[clerk-webhook] org signup invite handling failed (ignored)', e);
            else console.error('[clerk-webhook] org signup invite handling failed (ignored)');
          }
        }

        const nowIsoTeam = new Date().toISOString();
        const { data: teamRow } = await supabase
          .from('team_members')
          .select('id, organization_id')
          .eq('user_id', result.userId)
          .maybeSingle();

        const teamRowObj = asObject(teamRow) ?? {};
        const teamOrgId = typeof teamRowObj.organization_id === 'string' ? String(teamRowObj.organization_id).trim() : '';
        const teamScoped = teamOrgId
          ? createServiceRoleClientScoped({
              reason: 'clerk_webhook_team_member_sync_scoped',
              scopeColumn: 'organization_id',
              scopeId: teamOrgId,
            })
          : null;

        const memberUpdate = {
          avatar: image_url || undefined,
          name: first_name && last_name ? `${first_name} ${last_name}` : first_name || undefined,
          email: primaryEmail,
          updated_at: nowIsoTeam,
        } satisfies Record<string, unknown>;

        const baseTeamUpdate = teamScoped ? teamScoped.from('team_members') : supabase.from('team_members');
        const baseTeamUpdateQuery = baseTeamUpdate.update(memberUpdate).eq('user_id', result.userId);
        if (!teamScoped && teamOrgId) {
          await baseTeamUpdateQuery.eq('organization_id', teamOrgId);
        } else {
          await baseTeamUpdateQuery;
        }
      }

      return NextResponse.json({ ok: true }, { status: 200 });
    } catch (error) {
      if (!IS_PROD) console.error('Error handling webhook:', error);
      else console.error('Error handling webhook');
      return NextResponse.json({ error: 'Error handling webhook' }, { status: 500 });
    }
  }

  if (eventType === 'user.deleted') {
    try {
      if (!('id' in evt.data)) {
        return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
      }

      const userObj = asObject(evt.data);
      const clerkUserId = typeof userObj?.id === 'string' ? userObj.id : null;
      if (!clerkUserId) {
        return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
      }
      const supabase = createServiceRoleClient({ allowUnscoped: true, reason: 'clerk_webhook_user_deleted' });
      const nowIso = new Date().toISOString();

      const { data: socialUserRow, error: socialUserError } = await supabase
        .from('organization_users')
        .select('id, organization_id')
        .eq('clerk_user_id', clerkUserId)
        .limit(1)
        .maybeSingle();

      if (socialUserError) {
        throw new Error(socialUserError.message);
      }

      const socialUserObj = asObject(socialUserRow) ?? {};
      const socialUserId = typeof socialUserObj.id === 'string' ? String(socialUserObj.id) : null;
      const orgId = typeof socialUserObj.organization_id === 'string' ? String(socialUserObj.organization_id).trim() : '';
      const scoped = orgId
        ? createServiceRoleClientScoped({
            reason: 'clerk_webhook_user_deleted_scoped',
            scopeColumn: 'organization_id',
            scopeId: orgId,
          })
        : null;

      // Preferred path: mark user inactive (soft delete)
      const baseUserUpdate = scoped ? scoped.from('organization_users') : supabase.from('organization_users');

      let attempt = baseUserUpdate
        .update({ is_active: false, updated_at: nowIso, role: 'deleted', organization_id: null } satisfies Record<string, unknown>)
        .eq('clerk_user_id', clerkUserId);

      if (!scoped && orgId) {
        attempt = attempt.eq('organization_id', orgId);
      }

      const attemptRes = await attempt;
      const attemptObj = asObject(attemptRes) ?? {};
      const attemptErrorObj = asObject(attemptObj.error);

      if (attemptErrorObj) {
        const code = typeof attemptErrorObj.code === 'string' ? String(attemptErrorObj.code) : String(attemptErrorObj.code ?? '');
        if (code === '42703') {
          if (!ALLOW_SCHEMA_FALLBACKS) {
            const msg = typeof attemptErrorObj.message === 'string' ? String(attemptErrorObj.message) : 'missing column';
            throw new Error(`[SchemaMismatch] social_users missing column (${msg || '42703'})`);
          }

          reportSchemaFallback({
            source: 'app/api/webhooks/clerk.POSTHandler(user.deleted)',
            reason: 'organization_users soft-delete update missing column (fallback to minimal update)',
            error: attemptObj.error,
            extras: { clerkUserId: String(clerkUserId), organizationId: orgId ? String(orgId) : null },
          });
          const baseFallback = scoped ? scoped.from('organization_users') : supabase.from('organization_users');
          let fallbackQuery = baseFallback
            .update({ updated_at: nowIso, role: 'deleted', organization_id: null } satisfies Record<string, unknown>)
            .eq('clerk_user_id', clerkUserId);

          if (!scoped && orgId) {
            fallbackQuery = fallbackQuery.eq('organization_id', orgId);
          }

          const fallback = await fallbackQuery;

          const fallbackObj = asObject(fallback) ?? {};
          const fallbackErr = asObject(fallbackObj.error);
          if (fallbackErr && typeof fallbackErr.message === 'string') {
            throw new Error(fallbackErr.message);
          }
        } else {
          if (typeof attemptErrorObj.message === 'string') {
            throw new Error(attemptErrorObj.message);
          }
          throw new Error('Error handling webhook');
        }
      }

      if (socialUserId) {
        const baseMembershipDelete = scoped ? scoped.from('team_members') : supabase.from('team_members');
        let membershipDeleteQuery = baseMembershipDelete.delete().eq('user_id', socialUserId);
        if (!scoped && orgId) {
          membershipDeleteQuery = membershipDeleteQuery.eq('organization_id', orgId);
        }

        const membershipDelete = await membershipDeleteQuery;
        const membershipObj = asObject(membershipDelete) ?? {};
        const membershipErr = asObject(membershipObj.error);
        if (membershipErr && typeof membershipErr.message === 'string') {
          throw new Error(membershipErr.message);
        }
      }

      return NextResponse.json({ ok: true }, { status: 200 });
    } catch (error) {
      if (!IS_PROD) console.error('Error handling webhook (user.deleted):', error);
      else console.error('Error handling webhook (user.deleted)');
      return NextResponse.json({ error: 'Error handling webhook' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}


export const POST = shabbatGuard((req: Request) =>
  withWebhookGlobalAdminContext({ source: 'webhook_clerk' }, () => POSTHandler(req))
);
