'use client';

import React, { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ShoppingCart, Trash2, Send, PackageCheck, X, Zap, ChevronDown, FileText } from 'lucide-react';

import type {
  OperationsPurchaseOrderRow,
  OperationsPurchaseOrderStatus,
  OperationsSupplierRow,
} from '@/app/actions/operations';
import type { OperationsInventoryOption } from '@/app/actions/operations';
import { formatPurchaseOrderStatus } from '@/lib/services/operations/format';
import { CustomSelect } from '@/components/CustomSelect';

// ─── Types ──────────────────────────────────────────────────────────

interface LineItemDraft {
  key: string;
  itemId: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

// ─── Props ──────────────────────────────────────────────────────────

interface PurchaseOrdersViewProps {
  orgSlug: string;
  orders: OperationsPurchaseOrderRow[];
  suppliers: OperationsSupplierRow[];
  inventoryOptions: OperationsInventoryOption[];
  onCreateAction: (formData: FormData) => Promise<void>;
  onUpdateStatusAction: (formData: FormData) => Promise<void>;
  onDeleteAction: (formData: FormData) => Promise<void>;
  onAutoGenerateAction: (formData: FormData) => Promise<void>;
  flash: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────

function currencyLabel(amount: number | null, currency: string): string {
  if (amount === null || amount === undefined) return '—';
  const symbol = currency === 'ILS' ? '₪' : currency;
  return `${symbol}${amount.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function shortDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'הכל' },
  { value: 'DRAFT', label: 'טיוטה' },
  { value: 'SENT', label: 'נשלח' },
  { value: 'PARTIALLY_RECEIVED', label: 'התקבל חלקית' },
  { value: 'RECEIVED', label: 'התקבל' },
  { value: 'CANCELLED', label: 'בוטל' },
];

// ─── Component ──────────────────────────────────────────────────────

export function PurchaseOrdersView({
  orgSlug,
  orders,
  suppliers,
  inventoryOptions,
  onCreateAction,
  onUpdateStatusAction,
  onDeleteAction,
  onAutoGenerateAction,
  flash,
}: PurchaseOrdersViewProps) {
  const router = useRouter();
  const base = `/w/${encodeURIComponent(orgSlug)}/operations/purchase-orders`;
  const [isPending, startTransition] = useTransition();

  // Flash
  const [showFlash, setShowFlash] = useState(!!flash);
  useEffect(() => {
    if (!flash) return;
    setShowFlash(true);
    const t = setTimeout(() => setShowFlash(false), 5000);
    return () => clearTimeout(t);
  }, [flash]);

  // Filter
  const [statusFilter, setStatusFilter] = useState('ALL');
  const filteredOrders = useMemo(() => {
    if (statusFilter === 'ALL') return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newSupplierId, setNewSupplierId] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newExpectedDelivery, setNewExpectedDelivery] = useState('');
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([
    { key: '1', itemId: '', description: '', quantity: '1', unitPrice: '0' },
  ]);

  const addLineItem = useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      { key: String(Date.now()), itemId: '', description: '', quantity: '1', unitPrice: '0' },
    ]);
  }, []);

  const removeLineItem = useCallback((key: string) => {
    setLineItems((prev) => (prev.length > 1 ? prev.filter((li) => li.key !== key) : prev));
  }, []);

  const updateLineItem = useCallback((key: string, field: keyof LineItemDraft, value: string) => {
    setLineItems((prev) => prev.map((li) => (li.key === key ? { ...li, [field]: value } : li)));
  }, []);

  const handleItemSelect = useCallback(
    (key: string, itemId: string) => {
      const inv = inventoryOptions.find((o) => String(o.itemId) === itemId);
      setLineItems((prev) =>
        prev.map((li) =>
          li.key === key
            ? { ...li, itemId, description: inv ? inv.label : li.description }
            : li
        )
      );
    },
    [inventoryOptions]
  );

  const lineItemTotal = useMemo(() => {
    return lineItems.reduce((sum, li) => {
      const qty = parseFloat(li.quantity) || 0;
      const price = parseFloat(li.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  }, [lineItems]);

  const resetCreateForm = useCallback(() => {
    setNewSupplierId('');
    setNewNotes('');
    setNewExpectedDelivery('');
    setLineItems([{ key: '1', itemId: '', description: '', quantity: '1', unitPrice: '0' }]);
  }, []);

  // Status badge actions
  const getNextStatuses = useCallback((current: OperationsPurchaseOrderStatus): { value: OperationsPurchaseOrderStatus; label: string }[] => {
    switch (current) {
      case 'DRAFT':
        return [
          { value: 'SENT', label: 'שלח לספק' },
          { value: 'CANCELLED', label: 'בטל' },
        ];
      case 'SENT':
        return [
          { value: 'PARTIALLY_RECEIVED', label: 'התקבל חלקית' },
          { value: 'RECEIVED', label: 'התקבל במלואו' },
          { value: 'CANCELLED', label: 'בטל' },
        ];
      case 'PARTIALLY_RECEIVED':
        return [{ value: 'RECEIVED', label: 'התקבל במלואו' }];
      default:
        return [];
    }
  }, []);

  const isEmpty = filteredOrders.length === 0;

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Flash */}
      {flash && showFlash ? (
        <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm font-bold text-sky-800 flex items-center justify-between animate-in fade-in">
          <span>{flash}</span>
          <button type="button" onClick={() => setShowFlash(false)} className="text-sky-400 hover:text-sky-600 transition-colors shrink-0 mr-2">
            <X size={16} />
          </button>
        </div>
      ) : null}

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          type="button"
          onClick={() => { resetCreateForm(); setShowCreate(true); }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-all duration-200"
        >
          <Plus size={18} strokeWidth={2.5} />
          הזמנת רכש חדשה
        </button>
        <form action={onAutoGenerateAction}>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-all duration-200"
          >
            <Zap size={16} strokeWidth={2.5} />
            יצירה אוטומטית ממלאי נמוך
          </button>
        </form>
        <div className="sm:mr-auto">
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="סינון"
            options={STATUS_OPTIONS}
          />
        </div>
      </div>

      {/* Empty State */}
      {isEmpty && orders.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
          <ShoppingCart size={48} className="mx-auto text-slate-300 mb-4" />
          <div className="text-lg font-black text-slate-800">מחלקת רכש</div>
          <div className="mt-2 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            כאן תנהלו הזמנות רכש לספקים. צרו הזמנה ידנית או לחצו על ״יצירה אוטומטית״ כדי לייצר הזמנות מפריטים עם מלאי נמוך.
          </div>
        </div>
      ) : isEmpty ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          אין הזמנות בסטטוס הנבחר
        </div>
      ) : null}

      {/* Orders Table */}
      {!isEmpty ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3.5 font-bold text-slate-600">מס׳ הזמנה</th>
                  <th className="px-5 py-3.5 font-bold text-slate-600">ספק</th>
                  <th className="px-5 py-3.5 font-bold text-slate-600">סטטוס</th>
                  <th className="px-5 py-3.5 font-bold text-slate-600">סה״כ</th>
                  <th className="px-5 py-3.5 font-bold text-slate-600">שורות</th>
                  <th className="px-5 py-3.5 font-bold text-slate-600">תאריך</th>
                  <th className="px-5 py-3.5 font-bold text-slate-600">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((po) => {
                  const st = formatPurchaseOrderStatus(po.status);
                  const nextActions = getNextStatuses(po.status as OperationsPurchaseOrderStatus);
                  return (
                    <tr key={po.id} className="border-b border-slate-50 hover:bg-sky-50/30 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-black text-slate-900">{po.poNumber}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {po.supplierName || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900 tabular-nums">
                        {currencyLabel(po.totalAmount, po.currency)}
                      </td>
                      <td className="px-5 py-4 text-slate-600">{po.itemCount}</td>
                      <td className="px-5 py-4 text-slate-500 text-xs">{shortDate(po.createdAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {nextActions.map((action) => (
                            <form key={action.value} action={onUpdateStatusAction}>
                              <input type="hidden" name="id" value={po.id} />
                              <input type="hidden" name="status" value={action.value} />
                              <button
                                type="submit"
                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                                  action.value === 'CANCELLED'
                                    ? 'text-red-600 hover:bg-red-50'
                                    : action.value === 'SENT'
                                    ? 'text-sky-600 hover:bg-sky-50'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={action.label}
                              >
                                {action.value === 'SENT' ? <Send size={12} /> : null}
                                {action.value === 'RECEIVED' || action.value === 'PARTIALLY_RECEIVED' ? <PackageCheck size={12} /> : null}
                                {action.value === 'CANCELLED' ? <X size={12} /> : null}
                                {action.label}
                              </button>
                            </form>
                          ))}
                          {(po.status === 'DRAFT' || po.status === 'CANCELLED') ? (
                            <form action={onDeleteAction}>
                              <input type="hidden" name="id" value={po.id} />
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-red-500 hover:bg-red-50 transition-colors"
                                title="מחק"
                              >
                                <Trash2 size={12} />
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Summary Stats */}
      {orders.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
          {(['DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'] as const).map((s) => {
            const count = orders.filter((o) => o.status === s).length;
            const st = formatPurchaseOrderStatus(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(statusFilter === s ? 'ALL' : s)}
                className={`rounded-2xl border p-4 text-center transition-all ${
                  statusFilter === s ? 'border-sky-300 bg-sky-50 shadow-sm' : 'border-slate-200/60 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="text-2xl font-extrabold text-slate-900">{count}</div>
                <div className="text-xs font-medium text-slate-500 mt-1">{st.label}</div>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Create Modal */}
      {showCreate ? (
        <>
          <div className="fixed inset-0 bg-black/50 z-[200] backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div
            className="fixed inset-x-4 top-[5vh] bottom-[5vh] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-[201] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            dir="rtl"
          >
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-l from-sky-50 to-white">
              <div className="text-lg font-black text-slate-900">הזמנת רכש חדשה</div>
              <button type="button" onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form
              action={onCreateAction}
              className="flex-1 overflow-y-auto p-6 space-y-5"
              onSubmit={() => setShowCreate(false)}
            >
              {/* Supplier */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">ספק</label>
                <input type="hidden" name="supplierId" value={newSupplierId} />
                <CustomSelect
                  value={newSupplierId}
                  onChange={setNewSupplierId}
                  placeholder="בחר ספק (אופציונלי)"
                  options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                />
              </div>

              {/* Expected Delivery */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">תאריך אספקה צפוי</label>
                <input
                  type="date"
                  name="expectedDelivery"
                  value={newExpectedDelivery}
                  onChange={(e) => setNewExpectedDelivery(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200/80 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">הערות</label>
                <textarea
                  name="notes"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm outline-none focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100 resize-none"
                  placeholder="הערות להזמנה..."
                />
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-slate-600">שורות הזמנה</label>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700"
                  >
                    <Plus size={14} /> הוסף שורה
                  </button>
                </div>
                <div className="space-y-3">
                  {lineItems.map((li, idx) => (
                    <div key={li.key} className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black text-slate-400 w-5">{idx + 1}</span>
                        <div className="flex-1">
                          <CustomSelect
                            value={li.itemId}
                            onChange={(val) => handleItemSelect(li.key, val)}
                            placeholder="בחר פריט מהמלאי"
                            options={inventoryOptions.map((o) => ({
                              value: String(o.itemId),
                              label: o.label,
                            }))}
                          />
                        </div>
                        {lineItems.length > 1 ? (
                          <button type="button" onClick={() => removeLineItem(li.key)} className="text-red-400 hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>
                      <input type="hidden" name={`li_itemId_${idx}`} value={li.itemId} />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <input
                            name={`li_description_${idx}`}
                            value={li.description}
                            onChange={(e) => updateLineItem(li.key, 'description', e.target.value)}
                            placeholder="תיאור"
                            required
                            className="w-full h-9 rounded-lg border border-slate-200/80 bg-white px-2.5 text-xs font-medium text-slate-800 outline-none focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100"
                          />
                        </div>
                        <div>
                          <input
                            name={`li_quantity_${idx}`}
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={li.quantity}
                            onChange={(e) => updateLineItem(li.key, 'quantity', e.target.value)}
                            placeholder="כמות"
                            required
                            className="w-full h-9 rounded-lg border border-slate-200/80 bg-white px-2.5 text-xs font-medium text-slate-800 outline-none focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100"
                          />
                        </div>
                        <div>
                          <input
                            name={`li_unitPrice_${idx}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={li.unitPrice}
                            onChange={(e) => updateLineItem(li.key, 'unitPrice', e.target.value)}
                            placeholder="מחיר יחידה"
                            required
                            className="w-full h-9 rounded-lg border border-slate-200/80 bg-white px-2.5 text-xs font-medium text-slate-800 outline-none focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <input type="hidden" name="lineItemCount" value={lineItems.length} />
              </div>

              {/* Total */}
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 flex items-center justify-between">
                <span className="text-sm font-bold text-sky-800">סה״כ הזמנה</span>
                <span className="text-xl font-black text-sky-900">
                  ₪{lineItemTotal.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full h-12 rounded-2xl bg-sky-500 text-white font-black text-sm hover:bg-sky-600 shadow-sm transition-all duration-200"
              >
                <FileText size={16} className="inline ml-2" />
                צור הזמנת רכש
              </button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}
