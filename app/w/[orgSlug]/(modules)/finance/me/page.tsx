import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { MeView } from '@/views/MeView';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function FinanceMePage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  await requireWorkspaceAccessByOrgSlug(orgSlug);

  return (
    <MeView
      basePathOverride={`/w/${encodeURIComponent(orgSlug)}/finance`}
      moduleCards={[
        {
          title: 'סקירה',
          subtitle: 'מבט כללי על המצב הכספי',
          href: `/w/${encodeURIComponent(orgSlug)}/finance/overview`,
          iconId: 'trending_up',
        },
        {
          title: 'חשבוניות',
          subtitle: 'רשימת חשבוניות הארגון',
          href: `/w/${encodeURIComponent(orgSlug)}/finance/invoices`,
          iconId: 'target',
        },
        {
          title: 'הוצאות',
          subtitle: 'עלויות עבודה והוצאות ישירות',
          href: `/w/${encodeURIComponent(orgSlug)}/finance/expenses`,
          iconId: 'settings',
        },
      ]}
    />
  );
}
