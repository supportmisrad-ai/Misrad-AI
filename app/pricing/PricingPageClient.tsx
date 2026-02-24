'use client';

import React from 'react';
import { useAuth } from '@clerk/nextjs';
import { Check, X } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import PricingSection from '@/components/landing/PricingSection';
import KillerFeaturesBox from '@/components/landing/KillerFeaturesBox';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import { SalesFaq } from '@/components/landing/SalesFaq';
import { SecurityTrustSection } from '@/components/landing/SecurityTrustSection';
import { CostComparisonSection } from '@/components/landing/CostComparisonSection';

export default function PricingPageClient() {
  const { isSignedIn } = useAuth();

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden" dir="rtl">
      <Navbar isSignedIn={!!isSignedIn} />
      <div className="pt-20">
        <PricingSection
          isAuthenticated={!!isSignedIn}
          billingCycle="monthly"
          onBillingCycleChange={() => void 0}
          onSelectPlan={() => void 0}
        />

        <KillerFeaturesBox />

        <section className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center">
              <div className="text-xs font-black text-slate-500">השוואה הוגנת</div>
              <h2 className="mt-3 text-3xl sm:text-4xl font-black text-slate-900">מה מייחד את MISRAD?</h2>
              <p className="mt-2 text-sm text-slate-500">מול מתחרים ישראליים ובינלאומיים — בשקיפות מלאה</p>
            </div>

            <div className="mt-10 rounded-3xl border border-slate-200 bg-white overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 sm:p-5 font-black text-slate-700 text-right">פיצ׳ר</th>
                    <th className="p-4 sm:p-5 font-black text-indigo-700 text-center">MISRAD AI</th>
                    <th className="p-4 sm:p-5 font-black text-slate-500 text-center">Fireberry</th>
                    <th className="p-4 sm:p-5 font-black text-slate-500 text-center">הכוורת</th>
                    <th className="p-4 sm:p-5 font-black text-slate-500 text-center">Monday</th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    { label: 'מחיר ל-5 משתמשים (חבילת הכל כלול)', ours: '₪499', fireberry: '₪640–820', kaveret: '₪675', monday: '₪220–440' },
                    { label: 'משתמשים כלולים (חבילת הכל כלול)', ours: '5', fireberry: '0 (per user)', kaveret: '0 (per user)', monday: '0 (per user)' },
                    { label: 'מינימום משתמשים נדרש', ours: '1', fireberry: '1', kaveret: '1', monday: '3' },
                    { label: '6 מודולים (CRM+שיווק+תפעול+...)', ours: true, fireberry: false, kaveret: false, monday: false },
                    { label: 'Finance מובנה (במתנה)', ours: true, fireberry: false, kaveret: false, monday: false },
                    { label: 'שליטה קולית בעברית', ours: true, fireberry: false, kaveret: false, monday: false },
                    { label: 'מצב Kiosk לעובדים', ours: true, fireberry: false, kaveret: false, monday: false },
                    { label: 'מותאם לשבת', ours: true, fireberry: false, kaveret: false, monday: false },
                    { label: 'לוח שנה עברי', ours: true, fireberry: false, kaveret: false, monday: false },
                    { label: 'עברית מלאה', ours: true, fireberry: true, kaveret: true, monday: true },
                    { label: 'אפליקציית מובייל', ours: 'PWA (כמו אפליקציה)', fireberry: true, kaveret: true, monday: true },
                  ] as Array<{ label: string; ours: boolean | string; fireberry: boolean | string; kaveret: boolean | string; monday: boolean | string }>).map((row) => (
                    <tr key={row.label} className="border-b border-slate-200 last:border-b-0">
                      <td className="p-4 sm:p-5 font-bold text-slate-700 text-right">{row.label}</td>
                      {(['ours', 'fireberry', 'kaveret', 'monday'] as const).map((col) => {
                        const val = row[col];
                        return (
                          <td key={col} className="p-4 sm:p-5 text-center">
                            {typeof val === 'string' ? (
                              <span className={`text-xs font-bold ${col === 'ours' ? 'text-indigo-700' : 'text-slate-500'}`}>{val}</span>
                            ) : val ? (
                              <Check size={22} className="text-emerald-600 mx-auto" />
                            ) : (
                              <X size={22} className="text-rose-400 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-slate-400 text-center">
              מחירים מבוססים על תמחור רשמי של כל ספק (2025/2026). Fireberry: $35–$45/user. הכוורת: ₪135/user. Monday Pro: $24/user (מינימום 3).
              <br />
              <strong className="text-indigo-600">MISRAD AI כוללת עד 5 משתמשים בחבילת "הכל כלול"</strong> — מתחרים גובים per user בלבד.
              <br />
              <span className="text-slate-500">"מותאם לשבת" = בחירה אידיאולוגית של המפתח. לא מתאים? יש Monday/Fireberry/הכוורת (פתוח 24/7).</span>
              <br />
              <strong className="text-slate-600">כל המחירים של MISRAD AI כוללים מע&quot;מ.</strong>
            </p>
          </div>
        </section>

        <CostComparisonSection />

        <SecurityTrustSection />

        <TestimonialsSection />

        <SalesFaq variant="default" />
      </div>
      <Footer />
    </div>
  );
}
