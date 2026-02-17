'use client';

import React from 'react';
import { Sparkles, Zap, Brain, Clock } from 'lucide-react';

export function AiManagementSection() {
  return (
    <section className="py-20 px-4 md:px-6 lg:px-8 bg-white relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-transparent opacity-60" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-200 to-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-200 to-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Main Header with Sparkles */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full px-4 py-2 mb-6 border border-purple-200">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-700">טכנולוגיה בתרופה בעברית</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent mb-6 leading-tight">
            מערכת AI שמנהלת את העסק במקומך
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            לא עוד עבודה ידנית חוזרת ונשנית. AI חכם שמבין את העסק שלך בעברית טהורה ופועל בשמך
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Feature 1: Auto Documentation */}
          <div className="group bg-gradient-to-br from-white to-slate-50 rounded-2xl p-8 border border-slate-200 hover:border-purple-300 transition-all duration-300 hover:shadow-xl">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl group-hover:from-purple-200 group-hover:to-purple-100 transition-colors">
                <Brain className="w-7 h-7 text-purple-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">תיעוד אוטומטי חכם</h3>
            <p className="text-slate-600 mb-4">
              AI שומע שיחות, קורא מייל, ומתעד הכל אוטומטית. אתה פוקוס על העסק, המערכת מתעדת.
            </p>
            <ul className="space-y-2 text-slate-600 text-sm">
              <li>✓ הקלטה וקידוד עברי בזמן אמת</li>
              <li>✓ תיעוד עסקאות מיידי</li>
              <li>✓ התנבהות כשמשהו שפתוח</li>
            </ul>
          </div>

          {/* Feature 2: Smart Suggestions */}
          <div className="group bg-gradient-to-br from-white to-slate-50 rounded-2xl p-8 border border-slate-200 hover:border-blue-300 transition-all duration-300 hover:shadow-xl">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl group-hover:from-blue-200 group-hover:to-blue-100 transition-colors">
                <Zap className="w-7 h-7 text-blue-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">הצעות חכמות</h3>
            <p className="text-slate-600 mb-4">
              AI מציע פעולות הבאות בהתבסס על הדפוסים שלך. מחיר עדכון? זה יציע לך?
            </p>
            <ul className="space-y-2 text-slate-600 text-sm">
              <li>✓ המלצות מחיר תחרותיות</li>
              <li>✓ עדכוני ווצאפ אוטומטיים</li>
              <li>✓ זיהוי הזדמנויות עסקיות</li>
            </ul>
          </div>

          {/* Feature 3: 24/7 Operations */}
          <div className="group bg-gradient-to-br from-white to-slate-50 rounded-2xl p-8 border border-slate-200 hover:border-cyan-300 transition-all duration-300 hover:shadow-xl">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-cyan-100 to-cyan-50 rounded-xl group-hover:from-cyan-200 group-hover:to-cyan-100 transition-colors">
                <Clock className="w-7 h-7 text-cyan-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">עובד 24/7 בשבילך</h3>
            <p className="text-slate-600 mb-4">
              כשאתה ישן, אתה עובד. כשאתה בחופשה, אתה לא בטוח. המערכת לא קומה.
            </p>
            <ul className="space-y-2 text-slate-600 text-sm">
              <li>✓ סינכרון בעברית 24/7</li>
              <li>✓ עדכוני אוטומטיים ללקוחות</li>
              <li>✓ דוחות בבוקר בפנדק שלך</li>
            </ul>
          </div>

          {/* Feature 4: Learning System */}
          <div className="group bg-gradient-to-br from-white to-slate-50 rounded-2xl p-8 border border-slate-200 hover:border-violet-300 transition-all duration-300 hover:shadow-xl">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-violet-100 to-violet-50 rounded-xl group-hover:from-violet-200 group-hover:to-violet-100 transition-colors">
                <Sparkles className="w-7 h-7 text-violet-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">מערכת שלומדת</h3>
            <p className="text-slate-600 mb-4">
              ככל שאתה משתמש, ה-AI מבין יותר את הדפוסים שלך וחוזה יותר טוב.
            </p>
            <ul className="space-y-2 text-slate-600 text-sm">
              <li>✓ למידה מהפעולות שלך</li>
              <li>✓ הצעות מדויקות יותר עם הזמן</li>
              <li>✓ התאמה לדרך העבודה שלך</li>
            </ul>
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-2xl blur-xl opacity-20" />
          <div className="relative bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-2xl p-12 text-white text-center">
            <h3 className="text-3xl font-bold mb-4">הדיוק שלך בנתונים</h3>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto mb-6">
              כשברי-מובן של העסק שלך בתוך המערכת, כל קבלת החלטה היא מבוססת נתונים. מישהו עוד לא קרא? אתה יודע. עסקה תלויה? אלרט בפנדק שלך. רווחיות מפחתת? אתה רואה זה מיד.
            </p>
            <button className="inline-flex items-center gap-2 bg-white text-purple-600 font-bold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors">
              <span>צפו בדמו</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
