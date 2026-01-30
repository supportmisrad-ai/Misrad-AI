import { MeView } from '@/views/MeView';

export const dynamic = 'force-dynamic';

export default async function SocialMePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

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
    />
  );
}
