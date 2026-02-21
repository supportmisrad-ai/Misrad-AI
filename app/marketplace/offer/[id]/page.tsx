// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

import { getPublicWorkListingById } from '@/app/actions/work-listings';
import OfferInterestedClient from './OfferInterestedClient';

function formatPrice(price: string | null): { label: string; className: string } {
  if (!price) {
    return { label: 'מחיר: לא צויין', className: 'bg-slate-50 text-slate-700 border border-slate-200' };
  }

  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) {
    return { label: 'מחיר: לא צויין', className: 'bg-slate-50 text-slate-700 border border-slate-200' };
  }

  return {
    label: `₪${n.toLocaleString('he-IL')}`,
    className: 'bg-slate-900 text-white border border-slate-900',
  };
}

function formatStatus(status: string): { label: string; className: string; isClosed: boolean } {
  const s = String(status || '').toUpperCase();
  if (s === 'ACTIVE') return { label: 'זמין', className: 'bg-emerald-50 text-emerald-800 border border-emerald-200', isClosed: false };
  if (s === 'PENDING') return { label: 'ממתין לאישור', className: 'bg-amber-50 text-amber-800 border border-amber-200', isClosed: false };
  if (s === 'INTERESTED') return { label: 'התקבלה פנייה', className: 'bg-sky-50 text-sky-800 border border-sky-200', isClosed: false };
  if (s === 'CLOSED' || s === 'SOLD') return { label: 'נסגר', className: 'bg-slate-50 text-slate-700 border border-slate-200', isClosed: true };
  return { label: status, className: 'bg-slate-50 text-slate-700 border border-slate-200', isClosed: false };
}

export default async function MarketplaceOfferPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  const res = await getPublicWorkListingById({ id: String(id) });
  if (!res.ok) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
        <div className="mx-auto w-full max-w-lg px-4 py-10">
          <div className="rounded-[1.75rem] border border-rose-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-rose-100">
              <div className="text-xs font-black text-rose-700">MISRAD Marketplace</div>
              <div className="text-xl font-black text-rose-900 mt-1">הקישור לא תקין</div>
              <div className="text-sm font-bold text-rose-800 mt-2">{res.message || 'ההצעה לא קיימת או לא זמינה'}</div>
            </div>
            <div className="p-5">
              <div className="text-sm font-bold text-slate-600">אם זה אמור לעבוד—בקש קישור חדש ממי ששלח לך את ההצעה.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const listing = res.listing;
  const price = formatPrice(listing.price);
  const st = formatStatus(listing.status);
  const area = String(listing.targetGeo || '').trim();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      <div className="mx-auto w-full max-w-lg px-4 py-8">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="text-xs font-black text-slate-500">MISRAD Marketplace</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{String(listing.title || 'הצעת עבודה')}</div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black ${st.className}`}>{st.label}</span>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black ${price.className}`}>{price.label}</span>
              {area ? (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black bg-slate-50 text-slate-700 border border-slate-200">
                  אזור: {area}
                </span>
              ) : null}
            </div>
          </div>

          <div className="p-5 space-y-4">
            {st.isClosed ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-black text-slate-900">הצעה זו כבר לא זמינה</div>
                <div className="text-sm font-bold text-slate-600 mt-1">אם קיבלת את זה בטעות—בקש קישור חדש.</div>
              </div>
            ) : (
              <OfferInterestedClient id={String(listing.id)} disabled={listing.status === 'INTERESTED'} />
            )}

            {listing.status === 'INTERESTED' ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-sm font-black text-amber-900">כבר הוגשה פנייה</div>
                <div className="text-sm font-bold text-amber-800 mt-1">הפרטים כבר נשלחו. המתן שיחזרו אליך.</div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-slate-500">העמוד הזה נועד לצפייה ושיתוף—שמור על פרטיות.</div>
      </div>
    </div>
  );
}
