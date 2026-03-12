'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, Mail, Phone, CircleAlert, Building2, Clock, CreditCard, RefreshCw, Package, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';

interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  trialEndDate: string;
  daysSinceExpired: number;
  canStartNewTrial: boolean;
  subscriptionStatus: string;
}

export default function TrialExpiredPage() {
  const { isSignedIn, userId } = useAuth();
  const [orgInfo, setOrgInfo] = useState<OrganizationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingNewTrial, setStartingNewTrial] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !userId) {
      setLoading(false);
      return;
    }

    // Fetch current organization info
    fetch('/api/user/organization-info')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.organization) {
          setOrgInfo(data.organization);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [isSignedIn, userId]);

  const handleStartNewTrial = async () => {
    if (!orgInfo?.canStartNewTrial) return;
    
    setStartingNewTrial(true);
    setError(null);
    
    try {
      const res = await fetch('/api/trial/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Redirect to onboarding or workspace
        window.location.href = data.redirectUrl || '/workspaces/onboarding';
      } else {
        setError(data.error || 'לא ניתן להתחיל ניסיון חדש כעת');
        setStartingNewTrial(false);
      }
    } catch (err) {
      setError('שגיאה בתקשורת עם השרת');
      setStartingNewTrial(false);
    }
  };

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
            {orgInfo && (
              <p className="text-blue-200 text-sm mt-2" dir="rtl">
                {orgInfo.name} • תם לפני {orgInfo.daysSinceExpired} ימים
              </p>
            )}
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
                    תקופת הניסיון החינמית שלך במערכת Misrad AI הסתיימה. 
                    כל המידע שלך נשמר ומאובטח. כדי להמשיך להשתמש במערכת,
                    יש לבחור באחת מהאפשרויות הבאות.
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

            {/* Option 1: Start New Trial (if eligible) */}
            {orgInfo?.canStartNewTrial && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-6 shadow-lg">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-xl mb-2">
                    <RefreshCw className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="font-black text-slate-900 text-xl mb-2">
                    התחל ניסיון חדש 🎁
                  </h3>
                  <p className="text-slate-700 text-sm">
                    זכאי לניסיון נוסף! לאחר {orgInfo.daysSinceExpired} ימים מהניסיון הקודם,
                    ניתן להתחיל ניסיון חדש של 7 ימים.
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={handleStartNewTrial}
                  disabled={startingNewTrial}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-lg py-6"
                >
                  {startingNewTrial ? (
                    <>
                      <RefreshCw className="w-5 h-5 ml-2 animate-spin" />
                      מכין ניסיון חדש...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5 ml-2" />
                      התחל ניסיון חדש
                    </>
                  )}
                </Button>
                {error && (
                  <p className="text-red-600 text-sm text-center mt-2">{error}</p>
                )}
              </div>
            )}

            {/* Option 2: Upgrade to Paid */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6 shadow-lg">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl mb-2">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-black text-slate-900 text-2xl mb-2">
                  שדרג לחבילה בתשלום 🚀
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
                  צפה בחבילות ושדרג
                </Button>
              </Link>
              <p className="text-xs text-center text-slate-600 mt-3">
                תשלום מאובטח דרך Morning (חשבונית ירוקה) 🔒
              </p>
            </div>

            {/* Option 3: Contact Support */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
              <h3 className="font-black text-slate-900 text-lg mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                צריכים עזרה? צרו קשר
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                הצוות שלנו זמין לסייע בבחירת החבילה המתאימה ביותר
              </p>

              <div className="space-y-3">
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
                  href="https://wa.me/972512239520" target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow group"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-600">טלפון / WhatsApp</p>
                    <p className="font-bold text-slate-900 group-hover:text-green-600 transition-colors" dir="ltr">
                      051-2239520
                    </p>
                  </div>
                </a>
              </div>
            </div>

            {/* Security Note */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-3 text-slate-600">
                <Shield className="w-5 h-5 text-slate-400" />
                <p className="text-sm">
                  המידע שלך מאובטח ונשמר. שחזור הגישה לא יאבד שום נתון.
                </p>
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
              <div className="mt-3 text-[11px] text-amber-700 font-bold bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                🎁 מודול כספים בחינם עם כל חבילה &bull; כל המחירים כוללים מע&quot;מ
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
            MISRAD AI &bull; ע.מ 314885518 &bull; הפסנתר 9, ראשון לציון &bull; support@misrad-ai.com &bull; 051-2239520
          </p>
        </div>
      </div>
    </div>
  );
}
