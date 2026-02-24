'use client';

import { Loader2, Pencil } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { updateOperationsWorkOrder } from '@/app/actions/operations';
import { useOpsToast } from '@/components/operations/OperationsToastProvider';

const PRIORITY_OPTIONS = [
  { value: 'NORMAL', label: 'רגיל' },
  { value: 'HIGH', label: 'גבוה' },
  { value: 'URGENT', label: 'דחוף' },
  { value: 'CRITICAL', label: 'קריטי' },
];

export default function WorkOrderEditButton({
  orgSlug,
  workOrder,
}: {
  orgSlug: string;
  workOrder: {
    id: string;
    title: string;
    description: string | null;
    priority: string;
  };
}) {
  const router = useRouter();
  const { toast } = useOpsToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(workOrder.title);
  const [description, setDescription] = useState(workOrder.description || '');
  const [priority, setPriority] = useState(workOrder.priority);

  const handleSave = useCallback(async () => {
    setError(null);
    setLoading(true);
    const res = await updateOperationsWorkOrder({
      orgSlug,
      id: workOrder.id,
      title: title.trim(),
      description: description.trim() || null,
      priority,
    });
    setLoading(false);
    if (res.success) {
      setOpen(false);
      toast('קריאה עודכנה בהצלחה', 'success');
      router.refresh();
    } else {
      setError(res.error || 'שגיאה בעדכון');
    }
  }, [orgSlug, workOrder.id, title, description, priority, router, toast]);

  const handleCancel = useCallback(() => {
    setTitle(workOrder.title);
    setDescription(workOrder.description || '');
    setPriority(workOrder.priority);
    setError(null);
    setOpen(false);
  }, [workOrder]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-sky-600 transition"
      >
        <Pencil size={13} />
        עריכה
      </button>

      {open ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={handleCancel}>
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 max-w-lg mx-4 w-full"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="text-sm font-black text-slate-900 mb-4">עריכת קריאה</div>

            {error ? (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">כותרת</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">תיאור</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">עדיפות</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end mt-5">
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading || !title.trim()}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 shadow-sm transition disabled:opacity-60"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : 'שמור שינויים'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
