import { createServiceRoleClient } from '@/lib/supabase';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { rateLimit } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';

type ConsentRequestBody = {
  acceptTerms?: boolean;
  acceptPrivacy?: boolean;
};

async function POSTHandler(req: Request): Promise<Response> {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    return apiError('Unauthorized', { status: 401 });
  }

  const rl = await rateLimit({
    namespace: 'legal-consent',
    key: clerkUserId,
    limit: 10,
    windowMs: 60_000,
    mode: 'degraded',
    degradedLimit: 10,
  });
  if (!rl.ok) {
    return apiError('Too many requests', { status: 429 });
  }

  let body: ConsentRequestBody = {};
  try {
    body = (await req.json()) as ConsentRequestBody;
  } catch {
    body = {};
  }

  if (body?.acceptTerms !== true || body?.acceptPrivacy !== true) {
    return apiError('Missing consent', {
      status: 400,
      message: 'נדרש אישור לתנאי שימוש ולמדיניות פרטיות',
    });
  }

  const supabase = createServiceRoleClient({ reason: 'legal_consent_record', allowUnscoped: true });
  const now = new Date().toISOString();

  // Fetch document versions for audit trail
  const { data: contentRows } = await supabase
    .from('social_media_site_content')
    .select('key, updated_at')
    .eq('page', 'legal')
    .eq('section', 'documents')
    .in('key', ['terms_markdown', 'privacy_markdown']);

  const versionsByKey = new Map<string, string>();
  for (const row of (contentRows ?? [])) {
    const k = String(row.key || '').trim();
    if (!k) continue;
    const ts = row.updated_at ? new Date(row.updated_at) : null;
    versionsByKey.set(k, ts && !Number.isNaN(ts.getTime()) ? ts.toISOString() : now);
  }

  const termsVersion = versionsByKey.get('terms_markdown') || now;
  const privacyVersion = versionsByKey.get('privacy_markdown') || now;

  const { data, error } = await supabase
    .from('organization_users')
    .update({
      terms_accepted_at: now,
      privacy_accepted_at: now,
      terms_accepted_version: termsVersion,
      privacy_accepted_version: privacyVersion,
      updated_at: now,
    })
    .eq('clerk_user_id', String(clerkUserId))
    .select('id, terms_accepted_at, privacy_accepted_at, terms_accepted_version, privacy_accepted_version');

  if (error) {
    return apiError(error.message);
  }

  // No rows updated → webhook hasn't created the organizationUser record yet
  if (!data || data.length === 0) {
    return apiSuccess({ ok: true, pending: true, consent: null });
  }

  const updated = data[0] as {
    id: string;
    terms_accepted_at: string | null;
    privacy_accepted_at: string | null;
    terms_accepted_version: string | null;
    privacy_accepted_version: string | null;
  };

  return apiSuccess({
    ok: true,
    consent: {
      termsAcceptedAt: updated.terms_accepted_at ?? null,
      privacyAcceptedAt: updated.privacy_accepted_at ?? null,
      termsVersion: updated.terms_accepted_version ?? null,
      privacyVersion: updated.privacy_accepted_version ?? null,
    },
  });
}

export const POST = shabbatGuard(POSTHandler);
