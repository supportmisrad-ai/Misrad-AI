// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

import { createOperationsItem, getOperationsInventoryData } from '@/app/actions/operations';
import { ExportInventoryCsvButton } from '@/components/operations/ExportButtons';
import { FormPendingButton } from '@/components/operations/FormPendingButton';
import { InventoryItemActions } from '@/components/operations/InventoryItemActions';
import { InventoryCsvImport } from '@/components/operations/InventoryCsvImport';
import VisionIdentifyFillSearch from '@/components/operations/VisionIdentifyFillSearch';
import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

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
  const lowStockItems = items.filter((i) => isLowStock(i.onHand, i.minLevel));
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

      {lowStockItems.length > 0 ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-black text-amber-800">התראת מלאי נמוך</div>
            <div className="text-xs text-amber-700 mt-1">
              {lowStockItems.length === 1
                ? `הפריט "${lowStockItems[0].itemName}" מתחת לכמות המינימום (${lowStockItems[0].onHand}/${lowStockItems[0].minLevel})`
                : `${lowStockItems.length} פריטים מתחת לכמות המינימום: ${lowStockItems.slice(0, 3).map((i) => i.itemName).join(', ')}${lowStockItems.length > 3 ? ` ועוד ${lowStockItems.length - 3}` : ''}`}
            </div>
          </div>
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
              <FormPendingButton
                pendingText="יוצר פריט..."
                className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-colors disabled:opacity-50"
              >
                צור פריט
              </FormPendingButton>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
