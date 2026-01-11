import { NextResponse } from 'next/server';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;

  const workspace = await requireWorkspaceAccessByOrgSlugApi(orgSlug);
  return NextResponse.json({ entitlements: workspace.entitlements });
}
