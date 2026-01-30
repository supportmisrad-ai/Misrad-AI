import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { randomBytes } from 'crypto';
import { createClient, createServiceRoleClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function safeString(value: unknown): string {
  return String(value ?? '').trim();
}

function formatError(err: any) {
  if (!err) return null;
  return {
    message: err?.message ?? null,
    name: err?.name ?? null,
    status: err?.status ?? null,
    code: err?.code ?? null,
  };
}

export async function POST(req: Request) {
  try {
    const expectedKey = process.env.E2E_API_KEY;
    const providedKey = req.headers.get('x-e2e-key');

    if (!expectedKey || !providedKey || providedKey !== expectedKey) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'NoAuthSession' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const bucket = safeString(body?.bucket) || 'attachments';
    const otherOrgId = safeString(body?.otherOrgId);

    if (!otherOrgId) {
      return NextResponse.json({ ok: false, error: 'otherOrgId is required' }, { status: 400 });
    }

    const supabase = createClient();

    const rpcRes = await supabase.rpc('current_organization_id');
    const currentOrgId = rpcRes.error ? null : (rpcRes.data ? String(rpcRes.data) : null);

    const admin = createServiceRoleClient({ allowUnscoped: true, reason: 'e2e_storage_cross_org_seed' });

    const seedName = `e2e/${Date.now()}-${randomBytes(8).toString('hex')}.txt`;
    const targetName = `${otherOrgId}/${seedName}`;

    let seedOk = false;
    let seedError: any = null;

    try {
      const seed = await admin.storage.from(bucket).upload(targetName, randomBytes(32), {
        contentType: 'text/plain',
        upsert: true,
      });
      seedOk = !seed.error;
      seedError = seed.error;
    } catch (e: any) {
      seedOk = false;
      seedError = e;
    }

    const signedUrlAttempt = await supabase.storage.from(bucket).createSignedUrl(targetName, 60);

    const uploadAttempt = await supabase.storage.from(bucket).upload(
      `${otherOrgId}/e2e-upload/${Date.now()}-${randomBytes(6).toString('hex')}.bin`,
      randomBytes(16),
      { contentType: 'application/octet-stream', upsert: true }
    );

    try {
      await admin.storage.from(bucket).remove([targetName]);
    } catch {
      // ignore
    }

    const signedUrlAllowed = !signedUrlAttempt.error;
    const uploadAllowed = !uploadAttempt.error;

    return NextResponse.json({
      ok: true,
      userId,
      currentOrgId,
      bucket,
      otherOrgId,
      seeded: {
        name: targetName,
        ok: seedOk,
        error: formatError(seedError),
      },
      checks: {
        signedUrl: {
          allowed: signedUrlAllowed,
          error: formatError(signedUrlAttempt.error),
        },
        upload: {
          allowed: uploadAllowed,
          error: formatError(uploadAttempt.error),
        },
      },
      expectation: {
        signedUrlShouldBeBlocked: true,
        uploadShouldBeBlocked: true,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Storage cross-org check failed' }, { status: 500 });
  }
}
