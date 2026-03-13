'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Zap, 
  BarChart3, 
  Users, 
  Bell, 
  BrainCircuit,
  ArrowLeft,
  CheckCircle2,
  Clock,
  TrendingUp,
  MessageSquare
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// מגדל שמירה AI - דף שיווקי רשמי
// עיצוב תואם לשאר המערכת (Light Mode, צבעי המותג)
// ═══════════════════════════════════════════════════════════════════

export default function AITowerMarketingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans" dir="rtl">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                <ShieldCheck size={24} />
              </div>
              <span className="text-xl font-bold tracking-tight">מגדל שמירה <span className="text-blue-600">AI</span></span>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                גרסת בטא מוקדמת
              </span>
              <a
                href="https://misrad-ai.com"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                חזרה לאתר
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl -z-10 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-100/50 rounded-full blur-3xl -z-10" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
                הבינה המלאכותית שרואה<br />
                <span className="text-blue-600">את כל הארגון שלך</span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mx-auto mt-8 max-w-2xl text-xl text-slate-600 leading-relaxed"
            >
              מגדל השמירה מחבר בין כל חלקי העסק שלך - לקוחות, יומן, כספים ותפעול - 
              ומספק תובנות חכמות בזמן אמת שחוסכות זמן ומונעות טעויות.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-blue-200 transition hover:bg-blue-700 hover:scale-105 active:scale-95">
                בקש גישה לבטא
                <ArrowLeft size={20} />
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-4 text-lg font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
                איך זה עובד?
              </button>
            </motion.div>

            {/* Platform Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-8 border-y border-slate-200 py-10 sm:grid-cols-4"
            >
              <div className="text-center">
                <div className="text-4xl font-black text-slate-900">40%</div>
                <div className="mt-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">חיסכון בזמן</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black text-slate-900">3x</div>
                <div className="mt-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">מהירות תגובה</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black text-slate-900">75%</div>
                <div className="mt-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">דיוק בחיזוי</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black text-slate-900">24/7</div>
                <div className="mt-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">ניטור רציף</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl leading-tight">
                נמאס לך לדלג בין<br />
                <span className="text-red-500 underline decoration-red-200 underline-offset-8">מערכות מנותקות?</span>
              </h2>
              <p className="mt-6 text-lg text-slate-600 leading-relaxed">
                כשהמידע שלך מפוזר בין ה-CRM, הנהלת החשבונות ויומן הפגישות, דברים נופלים בין הכיסאות. 
                לקוחות בסיכון נשכחים, חשבוניות לא יוצאות בזמן, והעובדים שלך עמוסים במידע לא רלוונטי.
              </p>
              
              <ul className="mt-10 space-y-4">
                {[
                  'לקוחות חייבים כסף ולא מקבלים תזכורת',
                  'פרויקטים מסתיימים אבל החיוב נשכח',
                  'עובדים נכנסים למשמרת עם פיגור בלי שנדע',
                  'הזדמנויות עסקיות מתפספסות בגלל חוסר מעקב'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                    <CheckCircle2 className="text-red-500 shrink-0" size={20} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4 pt-12">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <Clock className="text-red-400 mb-3" />
                  <div className="font-bold text-slate-900">פיגור במשימות</div>
                  <div className="text-sm text-slate-500 mt-1">75% מהמשימות לא מזוהות כדחופות בזמן</div>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <TrendingUp className="text-red-400 mb-3" />
                  <div className="font-bold text-slate-900">אובדן הכנסה</div>
                  <div className="text-sm text-slate-500 mt-1">15% מהחיובים מתעכבים מעל חודש</div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <Users className="text-red-400 mb-3" />
                  <div className="font-bold text-slate-900">נטישת לקוחות</div>
                  <div className="text-sm text-slate-500 mt-1">זיהוי נטישה מתבצע רק אחרי שהלקוח עזב</div>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <Bell className="text-red-400 mb-3" />
                  <div className="font-bold text-slate-900">חוסר שליטה</div>
                  <div className="text-sm text-slate-500 mt-1">מעל 20 שעות בחודש על ניווט בין מודולים</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 lg:py-32 bg-slate-50 relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">הפתרון: המוח המרכזי של הארגון</h2>
            <p className="mt-4 text-lg text-slate-600">
              מגדל השמירה הוא לא עוד מודול - הוא השכבה האינטליגנטית שיושבת מעל כולם 
              ומחברת את הנקודות עבורך.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <BrainCircuit className="text-blue-600" size={32} />,
                title: 'ניתוח רב-תחומי',
                desc: 'ה-AI מנתח מידע מה-CRM, הכספים והתפעול בו-זמנית כדי למצוא דפוסים נסתרים.'
              },
              {
                icon: <Zap className="text-blue-600" size={32} />,
                title: 'פעולה מיידית',
                desc: 'לא רק התראה - אלא כרטיס פעולה. לחיצה אחת וה-AI מבצע את הפעולה במקומך.'
              },
              {
                icon: <BarChart3 className="text-blue-600" size={32} />,
                title: 'חיזוי עתידי',
                desc: 'זיהוי בעיות לפני שהן קורות: סיכוני נטישה, עומס על עובדים או חורי רווחיות.'
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition">
                <div className="mb-6">{feature.icon}</div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Action Cards Demo */}
          <div className="mt-24 max-w-4xl mx-auto">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="text-sm font-bold text-slate-400">מרכז הבקרה - תצוגה מקדימה</div>
              </div>
              <div className="p-8 space-y-6 bg-white">
                <div className="border border-red-100 bg-red-50/50 p-6 rounded-2xl flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  <div className="h-12 w-12 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-100">
                    <Users size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-red-600 mb-1 uppercase tracking-wider">סיכון נטישה דחוף</div>
                    <div className="text-lg font-bold text-slate-900">דני כהן לא פעיל מעל 14 יום</div>
                    <div className="text-slate-600 text-sm mt-1">יש לו 5 פרויקטים פעילים ויתרה של 12,000₪. מומלץ ליצור קשר.</div>
                  </div>
                  <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition">
                    שלח הודעת שימור
                  </button>
                </div>

                <div className="border border-blue-100 bg-blue-50/50 p-6 rounded-2xl flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-100">
                    <BarChart3 size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-blue-600 mb-1 uppercase tracking-wider">הזדמנות להכנסה</div>
                    <div className="text-lg font-bold text-slate-900">פרויקט "אתר תדמית" הסתיים</div>
                    <div className="text-slate-600 text-sm mt-1">כל המשימות בוצעו. ערך משוער לחיוב: 8,500₪.</div>
                  </div>
                  <button className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 transition">
                    הפק חשבונית עכשיו
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ / Simple CTA */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">מוכן להפוך את הארגון שלך לחכם באמת?</h2>
          <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto">
            מגדל השמירה נמצא כרגע בשלב בטא סגור ל-50 לקוחות בלבד. 
            הצטרף לרשימת ההמתנה וקבל גישה מוקדמת.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="mailto:access@misrad-ai.com"
              className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-xl shadow-2xl shadow-blue-200 hover:bg-blue-700 transition transform hover:-translate-y-1"
            >
              בקש גישה מוקדמת
            </a>
          </div>
          
          <p className="mt-8 text-sm font-bold text-slate-400">
            © 2026 MISRAD AI • <a href="https://misrad-ai.com" className="hover:text-blue-600">misrad-ai.com</a>
          </p>
        </div>
      </section>
    </div>
  );
}
