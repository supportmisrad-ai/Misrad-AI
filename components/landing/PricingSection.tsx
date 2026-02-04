'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Product } from '../../types';
import { DEFAULT_PRODUCTS } from '../../constants';
import { getModuleLabelHe } from '@/lib/os/modules/registry';
import { SalesFaq } from '@/components/landing/SalesFaq';
import type { OSModuleKey } from '@/lib/os/modules/types';
import { BILLING_PACKAGES, calculateOrderAmount } from '@/lib/billing/pricing';
import { StyledDropdown } from '@/components/ui/StyledDropdown';

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
        ? 'bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 border-indigo-200 shadow-2xl shadow-indigo-100/50 z-10 hover:shadow-2xl hover:shadow-indigo-200/50 hover:-translate-y-1' 
        : 'bg-white border-slate-200 hover:shadow-xl hover:-translate-y-1'
    }`}>
      {recommended && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-black px-6 py-2 rounded-full uppercase tracking-wider shadow-lg animate-pulse">
          ⭐ הכי משתלם
        </div>
      )}
      <div className="mb-5 sm:mb-6">
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 sm:mb-3">{title}</h3>
        <div className="flex items-baseline gap-1.5 sm:gap-2">
          <span className={`text-4xl sm:text-5xl font-black ${
            recommended ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600' : 'text-slate-900'
          }`}>₪{finalPrice}</span>
          <span className="text-slate-500 text-base sm:text-lg font-bold">/חודש</span>
        </div>
      </div>
      <ul className="space-y-2.5 sm:space-y-3 mb-5 sm:mb-6 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 sm:gap-2.5 text-xs sm:text-sm leading-relaxed text-slate-700">
            <div className={`mt-1 rounded-lg p-1.5 shrink-0 ${
              recommended ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-md' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            }`}>
              <Check size={14} strokeWidth={3} />
            </div>
            <span className="font-medium">{feature}</span>
          </li>
        ))}
      </ul>
      {extra}
      <button 
        onClick={onSelect}
        className={`w-full py-3 sm:py-4 rounded-2xl font-black text-sm sm:text-base transition-all flex items-center justify-center gap-2 group ${
          recommended 
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:shadow-indigo-300/50 hover:scale-105' 
            : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow-lg hover:scale-105'
        }`}
      >
        {buttonLabel} <ArrowRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
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
  isAuthenticated,
  billingCycle: _billingCycle, 
  onBillingCycleChange: _onBillingCycleChange,
  onSelectPlan 
}: PricingSectionProps) {
  const router = useRouter();
  const checkoutBillingCycle: 'monthly' = 'monthly';

  type PersonaKey = 'freelancer' | 'contractor' | 'agency' | 'smb';
  const [persona, setPersona] = useState<PersonaKey>('freelancer');

  const [selectedSoloModule, setSelectedSoloModule] = useState<OSModuleKey>('system');
  const [users, setUsers] = useState<number>(1);

  const personaToPackage: Record<PersonaKey, { title: string; packageType: keyof typeof BILLING_PACKAGES; blurb: string }> = {
    freelancer: {
      title: 'אני פרילאנסר',
      packageType: 'the_authority',
      blurb: 'צריך לקוחות + שיווק + בסיס לניהול עסק בצורה מסודרת.',
    },
    contractor: {
      title: 'אני קבלן',
      packageType: 'the_operator',
      blurb: 'צריך תפעול + כספים + שליטה בשטח.',
    },
    agency: {
      title: 'אני סוכנות',
      packageType: 'the_empire',
      blurb: 'צריך הכל במקום אחד + צוות (Nexus חובה למושבים).',
    },
    smb: {
      title: 'אני עסק קטן',
      packageType: 'the_closer',
      blurb: 'צריך להתחיל ממכירות ולנהל משימות ותהליך עבודה ברור.',
    },
  };

  const recommendedPackageType = personaToPackage[persona].packageType;
  const recommendedModules = BILLING_PACKAGES[recommendedPackageType].modules;

  const packageMarketingCopy: Record<keyof typeof BILLING_PACKAGES, { who: string; examples: string[] }> = {
    solo: {
      who: 'עסקים ממוקדים: עסק שצריך פתרון לבעיה אחת ספציפית.',
      examples: [],
    },
    the_closer: {
      who: 'צוותי מכירות: עסקים שהלב שלהם הוא סגירת עסקאות.',
      examples: [],
    },
    the_authority: {
      who: 'נותני שירותים דיגיטליים: עסקים שמוכרים "ראש" ושירות.',
      examples: [],
    },
    the_operator: {
      who: 'אנשי שטח ועבודת כפיים: עסקים שהעבודה שלהם קורית מחוץ למשרד.',
      examples: [],
    },
    the_empire: {
      who: 'עסקים בצמיחה (SMB): חברה שכבר יש לה כמה מחלקות (מכירות, שיווק, תפעול) וצריכה שהכל ידבר עם הכל.',
      examples: [],
    },
    the_mentor: {
      who: 'כל החבילות',
      examples: [],
    },
  };

  const soloMarketingExamples: string[] = []; // הוסר תוכן דמו

  const recommendedPricing = (() => {
    try {
      return calculateOrderAmount({
        packageType: recommendedPackageType as any,
        billingCycle: checkoutBillingCycle,
        seats: users,
      });
    } catch {
      return { amount: BILLING_PACKAGES[recommendedPackageType].monthlyPrice, modules: recommendedModules, includedSeats: 1, extraSeats: 0 } as any;
    }
  })();

  const kioskPremiumLine = (() => {
    const pkg = recommendedPackageType;
    if (pkg === 'the_operator' || pkg === 'the_empire') {
      return 'פרימיום: מסוף שטח (Kiosk) — שעון נוכחות חכם, משימות ומלאי מטאבלט.';
    }
    if (pkg === 'the_closer' || pkg === 'the_authority') {
      return 'אופציונלי: מסוף שטח (Kiosk) — זמין בחבילות שטח/הכל כלול.';
    }
    return null;
  })();

  const soloPricing = (() => {
    try {
      return calculateOrderAmount({
        packageType: 'solo',
        soloModuleKey: selectedSoloModule,
        billingCycle: checkoutBillingCycle,
        seats: users,
      });
    } catch {
      return { amount: 149, modules: [selectedSoloModule], includedSeats: 1, extraSeats: 0 } as any;
    }
  })();

  const goToTrial = () => {
    const destination = '/workspaces/onboarding';
    if (isAuthenticated) {
      router.push(destination);
      return;
    }
    router.push(`/login?redirect=${encodeURIComponent(destination)}`);
  };

  return (
    <section id="pricing" className="py-32 bg-gradient-to-b from-white via-slate-50 to-white relative z-10 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-20 w-[500px] h-[500px] bg-gradient-to-br from-indigo-100/40 to-purple-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 left-20 w-[600px] h-[600px] bg-gradient-to-br from-purple-100/30 to-pink-100/30 rounded-full blur-[140px]" />
      </div>
      
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 text-indigo-700 text-xs font-black mb-6 shadow-sm">
            <span>💰 מחירון</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 mb-4 sm:mb-6 leading-tight">
            תוכניות שמתאימות
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600">
              לכל עסק 🚀
            </span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            בוחרים חבילה שמתאימה לעסק — או מתחילים ממודול אחד. <strong className="text-slate-900">פשוט ככה.</strong>
          </p>

          <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3 mb-8">
            {(['freelancer', 'contractor', 'agency', 'smb'] as PersonaKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setPersona(k)}
                className={`px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm border transition-all ${
                  persona === k
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-600 shadow-lg shadow-indigo-200/50 scale-105'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {personaToPackage[k].title}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 max-w-6xl mx-auto">
          <PricingCard
            title={BILLING_PACKAGES[recommendedPackageType].labelHe}
            price={recommendedPricing.amount}
            features={[
              personaToPackage[persona].blurb,
              `כולל: ${(recommendedModules || []).map((m) => getModuleLabelHe(m)).join(' · ')}`,
              ...(kioskPremiumLine ? [kioskPremiumLine] : []),
              `משתמשים: ${recommendedPricing.includedSeats} כלולים` + (recommendedPricing.extraSeats > 0 ? ` · +${recommendedPricing.extraSeats} בתוספת` : ''),
              'תוספת משתמשים: 39 ₪ (מחייב Nexus)',
              `למי זה מתאים? ${packageMarketingCopy[recommendedPackageType].who}`,
              ...(packageMarketingCopy[recommendedPackageType].examples.length
                ? ['דוגמאות:', ...packageMarketingCopy[recommendedPackageType].examples.map((x) => `• ${x}`)]
                : []),
            ]}
            recommended={true}
            extra={
              <div className="mb-5 sm:mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-bold text-slate-700">כמה משתמשים צריך?</div>
                  <div className="text-sm font-bold text-slate-900">{users}</div>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={users}
                  onChange={(e) => setUsers(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full"
                />
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={users}
                    onChange={(e) => setUsers(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full rounded-xl bg-white border border-slate-200 px-4 py-2 text-slate-900"
                  />
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  Nexus נדרש עבור יותר ממשתמש אחד.
                </div>
              </div>
            }
            onSelect={() => {
              onSelectPlan('starter');
              goToTrial();
            }}
            billingCycle={checkoutBillingCycle}
            buttonLabel="התחל ניסיון חינם"
          />

          <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-lg hover:shadow-xl transition-all">
            <div className="text-xs sm:text-sm font-bold text-indigo-600">🎯 רוצה רק משהו ספציפי?</div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2 sm:mt-3">מודול בודד (149 ₪)</h3>
            <div className="text-sm sm:text-base text-slate-600 mt-2 sm:mt-3 leading-relaxed">בחר מודול והתחל ניסיון חינם.</div>

            <div className="mt-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 px-5 py-4">
              <div className="text-xs font-black text-slate-600 mb-1">למי זה מתאים?</div>
              <div className="text-sm text-slate-700">
                עסקים ממוקדים: עסק שצריך פתרון לבעיה אחת ספציפית.
              </div>
              {soloMarketingExamples.length ? (
                <div className="mt-3">
                  <div className="text-xs font-black text-slate-600 mb-1">דוגמאות:</div>
                  <div className="text-sm text-slate-700">
                    {soloMarketingExamples.map((x) => (
                      <div key={x}>• {x}</div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-5 space-y-3">
              <StyledDropdown
                value={selectedSoloModule}
                onChange={(value) => setSelectedSoloModule(value as OSModuleKey)}
                options={(['system', 'social', 'client', 'finance', 'operations', 'nexus'] as OSModuleKey[]).map((mk) => ({
                  value: mk,
                  label: getModuleLabelHe(mk)
                }))}
                variant="pricing"
                placeholder="בחר מודול"
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 text-center">
                סיכום: ₪{soloPricing.amount} · {getModuleLabelHe(selectedSoloModule)} · {users} משתמשים
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={() => {
                  onSelectPlan('starter');
                  goToTrial();
                }}
                className="w-full rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 text-white font-black py-4 shadow-lg hover:shadow-xl transition-all hover:scale-105 group"
              >
                התחל ניסיון חינם <ArrowRight size={18} className="inline rotate-180 mr-2 group-hover:-translate-x-1 transition-transform" />
              </button>
              <div className="text-xs text-slate-400 mt-2">
                תוספת משתמשים מעל 1 תתאפשר רק אם בחרת Nexus.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <div className="inline-block bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-3xl p-8 max-w-3xl shadow-xl">
            <p className="text-slate-700 text-lg leading-relaxed">
              בנינו את MISRAD כך ש<strong className="text-slate-900">כל עסק ימצא את מה שהוא צריך</strong> — לא יותר, לא פחות. 
              <span className="block mt-3 text-base text-slate-600">
                בחר רק את מה שאתה באמת משתמש בו, והתחל מהר.
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
