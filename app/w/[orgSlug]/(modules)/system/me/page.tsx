import { getSystemBootstrapCached } from '@/lib/services/system-service';
import { DataProvider } from '@/context/DataContext';
import { MeView } from '@/views/MeView';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SystemMePage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  const { initialCurrentUser, initialOrganization } = await getSystemBootstrapCached(orgSlug);

  const normalizedCurrentUser = initialCurrentUser
    ? {
        ...initialCurrentUser,
        phone: initialCurrentUser.phone ?? undefined,
      }
    : undefined;

  const normalizedOrganization = initialOrganization
    ? {
        ...initialOrganization,
        logo: initialOrganization.logo ?? undefined,
      }
    : undefined;

  const basePathOverride = `/w/${encodeURIComponent(orgSlug)}/system`;

  return (
    <DataProvider initialCurrentUser={normalizedCurrentUser} initialOrganization={normalizedOrganization}>
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
