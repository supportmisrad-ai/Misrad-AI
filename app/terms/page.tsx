import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export const dynamic = 'force-dynamic';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <Navbar />
      <main className="pt-24">
        <section className="relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[520px] h-[520px] bg-rose-200/25 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 w-[620px] h-[620px] bg-amber-200/20 rounded-full blur-[140px] pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6 py-16 sm:py-20 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
              <span>תנאי שימוש</span>
            </div>
            <h1 className="mt-6 text-4xl sm:text-5xl font-black leading-tight">תנאי שימוש</h1>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed">
              דף זה הוא placeholder זמני. לפני השקה נכניס כאן תנאים מלאים ומדויקים.
            </p>

            <div className="mt-10 space-y-4">
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
                <div className="font-black text-slate-900">שימוש בשירות</div>
                <div className="mt-2 text-sm text-slate-600">השירות מיועד לשימוש עסקי. יש להשתמש בו בהתאם לחוק ולהנחיות המוצר.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
                <div className="font-black text-slate-900">תשלומים וחיוב</div>
                <div className="mt-2 text-sm text-slate-600">החיוב מתבצע דרך עמוד התשלום החדש. מחירים עשויים להשתנות בכפוף לעדכון במחירון.</div>
                <div className="mt-4">
                  <Link href="/subscribe/checkout" className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold shadow-lg shadow-slate-900/10">
                    מעבר לתשלום
                  </Link>
                </div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
                <div className="font-black text-slate-900">אחריות</div>
                <div className="mt-2 text-sm text-slate-600">דף זה אינו משפטי ואינו מחייב, והוא יוחלף במסמך רשמי.</div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
