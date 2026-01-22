'use client';

import Link from 'next/link';
import { Activity, ArrowRight, ClipboardCheck, MapPin, ShieldCheck, Sparkles, Timer, Users } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { getModuleLabelHe } from '@/lib/os/modules/registry';

export const dynamic = 'force-dynamic';

export default function OperationsMarketingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <Navbar />
      <main className="pt-24">
        <section className="relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[560px] h-[560px] bg-amber-200/35 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 w-[640px] h-[640px] bg-rose-200/20 rounded-full blur-[170px] pointer-events-none" />
          <div className="max-w-6xl mx-auto px-6 py-16 sm:py-20 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
              <span>{getModuleLabelHe('operations')}</span>
              <span className="px-2 py-0.5 rounded-full bg-onyx-900 text-white text-[10px] font-black">שטח</span>
            </div>

            <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black leading-tight">
              {getModuleLabelHe('operations')}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-rose-700 to-indigo-700">
                תפעול, קריאות שירות, וסידור עבודה
              </span>
            </h1>

            <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">
              אם העסק שלך קורה בשטח — אתה צריך מערכת שמדברת שטח. סידור עבודה, פרויקטים, קריאות שירות, אנשי צוות,
              וסטטוסים — במקום אחד, ברור, מדיד.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-onyx-900 text-white font-bold shadow-xl shadow-onyx-900/10"
              >
                התחל ניסיון חינם
              </Link>
              <Link
                href="/subscribe/checkout?package=solo&module=operations&billing=monthly"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
              >
                מעבר לתשלום <ArrowRight size={16} className="rotate-180" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold hover:bg-amber-100"
              >
                ראה חבילות
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <ClipboardCheck size={18} />
                </div>
                <div className="mt-4 text-lg font-black">סידור עבודה שעובד</div>
                <div className="mt-2 text-sm text-slate-600">
                  תכנון יומי/שבועי, הקצאה לטכנאים, סטטוס בכל רגע.
                </div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
                  <Timer size={18} />
                </div>
                <div className="mt-4 text-lg font-black">קריאות שירות עם שליטה</div>
                <div className="mt-2 text-sm text-slate-600">פתיחה, עדכון, סיום, ותיעוד — בלי בלגן.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <MapPin size={18} />
                </div>
                <div className="mt-4 text-lg font-black">ניהול בשטח</div>
                <div className="mt-2 text-sm text-slate-600">כל מה שצריך — זמין מהטלפון, עם UI מהיר וברור.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              <div>
                <h2 className="text-3xl sm:text-4xl font-black leading-tight">
                  פחות טלפונים.
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-onyx-900 via-slate-700 to-onyx-900">
                    יותר ביצוע.
                  </span>
                </h2>
                <p className="mt-4 text-slate-600 leading-relaxed">
                  במקום לשאול "איפה הטכנאי?" או "מה הסטטוס?" — כולם רואים. במקום תיאומים בוואטסאפ — עבודה מסודרת,
                  קצרה, עם שקיפות.
                </p>

                <div className="mt-6 space-y-3">
                  {[
                    {
                      icon: Users,
                      title: 'צוות מסונכרן',
                      desc: 'נקסוס מחבר את הצוות — הרשאות, משימות ושקיפות (מומלץ למושבים).',
                    },
                    {
                      icon: ShieldCheck,
                      title: 'אחידות ותיעוד',
                      desc: 'מקטין טעויות, חוזרים על אותם תהליכים, ושומר היסטוריה.',
                    },
                    {
                      icon: Sparkles,
                      title: 'מוכן לצמיחה',
                      desc: 'כשעוברים מפרילאנס/צוות קטן לצוות שטח — הכל נשאר מסודר.',
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
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-amber-50 via-white to-indigo-50">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-600">
                    <Activity size={14} className="text-amber-700" />
                    דוגמה לתהליך עבודה
                  </div>
                  <div className="mt-2 text-xl font-black text-slate-900">קריאת שירות — מהפתיחה עד הסגירה</div>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {[
                      { title: 'נפתחה קריאה', note: 'כתובת + תיאור + תיעדוף', tone: 'bg-amber-50 border-amber-200 text-amber-900' },
                      { title: 'שויך טכנאי', note: 'סידור עבודה מסודר', tone: 'bg-indigo-50 border-indigo-200 text-indigo-900' },
                      { title: 'בדרך', note: 'סטטוס אמיתי בשטח', tone: 'bg-slate-50 border-slate-200 text-slate-900' },
                      { title: 'בוצע וסוכם', note: 'תיעוד + חתימה/הוכחה', tone: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
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
                      מתאים לך? חבילת תפעול ושטח <ArrowRight size={16} className="rotate-180" />
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
