import 'server-only';

import { orgExec, orgQuery, prisma } from '@/lib/services/operations/db';
import { asObject, getUnknownErrorMessage, logOperationsError, toIsoDate, toNumberSafe } from '@/lib/services/operations/shared';
import type {
  OperationsPurchaseOrderRow,
  OperationsPurchaseOrderDetail,
  OperationsPurchaseOrderLineItem,
  OperationsPurchaseOrdersData,
  OperationsPurchaseOrderStatus,
} from '@/lib/services/operations/types';

// ─── List ───────────────────────────────────────────────────────────

export async function getOperationsPurchaseOrdersForOrganizationId(params: {
  organizationId: string;
  status?: string;
}): Promise<{ success: boolean; data?: OperationsPurchaseOrdersData; error?: string }> {
  try {
    const statusFilter = params.status && params.status !== 'ALL'
      ? `AND po.status = $2`
      : '';
    const values: unknown[] = [params.organizationId];
    if (params.status && params.status !== 'ALL') values.push(params.status);

    const rows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT
          po.id::text,
          po.po_number,
          po.status,
          po.supplier_id::text,
          s.name AS supplier_name,
          po.notes,
          po.total_amount,
          po.currency,
          po.expected_delivery,
          po.sent_at,
          po.received_at,
          po.created_by,
          po.created_at,
          COALESCE((SELECT COUNT(*) FROM operations_purchase_order_items poi WHERE poi.purchase_order_id = po.id), 0) AS item_count
        FROM operations_purchase_orders po
        LEFT JOIN operations_suppliers s ON s.id = po.supplier_id
        WHERE po.organization_id = $1::uuid
        ${statusFilter}
        ORDER BY po.created_at DESC
      `,
      values,
    );

    const orders: OperationsPurchaseOrderRow[] = (rows || []).map((r) => {
      const obj = asObject(r) ?? {};
      return {
        id: String(obj.id ?? ''),
        poNumber: String(obj.po_number ?? ''),
        status: String(obj.status ?? 'DRAFT') as OperationsPurchaseOrderStatus,
        supplierId: obj.supplier_id ? String(obj.supplier_id) : null,
        supplierName: obj.supplier_name ? String(obj.supplier_name) : null,
        notes: obj.notes ? String(obj.notes) : null,
        totalAmount: obj.total_amount != null ? toNumberSafe(obj.total_amount) : null,
        currency: String(obj.currency ?? 'ILS'),
        expectedDelivery: toIsoDate(obj.expected_delivery),
        sentAt: toIsoDate(obj.sent_at),
        receivedAt: toIsoDate(obj.received_at),
        createdBy: obj.created_by ? String(obj.created_by) : null,
        createdAt: toIsoDate(obj.created_at) ?? new Date().toISOString(),
        itemCount: Number(obj.item_count ?? 0),
      };
    });

    return { success: true, data: { orders, totalCount: orders.length } };
  } catch (e: unknown) {
    logOperationsError('[operations] getOperationsPurchaseOrders failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הזמנות רכש' };
  }
}

// ─── Get by ID ──────────────────────────────────────────────────────

export async function getOperationsPurchaseOrderByIdForOrganizationId(params: {
  organizationId: string;
  id: string;
}): Promise<{ success: boolean; data?: OperationsPurchaseOrderDetail; error?: string }> {
  try {
    const poId = String(params.id || '').trim();
    if (!poId) return { success: false, error: 'חסר מזהה הזמנה' };

    const rows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT
          po.id::text,
          po.po_number,
          po.status,
          po.supplier_id::text,
          s.name AS supplier_name,
          po.notes,
          po.total_amount,
          po.currency,
          po.expected_delivery,
          po.sent_at,
          po.received_at,
          po.created_by,
          po.created_at,
          po.updated_at
        FROM operations_purchase_orders po
        LEFT JOIN operations_suppliers s ON s.id = po.supplier_id
        WHERE po.organization_id = $1::uuid AND po.id = $2::uuid
      `,
      [params.organizationId, poId],
    );

    const first = asObject((rows || [])[0]);
    if (!first) return { success: false, error: 'הזמנת רכש לא נמצאה' };

    const lineRows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT
          poi.id::text,
          poi.item_id::text,
          i.name AS item_name,
          poi.description,
          poi.quantity,
          poi.unit_price,
          poi.total_price,
          poi.received_qty
        FROM operations_purchase_order_items poi
        LEFT JOIN operations_items i ON i.id = poi.item_id
        WHERE poi.purchase_order_id = $1::uuid
        ORDER BY poi.created_at ASC
      `,
      [poId],
    );

    const lineItems: OperationsPurchaseOrderLineItem[] = (lineRows || []).map((r) => {
      const obj = asObject(r) ?? {};
      return {
        id: String(obj.id ?? ''),
        itemId: obj.item_id ? String(obj.item_id) : null,
        itemName: obj.item_name ? String(obj.item_name) : null,
        description: String(obj.description ?? ''),
        quantity: toNumberSafe(obj.quantity),
        unitPrice: toNumberSafe(obj.unit_price),
        totalPrice: toNumberSafe(obj.total_price),
        receivedQty: toNumberSafe(obj.received_qty),
      };
    });

    return {
      success: true,
      data: {
        id: String(first.id ?? ''),
        poNumber: String(first.po_number ?? ''),
        status: String(first.status ?? 'DRAFT') as OperationsPurchaseOrderStatus,
        supplierId: first.supplier_id ? String(first.supplier_id) : null,
        supplierName: first.supplier_name ? String(first.supplier_name) : null,
        notes: first.notes ? String(first.notes) : null,
        totalAmount: first.total_amount != null ? toNumberSafe(first.total_amount) : null,
        currency: String(first.currency ?? 'ILS'),
        expectedDelivery: toIsoDate(first.expected_delivery),
        sentAt: toIsoDate(first.sent_at),
        receivedAt: toIsoDate(first.received_at),
        createdBy: first.created_by ? String(first.created_by) : null,
        createdAt: toIsoDate(first.created_at) ?? new Date().toISOString(),
        updatedAt: toIsoDate(first.updated_at) ?? new Date().toISOString(),
        lineItems,
      },
    };
  } catch (e: unknown) {
    logOperationsError('[operations] getOperationsPurchaseOrderById failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הזמנת רכש' };
  }
}

// ─── Create ─────────────────────────────────────────────────────────

export async function createOperationsPurchaseOrderForOrganizationId(params: {
  organizationId: string;
  supplierId?: string | null;
  notes?: string | null;
  expectedDelivery?: string | null;
  createdBy?: string | null;
  lineItems: Array<{
    itemId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!params.lineItems.length) return { success: false, error: 'חובה להוסיף לפחות שורה אחת' };

    // Generate PO number: PO-YYYYMMDD-XXXX
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const countRows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `SELECT COUNT(*)::int AS cnt FROM operations_purchase_orders WHERE organization_id = $1::uuid`,
      [params.organizationId],
    );
    const cnt = Number(asObject((countRows || [])[0])?.cnt ?? 0) + 1;
    const poNumber = `PO-${datePart}-${String(cnt).padStart(4, '0')}`;

    // Calculate total
    let totalAmount = 0;
    for (const li of params.lineItems) {
      totalAmount += li.quantity * li.unitPrice;
    }

    const created = await prisma.operationsPurchaseOrder.create({
      data: {
        organizationId: params.organizationId,
        supplierId: params.supplierId || null,
        poNumber,
        status: 'DRAFT',
        notes: params.notes ? String(params.notes).trim() : null,
        totalAmount,
        currency: 'ILS',
        expectedDelivery: params.expectedDelivery ? new Date(params.expectedDelivery) : null,
        createdBy: params.createdBy || null,
        lineItems: {
          create: params.lineItems.map((li) => ({
            itemId: li.itemId || null,
            description: String(li.description).trim(),
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            totalPrice: li.quantity * li.unitPrice,
          })),
        },
      },
      select: { id: true },
    });

    return { success: true, id: created.id };
  } catch (e: unknown) {
    logOperationsError('[operations] createOperationsPurchaseOrder failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת הזמנת רכש' };
  }
}

// ─── Update Status ──────────────────────────────────────────────────

export async function updateOperationsPurchaseOrderStatusForOrganizationId(params: {
  organizationId: string;
  id: string;
  status: OperationsPurchaseOrderStatus;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const poId = String(params.id || '').trim();
    if (!poId) return { success: false, error: 'חסר מזהה הזמנה' };

    const validStatuses: OperationsPurchaseOrderStatus[] = ['DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'];
    if (!validStatuses.includes(params.status)) {
      return { success: false, error: 'סטטוס לא תקין' };
    }

    const existing = await prisma.operationsPurchaseOrder.findFirst({
      where: { id: poId, organizationId: params.organizationId },
      select: { id: true, status: true },
    });
    if (!existing) return { success: false, error: 'הזמנת רכש לא נמצאה' };

    const data: Record<string, unknown> = { status: params.status };
    if (params.status === 'SENT' && !existing.status) data.sentAt = new Date();
    if (params.status === 'SENT') data.sentAt = new Date();
    if (params.status === 'RECEIVED') data.receivedAt = new Date();

    await prisma.operationsPurchaseOrder.update({
      where: { id: poId },
      data,
    });

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] updateOperationsPurchaseOrderStatus failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בעדכון סטטוס הזמנה' };
  }
}

// ─── Receive Items ──────────────────────────────────────────────────

export async function receiveOperationsPurchaseOrderItemsForOrganizationId(params: {
  organizationId: string;
  purchaseOrderId: string;
  receivedItems: Array<{ lineItemId: string; receivedQty: number }>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const poId = String(params.purchaseOrderId || '').trim();
    if (!poId) return { success: false, error: 'חסר מזהה הזמנה' };

    const po = await prisma.operationsPurchaseOrder.findFirst({
      where: { id: poId, organizationId: params.organizationId },
      select: { id: true },
    });
    if (!po) return { success: false, error: 'הזמנת רכש לא נמצאה' };

    for (const ri of params.receivedItems) {
      if (ri.receivedQty <= 0) continue;
      await orgExec(
        prisma,
        params.organizationId,
        `
          UPDATE operations_purchase_order_items
          SET received_qty = received_qty + $1
          WHERE id = $2::uuid AND purchase_order_id = $3::uuid
        `,
        [ri.receivedQty, ri.lineItemId, poId],
      );
    }

    // Check if all items fully received
    const checkRows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT
          COALESCE(SUM(quantity), 0) AS total_qty,
          COALESCE(SUM(received_qty), 0) AS total_received
        FROM operations_purchase_order_items
        WHERE purchase_order_id = $1::uuid
      `,
      [poId],
    );
    const check = asObject((checkRows || [])[0]) ?? {};
    const totalQty = toNumberSafe(check.total_qty);
    const totalReceived = toNumberSafe(check.total_received);

    let newStatus: OperationsPurchaseOrderStatus;
    if (totalReceived >= totalQty) {
      newStatus = 'RECEIVED';
    } else if (totalReceived > 0) {
      newStatus = 'PARTIALLY_RECEIVED';
    } else {
      newStatus = 'SENT';
    }

    await prisma.operationsPurchaseOrder.update({
      where: { id: poId },
      data: {
        status: newStatus,
        ...(newStatus === 'RECEIVED' ? { receivedAt: new Date() } : {}),
      },
    });

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] receiveOperationsPurchaseOrderItems failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בקליטת פריטים' };
  }
}

// ─── Delete ─────────────────────────────────────────────────────────

export async function deleteOperationsPurchaseOrderForOrganizationId(params: {
  organizationId: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const poId = String(params.id || '').trim();
    if (!poId) return { success: false, error: 'חסר מזהה הזמנה' };

    const existing = await prisma.operationsPurchaseOrder.findFirst({
      where: { id: poId, organizationId: params.organizationId },
      select: { id: true, status: true },
    });
    if (!existing) return { success: false, error: 'הזמנת רכש לא נמצאה' };
    if (existing.status !== 'DRAFT' && existing.status !== 'CANCELLED') {
      return { success: false, error: 'ניתן למחוק רק הזמנות בסטטוס טיוטה או מבוטל' };
    }

    await prisma.operationsPurchaseOrder.delete({ where: { id: poId } });
    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] deleteOperationsPurchaseOrder failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת הזמנת רכש' };
  }
}

// ─── Auto-generate PO from low inventory ────────────────────────────

export async function autoGeneratePurchaseOrderFromLowInventoryForOrganizationId(params: {
  organizationId: string;
  createdBy?: string | null;
}): Promise<{ success: boolean; id?: string; error?: string; skipped?: boolean }> {
  try {
    // Find items where on_hand < min_level and have a supplier
    const lowRows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT
          i.id::text AS item_id,
          i.name AS item_name,
          i.supplier_id::text,
          s.name AS supplier_name,
          inv.on_hand,
          inv.min_level,
          COALESCE(i.cost, 0) AS unit_cost
        FROM operations_inventory inv
        JOIN operations_items i ON i.id = inv.item_id
        LEFT JOIN operations_suppliers s ON s.id = i.supplier_id
        WHERE inv.organization_id = $1::uuid
          AND inv.on_hand < inv.min_level
          AND i.supplier_id IS NOT NULL
        ORDER BY s.name, i.name
      `,
      [params.organizationId],
    );

    if (!lowRows || !lowRows.length) {
      return { success: true, skipped: true, error: 'אין פריטים עם מלאי נמוך שמשויכים לספק' };
    }

    // Group by supplier
    const bySupplier = new Map<string, Array<{ itemId: string; itemName: string; deficit: number; unitCost: number }>>();
    for (const r of lowRows) {
      const obj = asObject(r) ?? {};
      const suppId = String(obj.supplier_id ?? '');
      if (!suppId) continue;
      const deficit = Math.max(0, toNumberSafe(obj.min_level) - toNumberSafe(obj.on_hand));
      if (deficit <= 0) continue;
      if (!bySupplier.has(suppId)) bySupplier.set(suppId, []);
      bySupplier.get(suppId)!.push({
        itemId: String(obj.item_id ?? ''),
        itemName: String(obj.item_name ?? ''),
        deficit,
        unitCost: toNumberSafe(obj.unit_cost),
      });
    }

    if (bySupplier.size === 0) {
      return { success: true, skipped: true, error: 'אין חוסרים שדורשים הזמנה' };
    }

    // Create one PO per supplier (take first one for now — can be extended)
    let lastId = '';
    for (const [suppId, items] of bySupplier) {
      const result = await createOperationsPurchaseOrderForOrganizationId({
        organizationId: params.organizationId,
        supplierId: suppId,
        notes: 'הזמנת רכש אוטומטית — מלאי נמוך',
        createdBy: params.createdBy || 'system',
        lineItems: items.map((it) => ({
          itemId: it.itemId,
          description: it.itemName,
          quantity: it.deficit,
          unitPrice: it.unitCost,
        })),
      });
      if (result.success && result.id) lastId = result.id;
    }

    return { success: true, id: lastId };
  } catch (e: unknown) {
    logOperationsError('[operations] autoGeneratePurchaseOrderFromLowInventory failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת הזמנה אוטומטית' };
  }
}
