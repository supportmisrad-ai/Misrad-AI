// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

import { createOperationsItem, getOperationsInventoryData } from '@/app/actions/operations';
import VisionIdentifyFillSearch from '@/components/operations/VisionIdentifyFillSearch';
import { redirect } from 'next/navigation';

function isLowStock(onHand: number, minLevel: number): boolean {
  if (minLevel <= 0) return false;
  return onHand < minLevel;
}

export default async function OperationsInventoryPage({
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
  const qRaw = sp.q;
  const q = qRaw ? String(Array.isArray(qRaw) ? qRaw[0] : qRaw).trim() : '';

  const flashRaw = sp.flash;
  const flash = flashRaw ? String(Array.isArray(flashRaw) ? flashRaw[0] : flashRaw) : null;

  const base = `/w/${encodeURIComponent(orgSlug)}/operations`;

  async function createItemAction(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '').trim();
    const sku = String(formData.get('sku') || '').trim();
    const unit = String(formData.get('unit') || '').trim();

    const res = await createOperationsItem({
      orgSlug,
      name,
      sku: sku ? sku : null,
      unit: unit ? unit : null,
    });

    if (!res.success) {
      redirect(`${base}/inventory?flash=${encodeURIComponent(res.error || 'שגיאה ביצירת פריט')}`);
    }
    redirect(`${base}/inventory?flash=${encodeURIComponent('נוצר פריט חדש')}`);
  }

  const res = await getOperationsInventoryData({ orgSlug });
  const items = res.success ? res.data?.items ?? [] : [];
  const qLower = q.toLowerCase();
  const filteredItems = qLower
    ? items.filter((i) => {
        const name = String(i.itemName || '').toLowerCase();
        const sku = String(i.sku || '').toLowerCase();
        return name.includes(qLower) || sku.includes(qLower);
      })
    : items;

  return (
    <div className="mx-auto w-full max-w-6xl">
      {flash ? (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 text-sm font-black text-slate-900">
          {flash}
        </div>
      ) : null}

      <section className="mb-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="text-sm font-black text-slate-900">הוספת פריט חדש</div>
          <div className="text-xs text-slate-500 mt-1">לאחר יצירה הפריט יופיע ברשימת המלאי ובבחירות של קליטת מלאי.</div>
        </div>
        <div className="p-5">
          <form action={createItemAction} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <input
                name="name"
                required
                placeholder={'שם פריט'}
                className="w-full h-11 rounded-xl border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all duration-150 hover:border-slate-300 hover:shadow focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100"
              />
            </div>
            <div>
              <input
                name="sku"
                placeholder={'מק"ט (אופציונלי)'}
                className="w-full h-11 rounded-xl border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all duration-150 hover:border-slate-300 hover:shadow focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100"
              />
            </div>
            <div>
              <input
                name="unit"
                placeholder={'יחידה (אופציונלי)'}
                className="w-full h-11 rounded-xl border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all duration-150 hover:border-slate-300 hover:shadow focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100"
              />
            </div>
            <div className="md:col-span-4">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-colors"
              >
                צור פריט
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">פריטי מלאי</div>
                <div className="text-xs text-slate-500 mt-1">סך הכל {filteredItems.length} פריטים</div>
              </div>
            </div>

            <form id="ops-inventory-search-form" method="get" className="mt-4 flex items-center gap-2">
              <input
                name="q"
                defaultValue={q}
                placeholder={'חיפוש לפי שם/מק"ט'}
                className="flex-1 h-11 rounded-xl border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all duration-150 hover:border-slate-300 hover:shadow focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100"
              />
              <VisionIdentifyFillSearch formId="ops-inventory-search-form" inputName="q" orgSlug={orgSlug} />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl h-11 px-5 text-sm font-black bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-colors"
              >
                חפש
              </button>
            </form>
          </div>

          <div className="p-5">
            <div className="md:hidden space-y-3">
              {filteredItems.length ? (
                filteredItems.map((i) => {
                  const low = isLowStock(i.onHand, i.minLevel);
                  return (
                    <div
                      key={i.id}
                      className={
                        low
                          ? 'rounded-2xl border border-rose-200 bg-rose-50 p-4'
                          : 'rounded-2xl border border-slate-200 bg-white p-4'
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-black text-slate-900 truncate">{i.itemName}</div>
                          <div className="text-xs text-slate-500 mt-1">מק&quot;ט: {i.sku ? i.sku : '—'}</div>
                        </div>
                        <div className={low ? 'text-sm font-black text-rose-700' : 'text-sm font-black text-slate-700'}>
                          {i.onHand}
                        </div>
                      </div>

                      <div className="mt-3 text-xs font-bold text-slate-600">מינימום: {i.minLevel}</div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                  אין עדיין פריטים להצגה
                </div>
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right text-slate-500">
                    <th className="pb-3 font-bold">שם פריט</th>
                    <th className="pb-3 font-bold">מק&quot;ט</th>
                    <th className="pb-3 font-bold">כמות במלאי</th>
                    <th className="pb-3 font-bold">כמות מינימום</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length ? (
                    filteredItems.map((i) => {
                      const low = isLowStock(i.onHand, i.minLevel);
                      return (
                        <tr
                          key={i.id}
                          className={
                            low
                              ? 'border-t border-rose-100 bg-rose-50/60'
                              : 'border-t border-slate-100'
                          }
                        >
                          <td className="py-3 font-bold text-slate-900">{i.itemName}</td>
                          <td className="py-3 text-slate-600">{i.sku ? i.sku : <span className="text-slate-400">—</span>}</td>
                          <td className={low ? 'py-3 font-black text-rose-700' : 'py-3 font-black text-slate-700'}>
                            {i.onHand}
                          </td>
                          <td className="py-3 text-slate-600">{i.minLevel}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="border-t border-slate-100">
                      <td className="py-6 text-sm text-slate-500" colSpan={4}>
                        אין פריטים להצגה
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {!res.success ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                {res.error || 'שגיאה בטעינת המלאי'}
              </div>
            ) : null}
          </div>
      </section>
    </div>
  );
}
