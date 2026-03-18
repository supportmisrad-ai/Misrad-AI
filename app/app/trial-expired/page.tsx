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
  const { isSignedIn, userId, signOut } = useAuth();
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
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-[540px] space-y-6">
        {/* Main Card */}
        <div className="bg-white border border-slate-200/60 rounded-[24px] shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          {/* Header */}
          <div className="p-8 pt-10 text-center border-b border-slate-50">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-2xl mb-6 ring-1 ring-slate-100">
              <Clock className="w-8 h-8 text-slate-900" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
              תקופת הניסיון הסתיימה
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              הנתונים של <span className="text-slate-900 font-bold">{orgInfo?.name || 'הארגון שלך'}</span> בטוחים ומחכים לך.
            </p>
          </div>

          {/* Content */}
          <div className="p-8 space-y-8">
            {/* Status Section */}
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                <div className="shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
                    <Shield className="w-4 h-4 text-indigo-600" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">הגישה הושהתה זמנית</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    כדי להמשיך להשתמש ב-AI ובכלים המתקדמים של המערכת, יש לבחור חבילה או להתחיל ניסיון חדש במידה ואתם זכאים.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-1 gap-4">
              {/* Option 1: Upgrade to Paid - Primary */}
              <div className="group relative p-5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-200 hover:shadow-luxury transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Package className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-md uppercase tracking-wider">מומלץ</div>
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-1">שדרוג לחבילה מלאה</h3>
                <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                  המשך לעבוד ללא הגבלה עם כל כלי ה-AI והאוטומציה.
                </p>
                <Link href="/subscribe/checkout" className="block">
                  <Button
                    size="lg"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-6 rounded-xl shadow-none"
                  >
                    צפה בחבילות ושדרג
                  </Button>
                </Link>
              </div>

              {/* Option 2: Start New Trial - Secondary (If eligible) */}
              {orgInfo?.canStartNewTrial && (
                <div className="group p-5 bg-white border border-slate-200 rounded-2xl hover:border-amber-200 hover:shadow-luxury transition-all duration-300">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center group-hover:rotate-12 transition-transform">
                      <RefreshCw className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-slate-900">זכאי לניסיון נוסף!</h3>
                      <p className="text-[11px] text-slate-500">7 ימים נוספים במערכת</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleStartNewTrial}
                    disabled={startingNewTrial}
                    className="w-full border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 font-bold text-sm py-6 rounded-xl transition-all"
                  >
                    {startingNewTrial ? 'מכין ניסיון חדש...' : 'הפעל ניסיון נוסף'}
                  </Button>
                </div>
              )}
            </div>

            {/* Support Quick Link */}
            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-100">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-xs font-bold text-slate-600">צריך עזרה בהחלטה?</div>
              </div>
              <a 
                href="https://wa.me/972512239520" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs font-black text-indigo-600 hover:text-indigo-700 underline underline-offset-4"
              >
                דבר איתנו בוואטסאפ
              </a>
            </div>

            {/* Sign Out */}
            <div className="text-center">
              <button 
                onClick={() => signOut?.({ redirectUrl: '/login' })}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
              >
                התנתקות מהחשבון
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> SSL SECURE</span>
          <span className="flex items-center gap-1.5"><Building2 className="w-3 h-3" /> MISRAD AI HQ</span>
        </div>
      </div>
    </div>
  );
}
