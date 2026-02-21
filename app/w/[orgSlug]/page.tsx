import { redirect } from 'next/navigation';
import { getFirstAllowedModule, loadCurrentUserLastLocation, persistCurrentUserLastLocation, requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import type { WorkspaceEntitlements } from '@/lib/server/workspace';
import { asObject } from '@/lib/shared/unknown';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls


function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function coerceWorkspaceEntitlements(value: unknown): WorkspaceEntitlements {
  const obj = asObject(value) ?? {};
  return {
    nexus: Boolean(obj.nexus),
    system: Boolean(obj.system),
    operations: Boolean(obj.operations),
    social: Boolean(obj.social),
    finance: Boolean(obj.finance),
    client: Boolean(obj.client),
  };
}


export default async function WorkspaceEntryPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const resolvedParams = await params;
  const orgSlugRaw = String(resolvedParams?.orgSlug ?? '').trim();
  if (!orgSlugRaw) {
    redirect('/');
  }

  const orgSlug = safeDecodeURIComponent(orgSlugRaw);
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
  const entitlements = coerceWorkspaceEntitlements(workspace?.entitlements);
  const allowed = Object.entries(entitlements)
    .filter(([, v]) => v)
    .map(([k]) => k);

  // Run persist and load in parallel (both are independent)
  const [, lastResult] = await Promise.all([
    persistCurrentUserLastLocation({ orgSlug }).catch((e: unknown) => {
      console.error('[WorkspaceEntryPage] persistCurrentUserLastLocation failed (ignored):', e);
    }),
    loadCurrentUserLastLocation().catch((e: unknown) => {
      console.error('[WorkspaceEntryPage] loadCurrentUserLastLocation failed (ignored):', e);
      return null;
    }),
  ]);
  const last = lastResult ?? null;
  if (last?.orgSlug && String(last.orgSlug) === String(orgSlug) && last.module) {
    if (entitlements[last.module]) {
      redirect(`/w/${encodeURIComponent(orgSlug)}/${last.module}`);
    }
  }

  if (allowed.length === 1) {
    const first = getFirstAllowedModule(entitlements);
    if (first) {
      redirect(`/w/${encodeURIComponent(orgSlug)}/${first}`);
    }
  }

  redirect(`/w/${encodeURIComponent(orgSlug)}/lobby`);
}
