'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { CustomSelect } from '@/components/CustomSelect';
import { useOpsToast } from '@/components/operations/OperationsToastProvider';

import { formatWorkOrderStatus, formatPriority } from '@/lib/services/operations/format';

type ProjectData = {
  id: string;
  title: string;
  status: string;
  canonicalClientId: string | null;
  clientName: string | null;
  installationAddress: string | null;
  source: string | null;
  sourceRefId: string | null;
  createdAt: string;
  updatedAt: string;
  workOrders: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
  }>;
};

type ClientOption = {
  id: string;
  label: string;
};

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'פעיל' },
  { value: 'COMPLETED', label: 'הושלם' },
  { value: 'ON_HOLD', label: 'מוקפא' },
  { value: 'CANCELLED', label: 'בוטל' },
];

function formatProjectStatus(status: string): { label: string; cls: string } {
  switch (status) {
    case 'ACTIVE':
      return { label: 'פעיל', cls: 'bg-sky-50 text-sky-700 border border-sky-100' };
    case 'COMPLETED':
      return { label: 'הושלם', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100' };
    case 'ON_HOLD':
      return { label: 'מוקפא', cls: 'bg-amber-50 text-amber-700 border border-amber-100' };
    case 'CANCELLED':
      return { label: 'בוטל', cls: 'bg-slate-50 text-slate-500 border border-slate-200' };
    default:
      return { label: status, cls: 'bg-slate-50 text-slate-700 border border-slate-200' };
  }
}

function formatDate(dateIso: string): string {
  try {
    return new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(dateIso));
  } catch {
    return dateIso;
  }
}

const badgeCls = 'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black';

export default function ProjectDetailClient({
  base,
  project,
  clientOptions,
  updateAction,
}: {
  base: string;
  project: ProjectData;
  clientOptions: ClientOption[];
  updateAction: (params: {
    title?: string;
    status?: string;
    canonicalClientId?: string | null;
    installationAddress?: string | null;
  }) => Promise<{ success: boolean; error?: string }>;
}) {
  const router = useRouter();
  const { toast } = useOpsToast();
  const [isPending, startTransition] = useTransition();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [status, setStatus] = useState(project.status);
  const [clientId, setClientId] = useState(project.canonicalClientId ?? '');
  const [address, setAddress] = useState(project.installationAddress ?? '');
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateAction({
        title: title.trim(),
        status,
        canonicalClientId: clientId || null,
        installationAddress: address.trim() || null,
      });
      if (result.success) {
        setEditing(false);
        toast('פרויקט עודכן בהצלחה', 'success');
        router.refresh();
      } else {
        setError(result.error ?? 'שגיאה בעדכון');
      }
    });
  }

  function handleCancel() {
    setTitle(project.title);
    setStatus(project.status);
    setClientId(project.canonicalClientId ?? '');
    setAddress(project.installationAddress ?? '');
    setError(null);
    setEditing(false);
  }

  const ps = formatProjectStatus(project.status);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              {editing ? (
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-1.5 w-full max-w-sm outline-none focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100 transition-all"
                />
              ) : (
                <div className="text-sm font-bold text-slate-800 truncate">{project.title}</div>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`${badgeCls} ${ps.cls}`}>{ps.label}</span>
                {project.clientName ? (
                  <span className="text-xs text-slate-500">לקוח: <b>{project.clientName}</b></span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending}
                    className="inline-flex items-center justify-center rounded-xl h-9 px-4 text-xs font-bold bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-all duration-150 disabled:opacity-50"
                  >
                    {isPending ? 'שומר...' : 'שמור'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isPending}
                    className="inline-flex items-center justify-center rounded-xl h-9 px-4 text-xs font-medium text-slate-600 bg-white border border-slate-200/80 shadow-sm hover:shadow hover:border-slate-300 transition-all duration-150"
                  >
                    ביטול
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center justify-center rounded-xl h-9 px-4 text-xs font-bold bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-all duration-150"
                  >
                    עריכה
                  </button>
                  <Link
                    href={`${base}/projects`}
                    className="inline-flex items-center justify-center rounded-xl h-9 px-4 text-xs font-medium text-slate-600 bg-white border border-slate-200/80 shadow-sm hover:shadow hover:border-slate-300 transition-all duration-150"
                  >
                    חזרה
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {error ? (
          <div className="p-4 border-b border-rose-100 bg-rose-50 text-rose-800 text-sm font-bold">{error}</div>
        ) : null}

        <div className="p-5 space-y-4">
          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">סטטוס</label>
                <CustomSelect
                  value={status}
                  onChange={(val) => setStatus(val)}
                  options={STATUS_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">לקוח</label>
                <CustomSelect
                  value={clientId}
                  onChange={(val) => setClientId(val)}
                  placeholder="ללא לקוח"
                  options={clientOptions.map((c) => ({ value: c.id, label: c.label }))}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">כתובת התקנה</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="כתובת אתר הפרויקט"
                  className="h-11 w-full rounded-xl border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all duration-150 hover:border-slate-300 hover:shadow focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200/60 bg-white p-4">
                <div className="text-[11px] font-bold text-slate-500">כתובת</div>
                <div className="mt-1 text-sm font-bold text-slate-900">
                  {project.installationAddress || <span className="text-slate-400 font-normal">—</span>}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200/60 bg-white p-4">
                <div className="text-[11px] font-bold text-slate-500">נוצר</div>
                <div className="mt-1 text-sm text-slate-700">{formatDate(project.createdAt)}</div>
              </div>
              <div className="rounded-xl border border-slate-200/60 bg-white p-4">
                <div className="text-[11px] font-bold text-slate-500">עודכן</div>
                <div className="mt-1 text-sm text-slate-700">{formatDate(project.updatedAt)}</div>
              </div>
              {project.source ? (
                <div className="rounded-xl border border-slate-200/60 bg-white p-4">
                  <div className="text-[11px] font-bold text-slate-500">מקור</div>
                  <div className="mt-1 text-sm text-slate-700">{project.source}</div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-slate-800">קריאות שירות בפרויקט</div>
              <div className="text-xs text-slate-400 mt-0.5">{project.workOrders.length} קריאות</div>
            </div>
            <Link
              href={`${base}/work-orders/new`}
              className="inline-flex items-center justify-center rounded-xl h-9 px-4 text-xs font-bold bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-all duration-150"
            >
              קריאה חדשה
            </Link>
          </div>
        </div>

        <div className="p-5">
          <div className="md:hidden space-y-3">
            {project.workOrders.length ? (
              project.workOrders.map((wo) => {
                const statusBadge = formatWorkOrderStatus(wo.status);
                const priorityBadge = formatPriority(wo.priority);
                return (
                  <Link
                    key={wo.id}
                    href={`${base}/work-orders/${encodeURIComponent(wo.id)}`}
                    className="block rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="text-sm font-black text-slate-900 truncate">{wo.title}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className={`${badgeCls} ${statusBadge.cls}`}>{statusBadge.label}</span>
                      {priorityBadge ? <span className={`${badgeCls} ${priorityBadge.cls}`}>{priorityBadge.label}</span> : null}
                    </div>
                    <div className="mt-2 text-xs text-slate-400">{formatDate(wo.createdAt)}</div>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">אין קריאות שירות בפרויקט הזה</div>
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-slate-500">
                  <th className="pb-3 font-bold">כותרת</th>
                  <th className="pb-3 font-bold">סטטוס</th>
                  <th className="pb-3 font-bold">דחיפות</th>
                  <th className="pb-3 font-bold">תאריך</th>
                </tr>
              </thead>
              <tbody>
                {project.workOrders.length ? (
                  project.workOrders.map((wo) => {
                    const statusBadge = formatWorkOrderStatus(wo.status);
                    const priorityBadge = formatPriority(wo.priority);
                    return (
                      <tr key={wo.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3">
                          <Link href={`${base}/work-orders/${encodeURIComponent(wo.id)}`} className="font-bold text-slate-900 hover:text-sky-700 transition-colors">
                            {wo.title}
                          </Link>
                        </td>
                        <td className="py-3">
                          <span className={`${badgeCls} ${statusBadge.cls}`}>{statusBadge.label}</span>
                        </td>
                        <td className="py-3">
                          {priorityBadge ? (
                            <span className={`${badgeCls} ${priorityBadge.cls}`}>{priorityBadge.label}</span>
                          ) : (
                            <span className="text-slate-400 text-xs">רגיל</span>
                          )}
                        </td>
                        <td className="py-3 text-slate-600 text-xs">{formatDate(wo.createdAt)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="border-t border-slate-100">
                    <td className="py-6 text-sm text-slate-500" colSpan={4}>
                      אין קריאות שירות בפרויקט הזה
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
