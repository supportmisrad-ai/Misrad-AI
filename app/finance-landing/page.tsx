'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, CreditCard, FileText, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { getModuleLabelHe } from '@/lib/os/modules/registry';

export const dynamic = 'force-dynamic';

export default function FinanceMarketingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <Navbar />
      <main className="pt-24">
        <section className="relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[540px] h-[540px] bg-emerald-200/35 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 w-[640px] h-[640px] bg-indigo-200/15 rounded-full blur-[170px] pointer-events-none" />

          <div className="max-w-6xl mx-auto px-6 py-16 sm:py-20 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
              <span>{getModuleLabelHe('finance')}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">כספים</span>
            </div>

            <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black leading-tight">
              {getModuleLabelHe('finance')}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 via-emerald-600 to-indigo-700">
                חשבוניות, הוצאות, תשלומים ודוחות
              </span>
            </h1>

            <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">
              שליטה פיננסית שמרגישה פשוטה. מנפיקים חשבוניות, מנהלים הוצאות, עוקבים אחר תשלומים,
              ורואים תמונה ברורה של ההכנסות — בלי טבלאות מפוזרות.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold shadow-xl shadow-emerald-600/15 hover:bg-emerald-500"
              >
                התחל ניסיון חינם
              </Link>
              <Link
                href="/subscribe/checkout?package=solo&module=finance&billing=monthly"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
              >
                מעבר לתשלום <ArrowRight size={16} className="rotate-180" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold hover:bg-emerald-100"
              >
                ראה חבילות
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <FileText size={18} />
                </div>
                <div className="mt-4 text-lg font-black">חשבוניות בשתי לחיצות</div>
                <div className="mt-2 text-sm text-slate-600">יצירה, שליחה, ומעקב — בלי להסתבך.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <CreditCard size={18} />
                </div>
                <div className="mt-4 text-lg font-black">שליטה בתשלומים</div>
                <div className="mt-2 text-sm text-slate-600">מה שולם, מה פתוח, ומה צריך לגבות.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
                  <BarChart3 size={18} />
                </div>
                <div className="mt-4 text-lg font-black">דוחות ברורים</div>
                <div className="mt-2 text-sm text-slate-600">תמונה אמיתית של הכנסות והוצאות לאורך זמן.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              <div>
                <h2 className="text-3xl sm:text-4xl font-black leading-tight">
                  מספרים פשוטים.
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700">
                    החלטות מהירות.
                  </span>
                </h2>
                <p className="mt-4 text-slate-600 leading-relaxed">
                  המטרה היא לא "עוד מערכת" — אלא שתקבל החלטות בלי לחפש נתונים.
                  הכל במקום אחד: חיובים, הוצאות, תזרים, ותיעוד.
                </p>

                <div className="mt-6 space-y-3">
                  {[
                    {
                      icon: TrendingUp,
                      title: 'תמונה עסקית',
                      desc: 'רווחיות, הכנסות/הוצאות, ומה קורה החודש — במבט אחד.',
                    },
                    {
                      icon: ShieldCheck,
                      title: 'סדר ועמידה בתהליכים',
                      desc: 'הפחתת טעויות, אחידות חשבונאית, ותיעוד לכל פעולה.',
                    },
                    {
                      icon: Sparkles,
                      title: 'מתחבר למודולים',
                      desc: 'Finance עובד מצוין עם Operations (שטח) ו-Nexus (צוות).',
                    },
                  ].map((row) => (
                    <div key={row.title} className="flex items-start gap-3 rounded-2xl bg-white border border-slate-200 p-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                        <row.icon size={18} />
                      </div>
                      <div>
                        <div className="font-black text-slate-900">{row.title}</div>
                        <div className="text-sm text-slate-600 mt-1">{row.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-indigo-50">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-600">
                    <BarChart3 size={14} className="text-emerald-700" />
                    דוגמה לתהליך פיננסי
                  </div>
                  <div className="mt-2 text-xl font-black text-slate-900">מהנפקת חשבונית עד גבייה</div>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {[
                      { title: 'יוצרים חשבונית', note: 'פריטים + לקוח + סכום', tone: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
                      { title: 'שולחים ללקוח', note: 'מייל/וואטסאפ/קישור', tone: 'bg-indigo-50 border-indigo-200 text-indigo-900' },
                      { title: 'ממתינים לתשלום', note: 'סטטוס ברור', tone: 'bg-slate-50 border-slate-200 text-slate-900' },
                      { title: 'תשלום התקבל', note: 'תיעוד + התאמה', tone: 'bg-amber-50 border-amber-200 text-amber-900' },
                    ].map((s) => (
                      <div key={s.title} className={`rounded-2xl border p-4 ${s.tone}`}>
                        <div className="font-black">{s.title}</div>
                        <div className="text-sm opacity-80 mt-1">{s.note}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6">
                    <Link
                      href="/subscribe/checkout?package=the_operator&billing=monthly"
                      className="inline-flex items-center justify-center w-full px-6 py-3 rounded-xl bg-onyx-900 text-white font-black hover:bg-black"
                    >
                      עובד בשטח? חבילת תפעול ושטח <ArrowRight size={16} className="rotate-180" />
                    </Link>
                  </div>
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
