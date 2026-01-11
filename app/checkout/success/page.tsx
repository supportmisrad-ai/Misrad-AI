'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Sparkles, TrendingUp, Users, Heart, MessageCircle, Zap } from 'lucide-react';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'pro';

  useEffect(() => {
    // Redirect to dashboard after 5 seconds
    const timer = setTimeout(() => {
      router.push('/app');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0a0f1e] to-[#020617] flex items-center justify-center px-4 sm:px-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

      <div className="max-w-3xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="mb-8"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-900/50">
            <CheckCircle2 size={48} className="text-white" strokeWidth={3} />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-4 sm:mb-6 leading-tight"
        >
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
            ברכות!
          </span>
          <br />
          אתה בדרך להצלחה
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-lg sm:text-xl text-slate-300 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          הרכישה הושלמה בהצלחה. <span className="text-white font-bold">אנחנו כאן כדי ללוות אותך</span> בכל שלב של הדרך.
        </motion.p>

        {/* What's Next */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8 text-right"
        >
          <h2 className="text-xl font-black text-white mb-6 flex items-center justify-center gap-3">
            <Sparkles size={24} className="text-emerald-400" />
            מה הלאה?
          </h2>
          
          <div className="space-y-4">
            {[
              {
                icon: MessageCircle,
                title: 'תקבל אימייל',
                text: 'תוך דקות תקבל אימייל עם כל הפרטים והקישור להתחלה',
                color: 'indigo'
              },
              {
                icon: Zap,
                title: 'התחלה מהירה',
                text: 'תוכל להתחיל לעבוד מיד - הכל מוכן ומזומן לך',
                color: 'yellow'
              },
              {
                icon: TrendingUp,
                title: 'תתחיל להרוויח',
                text: 'המערכת תחסוך לך זמן וכסף מהרגע הראשון',
                color: 'emerald'
              },
              {
                icon: Heart,
                title: 'אנחנו כאן',
                text: 'צוות התמיכה שלנו זמין לעזור לך בכל שאלה',
                color: 'pink'
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-start gap-4 p-4 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl bg-${item.color}-500/20 border border-${item.color}-500/30 flex items-center justify-center shrink-0`}>
                  <item.icon size={24} className={`text-${item.color}-400`} />
                </div>
                <div className="flex-1 text-right">
                  <h3 className="font-black text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-300">{item.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/login?redirect=/app')}
            className="px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white rounded-xl font-black text-lg shadow-xl shadow-indigo-900/40 hover:shadow-2xl hover:shadow-indigo-900/60 transition-all flex items-center gap-2"
          >
            <span>התחל עכשיו</span>
            <ArrowRight size={20} className="rotate-180" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/')}
            className="px-8 py-4 bg-slate-800/50 border border-slate-700 text-white rounded-xl font-bold text-lg hover:bg-slate-700/50 transition-all"
          >
            חזרה לדף הבית
          </motion.button>
        </motion.div>

        {/* Reassurance Message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 text-sm text-slate-400"
        >
          מועבר אוטומטית למערכת תוך 5 שניות...
        </motion.p>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0a0f1e] to-[#020617] flex items-center justify-center">
        <div className="text-white text-lg">טוען...</div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
