import {
  getOperationsPurchaseOrders,
  getOperationsSuppliers,
  getOperationsInventoryOptions,
  createOperationsPurchaseOrder,
  updateOperationsPurchaseOrderStatus,
  deleteOperationsPurchaseOrder,
  autoGeneratePurchaseOrderFromLowInventory,
} from '@/app/actions/operations';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { redirect } from 'next/navigation';
import { PurchaseOrdersView } from '@/views/PurchaseOrdersView';
import type { OperationsPurchaseOrderStatus } from '@/app/actions/operations';

export default async function PurchaseOrdersPage({
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

  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  const [ordersRes, suppliersRes, inventoryOptionsRes] = await Promise.all([
    getOperationsPurchaseOrders({ orgSlug }),
    getOperationsSuppliers({ orgSlug }),
    getOperationsInventoryOptions({ orgSlug }),
  ]);

  const base = `/w/${encodeURIComponent(orgSlug)}/operations/purchase-orders`;

  async function createAction(formData: FormData) {
    'use server';
    const supplierId = String(formData.get('supplierId') || '').trim() || null;
    const notes = String(formData.get('notes') || '').trim() || null;
    const expectedDelivery = String(formData.get('expectedDelivery') || '').trim() || null;
    const lineItemCount = Number(formData.get('lineItemCount') || 0);

    const lineItems: Array<{
      itemId?: string | null;
      description: string;
      quantity: number;
      unitPrice: number;
    }> = [];

    for (let i = 0; i < lineItemCount; i++) {
      const description = String(formData.get(`li_description_${i}`) || '').trim();
      if (!description) continue;
      lineItems.push({
        itemId: String(formData.get(`li_itemId_${i}`) || '').trim() || null,
        description,
        quantity: Number(formData.get(`li_quantity_${i}`)) || 1,
        unitPrice: Number(formData.get(`li_unitPrice_${i}`)) || 0,
      });
    }

    if (!lineItems.length) {
      redirect(`${base}?flash=${encodeURIComponent('חובה להוסיף לפחות שורה אחת')}`);
    }

    const res = await createOperationsPurchaseOrder({
      orgSlug,
      supplierId,
      notes,
      expectedDelivery,
      lineItems,
    });

    if (!res.success) {
      redirect(`${base}?flash=${encodeURIComponent(res.error || 'שגיאה ביצירת הזמנה')}`);
    }

    redirect(`${base}?flash=${encodeURIComponent('הזמנת רכש נוצרה בהצלחה')}`);
  }

  async function updateStatusAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '').trim();
    const status = String(formData.get('status') || '').trim() as OperationsPurchaseOrderStatus;

    const res = await updateOperationsPurchaseOrderStatus({ orgSlug, id, status });

    if (!res.success) {
      redirect(`${base}?flash=${encodeURIComponent(res.error || 'שגיאה בעדכון סטטוס')}`);
    }

    redirect(`${base}?flash=${encodeURIComponent('סטטוס הזמנה עודכן')}`);
  }

  async function deleteAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '').trim();

    const res = await deleteOperationsPurchaseOrder({ orgSlug, id });

    if (!res.success) {
      redirect(`${base}?flash=${encodeURIComponent(res.error || 'שגיאה במחיקת הזמנה')}`);
    }

    redirect(`${base}?flash=${encodeURIComponent('הזמנת רכש נמחקה')}`);
  }

  async function autoGenerateAction(_formData: FormData) {
    'use server';
    const res = await autoGeneratePurchaseOrderFromLowInventory({ orgSlug });

    if (!res.success) {
      redirect(`${base}?flash=${encodeURIComponent(res.error || 'שגיאה ביצירת הזמנה אוטומטית')}`);
    }

    if (res.skipped) {
      redirect(`${base}?flash=${encodeURIComponent(res.error || 'אין פריטים עם מלאי נמוך')}`);
    }

    redirect(`${base}?flash=${encodeURIComponent('הזמנות רכש אוטומטיות נוצרו בהצלחה')}`);
  }

  return (
    <PurchaseOrdersView
      orgSlug={orgSlug}
      orders={ordersRes.data?.orders || []}
      suppliers={suppliersRes.data || []}
      inventoryOptions={inventoryOptionsRes.data || []}
      onCreateAction={createAction}
      onUpdateStatusAction={updateStatusAction}
      onDeleteAction={deleteAction}
      onAutoGenerateAction={autoGenerateAction}
      flash={flash}
    />
  );
}
