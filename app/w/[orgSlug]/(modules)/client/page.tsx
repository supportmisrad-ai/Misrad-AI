import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ClientModuleHome({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const { orgSlug } = resolvedParams;
  const sp = searchParams ? await Promise.resolve(searchParams) : {};

  const tab = typeof sp.tab === 'string' ? sp.tab : null;
  const meetingId = typeof sp.meetingId === 'string' ? sp.meetingId : null;

  const qs = new URLSearchParams();
  if (tab) qs.set('tab', tab);
  if (meetingId) qs.set('meetingId', meetingId);

  if (tab || meetingId) {
    redirect(`/w/${encodeURIComponent(orgSlug)}/client/clients${qs.size ? `?${qs.toString()}` : ''}`);
  }

  redirect(`/w/${encodeURIComponent(orgSlug)}/client/dashboard`);
}
