'use client';

import React, { useState } from 'react';
import { Database, Clock, AlertCircle, Shield, HardDrive, Trash2 } from 'lucide-react';
import { getAllRetentionPolicies, getRetentionPolicyDescription } from '@/lib/storage/retention-policy';

/**
 * Storage Management Panel - ממשק ניהול אחסון
 * 
 * מיועד למנהלי מערכת בדף Settings -> Storage.
 * מציג סטטיסטיקות שימוש, מדיניות שמירה, וכלי ניהול.
 */
export function StorageManagementPanel() {
  const policies = getAllRetentionPolicies();
  const [activeTab, setActiveTab] = useState<'overview' | 'policy'>('overview');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">ניהול אחסון</h2>
          <p className="text-sm text-slate-600 mt-1">
            מעקב אחר שימוש באחסון, מדיניות שמירה וניהול קבצים
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
          <HardDrive className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-bold text-emerald-700">Supabase Pro</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-bold text-sm transition-colors relative ${
            activeTab === 'overview'
              ? 'text-indigo-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          סקירה כללית
          {activeTab === 'overview' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('policy')}
          className={`px-4 py-2 font-bold text-sm transition-colors relative ${
            activeTab === 'policy'
              ? 'text-indigo-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          מדיניות שמירה
          {activeTab === 'policy' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
          )}
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Storage Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl border-2 border-slate-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-50">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">—</div>
                  <div className="text-xs text-slate-500">סה"כ קבצים</div>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl border-2 border-slate-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-emerald-50">
                  <HardDrive className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">—</div>
                  <div className="text-xs text-slate-500">נפח מנוצל</div>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl border-2 border-slate-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-amber-50">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">—</div>
                  <div className="text-xs text-slate-500">קבצים לקראת מחיקה</div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <strong className="font-black">סטטיסטיקות בזמן אמת</strong> - נתונים אלו יעודכנו בהמשך
                לכלול מעקב אחר שימוש בפועל, קבצים שנמחקו, והתראות ששלחו.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Policy Tab */}
      {activeTab === 'policy' && (
        <div className="space-y-4">
          {/* Policy Description */}
          <div className="p-5 rounded-xl bg-gradient-to-l from-indigo-50 to-slate-50 border-2 border-indigo-100">
            <div className="flex items-start gap-4">
              <Shield className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-black text-slate-900 text-lg">מדיניות שמירה אוטומטית</h3>
                <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                  המערכת מבצעת ניקוי אוטומטי של קבצים ישנים לפי מדיניות שמירה שנקבעה מראש.
                  כל לקוח מקבל התראה מוקדמת לפני מחיקה, והמערכת שומרת לוג ביקורת מלא.
                </p>
              </div>
            </div>
          </div>

          {/* Policy Table */}
          <div className="rounded-xl border-2 border-slate-200 bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200">
                  <th className="px-5 py-3 text-right font-black text-slate-700 text-sm">Bucket</th>
                  <th className="px-5 py-3 text-center font-black text-slate-700 text-sm">משך שמירה</th>
                  <th className="px-5 py-3 text-center font-black text-slate-700 text-sm">התראה</th>
                  <th className="px-5 py-3 text-right font-black text-slate-700 text-sm">סטטוס</th>
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
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Database className="w-4 h-4 text-slate-400" />
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{policy.bucket}</div>
                            <div className="text-xs text-slate-500">{policy.label}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {isInfinite ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                            <span className="text-xs font-bold text-emerald-700">∞</span>
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-slate-900">
                            {getRetentionPolicyDescription(policy.bucket)}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {policy.rule.notifyBeforeDelete ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span className="text-xs font-bold text-amber-700">
                              {policy.rule.notifyDaysBefore} ימים
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {isMandatory ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
                            <Shield className="w-3 h-3 text-red-600" />
                            <span className="text-xs font-bold text-red-700">חובה משפטית</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200">
                            <span className="text-xs font-bold text-blue-700">מדיניות רגילה</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Warning Box */}
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-start gap-3">
              <Trash2 className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-900">
                <strong className="font-black">אזהרה:</strong> קבצים שנמחקו אוטומטית אינם ניתנים לשחזור.
                ודאו שאתם מגבים קבצים חשובים לפני שחלף מועד המחיקה.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
