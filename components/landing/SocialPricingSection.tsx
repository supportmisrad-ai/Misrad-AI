'use client';

/**
 * Social Module Pricing Section
 * סקציית תמחור ייעודית למודול Social
 */

import React, { useState } from 'react';
import { Check, Crown, Zap, Users, Building2, ArrowRight } from 'lucide-react';
import { SOCIAL_PRICING, getSocialYearlySavings } from '@/lib/billing/social-pricing';
import { SocialPlan } from '@/types/social';

export default function SocialPricingSection() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans: SocialPlan[] = ['solo', 'team', 'agency', 'enterprise'];

  const getPlanIcon = (plan: SocialPlan) => {
    switch (plan) {
      case 'solo':
        return Zap;
      case 'team':
        return Users;
      case 'agency':
        return Building2;
      case 'enterprise':
        return Crown;
      default:
        return Zap;
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'צור קשר';
    return `₪${price}`;
  };

  return (
    <div className="py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            תמחור מודול Social
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            פרסום ישיר לרשתות חברתיות עם AI. בחר את התוכנית המתאימה לך
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <span
              className={`text-sm font-medium ${
                billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              חודשי
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              style={{
                backgroundColor: billingCycle === 'yearly' ? '#3b82f6' : '#e5e7eb',
              }}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium ${
                billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              שנתי
              <span className="mr-1 text-green-600 font-bold">(-20%)</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((planKey) => {
            const plan = SOCIAL_PRICING[planKey];
            const Icon = getPlanIcon(planKey);
            const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
            const savings = billingCycle === 'yearly' ? getSocialYearlySavings(planKey) : 0;

            return (
              <div
                key={planKey}
                className={`relative rounded-2xl border-2 p-8 ${
                  plan.highlighted
                    ? 'border-blue-500 bg-blue-50 shadow-xl scale-105'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      הכי פופולרי ⭐
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.labelHe}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                  <div className="text-4xl font-bold text-gray-900">
                    {formatPrice(price)}
                    {price > 0 && (
                      <span className="text-lg font-normal text-gray-500">/חודש</span>
                    )}
                  </div>
                  {savings > 0 && (
                    <p className="text-sm text-green-600 font-medium mt-2">
                      חוסך ₪{savings} בשנה
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">{plan.bestFor}</p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => {
                    // Check if feature contains markdown bold
                    const isBold = feature.includes('**');
                    const cleanFeature = feature.replace(/\*\*/g, '');

                    return (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span
                          className={`text-sm ${
                            isBold ? 'font-bold text-gray-900' : 'text-gray-700'
                          }`}
                        >
                          {cleanFeature}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* CTA */}
                <a href={price === 0 ? 'https://misrad-ai.com/contact' : `https://misrad-ai.com/signup?plan=${planKey}`}>
                  <button
                    className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                      plan.highlighted
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {price === 0 ? 'צור קשר' : 'התחל ניסיון חינם'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </a>
              </div>
            );
          })}
        </div>

        {/* Bottom Note */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600">
            כל התוכניות כוללות 7 ימי ניסיון חינם • ביטול בכל עת • תמיכה בעברית
          </p>
          <p className="text-xs text-gray-500 mt-2">
            המחירים כוללים מע״מ • פרסום ישיר (OAuth) ללא צורך ב-Make/Zapier • הכל כלול
          </p>
        </div>
      </div>
    </div>
  );
}
