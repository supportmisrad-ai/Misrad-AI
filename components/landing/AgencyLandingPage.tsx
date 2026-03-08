'use client';

/**
 * Agency Landing Page - דף נחיתה ייעודי לסוכנויות שיווק
 */

import { useState } from 'react';
import { Building2, Users, Zap, Shield, Crown, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';

export default function AgencyLandingPage() {
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-6">
            <Building2 className="h-4 w-4" />
            מיוחד לסוכנויות שיווק
          </div>
          
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            נהל עד <span className="text-orange-600">20 לקוחות</span>
            <br />
            ממערכת אחת חכמה
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            מערכת AI מלאה לסוכנויות שיווק - נהל לקוחות, תוכן, קמפיינים ופרסום ישיר
            <br />
            לרשתות חברתיות. <strong>הכל במקום אחד.</strong>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a href="https://misrad-ai.com/signup?plan=agency">
              <button className="px-8 py-4 bg-orange-600 text-white rounded-lg text-lg font-semibold hover:bg-orange-700 transition-colors flex items-center justify-center gap-2">
                התחל ניסיון חינם 7 ימים
                <ArrowRight className="h-5 w-5" />
              </button>
            </a>
            <a href="https://misrad-ai.com/contact">
              <button className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors">
                הזמן הדגמה אישית
              </button>
            </a>
          </div>

          <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              ללא כרטיס אשראי
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Setup ראשוני 30-45 דק׳
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              ביטול בכל עת
            </div>
          </div>
        </div>
      </div>

      {/* Problem-Solution */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                מנהל 10 לקוחות?
                <br />
                <span className="text-red-600">זה הסיוט שלך</span>
              </h2>
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="text-2xl">😫</span>
                  <div>
                    <strong>10 כלים שונים</strong> - Make, Zapier, Canva, Buffer, לוחות אקסל...
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl">💸</span>
                  <div>
                    <strong>תשלום על כל כלי</strong> - 300₪ כאן, 200₪ שם... סה״כ אלפי שקלים
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl">⏰</span>
                  <div>
                    <strong>בזבוז זמן</strong> - מעבר בין מערכות, העתקה-הדבקה, טעויות...
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl">🤯</span>
                  <div>
                    <strong>אין סדר</strong> - איפה הלקוח ראה? מה פרסמנו? איזה תוכן עבד?
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                עם Misrad AI?
                <br />
                <span className="text-green-600">הכל במקום אחד</span>
              </h3>
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                  <div>
                    <strong>מערכת אחת</strong> - כל 20 הלקוחות במקום אחד
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                  <div>
                    <strong>מחיר אחד</strong> - 999₪/חודש (במקום 3,000₪+)
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                  <div>
                    <strong>חוסך 15 שעות בשבוע</strong> - AI עושה את העבודה
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                  <div>
                    <strong>דשבורד מרכזי</strong> - כל הנתונים במקום אחד
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              כל מה שסוכנות צריכה
            </h2>
            <p className="text-xl text-gray-600">
              מנהל לקוחות, תוכן, קמפיינים ופרסום - הכל במערכת אחת
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">ניהול עד 20 לקוחות</h3>
              <p className="text-gray-600 mb-4">
                כל לקוח עם דשבורד משלו, תכנים משלו, סטטיסטיקות משלו. הפרדה מלאה.
              </p>
              <ul className="text-sm text-gray-700 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  פרופיל לקוח מלא
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Portal ללקוח לאישורים
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  דוחות מותאמים אישית
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">AI ליצירת תוכן</h3>
              <p className="text-gray-600 mb-4">
                תן פרטי לקוח, AI יוצר אסטרטגיה + תוכנית תוכן חודשית + פוסטים.
              </p>
              <ul className="text-sm text-gray-700 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  אסטרטגיית שיווק אוטומטית
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  30 פוסטים ב-2 דקות
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Hashtags חכמים
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">פרסום ישיר (OAuth)</h3>
              <p className="text-gray-600 mb-4">
                חיבור ישיר לפייסבוק, אינסטגרם, לינקדאין. ללא Make/Zapier. פרסום מיידי ללא תלות בכלים חיצוניים.
              </p>
              <ul className="text-sm text-gray-700 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  חיבור OAuth פשוט
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  תזמון חכם
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  פרסום ב-1 קליק
                </li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Crown className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">White Label</h3>
              <p className="text-gray-600 mb-4">
                הלקוחות שלך רואים את המותג שלך, לא את שלנו.
              </p>
              <ul className="text-sm text-gray-700 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  לוגו מותאם אישית
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  צבעי מותג
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  דומיין משלך (בקרוב)
                </li>
              </ul>
            </div>

            {/* Feature 5 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">אבטחה מלאה</h3>
              <p className="text-gray-600 mb-4">
                כל לקוח מבודד לחלוטין. אי אפשר לראות נתונים של לקוח אחר.
              </p>
              <ul className="text-sm text-gray-700 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Tenant isolation מלא
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  הצפנה מלאה
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  גיבוי אוטומטי
                </li>
              </ul>
            </div>

            {/* Feature 6 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">תמיכה VIP</h3>
              <p className="text-gray-600 mb-4">
                תמיכה מועדפת בעברית, מענה תוך 6 שעות.
              </p>
              <ul className="text-sm text-gray-700 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  מענה מהיר
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  שיחות Zoom
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  הדרכות אישיות
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing CTA */}
      <div className="bg-gradient-to-br from-orange-600 to-orange-700 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            תחליף 10 כלים במערכת אחת
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            999₪/חודש עד 20 לקוחות | הכל כלול | ביטול בכל עת
          </p>
          
          <div className="bg-white rounded-lg p-8 max-w-md mx-auto mb-8">
            <div className="text-right mb-4">
              <div className="text-sm text-gray-600 mb-2">תחסוך לפחות:</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Buffer/Hootsuite</span>
                  <span className="font-medium">₪300</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Make/Zapier Pro</span>
                  <span className="font-medium">₪200</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Canva Pro</span>
                  <span className="font-medium">₪100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ChatGPT Plus</span>
                  <span className="font-medium">₪80</span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-gray-200 font-bold text-red-600">
                  <span>סה״כ חיסכון:</span>
                  <span>₪680/חודש</span>
                </div>
              </div>
            </div>
          </div>

          <a href="https://misrad-ai.com/signup?plan=agency">
            <button className="px-10 py-5 bg-white text-orange-600 rounded-lg text-xl font-bold hover:bg-gray-100 transition-colors shadow-xl">
              התחל ניסיון חינם 7 ימים →
            </button>
          </a>
          
          <p className="text-orange-100 text-sm mt-4">
            ללא כרטיס אשראי • התקנה ב-10 דקות • ביטול בכל עת
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            שאלות נפוצות
          </h2>
          
          <div className="space-y-6">
            <details className="bg-white p-6 rounded-lg border border-gray-200">
              <summary className="font-medium text-gray-900 cursor-pointer">
                האם אני צריך להגדיר OAuth לכל לקוח בנפרד?
              </summary>
              <p className="mt-3 text-gray-600">
                כן, כל לקוח מתחבר עם חשבונות הרשתות החברתיות שלו (פייסבוק, לינקדאין). זה לוקח 10 דקות ללקוח, וזה חד-פעמי.
              </p>
            </details>

            <details className="bg-white p-6 rounded-lg border border-gray-200">
              <summary className="font-medium text-gray-900 cursor-pointer">
                האם זה כולל Make/Zapier או שאני צריך לשלם נפרד?
              </summary>
              <p className="mt-3 text-gray-600">
                <strong>הכל כלול!</strong> אם תבחר OAuth (מומלץ) - אין צורך ב-Make/Zapier בכלל. פרסום ישיר מהמערכת.
              </p>
            </details>

            <details className="bg-white p-6 rounded-lg border border-gray-200">
              <summary className="font-medium text-gray-900 cursor-pointer">
                מה קורה אם יש לי יותר מ-20 לקוחות?
              </summary>
              <p className="mt-3 text-gray-600">
                שדרג ל-Enterprise (תמחור מותאם אישית) עם לקוחות בלתי מוגבלים. צור קשר ונתאים לך תוכנית.
              </p>
            </details>

            <details className="bg-white p-6 rounded-lg border border-gray-200">
              <summary className="font-medium text-gray-900 cursor-pointer">
                האם אני יכול לנהל גם את הסושיאל של הסוכנות עצמה?
              </summary>
              <p className="mt-3 text-gray-600">
                <strong>בטח!</strong> הסוכנות נחשבת כ״לקוח״ ראשון. אז יש לך 19 לקוחות נוספים.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
