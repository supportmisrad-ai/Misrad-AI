'use client';

import React from 'react';
import { Database, Clock, Shield, AlertCircle } from 'lucide-react';
import { getAllRetentionPolicies } from '@/lib/storage/retention-policy';

/**
 * Storage Retention Section - מדיניות שמירת קבצים
 * 
 * מוצג בדף Pricing כפיצ'ר שיווקי - מראה ללקוחות פוטנציאליים שקיפות מלאה
 * לגבי משך שמירת הקבצים שלהם במערכת.
 */
export function StorageRetentionSection() {
  const policies = getAllRetentionPolicies();

  return (
    <section className="py-16 sm:py-20 bg-gradient-to-b from-white to-slate-50 border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200 mb-4">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-black text-indigo-700 uppercase tracking-wide">שקיפות מלאה</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
            מדיניות שמירת קבצים
          </h2>
          <p className="mt-3 text-base text-slate-600 max-w-2xl mx-auto">
            כל קובץ שאתם מעלים למערכת נשמר בטוח ב-Supabase Storage.
            <br />
            הנה בדיוק כמה זמן כל סוג קובץ נשמר, ומתי תקבלו התראה לפני מחיקה.
          </p>
        </div>

        {/* Retention Table */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-gradient-to-l from-indigo-50 to-slate-50 border-b-2 border-slate-200">
                  <th className="px-6 py-4 text-right font-black text-slate-700">סוג קובץ</th>
                  <th className="px-6 py-4 text-center font-black text-slate-700">משך שמירה</th>
                  <th className="px-6 py-4 text-center font-black text-slate-700">התראה מראש</th>
                  <th className="px-6 py-4 text-right font-black text-slate-700">הסבר</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy, idx) => {
                  const isInfinite = policy.rule.retentionDays === -1;
                  const isMandatory = policy.rule.mandatory;
                  
                  return (
                    <tr 
                      key={policy.bucket} 
                      className={`border-b border-slate-100 last:border-b-0 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      } hover:bg-indigo-50/30 transition-colors`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Database className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                          <div>
                            <div className="font-bold text-slate-900">{policy.label}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{policy.bucket}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isInfinite ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                            <span className="text-sm font-black text-emerald-700">∞</span>
                            <span className="text-xs font-bold text-emerald-600">ללא הגבלה</span>
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span className="font-bold text-slate-900">
                              {policy.rule.retentionDays >= 365 
                                ? `${Math.floor(policy.rule.retentionDays / 365)} ${Math.floor(policy.rule.retentionDays / 365) === 1 ? 'שנה' : 'שנים'}`
                                : `${policy.rule.retentionDays} ימים`
                              }
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {policy.rule.notifyBeforeDelete ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-xs font-bold text-amber-700">
                              {policy.rule.notifyDaysBefore} ימים לפני
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {policy.rule.description}
                        </p>
                        {isMandatory && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 border border-slate-200">
                            <Shield className="w-3 h-3 text-slate-500" />
                            <span className="text-xs font-bold text-slate-600">מחייב משפטית</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="mt-8 space-y-3">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong className="font-black">התראות אוטומטיות:</strong> תקבלו אימייל לפני שקבצים נמחקים,
              כדי שתוכלו להוריד ולגבות באופן ידני אם צריך.
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <strong className="font-black">הקלטות שיחות (2 שנים):</strong> מדיניות חובה לפי תקנות פרטיות ישראליות.
              לאחר שנתיים, ההקלטות נמחקות אוטומטית ולא ניתן לשחזר.
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <Database className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-900">
              <strong className="font-black">קבצים מוגנים:</strong> ניתן לסמן קבצים חשובים כ"מוגנים" ממחיקה אוטומטית
              (זמין בחבילות Pro+).
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center mt-6">
            כל הקבצים מאוחסנים ב-<strong className="text-slate-700">Supabase Storage</strong> (AWS) עם הצפנה מלאה והגנת GDPR.
            <br />
            מדיניות זו תקפה מ-מרץ 2026 ומעודכנת באופן שוטף בעמוד התנאים המשפטיים.
          </p>
        </div>
      </div>
    </section>
  );
}
