'use client';

import React from 'react';
import { ShieldCheck, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Client } from '@/types/social';

interface VaultTabProps {
  client: Client;
}

const VaultTab: React.FC<VaultTabProps> = ({ client }) => {
  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div className="bg-white p-12 rounded-[56px] border-2 border-slate-200 shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-3xl font-black flex items-center gap-3">
                כספת גישה <ShieldCheck className="text-blue-600" size={32}/>
              </h3>
              <p className="text-sm font-bold text-slate-400 mt-2">
                מידע על גישה לפלטפורמות של הלקוח
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-red-50 p-8 rounded-[32px] border-2 border-red-200 mb-8">
            <div className="flex items-start gap-4">
              <AlertTriangle className="text-red-600 shrink-0 mt-1" size={24}/>
              <div className="flex-1">
                <h4 className="text-lg font-black text-red-900 mb-3">
                  ⚠️ המערכת לא שומרת סיסמאות
                </h4>
                <p className="text-sm font-bold text-red-800 leading-relaxed mb-4">
                  <strong>Social לא שומרת סיסמאות או פרטי התחברות של הלקוחות.</strong> זה מסוכן מבחינה אבטחתית, משפטית ומקצועית.
                </p>
                <div className="bg-white/50 p-4 rounded-xl border border-red-100">
                  <p className="text-xs font-bold text-red-700 leading-relaxed">
                    <strong>למה?</strong> אם יפרצו למערכת, הם יגנבו גישה לאלפי חשבונות. התביעה תסגור את העסק. 
                    בנוסף, הלקוח לא יכול לעשות "העתק-הדבק" מהמחשב לטלפון בקלות. 
                    ולבסוף - למה לקחת אחריות על פרצות שלא קשורות אליך?
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-blue-50 p-8 rounded-[32px] border-2 border-blue-200">
            <div className="flex items-start gap-4 mb-6">
              <Info className="text-blue-600 shrink-0 mt-1" size={24}/>
              <div className="flex-1">
                <h4 className="text-lg font-black text-blue-900 mb-3">
                  איך זה עובד בפועל?
                </h4>
                <p className="text-sm font-bold text-blue-800 leading-relaxed mb-6">
                  <strong>Social היא "חדר המבצעים" (War Room), לא "צרור המפתחות".</strong>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-blue-100">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black text-sm shrink-0">1</div>
                  <div className="flex-1">
                    <h5 className="font-black text-slate-900 mb-1">תכנון</h5>
                    <p className="text-xs font-bold text-slate-600">
                      הסוכנות מעלה למערכת את כל הגרפיקות והטקסטים לחודש הקרוב
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-blue-100">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black text-sm shrink-0">2</div>
                  <div className="flex-1">
                    <h5 className="font-black text-slate-900 mb-1">אישור</h5>
                    <p className="text-xs font-bold text-slate-600">
                      הלקוח נכנס למערכת (מהנייד או מחשב), עובר על הפוסטים, כותב הערות ולוחץ "מאושר ✔️"
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-blue-100">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black text-sm shrink-0">3</div>
                  <div className="flex-1">
                    <h5 className="font-black text-slate-900 mb-1">הביצוע (Copy-Paste)</h5>
                    <p className="text-xs font-bold text-slate-600 mb-3">
                      ברגע שהגיע הזמן להעלות, המערכת שולחת למנהל הסושיאל התראה לטלפון:
                    </p>
                    <ul className="text-xs font-bold text-slate-600 space-y-2 mr-4">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5"/>
                        <span>הוא פותח את האפליקציה</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5"/>
                        <span>לוחץ כפתור "הורד מדיה" (שומר את התמונה לטלפון)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5"/>
                        <span>לוחץ כפתור "העתק טקסט"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5"/>
                        <span>פותח אינסטגרם (שכבר מחובר בחשבון הנכון) → מדביק → מפרסם</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Info */}
          {client.activePlatforms && client.activePlatforms.length > 0 && (
            <div className="mt-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h5 className="font-black text-slate-900 mb-4">פלטפורמות פעילות</h5>
              <div className="flex flex-wrap gap-2">
                {client.activePlatforms.map(platform => (
                  <span
                    key={platform}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-700"
                  >
                    {platform}
                  </span>
                ))}
              </div>
              <p className="text-xs font-bold text-slate-500 mt-4">
                💡 כל פלטפורמה מחוברת ישירות מהמכשיר של המנהל, לא דרך המערכת
              </p>
            </div>
          )}
        </div>
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-50/30 rounded-full blur-[100px]"></div>
      </div>
    </div>
  );
};

export default VaultTab;
