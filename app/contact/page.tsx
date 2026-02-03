import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { Mail, Clock, Send, MessageCircle, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <Navbar />
      <main className="pt-20">
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="absolute -top-24 -right-24 w-[520px] h-[520px] bg-emerald-200/30 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 w-[620px] h-[620px] bg-teal-200/25 rounded-full blur-[140px] pointer-events-none" />
          <div className="max-w-5xl mx-auto px-6 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/50 text-emerald-700 text-xs font-black shadow-sm">
              <MessageCircle size={14} />
              <span>צור קשר</span>
            </div>
            <h1 className="mt-8 text-4xl sm:text-5xl md:text-6xl font-black leading-tight">
              דבר איתנו
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600">
                נחזור אליך מהר
              </span>
            </h1>
            <p className="mt-6 text-xl text-slate-600 max-w-2xl leading-relaxed">
              לכל שאלה, בקשה או נושא טכני — אנחנו זמינים ונחזור אליך בהקדם.
            </p>

            <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Info Card */}
              <div className="rounded-3xl bg-white border border-slate-200 shadow-xl p-8">
                <div className="text-lg font-black text-slate-900 mb-6">פרטי יצירת קשר</div>
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg flex-shrink-0">
                      <Mail size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">אימייל</div>
                      <div className="text-slate-600 mt-1">support@misrad-ai.com</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg flex-shrink-0">
                      <Clock size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">זמינות</div>
                      <div className="text-slate-600 mt-1">א׳-ה׳ 09:00-18:00</div>
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-100 flex gap-4">
                  <Link
                    href="/pricing"
                    className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                  >
                    מחירון
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

              {/* Form Card */}
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-[2rem] blur-xl" />
                <div className="relative rounded-3xl bg-white border border-slate-200 shadow-xl p-8">
                  <div className="text-lg font-black text-slate-900 mb-6">שלח הודעה</div>
                  <form className="space-y-4">
                    <input
                      name="name"
                      placeholder="שם מלא"
                      className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-5 py-4 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                    />
                    <input
                      name="email"
                      type="email"
                      placeholder="אימייל"
                      className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-5 py-4 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none dir-ltr"
                    />
                    <textarea
                      name="message"
                      placeholder="במה אפשר לעזור?"
                      rows={4}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-5 py-4 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none resize-none"
                    />
                    <button
                      type="button"
                      className="group w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black px-6 py-4 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all flex items-center justify-center gap-2"
                    >
                      <Send size={18} />
                      שלח הודעה
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
