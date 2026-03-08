'use client';

import React, { useState, useMemo } from 'react';
import { ArrowRight, Check, Users, Minus, Plus, ShoppingCart, TrendingUp, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getModuleLabelHe } from '@/lib/os/modules/registry';
import type { OSModuleKey } from '@/lib/os/modules/types';
import { BILLING_PACKAGES, AI_CREDITS_PER_PLAN, calculateOrderAmount, hasNexus } from '@/lib/billing/pricing';
import { StyledDropdown } from '@/components/ui/StyledDropdown';
import PricingHelper from '@/components/landing/PricingHelper';

interface PricingSectionProps {
  isAuthenticated: boolean;
  billingCycle: 'monthly' | 'yearly';
  onBillingCycleChange: (cycle: 'monthly' | 'yearly') => void;
  onSelectPlan: (plan: 'starter' | 'pro' | 'enterprise') => void;
}

type PackageKey = 'solo' | 'the_closer' | 'the_authority' | 'the_operator' | 'the_empire';

const PACKAGES: { key: PackageKey; emoji: string; label: string; who: string; price: number; modules: string; freeUsers: number }[] = [
  { key: 'solo', emoji: '🎯', label: 'מודול בודד', who: 'צריך רק דבר אחד ספציפי', price: 149, modules: 'מודול לבחירה', freeUsers: 1 },
  { key: 'the_closer', emoji: '💼', label: 'מכירות', who: 'סוכן ביטוח, נדל״ן, מוקד — מנהל לידים עם AI', price: 249, modules: 'מכירות + ניהול', freeUsers: 1 },
  { key: 'the_authority', emoji: '🎨', label: 'שיווק ומיתוג', who: 'פרילנסר / נותן שירות שמייצר תוכן', price: 349, modules: 'שיווק + לקוחות + ניהול', freeUsers: 1 },
  { key: 'the_operator', emoji: '🔧', label: 'תפעול ושטח', who: 'קבלן / אנשי שטח שרוצים סדר', price: 349, modules: 'תפעול + ניהול + כספים', freeUsers: 1 },
  { key: 'the_empire', emoji: '👑', label: 'הכל כלול', who: 'ארגון בצמיחה שרוצה AI בכל מודול', price: 499, modules: 'כל 6 המודולים', freeUsers: 5 },
];

export default function PricingSection({ 
  isAuthenticated,
  billingCycle: externalBillingCycle, 
  onBillingCycleChange,
  onSelectPlan 
}: PricingSectionProps) {
  const router = useRouter();
  const [selectedPkg, setSelectedPkg] = useState<PackageKey>('the_empire');
  const [selectedSoloModule, setSelectedSoloModule] = useState<OSModuleKey>('system');
  const [users, setUsers] = useState<number>(1);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(externalBillingCycle || 'monthly');
  const [isNavigating, setIsNavigating] = useState(false);

  const toggleBilling = () => {
    const next = billingCycle === 'monthly' ? 'yearly' : 'monthly';
    setBillingCycle(next);
    onBillingCycleChange?.(next);
  };

  const pkg = PACKAGES.find((p) => p.key === selectedPkg) || PACKAGES[4];
  const isSolo = selectedPkg === 'solo';

  const pricing = useMemo(() => {
    try {
      return calculateOrderAmount({
        packageType: selectedPkg,
        soloModuleKey: isSolo ? selectedSoloModule : undefined,
        billingCycle,
        seats: users,
      });
    } catch {
      return { amount: pkg.price, modules: BILLING_PACKAGES[selectedPkg].modules, includedSeats: pkg.freeUsers, extraSeats: 0 };
    }
  }, [selectedPkg, isSolo, selectedSoloModule, billingCycle, users, pkg.price, pkg.freeUsers]);

  const monthlyPrice = useMemo(() => {
    try {
      return calculateOrderAmount({
        packageType: selectedPkg,
        soloModuleKey: isSolo ? selectedSoloModule : undefined,
        billingCycle: 'monthly',
        seats: users,
      }).amount;
    } catch {
      return pkg.price;
    }
  }, [selectedPkg, isSolo, selectedSoloModule, users, pkg.price]);

  const yearlySavings = billingCycle === 'yearly' ? (monthlyPrice * 12) - (pricing.amount * 12) : 0;

  const goToTrial = () => {
    if (isNavigating) return;
    setIsNavigating(true);

    const planParams = new URLSearchParams();
    planParams.set('plan', selectedPkg);
    planParams.set('seats', String(users));
    if (isSolo) planParams.set('module', selectedSoloModule);

    const destination = `/workspaces/onboarding?${planParams.toString()}`;
    if (isAuthenticated) {
      router.push('/me');
      return;
    }
    const loginParams = new URLSearchParams();
    loginParams.set('mode', 'sign-up');
    loginParams.set('plan', selectedPkg);
    loginParams.set('seats', String(users));
    if (isSolo) loginParams.set('module', selectedSoloModule);
    loginParams.set('redirect', destination);
    router.push(`/login?${loginParams.toString()}`);
  };

  const goToCheckout = () => {
    if (isNavigating) return;
    setIsNavigating(true);

    const params = new URLSearchParams();
    params.set('package', selectedPkg);
    params.set('billing', billingCycle);
    params.set('seats', String(users));
    if (isSolo) params.set('module', selectedSoloModule);
    params.set('product', BILLING_PACKAGES[selectedPkg].labelHe);
    router.push(`/subscribe/checkout?${params.toString()}`);
  };

  const incrementUsers = () => setUsers((u) => Math.min(50, u + 1));
  const decrementUsers = () => setUsers((u) => Math.max(1, u - 1));

  return (
    <section id="pricing" className="py-20 sm:py-32 bg-gradient-to-b from-white via-slate-50 to-white relative z-10 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-20 right-20 w-[500px] h-[500px] bg-gradient-to-br from-indigo-100/40 to-purple-100/40 rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
        <div className="absolute bottom-20 left-20 w-[600px] h-[600px] bg-gradient-to-br from-purple-100/30 to-pink-100/30 rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
      </div>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-3 sm:mb-5 leading-tight">
            בחר את החבילה שלך
          </h2>
          <p className="text-base sm:text-lg text-slate-500 max-w-xl mx-auto">
            לחץ על החבילה שמתאימה — התמחור מתעדכן מיד.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <span className={`text-sm font-bold transition-colors ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-400'}`}>
              חודשי
            </span>
            <button
              onClick={toggleBilling}
              className={`relative w-14 h-8 rounded-full transition-all duration-300 ${billingCycle === 'yearly' ? 'bg-indigo-600' : 'bg-slate-200'}`}
              aria-label="Toggle billing cycle"
            >
              <div
                className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 ${billingCycle === 'yearly' ? 'left-7' : 'left-1'}`}
              />
            </button>
            <span className={`text-sm font-bold transition-colors ${billingCycle === 'yearly' ? 'text-slate-900' : 'text-slate-400'}`}>
              שנתי
              <span className="mr-2 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-black rounded-full border border-emerald-200">
                חסוך 20%
              </span>
            </span>
          </div>
        </div>

        {/* Package selector — pill buttons */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10 sm:mb-12">
          {PACKAGES.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setSelectedPkg(p.key)}
              className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-full font-black text-xs sm:text-sm border-2 transition-all duration-200 ${
                selectedPkg === p.key
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-500 shadow-lg shadow-indigo-200/50 scale-105'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 hover:shadow-md'
              }`}
            >
              <span className="ml-1">{p.emoji}</span>
              {p.label}
              <span className={`mr-1.5 text-[10px] font-bold ${selectedPkg === p.key ? 'text-indigo-100' : 'text-slate-400'}`}>
                ₪{p.price}
              </span>
            </button>
          ))}
        </div>

        {/* Help buttons */}
        <div className="flex justify-center mb-10 sm:mb-12">
          <PricingHelper onSelectPersona={(p) => {
            const map: Record<string, PackageKey> = {
              freelancer: 'the_authority',
              contractor: 'the_operator',
              agency: 'the_empire',
              smb: 'the_closer',
            };
            setSelectedPkg(map[p] || 'the_empire');
          }} />
        </div>

        {/* Main pricing card */}
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-[2rem] border-2 border-indigo-200 bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/20 shadow-2xl shadow-indigo-100/40 overflow-hidden">
            {/* Top badge */}
            {selectedPkg === 'the_empire' ? (
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-center py-2 text-xs font-black tracking-wide">
                ⭐ הכי משתלם — כל המודולים + {pkg.freeUsers} משתמשים חינם
              </div>
            ) : null}

            <div className="p-6 sm:p-8 md:p-10">
              {/* Package name + price */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="text-sm font-bold text-indigo-600 mb-1">{pkg.emoji} {BILLING_PACKAGES[selectedPkg].labelHe}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                      ₪{pricing.amount}
                    </span>
                    <span className="text-slate-500 text-lg font-bold">/חודש{billingCycle === 'yearly' ? ' · שנתי' : ''}</span>
                    <span className="text-xs font-bold text-slate-400">(כולל מע&quot;מ)</span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-700">
                        <TrendingUp size={12} />
                        חסוך ₪{monthlyPrice - pricing.amount}/חודש
                      </span>
                      <span className="text-xs text-slate-400 line-through">₪{monthlyPrice}</span>
                    </div>
                  )}
                </div>
                {/* Free users badge */}
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-50 border-2 border-emerald-200">
                  <Users size={16} className="text-emerald-600" />
                  <span className="text-sm font-black text-emerald-800">
                    {pricing.includedSeats === 1 ? 'משתמש אחד' : `${pricing.includedSeats} משתמשים`} חינם
                  </span>
                </div>
              </div>

              {/* Who is this for */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200 px-5 py-3.5 mb-6">
                <div className="text-sm text-slate-700">
                  <strong className="text-slate-900">למי:</strong> {pkg.who}
                </div>
              </div>

              {/* Modules */}
              <div className="mb-6">
                <div className="text-xs font-black text-slate-500 mb-2.5">מודולים כלולים</div>
                {isSolo ? (
                  <div className="space-y-3">
                    <StyledDropdown
                      value={selectedSoloModule}
                      onChange={(value) => setSelectedSoloModule(value as OSModuleKey)}
                      options={(['system', 'social', 'client', 'operations', 'nexus'] as OSModuleKey[]).map((mk) => ({
                        value: mk,
                        label: getModuleLabelHe(mk),
                      }))}
                      variant="pricing"
                      placeholder="בחר מודול"
                    />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(BILLING_PACKAGES[selectedPkg].modules || []).map((m) => (
                      <span key={m} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700">
                        <Check size={12} strokeWidth={3} />
                        {getModuleLabelHe(m)}
                      </span>
                    ))}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-xs font-bold text-amber-700">
                      🎁 כספים — בונוס חינם
                    </span>
                  </div>
                )}
              </div>

              {/* Finance Bonus Note */}
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 mb-4">
                <span className="text-sm">🎁</span>
                <span className="text-xs font-bold text-amber-800">
                  מודול כספים בחינם עם כל חבילה — AI מנתח חשבוניות, מעקב תשלומים ותזרים. דורש אינטגרציה עם מערכת חשבוניות קיימת (חשבונית ירוקה, iCount ודומיהם).
                </span>
              </div>

              {/* AI Credits */}
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 border border-purple-100 mb-6">
                <span className="text-sm">🤖</span>
                <span className="text-xs font-bold text-purple-700">
                  {AI_CREDITS_PER_PLAN[selectedPkg].toLocaleString()} קרדיטי AI לחודש
                </span>
              </div>

              {/* Users stepper */}
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">כמה משתמשים?</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {pricing.includedSeats} כלולים בחינם{pricing.extraSeats > 0 ? ` · ${pricing.extraSeats} נוספים × 39 ₪` : ''}
                    </div>
                    {!hasNexus(pricing.modules) && users > 1 && (
                      <div className="text-[11px] text-amber-600 font-bold mt-1">תוספת משתמשים דורשת חבילה עם Nexus</div>
                    )}
                  </div>
                  <div className="flex items-center gap-0">
                    <button
                      type="button"
                      onClick={decrementUsers}
                      disabled={users <= 1}
                      className="w-10 h-10 rounded-r-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 disabled:opacity-30 transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={hasNexus(pricing.modules) ? 50 : 1}
                      value={hasNexus(pricing.modules) ? users : 1}
                      onChange={(e) => setUsers(Math.max(1, Math.min(hasNexus(pricing.modules) ? 50 : 1, Number(e.target.value) || 1)))}
                      className="w-14 h-10 border-y border-slate-200 text-center text-sm font-black text-slate-900 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={incrementUsers}
                      disabled={users >= 50 || !hasNexus(pricing.modules)}
                      className="w-10 h-10 rounded-l-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 disabled:opacity-30 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary line */}
              <div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 px-5 py-3 mb-6 text-center">
                <span className="text-sm font-bold text-slate-700">
                  סה״כ: <strong className="text-indigo-700 text-base">₪{pricing.amount}/חודש</strong>
                  {billingCycle === 'yearly' && <span className="text-xs text-slate-500"> (₪{pricing.amount * 12} לשנה)</span>}
                  {' · '}
                  {isSolo ? getModuleLabelHe(selectedSoloModule) : pkg.modules}
                  {' · '}
                  {users === 1 ? 'משתמש אחד' : `${users} משתמשים`}
                  {billingCycle === 'yearly' && yearlySavings > 0 && (
                    <span className="text-emerald-700 mr-1"> · חיסכון שנתי ₪{yearlySavings}</span>
                  )}
                </span>
              </div>

              {/* CTA — Trial + Buy Now */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => { onSelectPlan('starter'); goToTrial(); }}
                  disabled={isNavigating}
                  className="py-4 rounded-full font-black text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-200/50 hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isNavigating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      מעביר להרשמה...
                    </>
                  ) : (
                    <>
                      התחל 7 ימי ניסיון חינם
                      <ArrowRight size={16} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
                <button
                  onClick={goToCheckout}
                  disabled={isNavigating}
                  className="py-4 rounded-full font-black text-sm bg-white border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isNavigating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ShoppingCart size={16} />
                  )}
                  רכוש עכשיו
                </button>
              </div>
              <div className="text-[11px] text-slate-400 text-center mt-2">ללא כרטיס אשראי לניסיון · ביטול בכל עת · כל המחירים כוללים מע&quot;מ</div>
            </div>
          </div>
        </div>

        {/* Bottom note */}
        <div className="mt-12 sm:mt-16 text-center space-y-3">
          <div className="inline-block bg-white border border-slate-200 rounded-full px-6 py-3 shadow-md">
            <span className="text-sm text-slate-600 font-bold">
              כל החבילות כוללות <strong className="text-indigo-700">ניסיון חינם 7 ימים</strong> + <strong className="text-emerald-700">משתמשים כלולים</strong> + <strong className="text-amber-700">מודול כספים בחינם</strong>
            </span>
          </div>
          <div className="text-xs text-slate-400 font-bold">כל המחירים כוללים מע&quot;מ</div>
        </div>
      </div>
    </section>
  );
}
