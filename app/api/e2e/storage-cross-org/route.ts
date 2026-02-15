import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { blockE2eInProduction } from '@/lib/api-e2e-guard';
import { randomBytes } from 'crypto';
import { createClient, createServiceRoleClient } from '@/lib/supabase';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

export const dynamic = 'force-dynamic';

const IS_PROD = process.env.NODE_ENV === 'production';

function safeString(value: unknown): string {
  return String(value ?? '').trim();
}

function formatError(err: unknown) {
  if (!err) return null;
  const obj = asObject(err) ?? {};
  return {
    message: IS_PROD ? null : getErrorMessage(err) ?? null,
    name: err instanceof Error ? err.name : typeof obj.name === 'string' ? obj.name : null,
    status: typeof obj.status === 'number' ? obj.status : null,
    code: typeof obj.code === 'string' ? obj.code : null,
  };
}

export async function POST(req: Request) {
  const blocked = blockE2eInProduction();
  if (blocked) return blocked;

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

    const bodyJson: unknown = await req.json().catch(() => null);
    const bodyObj = asObject(bodyJson);
    const bucket = safeString(bodyObj?.bucket) || 'attachments';
    const otherOrgId = safeString(bodyObj?.otherOrgId);

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
    let seedError: unknown = null;

    try {
      const seed = await admin.storage.from(bucket).upload(targetName, randomBytes(32), {
        contentType: 'text/plain',
        upsert: true,
      });
      seedOk = !seed.error;
      seedError = seed.error;
    } catch (e: unknown) {
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
  } catch (e: unknown) {
    const safeMsg = 'Storage cross-org check failed';
    return NextResponse.json(
      { ok: false, error: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg },
      { status: 500 }
    );
  }
}
