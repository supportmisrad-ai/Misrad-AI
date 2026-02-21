// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

import {
  addOperationsStockToActiveVehicle,
  createOperationsItem,
  getOperationsDashboardData,
  getOperationsInventoryOptions,
  getOperationsTechnicianActiveVehicle,
} from '@/app/actions/operations';
import { requireWorkspaceAccessByOrgSlugUi } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUiWithWorkspaceId } from '@/lib/server/workspaceUser';
import { redirect } from 'next/navigation';
import { OperationsDashboard } from '@/views/OperationsDashboard';

export default async function OperationsModuleHome({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug } = await params;

  const sp = searchParams ? await Promise.resolve(searchParams) : {};
  const flashRaw = sp.flash;
  const flash = flashRaw ? String(Array.isArray(flashRaw) ? flashRaw[0] : flashRaw) : null;

  const workspace = await requireWorkspaceAccessByOrgSlugUi(orgSlug);
  const currentUser = await resolveWorkspaceCurrentUserForUiWithWorkspaceId(workspace.id);
  const technicianId = String(currentUser.profileId || currentUser.id || '').trim();

  async function quickAddStockAction(formData: FormData) {
    'use server';
    const itemId = String(formData.get('itemId') || '').trim();
    const qty = Number(formData.get('qty'));

    const base = `/w/${encodeURIComponent(orgSlug)}/operations`;
    const res = await addOperationsStockToActiveVehicle({
      orgSlug,
      technicianId,
      itemId,
      qty,
    });

    if (!res.success) {
      redirect(`${base}?flash=${encodeURIComponent(res.error || 'שגיאה בקליטת מלאי לרכב')}`);
    }

    redirect(`${base}?flash=${encodeURIComponent('נקלט מלאי לרכב הפעיל')}`);
  }

  async function quickCreateItemAction(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '').trim();
    const sku = String(formData.get('sku') || '').trim();
    const unit = String(formData.get('unit') || '').trim();

    const base = `/w/${encodeURIComponent(orgSlug)}/operations`;
    const res = await createOperationsItem({
      orgSlug,
      name,
      sku: sku ? sku : null,
      unit: unit ? unit : null,
    });

    if (!res.success) {
      redirect(`${base}?flash=${encodeURIComponent(res.error || 'שגיאה ביצירת פריט')}`);
    }

    redirect(`${base}?flash=${encodeURIComponent('נוצר פריט חדש')}`);
  }

  const [dashboardRes, inventoryOptionsRes, activeVehicleRes] = await Promise.all([
    getOperationsDashboardData({ orgSlug }),
    getOperationsInventoryOptions({ orgSlug }),
    technicianId ? getOperationsTechnicianActiveVehicle({ orgSlug, technicianId }) : Promise.resolve({ success: true, data: { vehicleId: null, vehicleName: null } }),
  ]);

  return (
    <OperationsDashboard
      orgSlug={orgSlug}
      initialData={dashboardRes.success ? dashboardRes.data : undefined}
      initialInventoryOptions={inventoryOptionsRes.success ? inventoryOptionsRes.data ?? [] : []}
      activeVehicleName={activeVehicleRes.success ? activeVehicleRes.data?.vehicleName ?? null : null}
      onQuickAddStockAction={quickAddStockAction}
      onQuickCreateItemAction={quickCreateItemAction}
      flash={flash}
    />
  );
}
