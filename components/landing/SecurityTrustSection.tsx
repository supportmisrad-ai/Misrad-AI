'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Lock, Server, Eye, FileCheck, ArrowLeft } from 'lucide-react';

export function SecurityTrustSection() {
  const features = [
    {
      icon: Lock,
      title: 'הצפנה בסטנדרט בנקאי',
      desc: 'כל הנתונים מוצפנים ב-AES-256 בזמן אחסון וב-TLS 1.3 בזמן העברה. אותו תקן שבנקים משתמשים בו.',
      color: 'bg-emerald-600',
    },
    {
      icon: Server,
      title: 'שרתים מאובטחים',
      desc: 'התשתית מתארחת על שרתי ענן מוגנים עם גיבוי אוטומטי יומי, ניטור 24/7 וזמינות של 99.9%.',
      color: 'bg-blue-600',
    },
    {
      icon: Eye,
      title: 'הנתונים שלך — רק שלך',
      desc: 'אנחנו לא משתמשים בנתונים שלך לאימון מודלים. המידע העסקי שלך לא נחשף לצד שלישי — לעולם.',
      color: 'bg-purple-600',
    },
    {
      icon: FileCheck,
      title: 'תאימות לחוק הגנת הפרטיות',
      desc: 'המערכת עומדת בדרישות חוק הגנת הפרטיות הישראלי ובתקני GDPR האירופיים. מדיניות פרטיות שקופה ונגישה.',
      color: 'bg-indigo-600',
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-1/3 w-[500px] h-[500px] bg-emerald-100/25 rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-100/20 rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black mb-4">
            <Shield size={14} />
            אבטחה ופרטיות
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-tight">
            המידע שלך בכספת.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-blue-600">לא בקופסה שחורה.</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            כשאתה מפקיד אצלנו את הנתונים העסקיים שלך, אנחנו לוקחים את זה ברצינות מוחלטת.
          </p>
        </div>

        {/* Security Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-3xl bg-white border border-slate-200 p-7 sm:p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-start gap-5">
                <div className={`w-14 h-14 rounded-2xl ${f.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform flex-shrink-0`}>
                  <f.icon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badges Strip */}
        <div className="mt-12 rounded-2xl bg-gradient-to-r from-emerald-50 via-blue-50 to-purple-50 border border-slate-200 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white">
                <Shield size={24} />
              </div>
              <div className="text-center lg:text-right">
                <div className="font-black text-slate-900">מחויבות לשקיפות מלאה</div>
                <div className="text-sm text-slate-600 mt-0.5">כל המסמכים המשפטיים שלנו פתוחים ונגישים לכולם</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/privacy"
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 transition-all"
              >
                מדיניות פרטיות
              </Link>
              <Link
                href="/terms"
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                תנאי שימוש
              </Link>
              <Link
                href="/security"
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:border-purple-300 hover:bg-purple-50 transition-all"
              >
                מדיניות אבטחה
              </Link>
              <Link
                href="/refund-policy"
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:border-amber-300 hover:bg-amber-50 transition-all"
              >
                מדיניות החזרים
              </Link>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/security"
            className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors group"
          >
            קראו את המדיניות המלאה שלנו
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
