'use client';

import React, { useEffect, useState } from 'react';
import { CustomSelect } from '@/components/CustomSelect';
import Link from 'next/link';
import { Plus, Package } from 'lucide-react';

import type { OperationsDashboardData } from '@/app/actions/operations';
import type { OperationsInventoryOption } from '@/app/actions/operations';
import { WorkOrderStatusChart, WorkOrderPriorityChart, InventoryPieChart } from '@/components/operations/DashboardCharts';
import { formatWorkOrderStatus, formatProjectStatus, slaLabel } from '@/lib/services/operations/format';
import DashboardTasksClient from '@/components/social/dashboard/DashboardTasksClient';
import { FloatingAIInsight } from '@/components/operations/FloatingAIInsight';

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
  const [showAiInsight, setShowAiInsight] = useState(true);

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
  const aiMessage = hasUrgent 
    ? 'זיהוי AI: ישנן קריאות דחופות הדורשות טיפול מיידי למניעת חריגת SLA' 
    : 'זיהוי AI: המערכת פועלת כסדרה. כל המשימות בטיפול.';

  const isEmpty = !recentWorkOrders.length && !recentProjects.length && (woStats?.total ?? 0) === 0;

  return (
    <div className="mx-auto w-full max-w-6xl relative">
      <FloatingAIInsight 
        message={aiMessage} 
        isVisible={showAiInsight} 
        onClose={() => setShowAiInsight(false)}
        priority={hasUrgent ? 'urgent' : 'normal'}
      />

      {flash && showFlash ? (
        <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm font-bold text-sky-800 flex items-center justify-between animate-in fade-in">
          <span>{flash}</span>
          <button type="button" onClick={() => setShowFlash(false)} className="text-sky-400 hover:text-sky-600 transition-colors shrink-0 mr-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      ) : null}

      {/* ──── Quick Action Bar ──── */}
      <div className="mb-8 flex flex-wrap items-center gap-4 px-1 md:px-0">
        <Link
          href={`${base}/work-orders/new`}
          className="group relative overflow-hidden flex-1 md:flex-none inline-flex items-center justify-center gap-2.5 rounded-2xl px-8 py-4 text-base font-black bg-sky-500 text-white hover:bg-sky-600 shadow-lg shadow-sky-500/25 active:scale-95 transition-all duration-200"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus size={20} strokeWidth={3} />
          קריאה חדשה
        </Link>
        <Link
          href={`${base}/projects/new`}
          className="flex-1 md:flex-none inline-flex items-center justify-center gap-2.5 rounded-2xl px-8 py-4 text-base font-bold bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-sm active:scale-95 transition-all duration-200"
        >
          <Plus size={18} strokeWidth={2.5} />
          פרויקט חדש
        </Link>

        {/* Desktop AI Insight Pill */}
        <div className="hidden lg:flex flex-1 items-center justify-end">
          <div className="bg-white/60 backdrop-blur-md border border-sky-100 px-5 py-3 rounded-2xl shadow-sm flex items-center gap-3 animate-fade-in relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            <div className={`w-2 h-2 rounded-full ${hasUrgent ? 'bg-rose-500 animate-pulse' : 'bg-sky-500'}`} />
            <span className="text-sm font-bold text-slate-700">
              {aiMessage}
            </span>
          </div>
        </div>
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
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'קריאות פתוחות', value: woStats?.open ?? 0, color: 'text-slate-900', href: `${base}/work-orders` },
          { label: 'בטיפול', value: woStats?.inProgress ?? 0, color: 'text-amber-500', href: `${base}/work-orders` },
          { label: 'הושלמו היום', value: woStats?.doneToday ?? 0, color: 'text-emerald-500', href: `${base}/work-orders` },
          { label: 'סה״כ קריאות', value: woStats?.total ?? 0, color: 'text-slate-900', href: `${base}/work-orders?status=ALL` },
        ].map((card, idx) => (
          <Link 
            key={idx}
            href={card.href} 
            className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200"
          >
            <div className={`text-3xl font-black ${card.color}`}>{card.value}</div>
            <div className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-tight">{card.label}</div>
            <div className="absolute bottom-0 left-0 h-1 w-0 bg-sky-500 transition-all duration-300 group-hover:w-full" />
          </Link>
        ))}
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
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {(woStats?.slaBreach ?? 0) > 0 ? (
            <Link href={`${base}/work-orders`} className="relative group overflow-hidden rounded-2xl border-2 border-red-500 bg-red-600 p-6 shadow-xl shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/30 transition-colors" />
              <div className="relative flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-white font-black text-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]">{woStats!.slaBreach}</div>
                <div>
                  <div className="text-sm font-black text-white uppercase tracking-widest">חריגות SLA</div>
                  <div className="text-xs text-red-100 font-bold mt-0.5">קריאות שחורגות מזמן התגובה</div>
                </div>
              </div>
            </Link>
          ) : null}
          {(woStats?.unassigned ?? 0) > 0 ? (
            <Link href={`${base}/work-orders`} className="relative group overflow-hidden rounded-2xl border-2 border-orange-500 bg-orange-500 p-6 shadow-xl shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/30 transition-colors" />
              <div className="relative flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-white font-black text-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]">{woStats!.unassigned}</div>
                <div>
                  <div className="text-sm font-black text-white uppercase tracking-widest">ממתינות לשיוך</div>
                  <div className="text-xs text-orange-50 font-bold mt-0.5">קריאות פתוחות ללא טכנאי</div>
                </div>
              </div>
            </Link>
          ) : null}
          {((woStats?.priorityCritical ?? 0) + (woStats?.priorityUrgent ?? 0)) > 0 ? (
            <Link href={`${base}/work-orders`} className="relative group overflow-hidden rounded-2xl border-2 border-rose-600 bg-rose-600 p-6 shadow-xl shadow-rose-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/30 transition-colors" />
              <div className="relative flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-white font-black text-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]">{(woStats?.priorityCritical ?? 0) + (woStats?.priorityUrgent ?? 0)}</div>
                <div>
                  <div className="text-sm font-black text-white uppercase tracking-widest">דחיפות גבוהה</div>
                  <div className="text-xs text-rose-100 font-bold mt-0.5">{woStats?.priorityCritical ?? 0} קריטי, {woStats?.priorityUrgent ?? 0} דחוף</div>
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
            <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                  <Package size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-800 uppercase tracking-tight">קליטת מלאי מהירה</div>
                  <div className="text-[11px] text-slate-500 font-bold">
                    {activeVehicleName ? `מזין לרכב: ${activeVehicleName}` : 'יש לבחור רכב פעיל בהגדרות'}
                  </div>
                </div>
              </div>
              
              <form action={onQuickAddStockAction} className="flex flex-col gap-3">
                <input type="hidden" name="itemId" value={selectedItemId} />
                <div className="w-full">
                  <CustomSelect
                    value={selectedItemId}
                    onChange={(val) => setSelectedItemId(val)}
                    placeholder="בחר פריט..."
                    options={inventoryOptions.map((o) => ({ value: String(o.itemId), label: o.label }))}
                  />
                </div>
                <div className="flex gap-3">
                  <input 
                    name="qty" 
                    type="number" 
                    step="0.001" 
                    min="0.001" 
                    placeholder="כמות" 
                    required 
                    className="flex-1 h-12 rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 text-base font-black text-slate-800 shadow-inner outline-none focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all" 
                  />
                  <button 
                    type="submit" 
                    disabled={!activeVehicleName || !inventoryOptions.length} 
                    className="h-12 rounded-2xl px-8 text-base font-black bg-sky-500 text-white hover:bg-sky-600 shadow-lg shadow-sky-500/25 active:scale-95 transition-all disabled:opacity-40 disabled:grayscale"
                  >
                    קלוט
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
              <div className="text-xs font-black text-slate-700 uppercase mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                  <Plus size={18} strokeWidth={3} />
                </div>
                הוספת פריט חדש למחירון
              </div>
              <form action={onQuickCreateItemAction} className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input name="name" required placeholder="שם הפריט (למשל: ברז ניל 1/2)" className="h-12 rounded-2xl border-2 border-slate-100 bg-white px-4 text-base font-bold text-slate-800 shadow-sm outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100 transition-all" />
                  <input name="sku" placeholder="מק״ט" className="h-12 rounded-2xl border-2 border-slate-100 bg-white px-4 text-base font-bold text-slate-800 shadow-sm outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100 transition-all" />
                </div>
                <div className="flex gap-3">
                  <input name="unit" placeholder="יחידה" className="flex-1 h-12 rounded-2xl border-2 border-slate-100 bg-white px-4 text-base font-bold text-slate-800 shadow-sm outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100 transition-all" />
                  <button type="submit" className="h-12 rounded-2xl px-8 text-base font-black text-slate-700 bg-white border-2 border-slate-200 shadow-sm hover:border-slate-300 hover:bg-slate-50 active:scale-95 transition-all">צור</button>
                </div>
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
