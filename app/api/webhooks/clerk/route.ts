import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase';
import { getOrCreateSupabaseUserAction } from '@/app/actions/users';

export async function POST(req: Request) {
  // Get the Svix headers for verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    });
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
    return new Response('Webhook secret is not configured', { status: 500 });
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
    return new Response('Error occured', {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    try {
      // Type guard to check if data is a user object
      if (!('id' in evt.data)) {
        return new Response('Invalid webhook data', { status: 400 });
      }

      const userData = evt.data as any;
      const id = userData.id;
      const email_addresses = userData.email_addresses || [];
      const first_name = userData.first_name;
      const last_name = userData.last_name;
      const image_url = userData.image_url;
      const publicMetadata = userData.public_metadata || {};

      const primaryEmail = email_addresses?.[0]?.email_address ? String(email_addresses[0].email_address) : undefined;

      // Preferred org can be provided by app flow via Clerk public metadata.
      // Fallback for employee-invite flow: infer org by matching a recently completed invite for this email.
      let preferredOrgKey = publicMetadata?.orgSlug ? String(publicMetadata.orgSlug) : undefined;
      if (!preferredOrgKey && primaryEmail) {
        const supabase = createClient();
        const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
        const { data: inviteRow } = await supabase
          .from('nexus_employee_invitation_links')
          .select('organization_id, used_at, is_used')
          .eq('employee_email', primaryEmail)
          .eq('is_used', true)
          .gte('used_at', cutoff)
          .order('used_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const inviteOrgId = (inviteRow as any)?.organization_id as string | null;
        if (inviteOrgId) {
          preferredOrgKey = String(inviteOrgId);
        }
      }

      // Get or create user in Supabase and sync profile image
      const result = await getOrCreateSupabaseUserAction(
        id,
        primaryEmail,
        first_name && last_name ? `${first_name} ${last_name}` : first_name || undefined,
        image_url || undefined,
        preferredOrgKey
      );

      if (!result.success) {
        console.error('Error syncing user profile:', result.error);
        return new Response('Error syncing user profile', { status: 500 });
      }

      // Also update social_team_members table if user exists there
      if (result.userId) {
        const supabase = createClient();
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

      return new Response('User profile synced', { status: 200 });
    } catch (error) {
      console.error('Error handling webhook:', error);
      return new Response('Error handling webhook', { status: 500 });
    }
  }

  return new Response('Webhook received', { status: 200 });
}

