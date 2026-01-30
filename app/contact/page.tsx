import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export const dynamic = 'force-dynamic';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <Navbar />
      <main className="pt-24">
        <section className="relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[520px] h-[520px] bg-emerald-200/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 w-[620px] h-[620px] bg-amber-200/25 rounded-full blur-[140px] pointer-events-none" />
          <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
              <span>צור קשר</span>
            </div>
            <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black leading-tight">
              דבר איתנו
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900">
                נחזור אליך מהר
              </span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">
              לכל שאלה, בקשה או נושא טכני — אנחנו זמינים ונחזור אליך בהקדם.
            </p>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
                <div className="text-sm font-black text-slate-900 mb-4">פרטים</div>
                <div className="space-y-2 text-sm text-slate-600">
                  <div><span className="font-bold text-slate-900">אימייל:</span> support@misrad-ai.com</div>
                  <div><span className="font-bold text-slate-900">זמינות:</span> א׳-ה׳ 09:00-18:00</div>
                </div>
                <div className="mt-6 flex gap-3">
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold shadow-lg shadow-slate-900/10"
                  >
                    מחירון
                  </Link>
                  <Link
                    href="/subscribe/checkout"
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                  >
                    תשלום
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
                <div className="text-sm font-black text-slate-900 mb-4">שלח הודעה</div>
                <form className="space-y-3">
                  <input
                    name="name"
                    placeholder="שם מלא"
                    className="w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400"
                  />
                  <input
                    name="email"
                    type="email"
                    placeholder="אימייל"
                    className="w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 dir-ltr"
                  />
                  <textarea
                    name="message"
                    placeholder="במה אפשר לעזור?"
                    rows={5}
                    className="w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    className="w-full rounded-xl bg-slate-900 text-white font-bold px-6 py-3 shadow-lg shadow-slate-900/10"
                  >
                    שלח
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
