'use client';

import Link from 'next/link';
import { ArrowRight, Boxes, ClipboardList, Mic, Truck } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export const dynamic = 'force-dynamic';

export default function SaveTimeHubPage() {
  return (
    <div className="min-h-screen bg-[#f7f7f5] text-slate-900 overflow-x-hidden" dir="rtl">
      <Navbar />
      <main className="pt-24">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-[560px] h-[560px] bg-slate-200/40 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 w-[640px] h-[640px] bg-amber-200/20 rounded-full blur-[170px] pointer-events-none" />

          <div className="max-w-6xl mx-auto px-6 py-16 sm:py-20 relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
                <span>חוסכים זמן</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black">Self-Serve</span>
              </div>

              <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black leading-tight">
                איך אתם רוצים
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-sky-700 via-rose-700 to-indigo-700">לחסוך זמן</span>
                היום?
              </h1>

              <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">
                בחרו מסלול, ראו את הוואו תוך דקה, והתחילו ניסיון חינם.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-orange-600 text-white font-bold shadow-xl shadow-orange-600/10 hover:bg-orange-500"
                >
                  התחל ניסיון חינם (בלי כרטיס)
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                >
                  ראה מחירים <ArrowRight size={16} className="rotate-180" />
                </Link>
              </div>
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Link
                href="/save-time/field"
                className="group relative rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden hover:border-slate-300 transition-colors"
              >
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute top-5 right-5 w-6 h-6 border-t-2 border-r-2 border-slate-300/70" />
                  <div className="absolute top-5 left-5 w-6 h-6 border-t-2 border-l-2 border-slate-300/70" />
                  <div className="absolute bottom-5 right-5 w-6 h-6 border-b-2 border-r-2 border-slate-300/70" />
                  <div className="absolute bottom-5 left-5 w-6 h-6 border-b-2 border-l-2 border-slate-300/70" />
                </div>
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-black text-slate-600">מסלול · שטח</div>
                      <div className="mt-2 text-2xl font-black text-slate-900">מלאי ברכב</div>
                    </div>
                    <div className="w-12 h-12 rounded-3xl bg-white border border-slate-200 flex items-center justify-center text-slate-900">
                      <Truck size={20} />
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-slate-700 font-black text-lg">&quot;יש לך את זה <span className="bg-yellow-200/70 px-1 rounded">ברכב 2</span>&quot;</div>
                  <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                    חיפוש חלק לפי שם/מק"ט (או תמונה), תשובה בשפה של השטח, והורדה מהמלאי ישירות מהקריאה.
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { icon: Boxes, title: 'הסטוק שלי', desc: 'רכב פעיל כברירת מחדל' },
                      { icon: ClipboardList, title: 'מקור לקריאה', desc: 'חד-משמעי בכל קריאה' },
                      { icon: Truck, title: 'חיסכון זמן', desc: 'פחות נסיעות למחסן' },
                    ].map((x) => (
                      <div key={x.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-2">
                          <x.icon size={16} className="text-slate-700" />
                          <div className="font-black text-slate-900">{x.title}</div>
                        </div>
                        <div className="text-xs text-slate-600 mt-2">{x.desc}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-black text-slate-900">
                    לצפייה במסלול <ArrowRight size={16} className="rotate-180 opacity-70 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Link>

              <Link
                href="/save-time/calls"
                className="group relative rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden hover:border-slate-300 transition-colors"
              >
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute top-5 right-5 w-6 h-6 border-t-2 border-r-2 border-slate-300/70" />
                  <div className="absolute top-5 left-5 w-6 h-6 border-t-2 border-l-2 border-slate-300/70" />
                  <div className="absolute bottom-5 right-5 w-6 h-6 border-b-2 border-r-2 border-slate-300/70" />
                  <div className="absolute bottom-5 left-5 w-6 h-6 border-b-2 border-l-2 border-slate-300/70" />
                </div>
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-rose-50 via-white to-amber-50">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-black text-slate-600">מסלול · מכירות</div>
                      <div className="mt-2 text-2xl font-black text-slate-900">סיכום שיחה</div>
                    </div>
                    <div className="w-12 h-12 rounded-3xl bg-white border border-slate-200 flex items-center justify-center text-slate-900">
                      <Mic size={20} />
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-slate-700 font-black text-lg">&quot;<span className="bg-yellow-200/70 px-1 rounded">סיכום מוכן</span> + משימות אופרטיביות&quot;</div>
                  <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                    מעלים הקלטה או מדביקים תמלול, ומקבלים תוצאה מובנית: סיכום, כוונה, התנגדויות ומשימות.
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { icon: Mic, title: 'אודיו או טקסט', desc: 'הסיכום נבנה מתמלול' },
                      { icon: ClipboardList, title: 'משימות', desc: 'רשימה ברורה לצעד הבא' },
                      { icon: Boxes, title: 'JSON מובנה', desc: 'לא טקסט חופשי' },
                    ].map((x) => (
                      <div key={x.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-2">
                          <x.icon size={16} className="text-slate-700" />
                          <div className="font-black text-slate-900">{x.title}</div>
                        </div>
                        <div className="text-xs text-slate-600 mt-2">{x.desc}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-black text-slate-900">
                    לצפייה במסלול <ArrowRight size={16} className="rotate-180 opacity-70 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
