import prisma from '@/lib/prisma';
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

  const now = new Date();
  const nowIso = now.toISOString();

  // Fetch document versions for audit trail (Prisma)
  let termsVersion = nowIso;
  let privacyVersion = nowIso;
  try {
    const contentRows = await prisma.socialMediaSiteContent.findMany({
      where: {
        page: 'legal',
        section: 'documents',
        key: { in: ['terms_markdown', 'privacy_markdown'] },
      },
      select: { key: true, updated_at: true },
    });

    for (const row of contentRows) {
      const ts = row.updated_at ? row.updated_at.toISOString() : nowIso;
      if (row.key === 'terms_markdown') termsVersion = ts;
      if (row.key === 'privacy_markdown') privacyVersion = ts;
    }
  } catch {
    // If content table is empty or missing docs, use current time as version
  }

  // Find the user record
  const existingUser = await prisma.organizationUser.findUnique({
    where: { clerk_user_id: String(clerkUserId) },
    select: { id: true },
  });

  // No record → webhook hasn't created the organizationUser record yet
  if (!existingUser) {
    return apiSuccess({ ok: true, pending: true, consent: null });
  }

  try {
    const updated = await prisma.organizationUser.update({
      where: { clerk_user_id: String(clerkUserId) },
      data: {
        terms_accepted_at: now,
        privacy_accepted_at: now,
        terms_accepted_version: termsVersion,
        privacy_accepted_version: privacyVersion,
        updated_at: now,
      },
      select: {
        id: true,
        terms_accepted_at: true,
        privacy_accepted_at: true,
        terms_accepted_version: true,
        privacy_accepted_version: true,
      },
    });

    return apiSuccess({
      ok: true,
      consent: {
        termsAcceptedAt: updated.terms_accepted_at?.toISOString() ?? null,
        privacyAcceptedAt: updated.privacy_accepted_at?.toISOString() ?? null,
        termsVersion: updated.terms_accepted_version ?? null,
        privacyVersion: updated.privacy_accepted_version ?? null,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to update consent';
    return apiError(msg, { status: 500 });
  }
}

export const POST = shabbatGuard(POSTHandler);
