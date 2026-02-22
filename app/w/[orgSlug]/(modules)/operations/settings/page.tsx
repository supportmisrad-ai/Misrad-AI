// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

import { redirect } from 'next/navigation';

import { ConfirmDeleteButton } from '@/components/operations/ConfirmDeleteButton';
import {
  createOperationsBuilding,
  createOperationsCallCategory,
  createOperationsDepartment,
  createOperationsLocation,
  createOperationsVehicle,
  createOperationsWorkOrderType,
  deleteOperationsBuilding,
  deleteOperationsCallCategory,
  deleteOperationsDepartment,
  deleteOperationsLocation,
  deleteOperationsVehicle,
  deleteOperationsWorkOrderType,
  getOperationsBuildings,
  getOperationsCallCategories,
  getOperationsDepartments,
  getOperationsLocations,
  getOperationsVehicles,
  getOperationsWorkOrderTypes,
} from '@/app/actions/operations';

const inputCls = 'flex-1 h-10 rounded-lg border border-slate-200/80 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all duration-150 hover:border-slate-300 focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100 placeholder:text-slate-400';
const btnAddCls = 'shrink-0 h-10 inline-flex items-center justify-center rounded-lg px-4 text-sm font-bold bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-all duration-150';
const btnDelCls = 'shrink-0 inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 bg-white border border-rose-200/60 shadow-sm hover:bg-rose-50 hover:border-rose-300 transition-all duration-150';
const cardCls = 'rounded-xl border border-slate-200/60 bg-white p-4';
const rowCls = 'flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-2.5';
const sectionTitleCls = 'text-xs font-semibold text-slate-600';

export default async function OperationsSettingsPage({
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
  const errorRaw = sp.error;
  const error = errorRaw ? String(Array.isArray(errorRaw) ? errorRaw[0] : errorRaw) : null;

  const base = `/w/${encodeURIComponent(orgSlug)}/operations`;

  const [locationsRes, typesRes, vehiclesRes, categoriesRes, buildingsRes, departmentsRes] = await Promise.all([
    getOperationsLocations({ orgSlug }),
    getOperationsWorkOrderTypes({ orgSlug }),
    getOperationsVehicles({ orgSlug }),
    getOperationsCallCategories({ orgSlug }),
    getOperationsBuildings({ orgSlug }),
    getOperationsDepartments({ orgSlug }),
  ]);

  const locations = locationsRes.success ? locationsRes.data ?? [] : [];
  const types = typesRes.success ? typesRes.data ?? [] : [];
  const vehicles = vehiclesRes.success ? vehiclesRes.data ?? [] : [];
  const categories = categoriesRes.success ? categoriesRes.data ?? [] : [];
  const buildings = buildingsRes.success ? buildingsRes.data ?? [] : [];
  const departments = departmentsRes.success ? departmentsRes.data ?? [] : [];

  // ──── Server Actions ────

  async function addCategoryAction(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '');
    const color = String(formData.get('color') || '') || null;
    const slaRaw = String(formData.get('sla') || '');
    const maxResponseMinutes = slaRaw ? parseInt(slaRaw, 10) : null;
    const res = await createOperationsCallCategory({ orgSlug, name, color, maxResponseMinutes: Number.isFinite(maxResponseMinutes) ? maxResponseMinutes : null });
    if (!res.success) redirect(`${base}/settings?error=${encodeURIComponent(res.error || 'שגיאה בהוספת קטגוריה')}`);
    redirect(`${base}/settings`);
  }

  async function deleteCategoryAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const res = await deleteOperationsCallCategory({ orgSlug, id });
    if (!res.success) redirect(`${base}/settings?error=${encodeURIComponent(res.error || 'שגיאה במחיקת קטגוריה')}`);
    redirect(`${base}/settings`);
  }

  async function addBuildingAction(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '');
    const address = String(formData.get('address') || '') || null;
    const floorsRaw = String(formData.get('floors') || '');
    const floors = floorsRaw ? parseInt(floorsRaw, 10) : null;
    const res = await createOperationsBuilding({ orgSlug, name, address, floors: Number.isFinite(floors) ? floors : null });
    if (!res.success) redirect(`${base}/settings?error=${encodeURIComponent(res.error || 'שגיאה בהוספת מבנה')}`);
    redirect(`${base}/settings`);
  }

  async function deleteBuildingAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const res = await deleteOperationsBuilding({ orgSlug, id });
    if (!res.success) redirect(`${base}/settings?error=${encodeURIComponent(res.error || 'שגיאה במחיקת מבנה')}`);
    redirect(`${base}/settings`);
  }

  async function addDepartmentAction(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '');
    const color = String(formData.get('color') || '') || null;
    const res = await createOperationsDepartment({ orgSlug, name, color });
    if (!res.success) redirect(`${base}/settings?error=${encodeURIComponent(res.error || 'שגיאה בהוספת מחלקה')}`);
    redirect(`${base}/settings`);
  }

  async function deleteDepartmentAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const res = await deleteOperationsDepartment({ orgSlug, id });
    if (!res.success) redirect(`${base}/settings?error=${encodeURIComponent(res.error || 'שגיאה במחיקת מחלקה')}`);
    redirect(`${base}/settings`);
  }

  async function addLocationAction(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '');
    const res = await createOperationsLocation({ orgSlug, name });
    if (!res.success) redirect(`${base}/settings?error=${encodeURIComponent(res.error || 'שגיאה בהוספת מחסן')}`);
    redirect(`${base}/settings`);
  }

  async function deleteLocationAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const res = await deleteOperationsLocation({ orgSlug, id });
    if (!res.success) redirect(`${base}/settings?error=${encodeURIComponent(res.error || 'שגיאה במחיקת מחסן')}`);
    redirect(`${base}/settings`);
  }

  async function addVehicleAction(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '');
    const res = await createOperationsVehicle({ orgSlug, name });
    if (!res.success) redirect(`${base}/settings?error=${encodeURIComponent(res.error || 'שגיאה בהוספת רכב')}`);
    redirect(`${base}/settings`);
  }

  async function deleteVehicleAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const res = await deleteOperationsVehicle({ orgSlug, id });
    if (!res.success) redirect(`${base}/settings?error=${encodeURIComponent(res.error || 'שגיאה במחיקת רכב')}`);
    redirect(`${base}/settings`);
  }

  async function addTypeAction(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '');
    const res = await createOperationsWorkOrderType({ orgSlug, name });
    if (!res.success) redirect(`${base}/settings?error=${encodeURIComponent(res.error || 'שגיאה בהוספת סוג קריאה')}`);
    redirect(`${base}/settings`);
  }

  async function deleteTypeAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const res = await deleteOperationsWorkOrderType({ orgSlug, id });
    if (!res.success) redirect(`${base}/settings?error=${encodeURIComponent(res.error || 'שגיאה במחיקת סוג קריאה')}`);
    redirect(`${base}/settings`);
  }

  function formatSla(minutes: number | null) {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} דק׳`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} שעות ו-${m} דק׳` : `${h} שעות`;
  }


  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{error}</div>
      ) : null}

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
            <form action={addCategoryAction} className="mt-3 flex flex-wrap gap-2">
              <input name="name" placeholder="שם קטגוריה" required className={inputCls} />
              <input name="sla" type="number" min="1" placeholder="SLA (דקות)" className={`${inputCls} max-w-[140px]`} />
              <input name="color" type="color" defaultValue="#3b82f6" className="h-10 w-10 rounded-lg border border-slate-200/80 cursor-pointer shadow-sm" title="צבע" />
              <button type="submit" className={btnAddCls}>הוסף</button>
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
                  <ConfirmDeleteButton id={c.id} action={deleteCategoryAction} className={btnDelCls} confirmMessage={`האם למחוק את הקטגוריה "${c.name}"?`} />
                </div>
              )) : <div className="text-sm text-slate-500">אין עדיין קטגוריות</div>}
            </div>
          </div>

          {/* מבנים */}
          <div className={cardCls}>
            <div className={sectionTitleCls}>מבנים</div>
            <form action={addBuildingAction} className="mt-3 flex flex-col gap-2">
              <div className="flex gap-2">
                <input name="name" placeholder="שם מבנה" required className={inputCls} />
                <input name="floors" type="number" min="1" placeholder="קומות" className={`${inputCls} max-w-[100px]`} />
              </div>
              <div className="flex gap-2">
                <input name="address" placeholder="כתובת (אופציונלי)" className={inputCls} />
                <button type="submit" className={btnAddCls}>הוסף</button>
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
                  <ConfirmDeleteButton id={b.id} action={deleteBuildingAction} className={btnDelCls} confirmMessage={`האם למחוק את המבנה "${b.name}"?`} />
                </div>
              )) : <div className="text-sm text-slate-500">אין עדיין מבנים</div>}
            </div>
          </div>

          {/* מחלקות */}
          <div className={cardCls}>
            <div className={sectionTitleCls}>מחלקות</div>
            <form action={addDepartmentAction} className="mt-3 flex gap-2">
              <input name="name" placeholder="שם מחלקה" required className={inputCls} />
              <input name="color" type="color" defaultValue="#8b5cf6" className="h-10 w-10 rounded-lg border border-slate-200/80 cursor-pointer shadow-sm" title="צבע" />
              <button type="submit" className={btnAddCls}>הוסף</button>
            </form>

            <div className="mt-4 space-y-2">
              {departments.length ? departments.map((d) => (
                <div key={d.id} className={rowCls}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color || '#94a3b8' }} />
                    <div className="text-sm font-black text-slate-900 truncate">{d.name}</div>
                  </div>
                  <ConfirmDeleteButton id={d.id} action={deleteDepartmentAction} className={btnDelCls} confirmMessage={`האם למחוק את המחלקה "${d.name}"?`} />
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
            <form action={addLocationAction} className="mt-3 flex gap-2">
              <input name="name" placeholder="שם מחסן חדש" className={inputCls} />
              <button type="submit" className={btnAddCls}>הוסף</button>
            </form>
            <div className="mt-4 space-y-2">
              {locations.length ? locations.map((l) => (
                <div key={l.id} className={rowCls}>
                  <div className="text-sm font-black text-slate-900 truncate">{l.name}</div>
                  <ConfirmDeleteButton id={l.id} action={deleteLocationAction} className={btnDelCls} confirmMessage={`האם למחוק את המחסן "${l.name}"?`} />
                </div>
              )) : <div className="text-sm text-slate-500">אין עדיין מחסנים</div>}
            </div>
          </div>

          {/* רכבים */}
          <div className={cardCls}>
            <div className={sectionTitleCls}>רכבים</div>
            <form action={addVehicleAction} className="mt-3 flex gap-2">
              <input name="name" placeholder="שם רכב חדש" className={inputCls} />
              <button type="submit" className={btnAddCls}>הוסף</button>
            </form>
            <div className="mt-4 space-y-2">
              {vehicles.length ? vehicles.map((v) => (
                <div key={v.id} className={rowCls}>
                  <div className="text-sm font-black text-slate-900 truncate">{v.name}</div>
                  <ConfirmDeleteButton id={v.id} action={deleteVehicleAction} className={btnDelCls} confirmMessage={`האם למחוק את הרכב "${v.name}"?`} />
                </div>
              )) : <div className="text-sm text-slate-500">אין עדיין רכבים</div>}
            </div>
          </div>

          {/* סוגי קריאות */}
          <div className={cardCls}>
            <div className={sectionTitleCls}>סוגי קריאות</div>
            <form action={addTypeAction} className="mt-3 flex gap-2">
              <input name="name" placeholder="סוג קריאה חדש" className={inputCls} />
              <button type="submit" className={btnAddCls}>הוסף</button>
            </form>
            <div className="mt-4 space-y-2">
              {types.length ? types.map((t) => (
                <div key={t.id} className={rowCls}>
                  <div className="text-sm font-black text-slate-900 truncate">{t.name}</div>
                  <ConfirmDeleteButton id={t.id} action={deleteTypeAction} className={btnDelCls} confirmMessage={`האם למחוק את סוג הקריאה "${t.name}"?`} />
                </div>
              )) : <div className="text-sm text-slate-500">אין עדיין סוגי קריאות</div>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
