'use client';

import React from 'react';
import Link from 'next/link';
import { Download, Database, KeyRound, ArrowLeft, ShieldCheck } from 'lucide-react';

export function DataOwnershipSection() {
  const promises = [
    {
      icon: Download,
      title: 'ייצוא מלא בקליק',
      desc: 'כל הנתונים שלך — לקוחות, עסקאות, משימות, מסמכים — ניתנים לייצוא לקובץ CSV או Excel בכל רגע. בלי לפתוח קריאת שירות.',
      color: 'bg-cyan-600',
    },
    {
      icon: Database,
      title: 'ללא נעילת ספק (Vendor Lock-in)',
      desc: 'אם תחליט לעזוב מחר — אתה יוצא עם כל המידע שלך. בלי עמלות יציאה, בלי עיכובים, בלי שאלות.',
      color: 'bg-indigo-600',
    },
    {
      icon: KeyRound,
      title: 'הנתונים שייכים לך',
      desc: 'אתה הבעלים החוקי של כל פיסת מידע שהזנת למערכת. אנחנו רק מספקי השירות — לא הבעלים של הנתונים שלך.',
      color: 'bg-violet-600',
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-white relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-cyan-100/25 rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
      </div>

      <div className="max-w-6xl mx-auto px-6 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-xs font-black mb-4">
              <ShieldCheck size={14} />
              ריבונות נתונים
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
              הנתונים שלך.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">תמיד שלך.</span>
            </h2>
            <p className="mt-4 text-lg text-slate-600 leading-relaxed">
              אנחנו יודעים שכשאתה מכניס את כל העסק למערכת אחת, השאלה הראשונה היא &quot;מה קורה אם ארצה לעזוב?&quot;.
              <br />
              <strong className="text-slate-700">התשובה שלנו: תצא עם הכל.</strong>
            </p>

            <div className="mt-8 space-y-5">
              {promises.map((p) => (
                <div key={p.title} className="flex items-start gap-4 group">
                  <div className={`w-12 h-12 rounded-xl ${p.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform flex-shrink-0`}>
                    <p.icon size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900">{p.title}</h3>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link
                href="/terms"
                className="inline-flex items-center gap-2 text-sm font-bold text-cyan-600 hover:text-cyan-700 transition-colors group"
              >
                קראו על זה בתנאי השימוש שלנו
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Visual Card */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-200/30 via-indigo-200/20 to-violet-200/20 rounded-[2rem] blur-2xl" />
            <div className="relative rounded-3xl bg-white border-2 border-slate-200 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-cyan-50 via-white to-indigo-50">
                <div className="flex items-center gap-2">
                  <Download size={16} className="text-cyan-600" />
                  <span className="text-xs font-black text-slate-600">ייצוא נתונים</span>
                </div>
                <div className="mt-1.5 text-lg font-black text-slate-900">הנתונים שלך — בקליק אחד</div>
              </div>

              {/* Mock Export UI */}
              <div className="p-6 space-y-3">
                {[
                  { name: 'לקוחות וליידים', count: '1,247 רשומות', format: 'CSV / Excel' },
                  { name: 'עסקאות ומכירות', count: '856 רשומות', format: 'CSV / Excel' },
                  { name: 'משימות ופרויקטים', count: '3,421 רשומות', format: 'CSV / Excel' },
                  { name: 'מסמכים וקבצים', count: '89 קבצים', format: 'ZIP' },
                  { name: 'היסטוריית תשלומים', count: '412 רשומות', format: 'CSV / Excel' },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors">
                    <div>
                      <div className="text-sm font-black text-slate-900">{item.name}</div>
                      <div className="text-[10px] font-bold text-slate-500">{item.count}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400">{item.format}</span>
                      <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center text-white">
                        <Download size={14} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-200 bg-cyan-50/50">
                <div className="text-center text-xs font-bold text-slate-500">
                  כל הנתונים ניתנים לייצוא בכל עת — בלי עלות נוספת
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
