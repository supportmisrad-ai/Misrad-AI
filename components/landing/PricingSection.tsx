'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Product } from '../../types';
import { DEFAULT_PRODUCTS } from '../../constants';
import { getModuleLabelHe } from '@/lib/os/modules/registry';
import { SalesFaq } from '@/components/landing/SalesFaq';

interface PricingCardProps {
  title: string;
  price: number;
  features: string[];
  recommended?: boolean;
  onSelect: () => void;
  billingCycle: 'monthly' | 'yearly';
  buttonLabel?: string;
  extra?: React.ReactNode;
}

const PricingCard = ({ title, price, features, recommended = false, onSelect, billingCycle, buttonLabel = 'בחר', extra }: PricingCardProps) => {
  const finalPrice = price;

  return (
    <div className={`relative p-6 sm:p-8 rounded-3xl border flex flex-col h-full transition-all duration-300 ${
      recommended 
        ? 'bg-white border-indigo-300 shadow-md z-10 scale-105' 
        : 'bg-white border-slate-200 hover:shadow-md'
    }`}>
      {recommended && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
          הכי משתלם
        </div>
      )}
      <div className="mb-6 sm:mb-8">
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl sm:text-4xl font-black text-slate-900">₪{finalPrice}</span>
          <span className="text-slate-400 text-sm font-bold">/חודש</span>
        </div>
      </div>
      <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
            <div className={`mt-0.5 rounded-full p-0.5 shrink-0 ${
              recommended ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-50 text-slate-500 border border-slate-200'
            }`}>
              <Check size={12} strokeWidth={3} />
            </div>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {extra}
      <button 
        onClick={onSelect}
        className={`w-full py-3 sm:py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
          recommended 
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm' 
            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100'
        }`}
      >
        {buttonLabel} <ArrowRight size={16} className="rotate-180" />
      </button>
    </div>
  );
};

interface PricingSectionProps {
  isAuthenticated: boolean;
  billingCycle: 'monthly' | 'yearly';
  onBillingCycleChange: (cycle: 'monthly' | 'yearly') => void;
  onSelectPlan: (plan: 'starter' | 'pro' | 'enterprise') => void;
}

export default function PricingSection({ 
  isAuthenticated: _isAuthenticated, 
  billingCycle: _billingCycle, 
  onBillingCycleChange: _onBillingCycleChange,
  onSelectPlan 
}: PricingSectionProps) {
  const router = useRouter();
  const [pricingMode, setPricingMode] = useState<'suite' | 'modules' | 'bundles'>('suite');
  const checkoutBillingCycle: 'monthly' = 'monthly';
  const [fullOfficeUsers, setFullOfficeUsers] = useState<number>(5);

  const fullOfficePrice = 349 + Math.max(0, fullOfficeUsers - 5) * 39;

  const fullOfficeProduct: Product =
    (DEFAULT_PRODUCTS || []).find((p) => p.id === 'prod_full_office') ||
    ({
      id: 'prod_full_office',
      name: 'משרד מלא · 4 מודולים',
      price: 349,
      color: 'bg-indigo-600 text-white',
      modules: ['crm', 'team', 'content', 'finance', 'ai', 'assets'],
      maxUsers: 5,
      maxStorageGB: 100,
      features: [getModuleLabelHe('nexus'), getModuleLabelHe('system'), getModuleLabelHe('social'), getModuleLabelHe('client')],
    } as Product);

  const pushSubscribeCheckout = ({
    plan,
    system,
    amount,
    product,
  }: {
    plan: 'solo' | 'starter' | 'pro' | 'enterprise';
    system?: string;
    amount?: number;
    product?: string;
  }) => {
    const qs = new URLSearchParams({
      plan,
      billing: checkoutBillingCycle,
    });
    if (system) qs.set('system', system);
    if (amount && Number.isFinite(amount) && amount > 0) qs.set('amount', String(amount));
    if (product) qs.set('product', product);
    router.push(`/subscribe/checkout?${qs.toString()}`);
  };

  const moduleCards: Array<{ key: string; title: string; price: number; features: string[]; recommended?: boolean; checkout: { plan: 'solo' | 'starter' | 'pro' | 'enterprise'; system?: string; amount?: number; product?: string } }> = [
    {
      key: 'system',
      title: getModuleLabelHe('system'),
      price: 149,
      features: ['משתמש אחד (ללא ניהול צוות)', 'ניהול לידים', 'Pipeline מכירות', 'משימות Follow Up'],
      recommended: true,
      checkout: { plan: 'solo', system: 'system', amount: 149, product: getModuleLabelHe('system') },
    },
    {
      key: 'client',
      title: getModuleLabelHe('client'),
      price: 149,
      features: ['משתמש אחד (ללא ניהול צוות)', 'פורטל לקוח', 'ניהול קבוצות', 'מעקב פגישות'],
      checkout: { plan: 'solo', system: 'client', amount: 149, product: getModuleLabelHe('client') },
    },
    {
      key: 'social',
      title: getModuleLabelHe('social'),
      price: 149,
      features: ['משתמש אחד (ללא ניהול צוות)', 'תוכן לפי DNA', 'פורטל לקוח', 'גבייה אוטומטית'],
      checkout: { plan: 'solo', system: 'social', amount: 149, product: getModuleLabelHe('social') },
    },
    {
      key: 'nexus',
      title: `${getModuleLabelHe('nexus')} (למנהלים)`,
      price: 149,
      features: ['משתמש אחד (ללא ניהול צוות)', 'משימות', 'יומן', 'ניהול צוות'],
      checkout: { plan: 'solo', system: 'nexus', amount: 149, product: getModuleLabelHe('nexus') },
    },
  ];

  const bundleCards: Array<{ key: string; title: string; price: number; features: string[]; recommended?: boolean; checkout: { plan: 'solo' | 'starter' | 'pro' | 'enterprise'; system?: string; amount?: number; product?: string } }> = [
    {
      key: 'bundle_combo',
      title: 'חבילת Combo (2 מודולים)',
      price: 249,
      features: ['משתמש אחד (ללא ניהול צוות)', 'בחר 2 מודולים מתוך 4', 'כניסה אחת', 'סנכרון בין המודולים'],
      recommended: true,
      checkout: { plan: 'starter', system: 'bundle_combo', amount: 249, product: 'חבילת Combo (2 מודולים)' },
    },
  ];

  return (
    <section id="pricing" className="py-32 bg-slate-50 relative z-10 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-indigo-700 text-xs font-bold mb-6">
            <span>מחירים</span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 mb-6">
            תוכניות שמתאימות
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              לכל עסק
            </span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
            בחר את מה שמתאים לך. כל המחירים כאן הם מחירי מחירון.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3 mb-8">
            <button
              type="button"
              onClick={() => setPricingMode('suite')}
              className={`px-5 py-3 rounded-xl font-bold text-sm border transition-all ${
                pricingMode === 'suite'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              משרד מלא (4 מודולים)
            </button>
            <button
              type="button"
              onClick={() => setPricingMode('modules')}
              className={`px-5 py-3 rounded-xl font-bold text-sm border transition-all ${
                pricingMode === 'modules'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              מודולים
            </button>
            <button
              type="button"
              onClick={() => setPricingMode('bundles')}
              className={`px-5 py-3 rounded-xl font-bold text-sm border transition-all ${
                pricingMode === 'bundles'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              חבילות
            </button>
          </div>

          <div className="mb-12" />
        </div>

        {pricingMode === 'suite' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
              <PricingCard
                title={fullOfficeProduct.name}
                price={fullOfficePrice}
                features={[
                  ...(fullOfficeProduct.features || []),
                  'כולל 5 משתמשים · +₪39 לכל מושב נוסף',
                ]}
                recommended={true}
                extra={
                  <div className="mb-5 sm:mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-bold text-slate-700">כמות משתמשים</div>
                      <div className="text-sm font-bold text-slate-900">{fullOfficeUsers}</div>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={50}
                      step={1}
                      value={fullOfficeUsers}
                      onChange={(e) => setFullOfficeUsers(Math.max(5, Number(e.target.value) || 5))}
                      className="w-full"
                    />
                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <input
                        type="number"
                        min={5}
                        step={1}
                        value={fullOfficeUsers}
                        onChange={(e) => setFullOfficeUsers(Math.max(5, Number(e.target.value) || 5))}
                        className="w-full rounded-xl bg-white border border-slate-200 px-4 py-2 text-slate-900"
                      />
                    </div>
                    <div className="text-xs text-slate-400 mt-2">
                      בסיס 349 ₪ כולל 5 משתמשים. כל משתמש נוסף מעל 5 = 39 ₪.
                    </div>
                  </div>
                }
                onSelect={() => {
                  onSelectPlan('starter');
                  const qs = new URLSearchParams({
                    plan: 'starter',
                    billing: checkoutBillingCycle,
                    system: 'full_stack',
                    amount: String(fullOfficePrice),
                    seats: String(fullOfficeUsers),
                    product: 'משרד מלא (4 מודולים)',
                  });
                  router.push(`/subscribe/checkout?${qs.toString()}`);
                }}
                billingCycle={checkoutBillingCycle}
                buttonLabel="המשך לתשלום"
              />
            </div>
          </>
        )}

        {pricingMode === 'modules' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {moduleCards.map((m) => (
              <PricingCard
                key={m.key}
                title={m.title}
                price={m.price}
                features={m.features}
                recommended={!!m.recommended}
                onSelect={() => pushSubscribeCheckout(m.checkout)}
                billingCycle={checkoutBillingCycle}
                buttonLabel="המשך לתשלום"
              />
            ))}
          </div>
        )}

        {pricingMode === 'bundles' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {bundleCards.map((b) => (
              <PricingCard
                key={b.key}
                title={b.title}
                price={b.price}
                features={b.features}
                recommended={!!b.recommended}
                onSelect={() => pushSubscribeCheckout(b.checkout)}
                billingCycle={checkoutBillingCycle}
                buttonLabel="המשך לתשלום"
              />
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <div className="inline-block bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl shadow-sm">
            <p className="text-slate-600 text-sm mb-2">
              <strong className="text-slate-900">חשוב לדעת:</strong> אפשר לקנות מודול בודד, חבילה או משרד מלא (כל המודולים).
            </p>
            <p className="text-slate-600 text-sm">
              משרד מלא כרגע כולל 4 מודולים. מודול פיננס יצטרף בהמשך.
            </p>
          </div>
        </div>

        <SalesFaq variant="default" />
      </div>
    </section>
  );
}
