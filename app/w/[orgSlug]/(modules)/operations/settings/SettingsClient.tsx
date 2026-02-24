'use client';

import React, { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ConfirmDeleteButton } from '@/components/operations/ConfirmDeleteButton';
import { useOpsToast } from '@/components/operations/OperationsToastProvider';
import type {
  OperationsCallCategoryRow,
  OperationsBuildingRow,
  OperationsDepartmentRow,
  OperationsLocationRow,
  OperationsVehicleRow,
  OperationsWorkOrderTypeRow,
} from '@/lib/services/operations/types';

const inputCls = 'flex-1 h-10 rounded-lg border border-slate-200/80 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all duration-150 hover:border-slate-300 focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100 placeholder:text-slate-400';
const btnAddCls = 'shrink-0 h-10 inline-flex items-center justify-center rounded-lg px-4 text-sm font-bold bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-all duration-150 disabled:opacity-50';
const btnDelCls = 'shrink-0 inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 bg-white border border-rose-200/60 shadow-sm hover:bg-rose-50 hover:border-rose-300 transition-all duration-150';
const cardCls = 'rounded-xl border border-slate-200/60 bg-white p-4';
const rowCls = 'flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-2.5';
const sectionTitleCls = 'text-xs font-semibold text-slate-600';

interface SettingsClientProps {
  orgSlug: string;
  categories: OperationsCallCategoryRow[];
  buildings: OperationsBuildingRow[];
  departments: OperationsDepartmentRow[];
  locations: OperationsLocationRow[];
  vehicles: OperationsVehicleRow[];
  types: OperationsWorkOrderTypeRow[];
  addCategoryAction: (formData: FormData) => Promise<void>;
  deleteCategoryAction: (formData: FormData) => Promise<void>;
  addBuildingAction: (formData: FormData) => Promise<void>;
  deleteBuildingAction: (formData: FormData) => Promise<void>;
  addDepartmentAction: (formData: FormData) => Promise<void>;
  deleteDepartmentAction: (formData: FormData) => Promise<void>;
  addLocationAction: (formData: FormData) => Promise<void>;
  deleteLocationAction: (formData: FormData) => Promise<void>;
  addVehicleAction: (formData: FormData) => Promise<void>;
  deleteVehicleAction: (formData: FormData) => Promise<void>;
  addTypeAction: (formData: FormData) => Promise<void>;
  deleteTypeAction: (formData: FormData) => Promise<void>;
}

function InlineSubmitButton({ label, isPending }: { label: string; isPending: boolean }) {
  return (
    <button type="submit" disabled={isPending} className={btnAddCls}>
      {isPending ? <Loader2 size={14} className="animate-spin" /> : label}
    </button>
  );
}

function formatSla(minutes: number | null) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} דק׳`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} שעות ו-${m} דק׳` : `${h} שעות`;
}

export default function SettingsClient({
  categories,
  buildings,
  departments,
  locations,
  vehicles,
  types,
  addCategoryAction,
  deleteCategoryAction,
  addBuildingAction,
  deleteBuildingAction,
  addDepartmentAction,
  deleteDepartmentAction,
  addLocationAction,
  deleteLocationAction,
  addVehicleAction,
  deleteVehicleAction,
  addTypeAction,
  deleteTypeAction,
}: SettingsClientProps) {
  const { toast } = useOpsToast();
  const router = useRouter();
  const [pendingSection, setPendingSection] = useState<string | null>(null);

  const wrapAction = useCallback(
    (action: (formData: FormData) => Promise<void>, section: string, successMsg: string) => {
      return async (formData: FormData) => {
        setPendingSection(section);
        try {
          await action(formData);
          toast(successMsg, 'success');
          router.refresh();
        } catch {
          toast('שגיאה בביצוע הפעולה', 'error');
        } finally {
          setPendingSection(null);
        }
      };
    },
    [toast, router],
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* ──── קריאות שירות ──── */}
      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="text-sm font-bold text-slate-800">קריאות שירות</div>
          <div className="text-xs text-slate-400 mt-0.5">קטגוריות תחזוקה, מבנים ומחלקות</div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* קטגוריות */}
          <div className={`${cardCls} lg:col-span-2`}>
            <div className={sectionTitleCls}>קטגוריות תחזוקה</div>
            <div className="text-[11px] text-slate-500 mt-0.5">לכל קטגוריה ניתן להגדיר SLA (זמן תגובה מקסימלי)</div>
            <form action={wrapAction(addCategoryAction, 'addCategory', 'קטגוריה נוספה בהצלחה')} className="mt-3 flex flex-wrap gap-2">
              <input name="name" placeholder="שם קטגוריה" required className={inputCls} />
              <input name="sla" type="number" min="1" placeholder="SLA (דקות)" className={`${inputCls} max-w-[140px]`} />
              <input name="color" type="color" defaultValue="#3b82f6" className="h-10 w-10 rounded-lg border border-slate-200/80 cursor-pointer shadow-sm" title="צבע" />
              <InlineSubmitButton label="הוסף" isPending={pendingSection === 'addCategory'} />
            </form>

            <div className="mt-4 space-y-2">
              {categories.length ? categories.map((c) => (
                <div key={c.id} className={rowCls}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color || '#94a3b8' }} />
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900 truncate">{c.name}</div>
                      {c.maxResponseMinutes ? (
                        <div className="text-[11px] text-slate-500 mt-0.5">SLA: {formatSla(c.maxResponseMinutes)}</div>
                      ) : null}
                    </div>
                  </div>
                  <ConfirmDeleteButton id={c.id} action={wrapAction(deleteCategoryAction, `delCat-${c.id}`, 'קטגוריה נמחקה')} className={btnDelCls} confirmMessage={`האם למחוק את הקטגוריה "${c.name}"?`} />
                </div>
              )) : <div className="text-sm text-slate-500">אין עדיין קטגוריות</div>}
            </div>
          </div>

          {/* מבנים */}
          <div className={cardCls}>
            <div className={sectionTitleCls}>מבנים</div>
            <form action={wrapAction(addBuildingAction, 'addBuilding', 'מבנה נוסף בהצלחה')} className="mt-3 flex flex-col gap-2">
              <div className="flex gap-2">
                <input name="name" placeholder="שם מבנה" required className={inputCls} />
                <input name="floors" type="number" min="1" placeholder="קומות" className={`${inputCls} max-w-[100px]`} />
              </div>
              <div className="flex gap-2">
                <input name="address" placeholder="כתובת (אופציונלי)" className={inputCls} />
                <InlineSubmitButton label="הוסף" isPending={pendingSection === 'addBuilding'} />
              </div>
            </form>

            <div className="mt-4 space-y-2">
              {buildings.length ? buildings.map((b) => (
                <div key={b.id} className={rowCls}>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-900 truncate">{b.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {[b.address, b.floors ? `${b.floors} קומות` : null].filter(Boolean).join(' · ') || 'ללא פרטים נוספים'}
                    </div>
                  </div>
                  <ConfirmDeleteButton id={b.id} action={wrapAction(deleteBuildingAction, `delBuild-${b.id}`, 'מבנה נמחק')} className={btnDelCls} confirmMessage={`האם למחוק את המבנה "${b.name}"?`} />
                </div>
              )) : <div className="text-sm text-slate-500">אין עדיין מבנים</div>}
            </div>
          </div>

          {/* מחלקות */}
          <div className={cardCls}>
            <div className={sectionTitleCls}>מחלקות</div>
            <form action={wrapAction(addDepartmentAction, 'addDepartment', 'מחלקה נוספה בהצלחה')} className="mt-3 flex gap-2">
              <input name="name" placeholder="שם מחלקה" required className={inputCls} />
              <input name="color" type="color" defaultValue="#8b5cf6" className="h-10 w-10 rounded-lg border border-slate-200/80 cursor-pointer shadow-sm" title="צבע" />
              <InlineSubmitButton label="הוסף" isPending={pendingSection === 'addDepartment'} />
            </form>

            <div className="mt-4 space-y-2">
              {departments.length ? departments.map((d) => (
                <div key={d.id} className={rowCls}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color || '#94a3b8' }} />
                    <div className="text-sm font-black text-slate-900 truncate">{d.name}</div>
                  </div>
                  <ConfirmDeleteButton id={d.id} action={wrapAction(deleteDepartmentAction, `delDept-${d.id}`, 'מחלקה נמחקה')} className={btnDelCls} confirmMessage={`האם למחוק את המחלקה "${d.name}"?`} />
                </div>
              )) : <div className="text-sm text-slate-500">אין עדיין מחלקות</div>}
            </div>
          </div>
        </div>
      </section>

      {/* ──── מלאי ולוגיסטיקה ──── */}
      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="text-sm font-bold text-slate-800">מלאי ולוגיסטיקה</div>
          <div className="text-xs text-slate-400 mt-0.5">מחסנים, רכבים וסוגי קריאות</div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* מחסנים */}
          <div className={cardCls}>
            <div className={sectionTitleCls}>מחסנים</div>
            <form action={wrapAction(addLocationAction, 'addLocation', 'מחסן נוסף בהצלחה')} className="mt-3 flex gap-2">
              <input name="name" placeholder="שם מחסן חדש" className={inputCls} />
              <InlineSubmitButton label="הוסף" isPending={pendingSection === 'addLocation'} />
            </form>
            <div className="mt-4 space-y-2">
              {locations.length ? locations.map((l) => (
                <div key={l.id} className={rowCls}>
                  <div className="text-sm font-black text-slate-900 truncate">{l.name}</div>
                  <ConfirmDeleteButton id={l.id} action={wrapAction(deleteLocationAction, `delLoc-${l.id}`, 'מחסן נמחק')} className={btnDelCls} confirmMessage={`האם למחוק את המחסן "${l.name}"?`} />
                </div>
              )) : <div className="text-sm text-slate-500">אין עדיין מחסנים</div>}
            </div>
          </div>

          {/* רכבים */}
          <div className={cardCls}>
            <div className={sectionTitleCls}>רכבים</div>
            <form action={wrapAction(addVehicleAction, 'addVehicle', 'רכב נוסף בהצלחה')} className="mt-3 flex gap-2">
              <input name="name" placeholder="שם רכב חדש" className={inputCls} />
              <InlineSubmitButton label="הוסף" isPending={pendingSection === 'addVehicle'} />
            </form>
            <div className="mt-4 space-y-2">
              {vehicles.length ? vehicles.map((v) => (
                <div key={v.id} className={rowCls}>
                  <div className="text-sm font-black text-slate-900 truncate">{v.name}</div>
                  <ConfirmDeleteButton id={v.id} action={wrapAction(deleteVehicleAction, `delVeh-${v.id}`, 'רכב נמחק')} className={btnDelCls} confirmMessage={`האם למחוק את הרכב "${v.name}"?`} />
                </div>
              )) : <div className="text-sm text-slate-500">אין עדיין רכבים</div>}
            </div>
          </div>

          {/* סוגי קריאות */}
          <div className={cardCls}>
            <div className={sectionTitleCls}>סוגי קריאות</div>
            <form action={wrapAction(addTypeAction, 'addType', 'סוג קריאה נוסף בהצלחה')} className="mt-3 flex gap-2">
              <input name="name" placeholder="סוג קריאה חדש" className={inputCls} />
              <InlineSubmitButton label="הוסף" isPending={pendingSection === 'addType'} />
            </form>
            <div className="mt-4 space-y-2">
              {types.length ? types.map((t) => (
                <div key={t.id} className={rowCls}>
                  <div className="text-sm font-black text-slate-900 truncate">{t.name}</div>
                  <ConfirmDeleteButton id={t.id} action={wrapAction(deleteTypeAction, `delType-${t.id}`, 'סוג קריאה נמחק')} className={btnDelCls} confirmMessage={`האם למחוק את סוג הקריאה "${t.name}"?`} />
                </div>
              )) : <div className="text-sm text-slate-500">אין עדיין סוגי קריאות</div>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
