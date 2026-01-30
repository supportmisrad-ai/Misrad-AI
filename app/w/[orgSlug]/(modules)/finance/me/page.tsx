import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { MeView } from '@/views/MeView';

export const dynamic = 'force-dynamic';

export default async function FinanceMePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
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
          subtitle: 'רשימת חשבוניות מהירה',
          href: `/w/${encodeURIComponent(orgSlug)}/finance/invoices`,
          iconId: 'trending_up',
        },
        {
          title: 'הוצאות',
          subtitle: 'סיכום הוצאות ותמחור',
          href: `/w/${encodeURIComponent(orgSlug)}/finance/expenses`,
          iconId: 'target',
        },
      ]}
    />
  );
}
