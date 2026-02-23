'use client';

import React from 'react';
import { CreditCard, Users, CircleCheckBig } from 'lucide-react';

export function UnifiedBusinessSection() {
  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 via-white to-slate-50 px-4 md:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            כל העסק שלך במקום אחד
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            בלי לעבור בין 5 תוכנות שונות. מערכת הפעלה לעסק שמתחברת לכל התהליכים שלך
          </p>
        </div>

        {/* Bento Grid - 3 Main Modules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* CRM Module */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg hover:border-blue-200 transition-all duration-300">
            <div className="mb-6">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">CRM חכם</h3>
              <p className="text-slate-600">ניהול לקוחות וקשרים בקצה אצבע</p>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CircleCheckBig className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">מעקב אחרי כל עסקה ודיל</span>
              </li>
              <li className="flex items-start gap-3">
                <CircleCheckBig className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">תיעוד אוטומטי של שיחות</span>
              </li>
              <li className="flex items-start gap-3">
                <CircleCheckBig className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">התראות בזמן אמת</span>
              </li>
            </ul>
          </div>

          {/* Attendance Module */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg hover:border-green-200 transition-all duration-300">
            <div className="mb-6">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">נוכחות וזמנים</h3>
              <p className="text-slate-600">ניהול משמרות וזמנים בדיוק</p>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CircleCheckBig className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">טאבלט נוכחות משותף</span>
              </li>
              <li className="flex items-start gap-3">
                <CircleCheckBig className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">דוחות עבודה מפורטים</span>
              </li>
              <li className="flex items-start gap-3">
                <CircleCheckBig className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">שילוב עם שכר ופיקדון</span>
              </li>
            </ul>
          </div>

          {/* Billing Module */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg hover:border-amber-200 transition-all duration-300">
            <div className="mb-6">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                <CreditCard className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">גבייה וחשבוניות</h3>
              <p className="text-slate-600">בקרה מלאה על הכספים</p>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CircleCheckBig className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">חשבוניות אוטומטיות</span>
              </li>
              <li className="flex items-start gap-3">
                <CircleCheckBig className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">תזכורות תשלום אוטומטיות</span>
              </li>
              <li className="flex items-start gap-3">
                <CircleCheckBig className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">דוחות פיננסיים בזמן אמת</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Integration Message */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 md:p-12 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">הכל מחובר, הכל עובד ביחד</h3>
          <p className="text-blue-100 text-lg max-w-3xl mx-auto">
            בלי שום אינטגרציות מסובכות, בלי API שלא עובד. המערכת שלך זורמת כמו מי טהור - לקוחות נתמכים אוטומטית, שעות עבודה מחושבות, עסקאות מתועדות.
          </p>
        </div>
      </div>
    </section>
  );
}
