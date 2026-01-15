import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export const dynamic = 'force-dynamic';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <Navbar />
      <main className="pt-24">
        <section className="relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[520px] h-[520px] bg-amber-200/30 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 w-[620px] h-[620px] bg-rose-200/25 rounded-full blur-[140px] pointer-events-none" />
          <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
              <span>אודות</span>
            </div>
            <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black leading-tight">
              MISRAD CRM
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900">
                מערכת שנבנתה לעבודה אמיתית
              </span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">
              דף זה הוא placeholder זמני. כאן יופיע הסיפור שלנו, העקרונות שמנחים אותנו, והדרך שבה אנחנו בונים מוצר שמכבד את הזמן של העסק.
            </p>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
                <div className="text-xs font-black text-slate-500">גישה</div>
                <div className="mt-2 text-lg font-black">פשוט. חד. ממוקד.</div>
                <div className="mt-2 text-sm text-slate-600">בלי רעש, בלי עודף פיצ׳רים, רק מה שגורם לדברים לזוז.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
                <div className="text-xs font-black text-slate-500">עיצוב</div>
                <div className="mt-2 text-lg font-black">Luxury Light</div>
                <div className="mt-2 text-sm text-slate-600">מערכת שנראית כמו מוצר פרימיום, ונשארת קריאה ונוחה כל היום.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
                <div className="text-xs font-black text-slate-500">ביצועים</div>
                <div className="mt-2 text-lg font-black">מהירות ויציבות</div>
                <div className="mt-2 text-sm text-slate-600">תהליכים קצרים, UI זורם, ותוצאות שמגיעות מהר.</div>
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-slate-900 text-white font-bold shadow-xl shadow-slate-900/10"
              >
                לראות מחירים
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
              >
                צור קשר
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
