import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

export const runtime = 'nodejs';

function sanitizeFileName(name: string): string {
  return String((name as any) ?? '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
}

export async function POST(req: Request) {
  try {
    await getAuthenticatedUser();

    const body = (await req.json().catch(() => ({}))) as {
      orgId?: string;
      clientId?: string;
      fileName?: string;
      mimeType?: string;
    };

    const orgId = String(body.orgId || '');
    const clientId = String(body.clientId || '');
    const fileName = String(body.fileName || 'recording');
    const mimeType = String(body.mimeType || '');

    if (!orgId) return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    if (!clientId) return NextResponse.json({ error: 'clientId is required' }, { status: 400 });

    try {
      await requireWorkspaceAccessByOrgSlugApi(orgId);
    } catch (e: any) {
      const status = typeof e?.status === 'number' ? e.status : 403;
      return NextResponse.json({ error: e?.message || 'Forbidden' }, { status });
    }

    const bucket = 'meeting-recordings';
    const safeName = sanitizeFileName(fileName);
    const path = `${orgId}/${clientId}/${Date.now()}-${safeName}`;

    const supabase = createClient();

    // Best effort: ensure bucket exists
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (listError) throw listError;

      const exists = (buckets || []).some((b) => b.name === bucket);
      if (!exists) {
        const { error: createError } = await supabase.storage.createBucket(bucket, {
          public: false,
          fileSizeLimit: 1024 * 1024 * 1024, // 1GB
        });
        if (createError) {
          // If concurrent create or permissions issue, continue and let upload fail if needed.
          console.warn('[meeting-recordings] createBucket failed:', createError.message);
        }
      }
    } catch (e: any) {
      console.warn('[meeting-recordings] bucket check failed:', e?.message ?? String(e));
    }

    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data?.signedUrl || !data?.token) {
      return NextResponse.json({ error: error?.message || 'Failed to create signed upload URL' }, { status: 500 });
    }

    return NextResponse.json({
      bucket,
      path,
      mimeType,
      signedUrl: data.signedUrl,
      token: data.token,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to prepare upload' }, { status: 500 });
  }
}
