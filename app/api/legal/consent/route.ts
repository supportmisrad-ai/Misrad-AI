import prisma from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { shabbatGuard } from '@/lib/api-shabbat-guard';

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

  const keys = ['terms_markdown', 'privacy_markdown'] as const;

  const contentRows = await prisma.social_site_content.findMany({
    where: {
      page: 'legal',
      section: 'documents',
      key: { in: [...keys] },
    },
    select: { key: true, updated_at: true },
  });

  const versionsByKey = new Map<string, string>();
  for (const row of contentRows) {
    const rowKey = String(row.key || '').trim();
    if (!rowKey) continue;
    const updatedAt = row.updated_at ? new Date(row.updated_at) : null;
    versionsByKey.set(rowKey, updatedAt && !Number.isNaN(updatedAt.getTime()) ? updatedAt.toISOString() : new Date().toISOString());
  }

  const now = new Date();
  const termsVersion = versionsByKey.get('terms_markdown') || now.toISOString();
  const privacyVersion = versionsByKey.get('privacy_markdown') || now.toISOString();

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
        termsAcceptedAt: updated.terms_accepted_at ? new Date(updated.terms_accepted_at).toISOString() : null,
        privacyAcceptedAt: updated.privacy_accepted_at ? new Date(updated.privacy_accepted_at).toISOString() : null,
        termsVersion: updated.terms_accepted_version ?? null,
        privacyVersion: updated.privacy_accepted_version ?? null,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error || '');
    if (msg.toLowerCase().includes('record to update not found')) {
      return apiError('User not ready', {
        status: 409,
        message: 'החשבון עדיין מסתנכרן. נסה שוב בעוד כמה שניות.',
      });
    }
    return apiError(error);
  }
}

export const POST = shabbatGuard(POSTHandler);
