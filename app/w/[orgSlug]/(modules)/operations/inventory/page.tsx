export const dynamic = 'force-dynamic';

import { getOperationsInventoryData } from '@/app/actions/operations';
import VisionIdentifyFillSearch from '@/components/operations/VisionIdentifyFillSearch';

function isLowStock(onHand: number, minLevel: number): boolean {
  if (minLevel <= 0) return false;
  return onHand < minLevel;
}

export default async function OperationsInventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug } = await params;
  const sp = (await searchParams) ?? {};
  const qRaw = sp.q;
  const q = qRaw ? String(Array.isArray(qRaw) ? qRaw[0] : qRaw).trim() : '';

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
      <section className="bg-white/80 backdrop-blur rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
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
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
              />
              <VisionIdentifyFillSearch formId="ops-inventory-search-form" inputName="q" orgSlug={orgSlug} />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-slate-900 text-white hover:bg-slate-800 transition-colors"
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
                          <div className="text-xs text-slate-500 mt-1">מק\"ט: {i.sku ? i.sku : '—'}</div>
                        </div>
                        <div className={low ? 'text-sm font-black text-rose-700' : 'text-sm font-black text-slate-700'}>
                          {i.onHand}
                        </div>
                      </div>

                      <div className="mt-3 text-xs font-bold text-slate-600">
                        מינימום: {i.minLevel}
                      </div>
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
                    <th className="pb-3 font-bold">מק\"ט</th>
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
