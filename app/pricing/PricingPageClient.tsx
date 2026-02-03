'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import PricingSection from '@/components/landing/PricingSection';
import KillerFeaturesBox from '@/components/landing/KillerFeaturesBox';

export default function PricingPageClient() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden" dir="rtl">
      <Navbar />
      <div className="pt-20">
        <PricingSection
          isAuthenticated={false}
          billingCycle="monthly"
          onBillingCycleChange={() => void 0}
          onSelectPlan={() => void 0}
        />

        <KillerFeaturesBox />

        <section className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center">
              <div className="text-xs font-black text-slate-500">השוואה מהירה</div>
              <h2 className="mt-3 text-3xl sm:text-4xl font-black text-slate-900">למה זה לא &quot;עוד מערכת&quot;</h2>
            </div>

            <div className="mt-10 rounded-3xl border border-slate-200 bg-white overflow-hidden">
              <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200">
                <div className="p-4 sm:p-5 text-sm font-black text-slate-700 text-right">פיצ׳ר</div>
                <div className="p-4 sm:p-5 text-sm font-black text-slate-900 text-center">MISRAD OS</div>
                <div className="p-4 sm:p-5 text-sm font-black text-slate-500 text-center">מתחרים</div>
              </div>

              {[
                { label: 'שליטה קולית בעברית', ours: true, theirs: false },
                { label: 'חיבור לקבלני משנה', ours: true, theirs: false },
                { label: 'מצב Kiosk לעובדים', ours: true, theirs: false },
              ].map((row) => (
                <div key={row.label} className="grid grid-cols-3 border-b border-slate-200 last:border-b-0">
                  <div className="p-4 sm:p-5 text-sm font-bold text-slate-700 text-right">{row.label}</div>
                  <div className="p-4 sm:p-5 flex items-center justify-center">
                    {row.ours ? <Check size={28} className="text-emerald-600" /> : <X size={28} className="text-rose-600" />}
                  </div>
                  <div className="p-4 sm:p-5 flex items-center justify-center">
                    {row.theirs ? <Check size={28} className="text-emerald-600" /> : <X size={28} className="text-rose-600" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
