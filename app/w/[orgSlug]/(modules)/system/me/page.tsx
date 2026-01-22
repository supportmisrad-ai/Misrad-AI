import { getSystemBootstrap } from '@/lib/services/system-service';
import { DataProvider } from '@/context/DataContext';
import { MeView } from '@/views/MeView';

export const dynamic = 'force-dynamic';

export default async function SystemMePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { initialCurrentUser, initialOrganization } = await getSystemBootstrap(orgSlug);

  const basePathOverride = `/w/${encodeURIComponent(orgSlug)}/system`;

  return (
    <DataProvider initialCurrentUser={initialCurrentUser} initialOrganization={initialOrganization}>
      <MeView
        basePathOverride={basePathOverride}
        moduleCards={[
          {
            title: 'לידים',
            subtitle: 'צינור מכירות וניהול פניות',
            href: `${basePathOverride}/sales_leads`,
            iconId: 'target',
          },
          {
            title: 'לוח בקרה',
            subtitle: 'חזרה לדף הבית',
            href: `${basePathOverride}/workspace`,
            iconId: 'trending_up',
          },
        ]}
      />
    </DataProvider>
  );
}
