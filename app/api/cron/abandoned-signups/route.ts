import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getBaseUrl } from '@/lib/utils';
import { sendAbandonedSignupFollowupEmail } from '@/lib/email';
import { shabbatGuard } from '@/lib/api-shabbat-guard';

export const dynamic = 'force-dynamic';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function hasFunction(value: unknown, name: string): value is Record<string, (...args: unknown[]) => unknown> {
  const obj = asObject(value);
  const fn = obj?.[name];
  return typeof fn === 'function';
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : '';
}

type LegacyDelegate = {
  findMany?: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
  create?: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

function getLegacyDelegate(name: string): LegacyDelegate {
  const clientObj = asObject(prisma as unknown);
  const delegate = clientObj?.[name];
  if (!asObject(delegate)) {
    throw new Error(`Prisma delegate ${name} is unavailable`);
  }
  return delegate as unknown as LegacyDelegate;
}

function safeString(value: unknown): string {
  return String(value ?? '').trim();
}

async function POSTHandler(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-cron-secret');
    if (authHeader !== process.env.CRON_SECRET) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = req.nextUrl;

    const dryRun = url.searchParams.get('dryRun') === '1' || url.searchParams.get('dryRun') === 'true';

    const limitRaw = Number(url.searchParams.get('limit') || '50');
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 50;

    const hoursRaw = Number(url.searchParams.get('hours') || '24');
    const hours = Number.isFinite(hoursRaw) ? Math.max(1, Math.min(168, Math.floor(hoursRaw))) : 24;

    const dedupeDaysRaw = Number(url.searchParams.get('dedupeDays') || '7');
    const dedupeDays = Number.isFinite(dedupeDaysRaw) ? Math.max(1, Math.min(60, Math.floor(dedupeDaysRaw))) : 7;

    const cutoffCreatedAt = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const dedupeCutoff = new Date(Date.now() - dedupeDays * 24 * 60 * 60 * 1000).toISOString();

    let usersRows: Array<Record<string, unknown>> = [];
    try {
      const delegate = getLegacyDelegate('social_users');
      const findMany = delegate.findMany;
      if (typeof findMany !== 'function') throw new Error('Prisma delegate social_users.findMany is unavailable');
      usersRows = await findMany({
        where: {
          organization_id: { not: null },
          created_at: { not: null, gte: new Date(cutoffCreatedAt) },
        },
        select: { id: true, clerk_user_id: true, email: true, full_name: true, created_at: true, organization_id: true },
        orderBy: { created_at: 'desc' },
        take: limit,
      });
    } catch (e: unknown) {
      return NextResponse.json(
        { ok: false, error: getErrorMessage(e) || 'Failed to query social_users' },
        { status: 500 }
      );
    }

    const candidates = (usersRows || []).map((u) => ({
      socialUserId: safeString(u.id),
      clerkUserId: safeString(u.clerk_user_id),
      email: safeString(u.email),
      fullName: safeString(u.full_name),
      createdAt: u.created_at ? new Date(String(u.created_at)).toISOString() : '',
      organizationId: safeString(u.organization_id),
    }));

    const orgIds = Array.from(new Set(candidates.map((c) => c.organizationId).filter(Boolean)));
    if (orgIds.length === 0) {
      return NextResponse.json({ ok: true, dryRun, total: 0, sent: 0, skipped: 0, reasons: {} });
    }

    const ownerByOrgId = new Map<string, string>();
    try {
      const delegate = getLegacyDelegate('social_organizations');
      const findMany = delegate.findMany;
      if (typeof findMany !== 'function') throw new Error('Prisma delegate social_organizations.findMany is unavailable');
      const orgRows = await findMany({
        where: { id: { in: orgIds } },
        select: { id: true, owner_id: true },
      });

      for (const row of orgRows) {
        ownerByOrgId.set(safeString(row.id), safeString(row.owner_id));
      }
    } catch {
      // ignore - treat as no owners
    }

    const ownerCandidates = candidates.filter((c) => {
      const ownerId = ownerByOrgId.get(c.organizationId);
      return Boolean(ownerId && c.socialUserId && ownerId === c.socialUserId);
    });

    const ownerOrgIds = Array.from(new Set(ownerCandidates.map((c) => c.organizationId).filter(Boolean)));
    if (ownerOrgIds.length === 0) {
      return NextResponse.json({ ok: true, dryRun, total: 0, sent: 0, skipped: candidates.length, reasons: { not_owner: candidates.length } });
    }

    let activeSubsRows: Array<Record<string, unknown>> = [];
    try {
      const delegate = getLegacyDelegate('subscriptions');
      const findMany = delegate.findMany;
      if (typeof findMany !== 'function') throw new Error('Prisma delegate subscriptions.findMany is unavailable');
      activeSubsRows = await findMany({
        where: {
          organization_id: { in: ownerOrgIds },
          status: 'active',
          current_period_end: { gt: new Date() },
        },
        select: { organization_id: true },
      });
    } catch (e: unknown) {
      return NextResponse.json(
        { ok: false, error: getErrorMessage(e) || 'Failed to query subscriptions' },
        { status: 500 }
      );
    }

    const activeOrgIds = new Set((activeSubsRows || []).map((r) => safeString(r.organization_id)).filter(Boolean));

    const notActiveSub = ownerCandidates.filter((c) => !activeOrgIds.has(c.organizationId));
    if (notActiveSub.length === 0) {
      return NextResponse.json({ ok: true, dryRun, total: 0, sent: 0, skipped: ownerCandidates.length, reasons: { has_active_subscription: ownerCandidates.length } });
    }

    const relevantOrgIds = Array.from(new Set(notActiveSub.map((c) => c.organizationId).filter(Boolean)));
    const relevantClerkIds = Array.from(new Set(notActiveSub.map((c) => c.clerkUserId).filter(Boolean)));

    const alreadySent = new Set<string>();
    try {
      const delegate = getLegacyDelegate('billing_events');
      const findMany = delegate.findMany;
      if (typeof findMany !== 'function') throw new Error('Prisma delegate billing_events.findMany is unavailable');
      const dedupeRows = await findMany({
        where: {
          event_type: 'abandoned_signup_followup_sent',
          occurred_at: { gte: new Date(dedupeCutoff) },
          organization_id: { in: relevantOrgIds },
          actor_clerk_user_id: { in: relevantClerkIds },
        },
        select: { organization_id: true, actor_clerk_user_id: true },
      });

      for (const row of dedupeRows) {
        const key = `${safeString(row.organization_id)}::${safeString(row.actor_clerk_user_id)}`;
        if (key !== '::') alreadySent.add(key);
      }
    } catch {
      // ignore
    }

    const baseUrl = getBaseUrl(req);
    const checkoutUrl = `${baseUrl}/subscribe/checkout`;

    let sent = 0;
    let skipped = 0;
    const reasons: Record<string, number> = {
      missing_email: 0,
      already_sent_recently: 0,
    };

    const results: Array<Record<string, unknown>> = [];

    for (const row of notActiveSub) {
      const dedupeKey = `${row.organizationId}::${row.clerkUserId}`;

      if (!row.email) {
        skipped++;
        reasons.missing_email++;
        results.push({ ...row, ok: false, skipped: true, reason: 'missing_email' });
        continue;
      }

      if (alreadySent.has(dedupeKey)) {
        skipped++;
        reasons.already_sent_recently++;
        results.push({ ...row, ok: false, skipped: true, reason: 'already_sent_recently' });
        continue;
      }

      if (dryRun) {
        results.push({ ...row, ok: true, dryRun: true });
        continue;
      }

      const sendRes = await sendAbandonedSignupFollowupEmail({
        toEmail: row.email,
        ownerName: row.fullName || null,
        checkoutUrl,
      });

      if (!sendRes.success) {
        results.push({ ...row, ok: false, error: sendRes.error || 'send_failed' });
        continue;
      }

      try {
        const delegate = getLegacyDelegate('billing_events');
        const create = delegate.create;
        if (typeof create !== 'function') throw new Error('Prisma delegate billing_events.create is unavailable');
        await create({
          data: {
            organization_id: String(row.organizationId),
            event_type: 'abandoned_signup_followup_sent',
            occurred_at: new Date(),
            actor_clerk_user_id: row.clerkUserId || null,
            payload: {
              email: row.email,
              created_at: row.createdAt,
            },
            created_at: new Date(),
          },
        });
      } catch {
        // ignore
      }

      sent++;
      results.push({ ...row, ok: true });
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      totalCandidates: candidates.length,
      totalTargeted: notActiveSub.length,
      sent,
      skipped,
      reasons,
      checkoutUrl,
      results,
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(e) || 'Unknown error' }, { status: 500 });
  }
}

export const POST = shabbatGuard(POSTHandler);
