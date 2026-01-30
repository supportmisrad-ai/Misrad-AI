import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { WebhookEvent } from '@clerk/nextjs/server';
import crypto from 'crypto';
import { createServiceRoleClient, createServiceRoleClientScoped } from '@/lib/supabase';
import { ensureProfileForClerkUserInOrganizationAction, getOrCreateSupabaseUserFromClerkWebhookAction } from '@/app/actions/users';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';
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

      const userData = evt.data as any;
      const id = userData.id;
      const email_addresses = userData.email_addresses || [];
      const first_name = userData.first_name;
      const last_name = userData.last_name;
      const image_url = userData.image_url;
      const publicMetadata = userData.public_metadata || {};

      const primaryEmail = email_addresses?.[0]?.email_address ? String(email_addresses[0].email_address) : undefined;

      let orgSignupInvite: any = null;

      // Preferred org can be provided by app flow via Clerk public metadata.
      // Fallback for employee-invite flow: infer org by matching a recently completed invite for this email.
      let preferredOrgKey = publicMetadata?.orgSlug ? String(publicMetadata.orgSlug) : undefined;
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

          if (!inviteError && inviteRow?.token) {
            orgSignupInvite = inviteRow;
            preferredOrgKey = `invite:${String(inviteRow.token)}`;
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

        const activeInviteOrgId = (activeInviteRow as any)?.organization_id as string | null;
        const activeInviteToken = (activeInviteRow as any)?.token as string | null;
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

          const usedInviteOrgId = (usedInviteRow as any)?.organization_id as string | null;
          const usedInviteToken = (usedInviteRow as any)?.token as string | null;
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

      if (!result.success) {
        if (!IS_PROD) console.error('Error syncing user profile:', result.error);
        else console.error('Error syncing user profile');
        return NextResponse.json({ error: 'Error syncing user profile' }, { status: 500 });
      }

      // Also update social_team_members table if user exists there
      if (result.userId) {
        const supabase = createServiceRoleClient({ allowUnscoped: true, reason: 'clerk_webhook_team_member_sync' });

        // If we have a pending org signup invite for this email, create/link org with exact name+slug
        if (orgSignupInvite?.token) {
          try {
            const nowIso = new Date().toISOString();
            const desiredSlug = orgSignupInvite?.desired_slug ? String(orgSignupInvite.desired_slug) : null;
            const orgName = orgSignupInvite?.organization_name ? String(orgSignupInvite.organization_name) : null;

            if (desiredSlug && orgName) {
              const { data: socialUserRow } = await supabase
                .from('social_users')
                .select('id, organization_id')
                .eq('id', result.userId)
                .maybeSingle();

              let orgId: string | null = (socialUserRow as any)?.organization_id ?? null;

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
                    subscription_plan: null,
                    trial_start_date: nowIso,
                    trial_days: 7,
                    created_at: nowIso,
                    updated_at: nowIso,
                  } as any)
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
                  .from('social_users')
                  .update({ organization_id: orgId, updated_at: nowIso } as any)
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
                  } as any)
                  .eq('token', String(orgSignupInvite.token));

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
          .from('social_team_members')
          .select('id, organization_id')
          .eq('user_id', result.userId)
          .maybeSingle();

        const teamOrgId = (teamRow as any)?.organization_id ? String((teamRow as any).organization_id).trim() : '';
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
          email: email_addresses?.[0]?.email_address || undefined,
          updated_at: nowIsoTeam,
        } as any;

        const baseTeamUpdate = teamScoped ? teamScoped.from('social_team_members') : supabase.from('social_team_members');
        let teamUpdateQuery = baseTeamUpdate.update(memberUpdate).eq('user_id', result.userId);
        if (!teamScoped && teamOrgId) {
          teamUpdateQuery = (teamUpdateQuery as any).eq('organization_id', teamOrgId);
        }

        await (teamUpdateQuery as any);
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

      const userData = evt.data as any;
      const clerkUserId = userData.id;
      const supabase = createServiceRoleClient({ allowUnscoped: true, reason: 'clerk_webhook_user_deleted' });
      const nowIso = new Date().toISOString();

      const { data: socialUserRow, error: socialUserError } = await supabase
        .from('social_users')
        .select('id, organization_id')
        .eq('clerk_user_id', clerkUserId)
        .limit(1)
        .maybeSingle();

      if (socialUserError) {
        throw new Error(socialUserError.message);
      }

      const socialUserId = (socialUserRow as any)?.id ? String((socialUserRow as any).id) : null;
      const orgId = (socialUserRow as any)?.organization_id ? String((socialUserRow as any).organization_id).trim() : '';
      const scoped = orgId
        ? createServiceRoleClientScoped({
            reason: 'clerk_webhook_user_deleted_scoped',
            scopeColumn: 'organization_id',
            scopeId: orgId,
          })
        : null;

      // Preferred path: mark user inactive (soft delete)
      const baseUserUpdate = scoped ? scoped.from('social_users') : supabase.from('social_users');

      let attempt = baseUserUpdate
        .update({ is_active: false, updated_at: nowIso, role: 'deleted', organization_id: null } as any)
        .eq('clerk_user_id', clerkUserId);

      if (!scoped && orgId) {
        attempt = (attempt as any).eq('organization_id', orgId);
      }

      const attemptRes = await (attempt as any);

      if (attemptRes.error) {
        const code = String((attemptRes.error as any)?.code || '');
        if (code === '42703') {
          const baseFallback = scoped ? scoped.from('social_users') : supabase.from('social_users');
          let fallbackQuery = baseFallback
            .update({ updated_at: nowIso, role: 'deleted', organization_id: null } as any)
            .eq('clerk_user_id', clerkUserId);

          if (!scoped && orgId) {
            fallbackQuery = (fallbackQuery as any).eq('organization_id', orgId);
          }

          const fallback = await (fallbackQuery as any);

          if (fallback.error) {
            throw new Error(fallback.error.message);
          }
        } else {
          throw new Error(attemptRes.error.message);
        }
      }

      if (socialUserId) {
        const baseMembershipDelete = scoped ? scoped.from('social_team_members') : supabase.from('social_team_members');
        let membershipDeleteQuery = baseMembershipDelete.delete().eq('user_id', socialUserId);
        if (!scoped && orgId) {
          membershipDeleteQuery = (membershipDeleteQuery as any).eq('organization_id', orgId);
        }

        const membershipDelete = await (membershipDeleteQuery as any);

        if ((membershipDelete as any)?.error) {
          throw new Error((membershipDelete as any).error.message);
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


export const POST = shabbatGuard(POSTHandler);
