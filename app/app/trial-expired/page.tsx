import React from 'react';
import { Calendar, Mail, Phone, CircleAlert, Building2, Clock, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'תקופת הניסיון הסתיימה | Misrad AI',
  description: 'תקופת הניסיון שלך הסתיימה. צור קשר איתנו להמשך שימוש במערכת.',
};

export default function TrialExpiredPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Main Card */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
          {/* Header with gradient background */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-4">
              <Clock className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2" dir="rtl">
              תקופת הניסיון הסתיימה
            </h1>
            <p className="text-blue-100 text-lg" dir="rtl">
              הגעת לסוף תקופת הניסיון החינמית
            </p>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6" dir="rtl">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex gap-4">
                <div className="shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <CircleAlert className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-black text-blue-900 mb-2">מה זה אומר?</h3>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    תקופת הניסיון החינמית שלך במערכת Misrad AI הסתיימה. כדי להמשיך להשתמש במערכת,
                    יש ליצור קשר עם הצוות שלנו לבחירת חבילה מתאימה והמשך השימוש.
                  </p>
                </div>
              </div>
            </div>

            {/* What happens now */}
            <div className="space-y-3">
              <h3 className="font-black text-slate-900 text-lg">מה קורה עכשיו?</h3>
              <div className="space-y-2">
                {[
                  '🔒 הגישה למערכת הוגבלה זמנית',
                  '💾 כל המידע שלך נשמר ומאובטח',
                  '🔄 ניתן לשחזר גישה מלאה לאחר בחירת חבילה',
                  '📞 הצוות שלנו זמין לסייע לך בתהליך',
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3 text-slate-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Primary CTA - Payment */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6 shadow-lg">
              <div className="text-center mb-4">
                <h3 className="font-black text-slate-900 text-2xl mb-2">
                  מוכנים להמשיך? 🚀
                </h3>
                <p className="text-slate-700">
                  השלם תשלום והמשך להשתמש במערכת באופן מיידי
                </p>
              </div>
              <Link href="/subscribe/checkout">
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-black text-lg py-6"
                >
                  <CreditCard className="w-6 h-6 ml-2" />
                  הסדר תשלום עכשיו
                </Button>
              </Link>
              <p className="text-xs text-center text-slate-600 mt-3">
                תשלום מאובטח דרך Morning (חשבונית ירוקה) 🔒
              </p>
            </div>

            {/* Alternative: Contact Section */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
              <h3 className="font-black text-slate-900 text-lg mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                צריכים עזרה? צרו קשר
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                הצוות שלנו זמין לסייע בבחירת החבילה המתאימה ביותר
              </p>

              <div className="space-y-3">
                {/* Contact Info */}
                <a
                  href="mailto:support@misrad-ai.com"
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow group"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-600">מייל</p>
                    <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                      support@misrad-ai.com
                    </p>
                  </div>
                </a>

                <a
                  href="https://wa.me/972547700700" target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow group"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-600">טלפון</p>
                    <p className="font-bold text-slate-900 group-hover:text-green-600 transition-colors" dir="ltr">
                      054-770-0700
                    </p>
                  </div>
                </a>
              </div>
            </div>

            {/* Packages Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <h3 className="font-black text-slate-900 text-lg mb-3">החבילות שלנו</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { name: '🎯 מודול בודד', price: '₪149' },
                  { name: '💼 מכירות', price: '₪249' },
                  { name: '🎨 שיווק ומיתוג', price: '₪349' },
                  { name: '👑 הכל כלול', price: '₪499' },
                ].map((pkg, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg">
                    <span className="font-medium text-slate-700">{pkg.name}</span>
                    <span className="font-black text-indigo-600">{pkg.price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Back to Login */}
            <div className="pt-4 text-center">
              <Link href="/login">
                <Button variant="outline" className="w-full sm:w-auto">
                  חזרה לדף התחברות
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-6">
          <p className="text-sm text-slate-600" dir="rtl">
            <Calendar className="inline-block w-4 h-4 ml-1" />
            MISRAD AI &bull; הפסנתר 9, ראשון לציון &bull; support@misrad-ai.com
          </p>
        </div>
      </div>
    </div>
  );
}
