'use client';

import React from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import PricingSection from '@/components/landing/PricingSection';

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
      </div>
      <Footer />
    </div>
  );
}
