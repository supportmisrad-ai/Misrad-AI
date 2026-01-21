import PremiumFrame from '@/components/profile/PremiumFrame';
import { DataProvider } from '@/context/DataContext';
import { requireWorkspaceAccessByOrgSlugUi } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUiWithWorkspaceId } from '@/lib/server/workspaceUser';
import { MeView } from '@/views/MeView';
import Link from 'next/link';
import { getOperationsInventoryData, getOperationsWorkOrdersData } from '@/app/actions/operations';

export const dynamic = 'force-dynamic';

export default async function OperationsMePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const workspace = await requireWorkspaceAccessByOrgSlugUi(orgSlug);
  const user = await resolveWorkspaceCurrentUserForUiWithWorkspaceId(workspace.id);

  const base = `/w/${encodeURIComponent(orgSlug)}/operations`;

  const [openRes, inProgressRes, newRes, inventoryRes] = await Promise.all([
    getOperationsWorkOrdersData({ orgSlug, status: 'OPEN', assignedTechnicianId: user.id }),
    getOperationsWorkOrdersData({ orgSlug, status: 'IN_PROGRESS', assignedTechnicianId: user.id }),
    getOperationsWorkOrdersData({ orgSlug, status: 'NEW', assignedTechnicianId: user.id }),
    getOperationsInventoryData({ orgSlug }),
  ]);

  const openCount = openRes.success ? openRes.data?.workOrders?.length ?? 0 : 0;
  const inProgressCount = inProgressRes.success ? inProgressRes.data?.workOrders?.length ?? 0 : 0;
  const newCount = newRes.success ? newRes.data?.workOrders?.length ?? 0 : 0;
  const inventoryItems = inventoryRes.success ? inventoryRes.data?.items ?? [] : [];

  let inventoryCritical = 0;
  let inventoryLow = 0;
  for (const i of inventoryItems) {
    const onHand = Number(i.onHand);
    const minLevel = Number(i.minLevel);
    if (onHand <= 0) {
      inventoryCritical += 1;
      continue;
    }
    if (minLevel > 0 && onHand < minLevel) {
      inventoryLow += 1;
    }
  }

  return (
    <PremiumFrame moduleLabel="Operations" title="אזור אישי" subtitle="תפעול ושטח">
      <DataProvider initialCurrentUser={user} initialOrganization={workspace}>
        <MeView
          basePathOverride={`/w/${encodeURIComponent(orgSlug)}/operations`}
          moduleCards={[
            {
              title: 'המשימות שלי',
              subtitle: 'מה נשאר לי לסגור היום',
              href: `/w/${encodeURIComponent(orgSlug)}/nexus/tasks`,
              iconId: 'target',
            },
            {
              title: 'הציוד שלי',
              subtitle: 'בדיקת מלאי וציוד בשטח',
              href: `/w/${encodeURIComponent(orgSlug)}/operations/inventory`,
              iconId: 'trending_up',
            },
          ]}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              href={`${base}/work-orders?status=OPEN`}
              className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="text-xs font-black text-slate-600">קריאות פתוחות</div>
              <div className="mt-2 text-2xl font-black text-slate-900">{openCount}</div>
            </Link>

            <Link
              href={`${base}/work-orders?status=IN_PROGRESS`}
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4 hover:bg-amber-100/50 transition-colors"
            >
              <div className="text-xs font-black text-amber-800">בטיפול</div>
              <div className="mt-2 text-2xl font-black text-amber-900">{inProgressCount}</div>
            </Link>

            <Link
              href={`${base}/work-orders?status=NEW`}
              className="rounded-2xl border border-sky-200 bg-sky-50 p-4 hover:bg-sky-100/50 transition-colors"
            >
              <div className="text-xs font-black text-sky-800">חדשות</div>
              <div className="mt-2 text-2xl font-black text-sky-900">{newCount}</div>
            </Link>

            <Link
              href={`${base}/inventory`}
              className="rounded-2xl border border-rose-200 bg-rose-50 p-4 hover:bg-rose-100/50 transition-colors"
            >
              <div className="text-xs font-black text-rose-800">מלאי (נמוך/קריטי)</div>
              <div className="mt-2 text-2xl font-black text-rose-900">
                {inventoryLow}/{inventoryCritical}
              </div>
            </Link>
          </div>
        </MeView>
      </DataProvider>
    </PremiumFrame>
  );
}
