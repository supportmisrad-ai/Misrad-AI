import { getMePageData } from '@/lib/server/me-page-data';
import { MeView } from '@/views/MeView';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SocialMePage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  const { leaveRequests, events } = await getMePageData(orgSlug);

  return (
    <MeView
      basePathOverride={`/w/${encodeURIComponent(orgSlug)}/social`}
      moduleCards={[
        {
          title: 'הגדרות סושיאל',
          subtitle: 'חיבורים, צוות, והתראות',
          href: `/w/${encodeURIComponent(orgSlug)}/social/settings`,
          iconId: 'settings',
        },
        {
          title: 'דשבורד',
          subtitle: 'חזרה לעבודה',
          href: `/w/${encodeURIComponent(orgSlug)}/social/dashboard`,
          iconId: 'trending_up',
        },
      ]}
      initialLeaveRequests={leaveRequests}
      initialEvents={events}
    />
  );
}
