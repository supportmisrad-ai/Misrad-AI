'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, ClipboardCheck, FileText, Mic, Tablet, Users, Play, Sparkles, Camera, Brain } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { getModuleLabelHe } from '@/lib/os/modules/registry';
import { DemoVideoModal } from '@/components/landing/DemoVideoModal';
import KillerFeaturesBox from '@/components/landing/KillerFeaturesBox';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import { SalesFaq } from '@/components/landing/SalesFaq';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default function OperationsMarketingPage() {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  
  const features = [
    {
      title: 'שיבוץ חכם — AI בוחר את הטכנאי',
      description: 'המערכת מנתחת עומס, ניסיון בקטגוריה וזמינות — ומציעה את הטכנאי הכי מתאים לכל קריאה. פשוט לוחצים "קבל".',
      icon: Brain,
    },
    {
      title: 'סיכום קריאה אוטומטי ב-AI',
      description: 'כשקריאה נסגרת — ה-AI מסכם: מה בוצע, אילו חומרים נצרכו, ותוצאה. בלחיצה אחת. בלי לכתוב דו"ח.',
      icon: Sparkles,
    },
    {
      title: 'תפסיקו להקליד. פשוט תדברו.',
      description: 'הידיים מלוכלכות? לחצו על המיקרופון — ההודעה מתומללת אוטומטית ונכנסת לצ\'אט הקריאה.',
      icon: Mic,
    },
    {
      title: 'תיעוד צילומי מקצועי',
      description: 'גלריית תמונות עם Lightbox, ניווט מקלדת, וצפייה מהירה — כל התמונות של הקריאה במקום אחד.',
      icon: Camera,
    },
    {
      title: 'מסוף שטח חכם (Kiosk)',
      description:
        'הפכו כל טאבלט פשוט לעמדת עבודה מנוהלת. שעון נוכחות, משימות וגישה למלאי – בחיבור מהיר ללא צורך בסיסמאות.',
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
                    עובדת אוטומטית.
                  </span>
                </h1>

                <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">
                  סידור עבודה, טכנאים, קריאות שירות ומלאי — הכל זמין מהנייד, ברור, מדיד, ומוכן לצוות.
                </p>

                <div className="mt-10 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/login?mode=sign-up&redirect=/workspaces/onboarding"
                    className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3 rounded-full bg-onyx-900 text-white font-bold shadow-xl shadow-onyx-900/10 hover:bg-black"
                  >
                    התחל ניסיון חינם
                  </Link>
                  <Link
                    href="/subscribe/checkout?package=solo&module=operations&billing=monthly"
                    className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3 rounded-full bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                  >
                    מעבר לתשלום <ArrowRight size={16} className="rotate-180" />
                  </Link>
                  <button
                    onClick={() => setIsVideoModalOpen(true)}
                    className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3 rounded-full bg-gradient-to-r from-white via-indigo-50/50 to-purple-50/50 border-2 border-indigo-200 text-slate-900 font-bold hover:border-indigo-300 hover:scale-105 transition-all gap-2"
                  >
                    <Play size={18} className="text-indigo-600" />
                    צפייה במערכת
                  </button>
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
                        { title: 'שיבוץ AI', desc: 'הטכנאי הנכון אוטומטית' },
                        { title: 'צ\'אט שטח', desc: 'קול + תמונות + קבצים' },
                        { title: 'סיכום AI', desc: 'דו"ח אוטומטי לכל קריאה' },
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
                      { title: 'נפתחה קריאה', note: 'כתובת + תיאור + דחיפות + SLA', tone: 'bg-amber-50 border-amber-200 text-amber-900' },
                      { title: 'AI שיבץ טכנאי', note: 'לפי עומס, ניסיון וזמינות', tone: 'bg-indigo-50 border-indigo-200 text-indigo-900' },
                      { title: 'טכנאי בשטח', note: 'צ\'אט + תמונות + הקלטות קוליות', tone: 'bg-slate-50 border-slate-200 text-slate-900' },
                      { title: 'AI סיכם את הקריאה', note: 'דו"ח אוטומטי ללא מאמץ', tone: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
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
                      className="inline-flex items-center justify-center w-full px-6 py-3 rounded-full bg-onyx-900 text-white font-black hover:bg-black"
                    >
                      מעבר למסלול השטח
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
                  className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3 rounded-full bg-slate-900 text-white font-black hover:bg-black"
                >
                  ראה חבילות <ArrowRight size={16} className="rotate-180" />
                </Link>
                <Link
                  href="/login?mode=sign-up&redirect=/workspaces/onboarding"
                  className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3 rounded-full bg-white border border-slate-200 text-slate-700 font-black hover:bg-slate-50"
                >
                  התחל ניסיון חינם
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
              כמה זה עולה?
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
              מודול Operations זמין במודול בודד או כחלק מחבילת תפעול ושטח.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center min-w-[160px]">
                <div className="text-xs font-bold text-slate-500 mb-1">מודול בודד</div>
                <div className="text-2xl font-black text-slate-900">₪149<span className="text-sm text-slate-500 font-bold">/חודש</span></div>
                <div className="text-[10px] text-slate-500 mt-1">Operations בלבד</div>
              </div>
              <div className="bg-white border-2 border-amber-200 rounded-2xl p-5 text-center min-w-[160px] shadow-lg">
                <div className="text-xs font-bold text-amber-700 mb-1">חבילת תפעול ושטח</div>
                <div className="text-2xl font-black text-amber-800">₪349<span className="text-sm text-slate-500 font-bold">/חודש</span></div>
                <div className="text-[10px] text-slate-500 mt-1">Operations + Nexus · 5 משתמשים</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center min-w-[160px]">
                <div className="text-xs font-bold text-slate-500 mb-1">הכל כלול</div>
                <div className="text-2xl font-black text-slate-900">₪499<span className="text-sm text-slate-500 font-bold">/חודש</span></div>
                <div className="text-[10px] text-slate-500 mt-1">6 מודולים + 5 משתמשים</div>
              </div>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-slate-900 text-white font-bold shadow-xl hover:bg-slate-800 transition-all"
            >
              ראה את כל החבילות
            </Link>
          </div>
        </section>

        <TestimonialsSection />

        <SalesFaq variant="default" />
      </main>
      <Footer />
      
      <DemoVideoModal 
        isOpen={isVideoModalOpen} 
        onClose={() => setIsVideoModalOpen(false)} 
      />
    </div>
  );
}
