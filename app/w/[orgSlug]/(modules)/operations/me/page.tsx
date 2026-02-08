import PremiumFrame from '@/components/profile/PremiumFrame';
import { DataProvider } from '@/context/DataContext';
import { requireWorkspaceAccessByOrgSlugUi } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUiWithWorkspaceId } from '@/lib/server/workspaceUser';
import { MeView } from '@/views/MeView';
import Link from 'next/link';
import {
  getOperationsInventoryData,
  getOperationsVehicleStockBalances,
  getOperationsWorkOrdersData,
  getOperationsVehicles,
  getOperationsTechnicianActiveVehicle,
  setOperationsTechnicianActiveVehicle,
} from '@/app/actions/operations';
import { redirect } from 'next/navigation';
import type { OperationsHolderStockRow } from '@/lib/services/operations/types';

export const dynamic = 'force-dynamic';

export default async function OperationsMePage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug } = await params;
  const workspace = await requireWorkspaceAccessByOrgSlugUi(orgSlug);
  const user = await resolveWorkspaceCurrentUserForUiWithWorkspaceId(workspace.id);

  const initialCurrentUser = {
    ...user,
    phone: user.phone ?? undefined,
  };

  const initialOrganization = {
    ...workspace,
    logo: workspace.logo ?? undefined,
  };

  const technicianId = String(user.profileId || '').trim();

  const base = `/w/${encodeURIComponent(orgSlug)}/operations`;

  const sp = searchParams ? await Promise.resolve(searchParams) : {};
  const errorRaw = sp.error;
  const error = errorRaw ? String(Array.isArray(errorRaw) ? errorRaw[0] : errorRaw) : null;

  const [openRes, inProgressRes, newRes, inventoryRes, vehiclesRes, activeVehicleRes] = await Promise.all([
    getOperationsWorkOrdersData({ orgSlug, status: 'OPEN', assignedTechnicianId: technicianId || user.id }),
    getOperationsWorkOrdersData({ orgSlug, status: 'IN_PROGRESS', assignedTechnicianId: technicianId || user.id }),
    getOperationsWorkOrdersData({ orgSlug, status: 'NEW', assignedTechnicianId: technicianId || user.id }),
    getOperationsInventoryData({ orgSlug }),
    getOperationsVehicles({ orgSlug }),
    getOperationsTechnicianActiveVehicle({ orgSlug, technicianId: technicianId || user.id }),
  ]);

  const openCount = openRes.success ? openRes.data?.workOrders?.length ?? 0 : 0;
  const inProgressCount = inProgressRes.success ? inProgressRes.data?.workOrders?.length ?? 0 : 0;
  const newCount = newRes.success ? newRes.data?.workOrders?.length ?? 0 : 0;
  const inventoryItems = inventoryRes.success ? inventoryRes.data?.items ?? [] : [];
  const vehicles = vehiclesRes.success ? vehiclesRes.data ?? [] : [];
  const activeVehicleId = activeVehicleRes.success ? activeVehicleRes.data?.vehicleId ?? null : null;

  type VehicleStockRes = Awaited<ReturnType<typeof getOperationsVehicleStockBalances>>;
  const emptyVehicleStockRes: VehicleStockRes = { success: true, data: [] };

  const vehicleStockRes: VehicleStockRes = activeVehicleId
    ? await getOperationsVehicleStockBalances({ orgSlug, vehicleId: String(activeVehicleId) })
    : emptyVehicleStockRes;
  const vehicleStock: OperationsHolderStockRow[] = vehicleStockRes.success ? (vehicleStockRes.data ?? []) : [];

  const vehicleStockError = !vehicleStockRes.success ? vehicleStockRes.error : undefined;

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

  async function setActiveVehicleAction(formData: FormData) {
    'use server';
    const vehicleIdRaw = formData.get('vehicleId');
    const vehicleId = vehicleIdRaw === null || vehicleIdRaw === undefined || vehicleIdRaw === '' ? null : String(vehicleIdRaw);

    const res = await setOperationsTechnicianActiveVehicle({
      orgSlug,
      technicianId: technicianId || user.id,
      vehicleId,
    });

    if (!res.success) {
      redirect(`${base}/me?error=${encodeURIComponent(res.error || 'שגיאה בשמירת רכב פעיל')}`);
    }
    redirect(`${base}/me`);
  }

  return (
    <PremiumFrame moduleLabel="Operations" title="אזור אישי" subtitle="תפעול, מלאי ושטח">
      <DataProvider initialCurrentUser={initialCurrentUser} initialOrganization={initialOrganization}>
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
          {error ? (
            <div className="mb-3 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-bold text-rose-800">{error}</div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-3">
            <div className="text-xs font-black text-slate-700">הרכב הפעיל שלי</div>
            <form action={setActiveVehicleAction} className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <select
                  name="vehicleId"
                  defaultValue={activeVehicleId ? String(activeVehicleId) : ''}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
                >
                  <option value="">לא משויך</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                {!vehiclesRes.success ? (
                  <div className="mt-2 text-xs font-bold text-rose-700">{vehiclesRes.error}</div>
                ) : null}
                {!activeVehicleRes.success ? (
                  <div className="mt-2 text-xs font-bold text-rose-700">{activeVehicleRes.error}</div>
                ) : null}
              </div>
              <div>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                >
                  שמור
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-3">
            <div className="text-xs font-black text-slate-700">מלאי ברכב הפעיל</div>
            <div className="text-xs text-slate-500 mt-1">מבוסס על מלאי לפי מקור (stock balances)</div>

            {!activeVehicleId ? (
              <div className="mt-3 text-sm text-slate-600">אין רכב פעיל. בחר רכב ושמור.</div>
            ) : !vehicleStockRes.success ? (
              <div className="mt-3 text-sm text-rose-800">{vehicleStockError || 'שגיאה בטעינת מלאי רכב'}</div>
            ) : vehicleStock.length ? (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                {vehicleStock.map((row) => (
                  <div
                    key={String(row.itemId)}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900 truncate">{String(row.label)}</div>
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      {String(row.onHand)}{row.unit ? ` ${String(row.unit)}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-600">אין עדיין מלאי ברכב הזה.</div>
            )}
          </div>

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
