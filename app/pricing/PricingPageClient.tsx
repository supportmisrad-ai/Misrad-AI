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
import { StorageRetentionSection } from '@/components/landing/StorageRetentionSection';
import GlobalPromotionBanner from '@/components/promotions/GlobalPromotionBanner';
import ContextualBannerDisplay from '@/components/promotions/ContextualBannerDisplay';

export default function PricingPageClient() {
  const { isSignedIn } = useAuth();

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden" dir="rtl">
      <Navbar isSignedIn={!!isSignedIn} />
      
      <ContextualBannerDisplay onPricingPage />
      <GlobalPromotionBanner onPricingPage />
      
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
              <h2 className="mt-3 text-3xl sm:text-4xl font-black text-slate-900">למה לשלם על מותגים?</h2>
              <p className="mt-2 text-sm text-slate-500">כשעסק ישראלי צריך תכלס תוצאות — בלי עמלות מנופחות</p>
            </div>

            <div className="mt-10 rounded-3xl border border-slate-200 bg-white overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800">
                    <th className="p-4 sm:p-5 font-black text-slate-300 text-right">פיצ׳ר</th>
                    <th className="p-4 sm:p-5 font-black text-white text-center bg-slate-800/50">MISRAD AI</th>
                    <th className="p-4 sm:p-5 font-black text-slate-500 text-center">Fireberry</th>
                    <th className="p-4 sm:p-5 font-black text-slate-500 text-center">הכוורת</th>
                    <th className="p-4 sm:p-5 font-black text-slate-500 text-center">Monday</th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    { label: 'מחיר ל-5 משתמשים (חבילת הכל כלול)', ours: '₪499', fireberry: '₪640–820', kaveret: '₪675', monday: '₪220–440' },
                    { label: 'משתמשים כלולים (חבילת הכל כלול)', ours: '5', fireberry: '0 (לפי משתמש)', kaveret: '0 (לפי משתמש)', monday: '0 (לפי משתמש)' },
                    { label: 'מינימום משתמשים נדרש', ours: '1', fireberry: '1', kaveret: '1', monday: '3' },
                    { label: '6 כלים שסוגרים פינות (מכירות+שיווק+...)', ours: true, fireberry: false, kaveret: false, monday: false },
                    { label: 'גבייה וכסף (במתנה)', ours: true, fireberry: false, kaveret: false, monday: false },
                    { label: 'פקודות קוליות בעברית', ours: true, fireberry: false, kaveret: false, monday: false },
                    { label: 'טופס לידים (לינק לשיתוף)', ours: true, fireberry: false, kaveret: false, monday: false },
                    { label: 'ייבוא חכם (AI)', ours: true, fireberry: 'בסיסי', kaveret: 'בסיסי', monday: 'בסיסי' },
                    { label: 'מצב שטח (Kiosk) לעובדים', ours: true, fireberry: false, kaveret: false, monday: false },
                    { label: 'הגנת שבת הרמטית', ours: true, fireberry: false, kaveret: false, monday: false },
                    { label: 'לוח שנה עברי', ours: true, fireberry: false, kaveret: false, monday: false },
                    { label: 'עברית מלאה', ours: true, fireberry: true, kaveret: true, monday: true },
                    { label: 'אפליקציית מובייל', ours: 'מערכת מותאמת (ללא התקנה)', fireberry: true, kaveret: true, monday: true },
                  ] as Array<{ label: string; ours: boolean | string; fireberry: boolean | string; kaveret: boolean | string; monday: boolean | string }>).map((row) => (
                    <tr key={row.label} className="border-b border-slate-200 last:border-b-0">
                      <td className="p-4 sm:p-5 font-bold text-slate-700 text-right">{row.label}</td>
                      {(['ours', 'fireberry', 'kaveret', 'monday'] as const).map((col) => {
                        const val = row[col];
                        return (
                          <td key={col} className={`p-4 sm:p-5 text-center ${col === 'ours' ? 'bg-slate-50/30' : ''}`}>
                            {typeof val === 'string' ? (
                              <span className={`text-xs font-black ${col === 'ours' ? 'text-slate-900' : 'text-slate-400'}`}>{val}</span>
                            ) : val ? (
                              <Check size={20} className={`${col === 'ours' ? 'text-slate-900' : 'text-slate-400'} mx-auto`} strokeWidth={3} />
                            ) : (
                              <X size={20} className="text-slate-200 mx-auto" strokeWidth={2} />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-6 text-[11px] text-slate-400 text-center leading-relaxed">
              מחירים מבוססים על מחירי שוק רשמיים (2025/2026). 
              <br />
              <strong className="text-slate-900">ב-MISRAD AI אתם לא משלמים לפי משתמש</strong> — עד 5 משתמשים כלולים בחבילה אחת.
              <br />
              <span className="text-slate-400">"הגנת שבת" = המערכת ננעלת כדי שתוכלו לנוח באמת.</span>
              <br />
              <strong className="text-slate-900">תכלס תוצאות. בלי אותיות קטנות.</strong>
            </p>
          </div>
        </section>

        <CostComparisonSection />

        <SecurityTrustSection />

        <StorageRetentionSection />

        <TestimonialsSection />

        <SalesFaq variant="default" />
      </div>
      <Footer />
    </div>
  );
}
