'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Calculator, Check, X } from 'lucide-react';

const comparisonRows = [
  { tool: 'CRM + ניהול לידים', separate: '₪150–300/חודש', misrad: true },
  { tool: 'לוח משימות לצוות', separate: '₪100–200/חודש', misrad: true },
  { tool: 'כלי AI (צ׳אט + ניתוח)', separate: '₪80–160/חודש', misrad: true },
  { tool: 'מערכת דיוור + אוטומציות', separate: '₪100–250/חודש', misrad: true },
  { tool: 'ניהול כספים + חשבוניות', separate: '₪100–200/חודש', misrad: true },
  { tool: 'שעון נוכחות + תפעול', separate: '₪50–150/חודש', misrad: true },
];

const totalSeparateMin = 580;
const totalSeparateMax = 1260;

export function CostComparisonSection() {
  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-white via-slate-50/50 to-white relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-amber-100/30 rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-emerald-100/20 rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
      </div>

      <div className="max-w-5xl mx-auto px-6 relative">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-black mb-4">
            <Calculator size={14} />
            השוואת עלויות
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-tight">
            כמה עולה לקנות הכל בנפרד?
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-emerald-600">המספרים מדברים</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            במקום לשלם ל-6 תוכנות שונות שלא מדברות אחת עם השנייה, קבל הכל במקום אחד.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="rounded-3xl border-2 border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                  <th className="p-5 font-black text-slate-700 text-right">כלי / שירות</th>
                  <th className="p-5 font-black text-slate-500 text-center">קנייה בנפרד</th>
                  <th className="p-5 text-center">
                    <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                      MISRAD AI
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, idx) => (
                  <tr key={row.tool} className={`border-b border-slate-100 ${idx % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                    <td className="p-4 sm:p-5 font-bold text-slate-700 text-right">{row.tool}</td>
                    <td className="p-4 sm:p-5 text-center">
                      <span className="text-sm font-bold text-slate-500">{row.separate}</span>
                    </td>
                    <td className="p-4 sm:p-5 text-center">
                      <Check size={22} className="text-emerald-600 mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td className="p-5 font-black text-lg text-slate-900 text-right">סה״כ חודשי</td>
                  <td className="p-5 text-center">
                    <div className="text-lg font-black text-rose-600 line-through decoration-2">
                      ₪{totalSeparateMin}–{totalSeparateMax}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 mt-0.5">בלי אינטגרציה ביניהם</div>
                  </td>
                  <td className="p-5 text-center">
                    <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                      ₪499
                    </div>
                    <div className="text-[10px] font-bold text-emerald-600 mt-0.5">הכל מחובר + 5 משתמשים</div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Savings Badge */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-indigo-50 border-2 border-emerald-200 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <Check size={20} strokeWidth={3} />
            </div>
            <div className="text-right">
              <div className="font-black text-slate-900">חיסכון של עד ₪760 בחודש</div>
              <div className="text-xs text-slate-500 mt-0.5">+ המערכות מדברות ביניהן = אפס טעויות אנוש</div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-400 text-center max-w-2xl mx-auto">
          * המחירים מבוססים על מחירי שוק ממוצעים לכלים נפוצים (2025/2026). 
          טווח המחירים מתאים לעסקים עם 3–10 עובדים. מחיר MISRAD AI הוא לחבילת &quot;הכל כלול&quot; הכוללת 5 משתמשים.
        </p>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors group"
          >
            ראה את כל החבילות
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
