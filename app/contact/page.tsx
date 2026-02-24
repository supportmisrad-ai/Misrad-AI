import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { Mail, Clock, MessageCircle, ArrowLeft, Phone } from 'lucide-react';
import ContactFormClient from './ContactFormClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

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
            <h1 className="mt-6 sm:mt-8 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight">
              דבר איתנו
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600">
                נחזור אליך מהר
              </span>
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl leading-relaxed">
              לכל שאלה, בקשה או נושא טכני — אנחנו זמינים ונחזור אליך בהקדם.
            </p>

            <div className="mt-10 sm:mt-14 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Info Card */}
              <div className="rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-8">
                <div className="text-base sm:text-lg font-black text-slate-900 mb-5 sm:mb-6">פרטי יצירת קשר</div>
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg flex-shrink-0">
                      <Mail size={18} className="sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-bold text-slate-900">אימייל</div>
                      <div className="text-sm sm:text-base text-slate-600 mt-1">support@misrad-ai.com</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg flex-shrink-0">
                      <Clock size={18} className="sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-bold text-slate-900">זמינות</div>
                      <div className="text-sm sm:text-base text-slate-600 mt-1">א׳-ה׳ 09:00-18:00</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg flex-shrink-0">
                      <Phone size={18} className="sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-bold text-slate-900">טלפון / WhatsApp</div>
                      <div className="text-sm sm:text-base text-slate-600 mt-1">
                        <a href="https://wa.me/972547700700" target="_blank" rel="noreferrer" className="text-emerald-700 hover:text-emerald-800 font-bold underline underline-offset-2">
                          054-770-0700
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-bold text-slate-900">כתובת</div>
                      <div className="text-sm sm:text-base text-slate-600 mt-1">הפסנתר 9, ראשון לציון</div>
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
                <div className="relative rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-8">
                  <div className="text-base sm:text-lg font-black text-slate-900 mb-5 sm:mb-6">שלח הודעה</div>
                  <ContactFormClient />
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
