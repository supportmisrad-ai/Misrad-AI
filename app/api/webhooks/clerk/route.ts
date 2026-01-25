import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase';
import { getOrCreateSupabaseUserAction } from '@/app/actions/users';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
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
    console.error('[clerk-webhook] Missing webhook secret. Set CLERK_WEBHOOK_SECRET (recommended) or CLERK_WEB_HOOK_SECRET.');
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
    console.error('Error verifying webhook:', err);
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
        const supabase = createClient();
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
          .select('organization_id, created_at')
          .eq('employee_email', primaryEmail)
          .eq('is_active', true)
          .eq('is_used', false)
          .or(`expires_at.is.null,expires_at.gte.${nowIso}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const activeInviteOrgId = (activeInviteRow as any)?.organization_id as string | null;
        if (activeInviteOrgId) {
          preferredOrgKey = String(activeInviteOrgId);
        }

        // Fallback: a recently used invite for this email (backwards compatibility)
        if (!preferredOrgKey) {
          const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
          const { data: usedInviteRow } = await supabase
            .from('nexus_employee_invitation_links')
            .select('organization_id, used_at, is_used')
            .eq('employee_email', primaryEmail)
            .eq('is_used', true)
            .gte('used_at', cutoff)
            .order('used_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const usedInviteOrgId = (usedInviteRow as any)?.organization_id as string | null;
          if (usedInviteOrgId) {
            preferredOrgKey = String(usedInviteOrgId);
          }
        }
      }

      // Get or create user in Supabase and sync profile image
      const shouldSendWelcomeEmail = eventType === 'user.created';
      const result = await getOrCreateSupabaseUserAction(
        id,
        primaryEmail,
        first_name && last_name ? `${first_name} ${last_name}` : first_name || undefined,
        image_url || undefined,
        preferredOrgKey,
        shouldSendWelcomeEmail
      );

      if (!result.success) {
        console.error('Error syncing user profile:', result.error);
        return NextResponse.json({ error: 'Error syncing user profile' }, { status: 500 });
      }

      // Also update social_team_members table if user exists there
      if (result.userId) {
        const supabase = createClient();

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
                    trial_days: 30,
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
                await supabase
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
              }
            }
          } catch (e) {
            console.error('[clerk-webhook] org signup invite handling failed (ignored)', e);
          }
        }

        await supabase
          .from('social_team_members')
          .update({
            avatar: image_url || undefined,
            name: first_name && last_name ? `${first_name} ${last_name}` : first_name || undefined,
            email: email_addresses?.[0]?.email_address || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', result.userId);
      }

      return NextResponse.json({ ok: true }, { status: 200 });
    } catch (error) {
      console.error('Error handling webhook:', error);
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
      const supabase = createClient();
      const nowIso = new Date().toISOString();

      // Preferred path: mark user inactive (soft delete)
      const attempt = await supabase
        .from('social_users')
        .update({ is_active: false, updated_at: nowIso } as any)
        .eq('clerk_user_id', clerkUserId);

      // Backwards compatibility: if is_active column doesn't exist
      if (attempt.error?.message) {
        const msg = String(attempt.error.message).toLowerCase();
        if (msg.includes('column') && msg.includes('is_active')) {
          await supabase
            .from('social_users')
            .update({ role: 'deleted', allowed_modules: [], updated_at: nowIso } as any)
            .eq('clerk_user_id', clerkUserId);
        } else {
          throw new Error(attempt.error.message);
        }
      }

      // Best-effort: also deactivate any team membership rows if schema supports it
      try {
        await supabase
          .from('social_team_members')
          .update({ is_active: false, updated_at: nowIso } as any)
          .eq('clerk_user_id', clerkUserId);
      } catch {
        // ignore
      }

      return NextResponse.json({ ok: true }, { status: 200 });
    } catch (error) {
      console.error('Error handling webhook (user.deleted):', error);
      return NextResponse.json({ error: 'Error handling webhook' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}


export const POST = shabbatGuard(POSTHandler);
