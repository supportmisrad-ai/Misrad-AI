import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

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

  return await withTenantIsolationContext(
    { source: 'api_legal_consent', reason: 'record_consent', suppressReporting: true },
    async () => {
      const keys = ['terms_markdown', 'privacy_markdown'] as const;

      const contentRows = await prisma.socialMediaSiteContent.findMany({
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
        // P2025 = record not found (webhook hasn't created organizationUser yet)
        const isNotFound =
          (error instanceof Prisma.PrismaClientKnownRequestError && (error as Prisma.PrismaClientKnownRequestError).code === 'P2025') ||
          (error instanceof Error && error.message.toLowerCase().includes('not found'));
        if (isNotFound) {
          return apiSuccess({ ok: true, pending: true, consent: null });
        }
        return apiError(error);
      }
    }
  );
}

export const POST = shabbatGuard(POSTHandler);
