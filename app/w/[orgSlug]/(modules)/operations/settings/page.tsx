export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

import {
  createOperationsLocation,
  createOperationsWorkOrderType,
  deleteOperationsLocation,
  deleteOperationsWorkOrderType,
  getOperationsLocations,
  getOperationsWorkOrderTypes,
} from '@/app/actions/operations';

export default async function OperationsSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug } = await params;
  const sp = (await searchParams) ?? {};
  const errorRaw = sp.error;
  const error = errorRaw ? String(Array.isArray(errorRaw) ? errorRaw[0] : errorRaw) : null;

  const base = `/w/${encodeURIComponent(orgSlug)}/operations`;

  const [locationsRes, typesRes] = await Promise.all([
    getOperationsLocations({ orgSlug }),
    getOperationsWorkOrderTypes({ orgSlug }),
  ]);

  const locations = locationsRes.success ? locationsRes.data ?? [] : [];
  const types = typesRes.success ? typesRes.data ?? [] : [];

  async function addLocationAction(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '');
    const res = await createOperationsLocation({ orgSlug, name });
    if (!res.success) {
      redirect(`${base}/settings?error=${encodeURIComponent(res.error || 'שגיאה בהוספת מחסן')}`);
    }
    redirect(`${base}/settings`);
  }

  async function deleteLocationAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const res = await deleteOperationsLocation({ orgSlug, id });
    if (!res.success) {
      redirect(`${base}/settings?error=${encodeURIComponent(res.error || 'שגיאה במחיקת מחסן')}`);
    }
    redirect(`${base}/settings`);
  }

  async function addTypeAction(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '');
    const res = await createOperationsWorkOrderType({ orgSlug, name });
    if (!res.success) {
      redirect(`${base}/settings?error=${encodeURIComponent(res.error || 'שגיאה בהוספת סוג קריאה')}`);
    }
    redirect(`${base}/settings`);
  }

  async function deleteTypeAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const res = await deleteOperationsWorkOrderType({ orgSlug, id });
    if (!res.success) {
      redirect(`${base}/settings?error=${encodeURIComponent(res.error || 'שגיאה במחיקת סוג קריאה')}`);
    }
    redirect(`${base}/settings`);
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <section className="bg-white/80 backdrop-blur rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="text-sm font-black text-slate-900">הגדרות</div>
          <div className="text-xs text-slate-500 mt-1">ניהול מחסנים וסוגי קריאות שירות</div>
        </div>

        {error ? (
          <div className="p-4 border-b border-rose-100 bg-rose-50 text-rose-800 text-sm font-bold">{error}</div>
        ) : null}

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-black text-slate-700">מחסנים (Locations)</div>
            <form action={addLocationAction} className="mt-3 flex gap-2">
              <input
                name="name"
                placeholder="שם מחסן חדש"
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                הוסף
              </button>
            </form>

            <div className="mt-4 space-y-2">
              {locations.length ? (
                locations.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900 truncate">{l.name}</div>
                      <div className="text-[11px] text-slate-500 mt-1">נוצר: {new Date(l.createdAt).toLocaleString('he-IL')}</div>
                    </div>
                    <form action={deleteLocationAction}>
                      <input type="hidden" name="id" value={l.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-2xl px-3 py-2 text-xs font-black bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 transition-colors"
                      >
                        מחק
                      </button>
                    </form>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">אין עדיין מחסנים</div>
              )}

              {!locationsRes.success ? (
                <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  {locationsRes.error || 'שגיאה בטעינת מחסנים'}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-black text-slate-700">סוגי קריאות (Types)</div>
            <form action={addTypeAction} className="mt-3 flex gap-2">
              <input
                name="name"
                placeholder="שם סוג קריאה חדש"
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                הוסף
              </button>
            </form>

            <div className="mt-4 space-y-2">
              {types.length ? (
                types.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900 truncate">{t.name}</div>
                      <div className="text-[11px] text-slate-500 mt-1">נוצר: {new Date(t.createdAt).toLocaleString('he-IL')}</div>
                    </div>
                    <form action={deleteTypeAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-2xl px-3 py-2 text-xs font-black bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 transition-colors"
                      >
                        מחק
                      </button>
                    </form>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">אין עדיין סוגי קריאות</div>
              )}

              {!typesRes.success ? (
                <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  {typesRes.error || 'שגיאה בטעינת סוגי קריאות'}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
