'use client';

import Link from 'next/link';
import { ArrowRight, ClipboardCheck, FileText, Mic, Tablet, Users } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { getModuleLabelHe } from '@/lib/os/modules/registry';
import KillerFeaturesBox from '@/components/landing/KillerFeaturesBox';

export const dynamic = 'force-dynamic';

export default function OperationsMarketingPage() {
  const features = [
    {
      title: 'תפסיקו להקליד. פשוט תדברו.',
      description: 'הידיים מלוכלכות? לחצו על המיקרופון ופתחו קריאה או חשבונית בקול.',
      icon: Mic,
    },
    {
      title: 'מסוף שטח חכם (Kiosk)',
      description:
        'הפכו כל טאבלט פשוט לעמדת עבודה מנוהלת. שעון נוכחות, משימות וגישה למלאי – בחיבור מהיר ללא צורך בסיסמאות לעובדים.',
      icon: Tablet,
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden" dir="rtl">
      <Navbar />
      <main className="pt-20">
        <section className="relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[560px] h-[560px] bg-amber-200/35 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 w-[640px] h-[640px] bg-rose-200/20 rounded-full blur-[170px] pointer-events-none" />

          <div className="max-w-6xl mx-auto px-6 py-16 sm:py-20 relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
                  <span>{getModuleLabelHe('operations')}</span>
                  <span className="px-2 py-0.5 rounded-full bg-onyx-900 text-white text-[10px] font-black">שטח</span>
                </div>

                <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black leading-tight">
                  האופרציה שלכם,
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-rose-700 to-indigo-700">
                    על טייס אוטומטי.
                  </span>
                </h1>

                <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">
                  סידור עבודה, טכנאים, קריאות שירות ומלאי — הכל זמין מהנייד, ברור, מדיד, ומוכן לצוות.
                </p>

                <div className="mt-10 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/pricing"
                    className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3 rounded-xl bg-onyx-900 text-white font-bold shadow-xl shadow-onyx-900/10 hover:bg-black"
                  >
                    התחל ניסיון חינם (בלי כרטיס)
                  </Link>
                  <Link
                    href="/subscribe/checkout?package=solo&module=operations&billing=monthly"
                    className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                  >
                    מעבר לתשלום <ArrowRight size={16} className="rotate-180" />
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold hover:bg-amber-100"
                  >
                    ראה חבילות
                  </Link>
                </div>
              </div>

              <div className="rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-amber-50 via-white to-indigo-50">
                  <div className="text-xs font-black text-slate-600">דוגמה · מובייל שטח</div>
                  <div className="mt-2 text-xl font-black text-slate-900">הכל קורה מהטלפון</div>
                </div>
                <div className="p-6">
                  <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-amber-50 p-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-black text-slate-700">מוכן לעבודה בשטח</div>
                      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-900">
                        <ClipboardCheck size={18} />
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { title: 'סידור עבודה', desc: 'מי הולך לאן ומתי' },
                        { title: 'קריאת שירות', desc: 'פתיחה וסיום' },
                        { title: 'דיווח', desc: 'צילום/חתימה/תיעוד' },
                      ].map((x) => (
                        <div key={x.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="font-black text-slate-900">{x.title}</div>
                          <div className="text-xs text-slate-600 mt-1">{x.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-4">
                {features.map((f) => (
                  <div key={f.title} className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-3xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-900 shrink-0">
                        <f.icon size={26} />
                      </div>
                      <div>
                        <div className="text-xl font-black text-slate-900">{f.title}</div>
                        <div className="mt-2 text-sm text-slate-600 leading-relaxed">{f.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-white via-slate-50 to-indigo-50">
                  <div className="text-xs font-black text-slate-600">דוגמה · פקודה קולית</div>
                  <div className="mt-2 text-xl font-black text-slate-900">דיבור → פעולה</div>
                </div>
                <div className="p-6">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shrink-0">
                        <Mic size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">&quot;חשבונית ליוסי על 500&quot;</div>
                        <div className="text-xs text-slate-600 mt-1">המערכת יוצרת מסמך ומכינה שליחה.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <KillerFeaturesBox />

        <section className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
                  <FileText size={14} className="text-slate-900" />
                  נהלי עבודה ברורים
                </div>
                <h2 className="mt-5 text-3xl sm:text-4xl font-black leading-tight">תהליך אחיד, פחות טעויות</h2>
                <p className="mt-4 text-slate-600 leading-relaxed">
                  כשהעבודה רצה מהר — נהלים קצרים וברורים עושים את ההבדל. כל צוות עובד באותו סטנדרט, עם תיעוד שמתחבר למשימות.
                </p>

                <div className="mt-6 space-y-3">
                  {[
                    {
                      icon: Users,
                      title: 'צוות מסונכרן',
                      desc: 'משימות, הרשאות ושקיפות — כולם יודעים מה לעשות.',
                    },
                    {
                      icon: ClipboardCheck,
                      title: 'תיעוד וסטטוסים',
                      desc: 'כל פעולה נשמרת. אין “אמרו לי בוואטסאפ”.',
                    },
                    {
                      icon: FileText,
                      title: 'נהלים קצרים',
                      desc: 'פותחים SOP ומבצעים — בלי חיפושים, בלי בלגן.',
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
                  <div className="text-xs font-black text-slate-600">דוגמה · תהליך עבודה</div>
                  <div className="mt-2 text-xl font-black text-slate-900">קריאת שירות — מהפתיחה עד הסגירה</div>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {[
                      { title: 'נפתחה קריאה', note: 'כתובת + תיאור + תיעדוף', tone: 'bg-amber-50 border-amber-200 text-amber-900' },
                      { title: 'שויך טכנאי', note: 'סידור עבודה מסודר', tone: 'bg-indigo-50 border-indigo-200 text-indigo-900' },
                      { title: 'בדרך', note: 'סטטוס אמיתי בשטח', tone: 'bg-slate-50 border-slate-200 text-slate-900' },
                      { title: 'בוצע וסוכם', note: 'תיעוד + הוכחה', tone: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
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

        <section className="py-14 sm:py-16 bg-white border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-6">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-emerald-50 p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <div className="text-xs font-black text-slate-600">MISRAD Connect</div>
                <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">רוצים לגדול? שתפו לידים שלא הספקתם לקחת.</div>
                <div className="mt-3 text-slate-600 leading-relaxed">
                  היומן מלא? אל תזרקו את העבודה. העבירו את הליד לקולגה בקליק אחד דרך וואטסאפ — וקבלו עמלה או קרדיט.
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <Link
                  href="/pricing"
                  className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3 rounded-xl bg-slate-900 text-white font-black hover:bg-black"
                >
                  ראה חבילות <ArrowRight size={16} className="rotate-180" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-black hover:bg-slate-50"
                >
                  התחל ניסיון חינם
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
