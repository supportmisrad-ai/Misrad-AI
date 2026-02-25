'use client';

import React from 'react';
import Link from 'next/link';
import { CircleCheckBig, Zap, Layers, Smartphone } from 'lucide-react';

export function ModularitySimplicitySection() {
  return (
    <section className="py-20 px-4 md:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            מבנה מודולרי, עיצוב פשוט
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            שלם רק על מה שצריך. התחל קטן, גדל כשהעסק גדל. אין חוזים סגורים, אין תעריפים מוגזמים.
          </p>
        </div>

        {/* Core Principles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {/* Card 1: Modularity */}
          <div className="bg-white rounded-xl p-6 border-2 border-green-100 hover:border-green-500 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0">
                <CircleCheckBig className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">מודולריות</h3>
            </div>
            <p className="text-slate-600">
              בחר בדיוק את המודולים שאתה צריך. בלי תשלום תוספות על דברים שלא תשתמש בהם.
            </p>
          </div>

          {/* Card 2: Flexibility */}
          <div className="bg-white rounded-xl p-6 border-2 border-green-100 hover:border-green-500 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0">
                <CircleCheckBig className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">גמישות</h3>
            </div>
            <p className="text-slate-600">
              עדכן את החבילה שלך בכל זמן. הוסף מודולים כשאתה צומח, או בטל אם כבר לא צריך.
            </p>
          </div>

          {/* Card 3: Simplicity */}
          <div className="bg-white rounded-xl p-6 border-2 border-green-100 hover:border-green-500 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0">
                <CircleCheckBig className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">פשטות</h3>
            </div>
            <p className="text-slate-600">
              ממשק אינטואיטיבי שלא צריך הדרכה. כל קליק הוא יעד, כל עמוד ברור.
            </p>
          </div>

          {/* Card 4: Scale */}
          <div className="bg-white rounded-xl p-6 border-2 border-green-100 hover:border-green-500 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0">
                <CircleCheckBig className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">מדרג</h3>
            </div>
            <p className="text-slate-600">
              מחר יש לך 10 עובדים, בשנה 100. המערכת גדלה איתך בלי שינויים טכניים.
            </p>
          </div>
        </div>

        {/* Pricing Philosophy */}
        <div className="bg-white rounded-2xl p-12 border-2 border-green-200 mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-3xl font-bold text-slate-900 mb-6">מודל התמחור שלנו</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CircleCheckBig className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700"><strong>אין עמלות נסתרות</strong> - מה שאתה רואה הוא מה שאתה משלם</span>
                </li>
                <li className="flex items-start gap-3">
                  <CircleCheckBig className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700"><strong>ללא הגבלות</strong> - הוסף עובדים כשאתה צריך</span>
                </li>
                <li className="flex items-start gap-3">
                  <CircleCheckBig className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700"><strong>ביטול בכל זמן</strong> - אין חוזים ארוכים, אין קנסות</span>
                </li>
                <li className="flex items-start gap-3">
                  <CircleCheckBig className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700"><strong>הנחות בנפח</strong> - יותר מודולים = הנחה טובה יותר</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-8 border-2 border-green-200">
              <h4 className="text-2xl font-bold text-slate-900 mb-6">דוגמה: עסק קטן</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-green-200">
                  <span className="text-slate-700">System · לידים ומכירות</span>
                  <span className="font-bold text-slate-900">₪149/חודש</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-green-200">
                  <span className="text-slate-700">2 עובדים נוספים</span>
                  <span className="font-bold text-slate-900">₪78/חודש</span>
                </div>
                <div className="flex justify-between items-center bg-green-100 rounded-lg p-3 text-lg font-bold">
                  <span className="text-slate-900">סה&quot;כ</span>
                  <span className="text-green-700">₪227/חודש</span>
                </div>
                <p className="text-sm text-slate-600 pt-3 italic">
                  בלי תוספות סמויות. בלי הפתעות. ברור וגלוי.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Integration Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-8 border border-slate-200">
            <Layers className="w-10 h-10 text-blue-600 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-3">אינטגרציה מקבילה</h3>
            <p className="text-slate-600">
              כל המודולים עובדים יחד. מעולם לא צריך להעביר נתונים בין מערכות.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 border border-slate-200">
            <Zap className="w-10 h-10 text-amber-600 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-3">ביצועים מהירים</h3>
            <p className="text-slate-600">
              המערכת מהירה גם עם הרבה עובדים ונתונים. ביצועים חלקים.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 border border-slate-200">
            <Smartphone className="w-10 h-10 text-purple-600 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-3">נייד ראשון</h3>
            <p className="text-slate-600">
              עבוד מהטלפון, טאבלט, מחשב. הכל מסונכרן בזמן אמת.
            </p>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-12 border-2 border-green-200">
          <h3 className="text-2xl font-bold text-slate-900 mb-3">
            התחל עם מה שצריך. גדל בהתאם לצורך.
          </h3>
          <p className="text-slate-600 max-w-2xl mx-auto mb-6">
            המערכת בנויה לעסקים שרוצים כלים חזקים בלי מורכבות. ללא תוספות מיותרות. בלי תעריפים נסתרים. רק מה שאתה באמת צריך.
          </p>
          <Link href="/login?mode=sign-up&redirect=/workspaces/onboarding" className="inline-flex items-center gap-2 bg-green-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-green-700 transition-colors">
            <span>בואו נתחיל - ניסיון של 7 ימים</span>
            <CircleCheckBig className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
