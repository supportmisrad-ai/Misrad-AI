'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Boxes, ClipboardList, Mic, Truck, Sparkles, Zap } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import { SalesFaq } from '@/components/landing/SalesFaq';

export const dynamic = 'force-dynamic';

export default function SaveTimeHubPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden" dir="rtl">
      <Navbar />
      <main className="pt-20">
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-[560px] h-[560px] bg-orange-200/30 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 w-[640px] h-[640px] bg-amber-200/25 rounded-full blur-[170px] pointer-events-none" />

          <div className="max-w-6xl mx-auto px-6 relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-black">
                <Zap size={14} />
                <span>חוסכים זמן</span>
                <span className="px-2.5 py-1 rounded-full bg-orange-600 text-white text-[10px] font-black">Self-Serve</span>
              </div>

              <h1 className="mt-8 text-4xl sm:text-5xl md:text-6xl font-black leading-tight">
                איך אתם רוצים
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-rose-600 to-amber-600">לחסוך זמן</span>
                היום?
              </h1>

              <p className="mt-6 text-xl text-slate-600 max-w-2xl leading-relaxed">
                בחרו מסלול, ראו את הוואו תוך דקה, והתחילו ניסיון חינם.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/pricing"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-slate-900 text-white font-black shadow-lg hover:bg-slate-800 transition-colors"
                >
                  התחל ניסיון חינם
                  <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-white border border-slate-200 text-slate-700 font-black hover:bg-slate-50 hover:shadow-lg transition-all"
                >
                  ראה מחירים
                </Link>
              </div>
            </div>

            <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Link
                href="/save-time/field"
                className="group relative rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-cyan-50 via-white to-blue-50">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-black text-slate-500">מסלול · שטח</div>
                      <div className="mt-2 text-2xl font-black text-slate-900">מלאי ברכב</div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-cyan-600 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                      <Truck size={24} />
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-slate-700 font-black text-lg">&quot;יש לך את זה <span className="bg-amber-100 px-1.5 py-0.5 rounded-lg">ברכב 2</span>&quot;</div>
                  <div className="mt-3 text-slate-600 leading-relaxed">
                    חיפוש חלק לפי שם/מק״ט (או תמונה), תשובה בשפה של השטח, והורדה מהמלאי ישירות מהקריאה.
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { icon: Boxes, title: 'הסטוק שלי', desc: 'רכב פעיל כברירת מחדל', color: 'bg-cyan-600' },
                      { icon: ClipboardList, title: 'מקור לקריאה', desc: 'חד-משמעי בכל קריאה', color: 'bg-emerald-600' },
                      { icon: Truck, title: 'חיסכון זמן', desc: 'פחות נסיעות למחסן', color: 'bg-amber-600' },
                    ].map((x) => (
                      <div key={x.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-white hover:shadow-lg transition-all">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${x.color} flex items-center justify-center text-white`}>
                            <x.icon size={14} />
                          </div>
                          <div className="font-black text-slate-900">{x.title}</div>
                        </div>
                        <div className="text-xs text-slate-600 mt-2">{x.desc}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-black text-cyan-600 group-hover:text-cyan-700">
                    לצפייה במסלול <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>

              <Link
                href="/save-time/calls"
                className="group relative rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-rose-50 via-white to-amber-50">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-black text-slate-500">מסלול · מכירות</div>
                      <div className="mt-2 text-2xl font-black text-slate-900">סיכום שיחה</div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-rose-600 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                      <Mic size={24} />
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-slate-700 font-black text-lg">&quot;<span className="bg-amber-100 px-1.5 py-0.5 rounded-lg">סיכום מוכן</span> + משימות אופרטיביות&quot;</div>
                  <div className="mt-3 text-slate-600 leading-relaxed">
                    מעלים הקלטה או מדביקים תמלול, ומקבלים תוצאה מובנית: סיכום, כוונה, התנגדויות ומשימות.
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { icon: Mic, title: 'אודיו או טקסט', desc: 'הסיכום נבנה מתמלול', color: 'bg-rose-600' },
                      { icon: ClipboardList, title: 'משימות', desc: 'רשימה ברורה לצעד הבא', color: 'bg-purple-600' },
                      { icon: Boxes, title: 'JSON מובנה', desc: 'לא טקסט חופשי', color: 'bg-amber-600' },
                    ].map((x) => (
                      <div key={x.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-white hover:shadow-lg transition-all">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${x.color} flex items-center justify-center text-white`}>
                            <x.icon size={14} />
                          </div>
                          <div className="font-black text-slate-900">{x.title}</div>
                        </div>
                        <div className="text-xs text-slate-600 mt-2">{x.desc}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-black text-rose-600 group-hover:text-rose-700">
                    לצפייה במסלול <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        <TestimonialsSection />

        <SalesFaq variant="default" />
      </main>
      <Footer />
    </div>
  );
}
