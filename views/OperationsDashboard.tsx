'use client';

import React, { useEffect, useState } from 'react';
import { CustomSelect } from '@/components/CustomSelect';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import type { OperationsDashboardData } from '@/app/actions/operations';
import type { OperationsInventoryOption } from '@/app/actions/operations';
import { WorkOrderStatusChart, WorkOrderPriorityChart, InventoryPieChart } from '@/components/operations/DashboardCharts';
import { formatWorkOrderStatus, formatProjectStatus, slaLabel } from '@/lib/services/operations/format';
import DashboardTasksClient from '@/components/social/dashboard/DashboardTasksClient';

export function OperationsDashboard({
  orgSlug,
  initialData,
  initialInventoryOptions,
  activeVehicleName,
  onQuickAddStockAction,
  onQuickCreateItemAction,
  flash,
}: {
  orgSlug: string;
  initialData?: OperationsDashboardData;
  initialInventoryOptions: OperationsInventoryOption[];
  activeVehicleName: string | null;
  onQuickAddStockAction: (formData: FormData) => Promise<void>;
  onQuickCreateItemAction: (formData: FormData) => Promise<void>;
  flash: string | null;
}) {
  const base = `/w/${encodeURIComponent(orgSlug)}/operations`;

  const [selectedItemId, setSelectedItemId] = useState(initialInventoryOptions?.length ? String(initialInventoryOptions[0].itemId) : '');
  const [showFlash, setShowFlash] = useState(!!flash);
  useEffect(() => {
    if (!flash) return;
    setShowFlash(true);
    const t = setTimeout(() => setShowFlash(false), 5000);
    return () => clearTimeout(t);
  }, [flash]);

  const recentProjects = initialData?.recentProjects || [];
  const inventory = initialData?.inventorySummary;
  const inventoryOptions = initialInventoryOptions || [];
  const woStats = initialData?.workOrderStats;
  const recentWorkOrders = initialData?.recentWorkOrders || [];

  const inventoryStatus = React.useMemo(() => {
    const total = inventory?.total ?? 0;
    const pct = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);
    return [
      { label: 'תקין', count: inventory?.ok ?? 0, value: pct(inventory?.ok ?? 0), colorClass: 'bg-emerald-500' },
      { label: 'נמוך', count: inventory?.low ?? 0, value: pct(inventory?.low ?? 0), colorClass: 'bg-amber-500' },
      { label: 'קריטי', count: inventory?.critical ?? 0, value: pct(inventory?.critical ?? 0), colorClass: 'bg-rose-500' },
    ];
  }, [inventory?.critical, inventory?.low, inventory?.ok, inventory?.total]);

  const hasUrgent = (woStats?.slaBreach ?? 0) > 0 || (woStats?.priorityCritical ?? 0) > 0 || (woStats?.priorityUrgent ?? 0) > 0;

  const isEmpty = !recentWorkOrders.length && !recentProjects.length && (woStats?.total ?? 0) === 0;

  return (
    <div className="mx-auto w-full max-w-6xl">
      {flash && showFlash ? (
        <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm font-bold text-sky-800 flex items-center justify-between animate-in fade-in">
          <span>{flash}</span>
          <button type="button" onClick={() => setShowFlash(false)} className="text-sky-400 hover:text-sky-600 transition-colors shrink-0 mr-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      ) : null}

      {/* ──── Quick Action Bar ──── */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Link
          href={`${base}/work-orders/new`}
          className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-all duration-200"
        >
          <Plus size={18} strokeWidth={2.5} />
          פתח קריאה חדשה
        </Link>
        <Link
          href={`${base}/projects/new`}
          className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-all duration-200"
        >
          <Plus size={16} strokeWidth={2} />
          פרויקט חדש
        </Link>
      </div>

      {/* ──── Empty State ──── */}
      {isEmpty ? (
        <div className="mb-6 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
          <div className="text-lg font-black text-slate-800">ברוכים הבאים למודול תפעול!</div>
          <div className="mt-2 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            כדי להתחיל, פתחו קריאת שירות חדשה או צרו פרויקט. אפשר גם להגדיר קטגוריות, מבנים ומחלקות בדף ההגדרות.
          </div>
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`${base}/work-orders/new`}
              className="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black bg-sky-500 text-white hover:bg-sky-600 transition-colors"
            >
              <Plus size={16} /> קריאה ראשונה
            </Link>
            <Link
              href={`${base}/settings`}
              className="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              הגדרות מודול
            </Link>
          </div>
        </div>
      ) : null}

      {/* ──── Work Order Stats Cards ──── */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href={`${base}/work-orders`} className="group rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200">
          <div className="text-2xl font-extrabold text-slate-900">{woStats?.open ?? 0}</div>
          <div className="text-xs font-medium text-slate-500 mt-1">קריאות פתוחות</div>
        </Link>
        <Link href={`${base}/work-orders`} className="group rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200">
          <div className="text-2xl font-extrabold text-amber-500">{woStats?.inProgress ?? 0}</div>
          <div className="text-xs font-medium text-slate-500 mt-1">בטיפול</div>
        </Link>
        <Link href={`${base}/work-orders`} className="group rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200">
          <div className="text-2xl font-extrabold text-emerald-500">{woStats?.doneToday ?? 0}</div>
          <div className="text-xs font-medium text-slate-500 mt-1">הושלמו היום</div>
        </Link>
        <Link href={`${base}/work-orders?status=ALL`} className="group rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200">
          <div className="text-2xl font-extrabold text-slate-900">{woStats?.total ?? 0}</div>
          <div className="text-xs font-medium text-slate-500 mt-1">סה״כ קריאות</div>
        </Link>
      </div>

      {/* ──── Closure Stats ──── */}
      {woStats && (woStats.doneThisWeek > 0 || woStats.doneThisMonth > 0 || woStats.avgResolutionMinutes !== null) ? (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-5">
            <div className="text-2xl font-extrabold text-emerald-700">{woStats.doneThisWeek}</div>
            <div className="text-xs font-medium text-emerald-600 mt-1">הושלמו השבוע</div>
          </div>
          <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-5">
            <div className="text-2xl font-extrabold text-emerald-700">{woStats.doneThisMonth}</div>
            <div className="text-xs font-medium text-emerald-600 mt-1">הושלמו החודש</div>
          </div>
          <div className="rounded-2xl border border-sky-200/60 bg-sky-50/50 p-5">
            <div className="text-2xl font-extrabold text-sky-700">
              {woStats.avgResolutionMinutes !== null
                ? woStats.avgResolutionMinutes >= 60
                  ? `${Math.round(woStats.avgResolutionMinutes / 60)} שעות`
                  : `${woStats.avgResolutionMinutes} דק׳`
                : '—'}
            </div>
            <div className="text-xs font-medium text-sky-600 mt-1">ממוצע זמן טיפול</div>
          </div>
        </div>
      ) : null}

      {/* ──── Alerts Row ──── */}
      {hasUrgent ? (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          {(woStats?.slaBreach ?? 0) > 0 ? (
            <Link href={`${base}/work-orders`} className="rounded-2xl border border-red-200 bg-red-50/80 p-4 hover:bg-red-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-700 font-black text-sm">{woStats!.slaBreach}</div>
                <div>
                  <div className="text-sm font-black text-red-800">חריגות SLA</div>
                  <div className="text-[11px] text-red-600">קריאות שעברו את זמן התגובה</div>
                </div>
              </div>
            </Link>
          ) : null}
          {(woStats?.unassigned ?? 0) > 0 ? (
            <Link href={`${base}/work-orders`} className="rounded-2xl border border-orange-200 bg-orange-50/80 p-4 hover:bg-orange-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-700 font-black text-sm">{woStats!.unassigned}</div>
                <div>
                  <div className="text-sm font-black text-orange-800">ממתינות לשיוך</div>
                  <div className="text-[11px] text-orange-600">קריאות ללא טכנאי</div>
                </div>
              </div>
            </Link>
          ) : null}
          {((woStats?.priorityCritical ?? 0) + (woStats?.priorityUrgent ?? 0)) > 0 ? (
            <Link href={`${base}/work-orders`} className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 hover:bg-rose-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 font-black text-sm">{(woStats?.priorityCritical ?? 0) + (woStats?.priorityUrgent ?? 0)}</div>
                <div>
                  <div className="text-sm font-black text-rose-800">דחיפות גבוהה</div>
                  <div className="text-[11px] text-rose-600">{woStats?.priorityCritical ?? 0} קריטי, {woStats?.priorityUrgent ?? 0} דחוף</div>
                </div>
              </div>
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* ──── Charts ──── */}
      {woStats && (woStats.total > 0 || (inventory && inventory.total > 0)) ? (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {woStats.total > 0 ? (
            <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
              <WorkOrderStatusChart stats={woStats} />
            </section>
          ) : null}
          {woStats.total > 0 ? (
            <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
              <WorkOrderPriorityChart stats={woStats} />
            </section>
          ) : null}
          {inventory && inventory.total > 0 ? (
            <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
              <InventoryPieChart inventory={inventory} />
            </section>
          ) : null}
        </div>
      ) : null}

      {/* ──── Recent Work Orders + Inventory ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-slate-800">קריאות אחרונות</div>
              <Link href={`${base}/work-orders`} className="text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors">
                לכל הקריאות
              </Link>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {recentWorkOrders.length ? (
              recentWorkOrders.map((wo) => {
                const st = formatWorkOrderStatus(wo.status);
                const sla = slaLabel(wo.slaDeadline);
                return (
                  <Link
                    key={wo.id}
                    href={`${base}/work-orders/${encodeURIComponent(wo.id)}`}
                    className="block rounded-xl border border-slate-100 bg-white p-3 hover:bg-sky-50/40 hover:border-sky-100 transition-all duration-150"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-slate-900 truncate">{wo.title}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black border ${st.cls}`}>{st.label}</span>
                          {wo.categoryName ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black bg-violet-50 text-violet-700 border border-violet-100">{wo.categoryName}</span> : null}
                          {wo.priority !== 'NORMAL' ? (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black ${
                              wo.priority === 'CRITICAL' ? 'bg-red-100 text-red-800 border border-red-200' :
                              wo.priority === 'URGENT' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                              'bg-orange-50 text-orange-700 border border-orange-100'
                            }`}>
                              {wo.priority === 'CRITICAL' ? 'קריטי' : wo.priority === 'URGENT' ? 'דחוף' : 'גבוה'}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {sla ? <span className={`text-[10px] shrink-0 ${sla.cls}`}>{sla.text}</span> : null}
                    </div>
                    <div className="mt-1.5 text-[11px] text-slate-500">
                      {wo.technicianLabel ? `טכנאי: ${wo.technicianLabel}` : 'ללא טכנאי'}
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="text-center py-6 text-sm text-slate-500">אין עדיין קריאות</div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-slate-800">סטטוס מלאי</div>
              <Link href={`${base}/inventory`} className="text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors">
                למסך מלאי
              </Link>
            </div>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              {inventoryStatus.map((s) => (
                <div key={s.label} className="flex items-center gap-4">
                  <div className="w-14 text-xs font-bold text-slate-600">{s.label}</div>
                  <div className="flex-1">
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-3 ${s.colorClass}`} style={{ width: `${s.value}%` }} />
                    </div>
                  </div>
                  <div className="w-24 text-xs font-black text-slate-700 text-left">{s.count} ({s.value}%)</div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-black text-slate-700">סיכום</div>
              <div className="text-sm text-slate-600 mt-1">
                {inventory
                  ? `סה"כ ${inventory.total} פריטים: ${inventory.ok} תקין, ${inventory.low} נמוך, ${inventory.critical} קריטי.`
                  : 'טוען נתונים...'}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ──── Quick Actions + Projects ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-slate-800">פעולות מהירות</div>
              <Link href={`${base}/settings`} className="text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors">
                הגדרות
              </Link>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-4">
              <div className="text-xs font-semibold text-slate-600">קליטת מלאי לרכב</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {activeVehicleName ? `רכב: ${activeVehicleName}` : 'אין רכב פעיל'}
              </div>
              <form action={onQuickAddStockAction} className="mt-3 flex gap-2">
                <input type="hidden" name="itemId" value={selectedItemId} />
                <div className="flex-1">
                  <CustomSelect
                    value={selectedItemId}
                    onChange={(val) => setSelectedItemId(val)}
                    placeholder="אין פריטים"
                    options={inventoryOptions.map((o) => ({ value: String(o.itemId), label: o.label }))}
                  />
                </div>
                <input name="qty" type="number" step="0.001" min="0.001" placeholder="כמות" required className="w-20 h-10 rounded-lg border border-slate-200/80 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all duration-150 hover:border-slate-300 focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100" />
                <button type="submit" disabled={!activeVehicleName || !inventoryOptions.length} className="h-10 rounded-lg px-4 text-sm font-bold bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed">קלוט</button>
              </form>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-4">
              <div className="text-xs font-semibold text-slate-600">פריט חדש</div>
              <form action={onQuickCreateItemAction} className="mt-3 flex gap-2">
                <input name="name" required placeholder="שם פריט" className="flex-1 h-10 rounded-lg border border-slate-200/80 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all duration-150 hover:border-slate-300 focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100" />
                <input name="sku" placeholder="מק״ט" className="w-24 h-10 rounded-lg border border-slate-200/80 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all duration-150 hover:border-slate-300 focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100" />
                <input name="unit" placeholder="יחידה" className="w-20 h-10 rounded-lg border border-slate-200/80 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all duration-150 hover:border-slate-300 focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100" />
                <button type="submit" className="h-10 rounded-lg px-4 text-sm font-medium text-slate-700 bg-white border border-slate-200/80 shadow-sm hover:shadow hover:border-slate-300 transition-all duration-150">צור</button>
              </form>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-slate-800">פרויקטים אחרונים</div>
              <Link href={`${base}/projects`} className="text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors">
                לכל הפרויקטים
              </Link>
            </div>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right text-slate-500">
                    <th className="pb-3 font-bold">פרויקט</th>
                    <th className="pb-3 font-bold">סטטוס</th>
                    <th className="pb-3 font-bold">לקוח</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.length ? (
                    recentProjects.map((p) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="py-3 font-bold text-slate-900">{p.title}</td>
                        <td className="py-3">
                          {(() => { const ps = formatProjectStatus(p.status); return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ${ps.cls}`}>{ps.label}</span>; })()}
                        </td>
                        <td className="py-3 text-slate-600">{p.clientName || <span className="text-slate-400">—</span>}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-t border-slate-100">
                      <td className="py-6 text-sm text-slate-500" colSpan={3}>אין עדיין פרויקטים</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Module Tasks */}
        <section className="mt-8">
          <DashboardTasksClient orgId={orgSlug} module="operations" />
        </section>
      </div>
    </div>
  );
}
