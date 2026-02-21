import { redirect } from 'next/navigation';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function ClientCatchAllPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; path: string[] }> | { orgSlug: string; path: string[] };
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug, path } = await params;
  const sp = searchParams ? await Promise.resolve(searchParams) : {};

  const tab = typeof sp.tab === 'string' ? sp.tab : null;
  const meetingId = typeof sp.meetingId === 'string' ? sp.meetingId : null;

  const qs = new URLSearchParams();
  if (tab) qs.set('tab', tab);
  if (meetingId) qs.set('meetingId', meetingId);

  const head = Array.isArray(path) && path.length ? String(path[0]) : '';

  if (head === 'hub' || head === 'settings') {
    redirect(`/w/${encodeURIComponent(orgSlug)}/client/hub`);
  }

  if (head === 'client-portal') {
    redirect(`/w/${encodeURIComponent(orgSlug)}/client/client-portal${qs.size ? `?${qs.toString()}` : ''}`);
  }

  if (head === 'clients') {
    redirect(`/w/${encodeURIComponent(orgSlug)}/client/clients${qs.size ? `?${qs.toString()}` : ''}`);
  }

  if (head === 'dashboard') {
    redirect(`/w/${encodeURIComponent(orgSlug)}/client/dashboard`);
  }

  redirect(`/w/${encodeURIComponent(orgSlug)}/client/dashboard`);
}
