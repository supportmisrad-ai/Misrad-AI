'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Shield, Heart, TrendingUp, Users, Sparkles, Clock, MessageCircle, ArrowLeft, CheckCircle2, Zap } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

type Plan = 'starter' | 'pro' | 'enterprise';
type BillingCycle = 'monthly' | 'yearly';

const planDetails = {
  starter: {
    name: 'סטארטר',
    monthlyPrice: 299,
    yearlyPrice: 239,
    features: [
      'עד 5 משתמשים',
      'ניהול משימות בסיסי',
      'CRM בסיסי',
      'דוחות בסיסיים',
      'תמיכה באימייל',
      '2GB אחסון קבצים'
    ]
  },
  pro: {
    name: 'פרו',
    monthlyPrice: 599,
    yearlyPrice: 479,
    features: [
      'עד 20 משתמשים',
      'כל הפיצ׳רים של סטארטר',
      'System מלא',
      'Client מלא',
      'בינה מלאכותית (AI)',
      'אוטומציות מתקדמות',
      'דוחות מתקדמים',
      'תמיכה עדיפות',
      '50GB אחסון קבצים',
      'אינטגרציות מלאות'
    ]
  },
  enterprise: {
    name: 'אנטרפרייז',
    monthlyPrice: 1299,
    yearlyPrice: 1039,
    features: [
      'משתמשים ללא הגבלה',
      'כל הפיצ׳רים של פרו',
      'Multi-tenant',
      'ניהול תפקידים מתקדם',
      'API מלא',
      'אימות SSO',
      'גיבויים יומיים',
      'תמיכה 24/7',
      'אחסון ללא הגבלה',
      'ניהול מותאם אישית',
      'אימון צוות ייעודי'
    ]
  }
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  
  const [plan, setPlan] = useState<Plan>('pro');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const planParam = searchParams.get('plan') as Plan;
    const billingParam = searchParams.get('billing') as BillingCycle;
    
    if (planParam && ['starter', 'pro', 'enterprise'].includes(planParam)) {
      setPlan(planParam);
    }
    if (billingParam && ['monthly', 'yearly'].includes(billingParam)) {
      setBillingCycle(billingParam);
    }
  }, [searchParams]);

  const selectedPlan = planDetails[plan];
  const price = billingCycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice;
  const finalPrice = billingCycle === 'yearly' ? Math.round(price * 0.8) : price;
  const monthlySavings = billingCycle === 'yearly' ? Math.round(price * 0.2) : 0;

  const handleCheckout = async () => {
    if (!isSignedIn) {
      router.push(`/sign-up?plan=${plan}&billing=${billingCycle}&redirect=checkout`);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          billingCycle,
          price: finalPrice
        })
      });

      if (!response.ok) {
        throw new Error('שגיאה ביצירת חשבון');
      }

      router.push(`/subscribe/checkout`);
    } catch (err: any) {
      setError(err.message || 'אירעה שגיאה. אנא נסה שוב.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0a0f1e] to-[#020617] py-8 sm:py-12 px-4 sm:px-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12 px-4"
        >
          <button
            onClick={() => router.push('/#pricing')}
            className="text-slate-400 hover:text-white mb-6 sm:mb-8 inline-flex items-center gap-2 text-sm transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            חזרה למחירים
          </button>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-6">
            <Sparkles size={14} />
            <span>ניסיון חינם של 14 יום • ביטול בכל עת</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 sm:mb-6 leading-tight">
            אתה בדרך הנכונה
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              להצלחה
            </span>
          </h1>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 border border-emerald-500/30 rounded-2xl p-6 sm:p-8"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <TrendingUp size={24} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-white mb-3">למה זה משתלם לך?</h3>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPageClient({ initialUserId }: { initialUserId: string | null }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0a0f1e] to-[#020617] flex items-center justify-center">
        <div className="text-white text-lg">טוען...</div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
