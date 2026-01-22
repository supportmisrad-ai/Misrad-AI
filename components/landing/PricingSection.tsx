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
      examples: [
        'סוכני ביטוח / נדל"ן: צריכים לנהל לידים, יומן פגישות, ולעקוב אחרי הביצועים של עצמם (Nexus).',
        'מוקדי מכירות: צריכים חייגן, CRM, וניהול משמרות (Nexus).',
      ],
    },
    the_authority: {
      who: 'נותני שירותים דיגיטליים: עסקים שמוכרים "ראש" ושירות.',
      examples: [
        'סוכנויות דיגיטל: צריכים לנהל קמפיינים (Social), לתת ללקוח פורטל שקוף (Client), ולנהל את הצוות (Nexus).',
        'פרילאנסרים (מעצבים, בוני אתרים): צריכים לשווק את עצמם ולתת שירות VIP ללקוח.',
      ],
    },
    the_operator: {
      who: 'אנשי שטח ועבודת כפיים: עסקים שהעבודה שלהם קורית מחוץ למשרד.',
      examples: [
        'מתקיני מזגנים / חשמלאים: צריכים לנהל קריאות שירות (Operations), להוציא חשבונית בשטח (Finance), ולנהל את הטכנאים (Nexus).',
        'חברות הובלה / ניקיון: צריכים סידור עבודה וגבייה.',
      ],
    },
    the_empire: {
      who: 'עסקים בצמיחה (SMB): חברה שכבר יש לה כמה מחלקות (מכירות, שיווק, תפעול) וצריכה שהכל ידבר עם הכל.',
      examples: [
        'חברת שיפוצים גדולה: יש להם גם אנשי מכירות (System), גם טכנאים בשטח (Operations), וגם הנהלת חשבונות (Finance).',
        'סטארטאפ: צריך לנהל הכל במקום אחד כדי לחסוך זמן וכסף.',
      ],
    },
    the_mentor: {
      who: 'Legacy',
      examples: [],
    },
  };

  const soloMarketingExamples = (() => {
    const mk = selectedSoloModule;
    if (mk === 'system') {
      return ['מוקד טלפוני קטן: צריך רק System (חייגן ולידים).'];
    }
    if (mk === 'finance') {
      return ['מנהל חשבונות: צריך רק Finance (חשבוניות).'];
    }
    if (mk === 'social') {
      return ['מנהל סושיאל: צריך רק Social (ניהול פוסטים ללקוחות).'];
    }
    return [];
  })();

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

  const goToCheckout = (params: { packageType: keyof typeof BILLING_PACKAGES; soloModuleKey?: OSModuleKey; seats?: number }) => {
    const qs = new URLSearchParams({
      billing: checkoutBillingCycle,
      package: String(params.packageType),
    });
    if (params.packageType === 'solo' && params.soloModuleKey) {
      qs.set('module', String(params.soloModuleKey));
    }
    if (params.seats && Number.isFinite(params.seats) && params.seats > 0) {
      qs.set('seats', String(params.seats));
    }
    router.push(`/subscribe/checkout?${qs.toString()}`);
  };

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
            בוחרים חבילה שמתאימה לעסק — או מתחילים ממודול אחד. פשוט.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3 mb-8">
            {(['freelancer', 'contractor', 'agency', 'smb'] as PersonaKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setPersona(k)}
                className={`px-5 py-3 rounded-xl font-bold text-sm border transition-all ${
                  persona === k
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {personaToPackage[k].title}
              </button>
            ))}
          </div>

          <div className="mb-12" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          <PricingCard
            title={`${BILLING_PACKAGES[recommendedPackageType].labelHe} (${BILLING_PACKAGES[recommendedPackageType].monthlyPrice} ₪)`}
            price={recommendedPricing.amount}
            features={[
              personaToPackage[persona].blurb,
              `כולל: ${(recommendedModules || []).map((m) => getModuleLabelHe(m)).join(' · ')}`,
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
              goToCheckout({ packageType: recommendedPackageType, seats: users });
            }}
            billingCycle={checkoutBillingCycle}
            buttonLabel="המשך לתשלום"
          />

          <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="text-sm text-slate-500">רוצה רק משהו ספציפי?</div>
            <h3 className="text-xl font-black text-slate-900 mt-2">מודול בודד (149 ₪)</h3>
            <div className="text-sm text-slate-600 mt-2">בחר מודול והמשך לתשלום.</div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
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

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                value={selectedSoloModule}
                onChange={(e) => setSelectedSoloModule(e.target.value as OSModuleKey)}
                className="w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-900"
              >
                {(['system', 'social', 'client', 'finance', 'operations', 'nexus'] as OSModuleKey[]).map((mk) => (
                  <option key={mk} value={mk}>
                    {getModuleLabelHe(mk)}
                  </option>
                ))}
              </select>

              <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                סיכום: ₪{soloPricing.amount} · {getModuleLabelHe(selectedSoloModule)} · {users} משתמשים
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={() => {
                  onSelectPlan('starter');
                  goToCheckout({ packageType: 'solo', soloModuleKey: selectedSoloModule, seats: users });
                }}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 shadow-sm"
              >
                המשך לתשלום <ArrowRight size={16} className="inline rotate-180 mr-2" />
              </button>
              <div className="text-xs text-slate-400 mt-2">
                תוספת משתמשים מעל 1 תתאפשר רק אם בחרת Nexus.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-block bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl shadow-sm">
            <p className="text-slate-600 text-sm">
              <strong className="text-slate-900">המסר השיווקי:</strong> "לא משנה מה העסק שלך עושה, יש לנו חבילה שתפורה בדיוק למידות שלך."
            </p>
          </div>
        </div>

        <SalesFaq variant="default" />
      </div>
    </section>
  );
}
