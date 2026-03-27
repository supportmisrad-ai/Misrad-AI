'use client';

import { Pencil, Trash2, X, Check, Loader2 } from 'lucide-react';
import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { updateOperationsItem, deleteOperationsItem } from '@/app/actions/operations';
import { useOpsToast } from '@/components/operations/OperationsToastProvider';

type InventoryItemRow = {
  id: string;
  itemName: string;
  sku: string | null;
  onHand: number;
  minLevel: number;
};

export function InventoryItemActions({
  item,
  orgSlug,
}: {
  item: InventoryItemRow;
  orgSlug: string;
}) {
  const router = useRouter();
  const { toast } = useOpsToast();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(item.itemName);
  const [sku, setSku] = useState(item.sku || '');
  const [minLevel, setMinLevel] = useState(item.minLevel);

  const handleSave = useCallback(async () => {
    setLoading(true);
    const res = await updateOperationsItem({
      orgSlug,
      itemId: item.id,
      name: name.trim(),
      sku: sku.trim() || null,
      minLevel,
    });
    setLoading(false);
    if (res.success) {
      setEditing(false);
      toast('פריט עודכן בהצלחה', 'success');
      window.location.reload();
    } else {
      toast(res.error || 'שגיאה בעדכון פריט', 'error');
    }
  }, [orgSlug, item.id, name, sku, minLevel, router, toast]);

  const handleDelete = useCallback(async () => {
    setLoading(true);
    const res = await deleteOperationsItem({ orgSlug, itemId: item.id });
    setLoading(false);
    if (res.success) {
      setConfirmDelete(false);
      toast('פריט נמחק בהצלחה', 'success');
      window.location.reload();
    } else {
      toast(res.error || 'שגיאה במחיקת פריט', 'error');
    }
  }, [orgSlug, item.id, router, toast]);

  if (confirmDelete) {
    return createPortal(
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDelete(false)}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()} dir="rtl">
          <div className="text-sm font-black text-slate-900 mb-2">אישור מחיקה</div>
          <div className="text-sm text-slate-600 mb-5">
            האם למחוק את הפריט &quot;{item.itemName}&quot;? פעולה זו תמחק גם את כל יתרות המלאי הקשורות.
          </div>
          <div className="flex items-center gap-3 justify-end">
            <button type="button" onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition" disabled={loading}>
              ביטול
            </button>
            <button type="button" onClick={handleDelete} disabled={loading} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-sm transition disabled:opacity-60">
              {loading ? <Loader2 size={14} className="animate-spin" /> : 'מחק'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (editing) {
    return createPortal(
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditing(false)}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 max-w-md mx-4 w-full" onClick={(e) => e.stopPropagation()} dir="rtl">
          <div className="text-sm font-black text-slate-900 mb-4">עריכת פריט</div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">שם פריט</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">מק&quot;ט</label>
              <input value={sku} onChange={(e) => setSku(e.target.value)} className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">כמות מינימום</label>
              <input type="number" min={0} value={minLevel} onChange={(e) => setMinLevel(Number(e.target.value))} className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
            </div>
          </div>
          <div className="flex items-center gap-3 justify-end mt-5">
            <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition" disabled={loading}>
              ביטול
            </button>
            <button type="button" onClick={handleSave} disabled={loading || !name.trim()} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 shadow-sm transition disabled:opacity-60">
              {loading ? <Loader2 size={14} className="animate-spin" /> : 'שמור'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-sky-600 transition" title="עריכה">
        <Pencil size={14} />
      </button>
      <button type="button" onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition" title="מחיקה">
        <Trash2 size={14} />
      </button>
    </div>
  );
}
