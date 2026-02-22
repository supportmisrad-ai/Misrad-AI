import { DataProvider } from '@/context/DataContext';
import { requireWorkspaceAccessByOrgSlugUi } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';
import { resolveStorageUrlMaybeServiceRole } from '@/lib/services/operations/storage';
import { MeView } from '@/views/MeView';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function ClientMePage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  const workspace = await requireWorkspaceAccessByOrgSlugUi(orgSlug);

  const [user, signedLogo] = await Promise.all([
    resolveWorkspaceCurrentUserForUi(orgSlug),
    workspace.logo
      ? resolveStorageUrlMaybeServiceRole(workspace.logo, 60 * 60, { organizationId: workspace.id })
      : Promise.resolve(''),
  ]);

  const initialCurrentUser = {
    ...user,
    phone: user.phone ?? undefined,
  };

  const initialOrganization = {
    ...workspace,
    logo: signedLogo ?? undefined,
  };

  return (
    <DataProvider initialCurrentUser={initialCurrentUser} initialOrganization={initialOrganization}>
      <MeView
        basePathOverride={`/w/${encodeURIComponent(orgSlug)}/client`}
        moduleCards={[
          {
            title: 'הגדרות לקוחות',
            subtitle: 'פורטל, אוטומציות וחיבורים',
            href: `/w/${encodeURIComponent(orgSlug)}/client/hub`,
            iconId: 'settings',
          },
          {
            title: 'לקוחות',
            subtitle: 'רשימה, סטטוסים ופעולות',
            href: `/w/${encodeURIComponent(orgSlug)}/client`,
            iconId: 'user',
          },
        ]}
      />
    </DataProvider>
  );
}
