export const dynamic = 'force-dynamic';

import { getConnectOfferByToken } from '@/app/actions/connect-marketplace';
import OfferInterestedClient from './OfferInterestedClient';

function formatPrice(price: string | null): { label: string; className: string } {
  if (!price) {
    return { label: 'ללא עלות / העברה', className: 'bg-emerald-50 text-emerald-800 border border-emerald-200' };
  }

  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) {
    return { label: 'ללא עלות / העברה', className: 'bg-emerald-50 text-emerald-800 border border-emerald-200' };
  }

  return {
    label: `₪${n.toLocaleString('he-IL')}`,
    className: 'bg-slate-900 text-white border border-slate-900',
  };
}

function formatStatus(status: string): { label: string; className: string; isClosed: boolean } {
  const s = String(status || '').toUpperCase();
  if (s === 'APPROVED') return { label: 'אושר', className: 'bg-emerald-50 text-emerald-800 border border-emerald-200', isClosed: false };
  if (s === 'INTERESTED') return { label: 'ממתין לאישור בעל הליד', className: 'bg-amber-50 text-amber-800 border border-amber-200', isClosed: false };
  if (s === 'LISTED') return { label: 'זמין', className: 'bg-sky-50 text-sky-800 border border-sky-200', isClosed: false };
  if (s === 'SOLD' || s === 'CLOSED') return { label: 'נסגר / לא רלוונטי', className: 'bg-slate-50 text-slate-700 border border-slate-200', isClosed: true };
  return { label: status, className: 'bg-slate-50 text-slate-700 border border-slate-200', isClosed: false };
}

export default async function ConnectOfferPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const res = await getConnectOfferByToken({ token: String(token) });
  if (!res.ok) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
        <div className="mx-auto w-full max-w-lg px-4 py-10">
          <div className="rounded-[1.75rem] border border-rose-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-rose-100">
              <div className="text-xs font-black text-rose-700">MISRAD Connect</div>
              <div className="text-xl font-black text-rose-900 mt-1">הקישור לא תקין</div>
              <div className="text-sm font-bold text-rose-800 mt-2">{res.message || 'הטוקן לא תקין או פג תוקף'}</div>
            </div>
            <div className="p-5">
              <div className="text-sm font-bold text-slate-600">אם זה אמור לעבוד—בקש קישור חדש ממי ששלח לך את ההצעה.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const offer = res.offer;
  const price = formatPrice(offer.price);
  const st = formatStatus(offer.status);

  const publicDescription = String(offer.publicDescription || '').trim();
  const area = String(offer.targetGeo || offer.lead.installationAddress || '').trim();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      <div className="mx-auto w-full max-w-lg px-4 py-8">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="text-xs font-black text-slate-500">MISRAD Connect</div>
            <div className="text-2xl font-black text-slate-900 mt-1">הזדמנות עבודה</div>
            <div className="text-sm font-bold text-slate-600 mt-2">העברת ליד בצורה בטוחה — בלי חשיפת פרטים רגישים עד אישור.</div>

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
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-black text-slate-500">תיאור</div>
              <div className="mt-2 text-sm font-bold text-slate-800 whitespace-pre-wrap">{publicDescription || '—'}</div>
            </div>

            {st.isClosed ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-black text-slate-900">הצעה זו כבר לא זמינה</div>
                <div className="text-sm font-bold text-slate-600 mt-1">אם קיבלת את זה בטעות—בקש קישור חדש.</div>
              </div>
            ) : (
              <OfferInterestedClient token={String(offer.token)} disabled={offer.status === 'INTERESTED'} />
            )}

            {offer.status === 'INTERESTED' ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-sm font-black text-amber-900">כבר הוגשה בקשה</div>
                <div className="text-sm font-bold text-amber-800 mt-1">הבקשה כבר נשלחה לבעל הליד. המתן לאישור.</div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-black text-slate-500">פרטיות</div>
              <div className="mt-2 text-sm font-bold text-slate-700">
                מספר הטלפון והפרטים המלאים של הלקוח ייחשפו רק אחרי שבעל הליד יאשר.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-slate-500">הקישור הזה אישי—אל תשתף אותו.</div>
      </div>
    </div>
  );
}
