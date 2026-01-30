import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, createServiceRoleClientScoped } from '@/lib/supabase';
import { getBaseUrl } from '@/lib/utils';
import { sendAbandonedSignupFollowupEmail } from '@/lib/email';
import { shabbatGuard } from '@/lib/api-shabbat-guard';

export const dynamic = 'force-dynamic';

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

    const supabase = createServiceRoleClient({ allowUnscoped: true, reason: 'cron_abandoned_signups_followup' });

    const usersRes = await supabase
      .from('social_users')
      .select('id, clerk_user_id, email, full_name, created_at, organization_id')
      .not('organization_id', 'is', null)
      .not('created_at', 'is', null)
      .gte('created_at', cutoffCreatedAt)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (usersRes.error) {
      return NextResponse.json(
        { ok: false, error: usersRes.error.message || 'Failed to query social_users' },
        { status: 500 }
      );
    }

    const candidates = (usersRes.data || []).map((u: any) => ({
      socialUserId: safeString(u.id),
      clerkUserId: safeString(u.clerk_user_id),
      email: safeString(u.email),
      fullName: safeString(u.full_name),
      createdAt: safeString(u.created_at),
      organizationId: safeString(u.organization_id),
    }));

    const orgIds = Array.from(new Set(candidates.map((c) => c.organizationId).filter(Boolean)));
    if (orgIds.length === 0) {
      return NextResponse.json({ ok: true, dryRun, total: 0, sent: 0, skipped: 0, reasons: {} });
    }

    const orgOwnersRes = await supabase
      .from('organizations')
      .select('id, owner_id')
      .in('id', orgIds);

    const ownerByOrgId = new Map<string, string>();
    if (!orgOwnersRes.error && orgOwnersRes.data) {
      for (const row of orgOwnersRes.data as any[]) {
        ownerByOrgId.set(safeString(row.id), safeString(row.owner_id));
      }
    }

    const ownerCandidates = candidates.filter((c) => {
      const ownerId = ownerByOrgId.get(c.organizationId);
      return Boolean(ownerId && c.socialUserId && ownerId === c.socialUserId);
    });

    const ownerOrgIds = Array.from(new Set(ownerCandidates.map((c) => c.organizationId).filter(Boolean)));
    if (ownerOrgIds.length === 0) {
      return NextResponse.json({ ok: true, dryRun, total: 0, sent: 0, skipped: candidates.length, reasons: { not_owner: candidates.length } });
    }

    const activeSubsRes = await supabase
      .from('subscriptions')
      .select('organization_id')
      .in('organization_id', ownerOrgIds)
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString());

    if (activeSubsRes.error) {
      return NextResponse.json(
        { ok: false, error: activeSubsRes.error.message || 'Failed to query subscriptions' },
        { status: 500 }
      );
    }

    const activeOrgIds = new Set((activeSubsRes.data || []).map((r: any) => safeString(r.organization_id)).filter(Boolean));

    const notActiveSub = ownerCandidates.filter((c) => !activeOrgIds.has(c.organizationId));
    if (notActiveSub.length === 0) {
      return NextResponse.json({ ok: true, dryRun, total: 0, sent: 0, skipped: ownerCandidates.length, reasons: { has_active_subscription: ownerCandidates.length } });
    }

    const relevantOrgIds = Array.from(new Set(notActiveSub.map((c) => c.organizationId).filter(Boolean)));
    const relevantClerkIds = Array.from(new Set(notActiveSub.map((c) => c.clerkUserId).filter(Boolean)));

    const dedupeRes = await supabase
      .from('billing_events')
      .select('organization_id, actor_clerk_user_id, occurred_at')
      .eq('event_type', 'abandoned_signup_followup_sent')
      .gte('occurred_at', dedupeCutoff)
      .in('organization_id', relevantOrgIds)
      .in('actor_clerk_user_id', relevantClerkIds);

    const alreadySent = new Set<string>();
    if (!dedupeRes.error && dedupeRes.data) {
      for (const row of dedupeRes.data as any[]) {
        const key = `${safeString(row.organization_id)}::${safeString(row.actor_clerk_user_id)}`;
        if (key !== '::') alreadySent.add(key);
      }
    }

    const baseUrl = getBaseUrl(req);
    const checkoutUrl = `${baseUrl}/subscribe/checkout`;

    let sent = 0;
    let skipped = 0;
    const reasons: Record<string, number> = {
      missing_email: 0,
      already_sent_recently: 0,
    };

    const results: any[] = [];

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
        const scopedWrite = createServiceRoleClientScoped({
          reason: 'cron_abandoned_signups_followup_write',
          scopeColumn: 'organization_id',
          scopeId: row.organizationId,
        });
        await scopedWrite.from('billing_events').insert({
          organization_id: row.organizationId,
          event_type: 'abandoned_signup_followup_sent',
          occurred_at: new Date().toISOString(),
          actor_clerk_user_id: row.clerkUserId || null,
          payload: {
            email: row.email,
            created_at: row.createdAt,
          },
        } as any);
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
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

export const POST = shabbatGuard(POSTHandler);
