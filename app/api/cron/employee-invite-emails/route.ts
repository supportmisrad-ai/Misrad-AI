import { NextRequest, NextResponse } from 'next/server';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { sendEmployeeInvitationEmail } from '@/lib/email';
import { getUpstashRedisClient } from '@/lib/server/upstashRedis';
import { EmployeeInviteEmailJob, getEmployeeInviteEmailQueueKey } from '@/lib/server/employeeInviteEmailQueue';

export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest): boolean {
  const headerSecret = req.headers.get('x-cron-secret');
  if (headerSecret && headerSecret === process.env.CRON_SECRET) return true;

  const authHeader = req.headers.get('authorization');
  if (authHeader && process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;

  return false;
}

function safeNumber(v: string | null, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

async function processQueue(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const redis = getUpstashRedisClient();
  if (!redis) {
    return NextResponse.json({ ok: false, error: 'Redis not configured' }, { status: 500 });
  }

  const url = req.nextUrl;
  const limit = Math.max(1, Math.min(200, Math.floor(safeNumber(url.searchParams.get('limit'), 25))));

  const queueKey = getEmployeeInviteEmailQueueKey();

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  const errors: Array<{ invitationId?: string; error: string }> = [];

  for (let i = 0; i < limit; i++) {
    const raw = await redis.rpop<string>(queueKey);
    if (!raw) break;

    processed += 1;

    let job: EmployeeInviteEmailJob | null = null;
    try {
      job = JSON.parse(String(raw || '')) as EmployeeInviteEmailJob;
    } catch (e: any) {
      failed += 1;
      errors.push({ error: e?.message || 'Invalid job JSON' });
      continue;
    }

    const invitationId = String(job.invitationId || '').trim();
    const toEmail = String(job.toEmail || '').trim();

    if (!invitationId || !toEmail) {
      failed += 1;
      errors.push({ invitationId, error: 'Missing invitationId/toEmail' });
      continue;
    }

    const lockKey = `done:employee_invite_email:${invitationId}`;
    const lockRes = await redis.set(lockKey, '1', { nx: true, ex: 60 * 60 * 24 * 30 });
    if (!lockRes) {
      skipped += 1;
      continue;
    }

    const attempts = typeof job.attempts === 'number' ? job.attempts : 0;

    const sendRes = await sendEmployeeInvitationEmail(
      toEmail,
      job.employeeName || null,
      String(job.department || ''),
      String(job.role || ''),
      String(job.invitationUrl || ''),
      job.createdByName || null
    );

    if (sendRes.success) {
      sent += 1;
      continue;
    }

    failed += 1;
    errors.push({ invitationId, error: sendRes.error || 'send_failed' });

    if (attempts < 4) {
      await redis.del(lockKey);
      const retryJob: EmployeeInviteEmailJob = { ...job, attempts: attempts + 1 };
      await redis.lpush(queueKey, JSON.stringify(retryJob));
    }
  }

  return NextResponse.json({
    ok: true,
    processed,
    sent,
    skipped,
    failed,
    errors,
  });
}

export const GET = shabbatGuard(processQueue);
export const POST = shabbatGuard(processQueue);
