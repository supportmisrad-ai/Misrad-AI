import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getBaseUrl } from '@/lib/utils';
import { sendDay2CheckinEmail, sendDay7CheckinEmail, sendDay45FeedbackEmail } from '@/lib/email';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { cronGuard } from '@/lib/api-cron-guard';
import { getErrorMessage } from '@/lib/shared/unknown';

export const dynamic = 'force-dynamic';

const IS_PROD = process.env.NODE_ENV === 'production';

type FollowupType = 'day2' | 'day7' | 'day45';

const FOLLOWUP_CONFIG: Record<FollowupType, { daysAfterCreation: number; emailTypeId: string; label: string }> = {
  day2: { daysAfterCreation: 2, emailTypeId: 'onboarding_day2_checkin', label: 'Day 2 check-in' },
  day7: { daysAfterCreation: 7, emailTypeId: 'onboarding_day7_checkin', label: 'Day 7 check-in' },
  day45: { daysAfterCreation: 45, emailTypeId: 'onboarding_day45_feedback', label: 'Day 45 feedback' },
};

async function POSTHandler(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const dryRun = url.searchParams.get('dryRun') === '1' || url.searchParams.get('dryRun') === 'true';
    const typeParam = url.searchParams.get('type') as FollowupType | 'all' | null;
    const types: FollowupType[] = typeParam && typeParam !== 'all' && FOLLOWUP_CONFIG[typeParam]
      ? [typeParam]
      : ['day2', 'day7', 'day45'];

    const baseUrl = getBaseUrl(req);
    const results: Array<Record<string, unknown>> = [];
    let totalSent = 0;
    let totalSkipped = 0;

    for (const type of types) {
      const config = FOLLOWUP_CONFIG[type];
      const now = new Date();

      // Window: orgs created exactly N days ago (±12 hours to avoid missing anyone)
      const targetDate = new Date(now.getTime() - config.daysAfterCreation * 24 * 60 * 60 * 1000);
      const windowStart = new Date(targetDate.getTime() - 12 * 60 * 60 * 1000);
      const windowEnd = new Date(targetDate.getTime() + 12 * 60 * 60 * 1000);

      // Find organizations in the window
      const orgs = await prisma.organization.findMany({
        where: {
          created_at: {
            gte: windowStart,
            lte: windowEnd,
          },
          subscription_status: { not: 'cancelled' },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          owner_id: true,
          created_at: true,
          owner: {
            select: {
              id: true,
              email: true,
              full_name: true,
            },
          },
        },
      });

      if (orgs.length === 0) {
        results.push({ type, orgsFound: 0, sent: 0, skipped: 0 });
        continue;
      }

      // Check which emails were already sent (dedup via email_sent_logs)
      const orgIds = orgs.map((o) => o.id);
      let alreadySentOrgIds = new Set<string>();
      try {
        const p = prisma as unknown as Record<string, unknown>;
        const delegate = p.emailSentLog as { findMany: (args: Record<string, unknown>) => Promise<Array<{ organization_id: string | null }>> } | undefined;
        const existing = delegate
          ? await delegate.findMany({
              where: {
                email_type_id: config.emailTypeId,
                organization_id: { in: orgIds },
              },
              select: { organization_id: true },
            })
          : [];
        alreadySentOrgIds = new Set(
          existing
            .map((r) => r.organization_id)
            .filter((id): id is string => Boolean(id))
        );
      } catch {
        // Table might not exist yet — skip dedup
      }

      let sent = 0;
      let skipped = 0;

      for (const org of orgs) {
        const ownerEmail = org.owner?.email;
        if (!ownerEmail) {
          skipped++;
          continue;
        }

        if (alreadySentOrgIds.has(org.id)) {
          skipped++;
          continue;
        }

        if (dryRun) {
          results.push({
            type,
            orgId: org.id,
            orgName: org.name,
            ownerEmail,
            dryRun: true,
          });
          continue;
        }

        const portalUrl = org.slug
          ? `${baseUrl}/w/${encodeURIComponent(org.slug)}`
          : baseUrl;
        const ratingUrl = `${baseUrl}/rate?org=${encodeURIComponent(org.id)}`;

        let sendResult: { success: boolean; error?: string };

        if (type === 'day2') {
          sendResult = await sendDay2CheckinEmail({
            toEmail: ownerEmail,
            ownerName: org.owner?.full_name || null,
            organizationName: org.name,
            portalUrl,
          });
        } else if (type === 'day7') {
          sendResult = await sendDay7CheckinEmail({
            toEmail: ownerEmail,
            ownerName: org.owner?.full_name || null,
            organizationName: org.name,
            portalUrl,
          });
        } else {
          sendResult = await sendDay45FeedbackEmail({
            toEmail: ownerEmail,
            ownerName: org.owner?.full_name || null,
            organizationName: org.name,
            ratingUrl,
            googleReviewUrl: (process.env.MISRAD_GOOGLE_REVIEW_URL || '').trim() || undefined,
          });
        }

        if (!sendResult.success) {
          results.push({ type, orgId: org.id, orgName: org.name, ok: false, error: sendResult.error });
          continue;
        }

        // Log the sent email for dedup
        try {
          const logDelegate = (prisma as unknown as Record<string, unknown>).emailSentLog as { create: (args: Record<string, unknown>) => Promise<unknown> } | undefined;
          await logDelegate?.create({
            data: {
              email_type_id: config.emailTypeId,
              recipient_email: ownerEmail,
              organization_id: org.id,
              user_id: org.owner_id,
              status: 'sent',
              metadata: { orgName: org.name },
            },
          });
        } catch {
          // Table might not exist yet — ignore
        }

        sent++;
        totalSent++;
        results.push({ type, orgId: org.id, orgName: org.name, ok: true });
      }

      totalSkipped += skipped;
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      types,
      totalSent,
      totalSkipped,
      results,
    });
  } catch (e: unknown) {
    const safeMsg = 'Unknown error in onboarding-followups cron';
    return NextResponse.json(
      { ok: false, error: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg },
      { status: 500 }
    );
  }
}

export const POST = shabbatGuard(cronGuard(POSTHandler));
