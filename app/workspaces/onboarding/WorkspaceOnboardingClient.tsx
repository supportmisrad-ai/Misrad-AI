'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Building2, Phone, Mail, ArrowLeft, Sparkles, Crown, Briefcase, Palette, Wrench, Target, GraduationCap, Loader2, Puzzle, MessageCircle, X, ChevronDown, Tag, Lightbulb, CheckCircle2 } from 'lucide-react';
import { upsertCustomerAccountForCurrentOrganization, selectPlanForCurrentOrganization } from '@/app/actions/customer-accounts';
import { getActiveGlobalPromotion } from '@/app/actions/global-promotion';
import { Input } from '@/components/ui/input';
import { BILLING_PACKAGES, CUSTOM_PLAN_PRICE_TABLE, calculateCustomPlanPrice } from '@/lib/billing/pricing';
import type { PackageType } from '@/lib/billing/pricing';
import { getModuleLabel, getModuleLabelHe } from '@/lib/os/modules/registry';
import type { OSModuleKey } from '@/lib/os/modules/types';

const PLAN_EMOJI: Record<string, string> = {
  solo: '🎯',
  the_closer: '💼',
  the_authority: '🎨',
  the_operator: '🔧',
  the_empire: '👑',
  the_mentor: '🏆',
  custom: '🧩',
};

const PLAN_ICON: Record<string, React.ReactNode> = {
  solo: <Target size={20} />,
  the_closer: <Briefcase size={20} />,
  the_authority: <Palette size={20} />,
  the_operator: <Wrench size={20} />,
  the_empire: <Crown size={20} />,
  the_mentor: <GraduationCap size={20} />,
  custom: <Puzzle size={20} />,
};

const PLAN_DESCRIPTION: Record<string, string> = {
  solo: 'מודול אחד לבחירתך',
  the_closer: 'מודול SYSTEM (מכירות) + מודול NEXUS (נקסוס) - ניהול וצוות',
  the_authority: 'מודול SOCIAL (שיווק) + CLIENT (לקוחות) + NEXUS (נקסוס) - מיתוג ולקוחות',
  the_operator: 'מודול OPERATIONS (תפעול) + NEXUS (נקסוס) - שטח וצוות',
  the_empire: 'כל המודולים כלולים',
  the_mentor: 'כל המודולים + ליווי',
  custom: 'בחר בדיוק את המודולים שאתה צריך',
};

// Plans to show in the picker (excluding the_mentor which is special)
const VISIBLE_PLANS: PackageType[] = ['the_empire', 'the_closer', 'the_authority', 'the_operator', 'solo'];

type OnboardingStep = 'plan' | 'details';

type ActivePromo = {
  discountPercent: number | null;
  discountAmountCents: number | null;
  badgeText: string | null;
  couponCode: string | null;
} | null;

const MODULE_OPTIONS: { key: OSModuleKey; labelEn: string; labelHe: string; desc: string; color: string }[] = [
  { key: 'nexus',      labelEn: 'NEXUS',      labelHe: 'ניהול וצוות',    desc: 'ניהול משימות, צוות וניתוחים', color: 'indigo' },
  { key: 'system',     labelEn: 'SYSTEM',     labelHe: 'מכירות',          desc: 'CRM, לידים ומשפכי מכירה',     color: 'blue'   },
  { key: 'social',     labelEn: 'SOCIAL',     labelHe: 'שיווק',            desc: 'ניהול תוכן ושיווק דיגיטלי',  color: 'pink'   },
  { key: 'client',     labelEn: 'CLIENT',     labelHe: 'לקוחות',           desc: 'ניהול לקוחות ומתאמים',        color: 'orange' },
  { key: 'operations', labelEn: 'OPERATIONS', labelHe: 'תפעול',            desc: 'שטח, שיפטים ונוכחות',         color: 'cyan'   },
];

const MODULE_COLOR_CLASSES: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  indigo: { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-300', ring: 'ring-indigo-200' },
  blue:   { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-300',   ring: 'ring-blue-200'   },
  pink:   { bg: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-300',   ring: 'ring-pink-200'   },
  orange: { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-300', ring: 'ring-orange-200' },
  cyan:   { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-300',   ring: 'ring-cyan-200'   },
};

// Quick AI chat for plan guidance
const AI_QUESTIONS: { q: string; a: string }[] = [
  {
    q: 'מה מתאים לעסק קטן שמתחיל?',
    a: '💡 לעסק קטן שמתחיל, ממליצים על **מודול בודד** (149₪) — בחר את האזור הכי כואב: מכירות (System), שיווק (Social) או ניהול (Nexus). אפשר לשדרג בכל עת ללא קנס.',
  },
  {
    q: 'יש מודולים שלא קיים בחבילה שמתאימה לי',
    a: '🧩 בדיוק בשביל זה בנינו את **"בנה חבילה משלך"** — בחר כל שילוב של מודולים. המחיר מחושב לפי כמות המודולים: 1→149₪, 2→249₪, 3→349₪, 4→429₪, 5→499₪.',
  },
  {
    q: 'מה ההבדל בין הכל כלול לבנה משלך?',
    a: '👑 **הכל כלול** (499₪) = 5 מודולים + Finance מתנה. **בנה משלך** = שלם רק על מה שצריך. לדוגמה: Nexus + Social + System + Client = 4 מודולים = 429₪ (חיסכון של 70₪ לחודש).',
  },
  {
    q: 'מה כלול בניסיון החינם?',
    a: '✅ **7 ימים מלאים** לכל החבילות — ללא כרטיס אשראי, ללא הגבלות. גישה מלאה לכל המודולים שבחרת. בסיום ה-7 ימים תוכל לבחור להמשיך או לבטל.',
  },
];

export default function WorkspaceOnboardingClient(props: {
  organizationKey: string;
  initialCompanyName: string;
  initialPhone: string;
  initialEmail: string;
  planKey: string | null;
  seats: number | null;
  soloModuleKey: string | null;
}) {
  const router = useRouter();

  const needsPlanSelection = !props.planKey;
  const [step, setStep] = useState<OnboardingStep>(needsPlanSelection ? 'plan' : 'details');
  const [selectedPlan, setSelectedPlan] = useState<PackageType | null>(
    props.planKey ? (props.planKey as PackageType) : null
  );
  const [selectedSoloModule, setSelectedSoloModule] = useState<OSModuleKey | null>(
    props.soloModuleKey ? (props.soloModuleKey as OSModuleKey) : null
  );
  const [customModules, setCustomModules] = useState<Set<OSModuleKey>>(new Set());
  const [activePromo, setActivePromo] = useState<ActivePromo>(null);
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState(props.initialCompanyName);
  const [phone, setPhone] = useState(props.initialPhone);
  const [email, setEmail] = useState(props.initialEmail);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load active promotion
  useEffect(() => {
    getActiveGlobalPromotion().then((res) => {
      if (res.success && res.data) {
        setActivePromo({
          discountPercent: res.data.discountPercent,
          discountAmountCents: res.data.discountAmountCents,
          badgeText: res.data.badgeText,
          couponCode: res.data.couponCode,
        });
      }
    }).catch(() => null);
  }, []);

  const activePlanKey = selectedPlan || props.planKey;

  const planDef = useMemo(() => {
    if (!activePlanKey) return null;
    const key = activePlanKey as PackageType;
    if (!Object.prototype.hasOwnProperty.call(BILLING_PACKAGES, key)) return null;
    return { key, ...BILLING_PACKAGES[key] };
  }, [activePlanKey]);

  const activeSoloModule = selectedSoloModule || props.soloModuleKey;

  const planModules = useMemo(() => {
    if (!planDef) return [];
    if (planDef.key === 'solo' && activeSoloModule) {
      return [activeSoloModule as OSModuleKey];
    }
    if (planDef.key === 'custom') {
      return Array.from(customModules) as OSModuleKey[];
    }
    return planDef.modules;
  }, [planDef, activeSoloModule, customModules]);

  const canSubmitDetails = useMemo(() => {
    return Boolean(companyName.trim() && phone.trim() && email.trim());
  }, [companyName, phone, email]);

  const customPrice = useMemo(() => calculateCustomPlanPrice(customModules.size), [customModules]);

  const canProceedFromPlan = useMemo(() => {
    if (!selectedPlan) return false;
    if (selectedPlan === 'solo' && !selectedSoloModule) return false;
    if (selectedPlan === 'custom' && customModules.size === 0) return false;
    return true;
  }, [selectedPlan, selectedSoloModule, customModules]);

  const handlePlanContinue = async () => {
    if (!canProceedFromPlan || isSaving) return;
    setError(null);
    setIsSaving(true);

    try {
      const res = await selectPlanForCurrentOrganization({
        orgSlug: props.organizationKey,
        planKey: String(selectedPlan),
        soloModuleKey: selectedPlan === 'solo' ? selectedSoloModule : null,
        customModules: selectedPlan === 'custom' ? Array.from(customModules) : null,
      });

      if (!res.success) {
        throw new Error(res.error || 'שגיאה בבחירת חבילה');
      }

      setStep('details');
      setIsSaving(false);
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)) || 'שגיאה בבחירת חבילה');
      setIsSaving(false);
    }
  };

  const handleDetailsSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    setError(null);

    const name = companyName.trim();
    const p = phone.trim();
    const emailValue = email.trim();

    if (!name) {
      setError('שם עסק חובה');
      return;
    }
    if (!p) {
      setError('טלפון חובה');
      return;
    }
    if (!emailValue) {
      setError('אימייל חובה');
      return;
    }

    setIsSaving(true);
    try {
      const res = await upsertCustomerAccountForCurrentOrganization({
        orgSlug: props.organizationKey,
        companyName: name,
        phone: p,
        email: emailValue,
      });

      if (!res.success) {
        throw new Error(res.error || 'שגיאה בשמירה');
      }

      // Navigate directly to first module of the selected plan (skip intermediate redirect)
      const firstModule = planModules[0];
      const dest = firstModule
        ? `/w/${encodeURIComponent(props.organizationKey)}/${firstModule}`
        : `/w/${encodeURIComponent(props.organizationKey)}/lobby`;
      router.push(dest);
      // Keep isSaving=true — page will unmount during navigation.
      // This prevents the button from becoming clickable again.
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)) || 'שגיאה בשמירה');
      setIsSaving(false);
    }
  };

  const totalSteps = needsPlanSelection ? 4 : 3;
  const currentStepNumber = step === 'plan' ? 2 : (needsPlanSelection ? 3 : 2);

  const soloModuleOptions: { key: OSModuleKey; label: string; labelEn: string }[] = [
    { key: 'nexus', label: 'ניהול וצוות', labelEn: 'NEXUS' },
    { key: 'system', label: 'מכירות', labelEn: 'SYSTEM' },
    { key: 'social', label: 'שיווק', labelEn: 'SOCIAL' },
    { key: 'client', label: 'לקוחות', labelEn: 'CLIENT' },
    { key: 'operations', label: 'תפעול', labelEn: 'OPERATIONS' },
  ];

  const toggleCustomModule = (mod: OSModuleKey) => {
    setCustomModules(prev => {
      const next = new Set(prev);
      if (next.has(mod)) next.delete(mod);
      else next.add(mod);
      return next;
    });
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" dir="rtl">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[520px] h-[520px] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-[-10%] left-[-10%] w-[420px] h-[420px] bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[520px] h-[520px] bg-emerald-500/10 rounded-full blur-[120px]" />
      </div>

      <div className={`relative mx-auto px-6 py-14 ${step === 'plan' ? 'max-w-2xl' : 'max-w-xl'}`}>
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black mb-4">
            <Sparkles size={14} /> כמעט שם!
          </div>
          <h1 className="text-3xl font-black text-slate-900">
            {step === 'plan' ? 'בחר את החבילה שלך' : 'עוד רגע מתחילים'}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {step === 'plan'
              ? '7 ימי ניסיון חינם לכל חבילה · ללא כרטיס אשראי'
              : 'צריך רק כמה פרטים כדי להפעיל את הניסיון החינם שלך'}
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-3 mb-6 px-1">
          {/* Step 1: Signed up */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black">
              <Check size={14} strokeWidth={3} />
            </div>
            <span className="text-xs font-bold text-emerald-600">נרשמת</span>
          </div>
          <div className="flex-1 h-px bg-slate-200" />

          {/* Step 2: Plan selection (only if needed) */}
          {needsPlanSelection ? (
            <>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                  step === 'plan'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-emerald-500 text-white'
                }`}>
                  {step === 'plan' ? '2' : <Check size={14} strokeWidth={3} />}
                </div>
                <span className={`text-xs font-black ${step === 'plan' ? 'text-indigo-700' : 'text-emerald-600'}`}>
                  חבילה
                </span>
              </div>
              <div className="flex-1 h-px bg-slate-200" />
            </>
          ) : null}

          {/* Step: Business details */}
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
              step === 'details'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-200 text-slate-400'
            }`}>
              {currentStepNumber}
            </div>
            <span className={`text-xs font-black ${step === 'details' ? 'text-indigo-700' : 'text-slate-400'}`}>
              פרטי העסק
            </span>
          </div>
          <div className="flex-1 h-px bg-slate-200" />

          {/* Last step: Go */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-xs font-black">
              {totalSteps}
            </div>
            <span className="text-xs font-bold text-slate-400">מתחילים!</span>
          </div>
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* STEP: Plan Selection                    */}
        {/* ═══════════════════════════════════════ */}
        {step === 'plan' ? (
          <div className="space-y-4">

            {/* Recommendation Banner */}
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 flex gap-3">
              <Lightbulb size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-emerald-800">המלצה לעסקים קטנים</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  התחל עם <strong>מודול בודד (149₪)</strong> — הכי כלכלי לשלב ההתחלה. אפשר לשדרג בכל עת ללא קנס. 80% מהלקוחות מגיעים ל-3+ מודולים תוך 3 חודשים.
                </p>
              </div>
            </div>

            {/* Active Promo Banner */}
            {activePromo ? (
              <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 flex items-center gap-3">
                <Tag size={18} className="text-amber-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-amber-800">
                    {activePromo.badgeText || '⚡ מבצע פעיל'}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {activePromo.discountPercent
                      ? `${activePromo.discountPercent}% הנחה על כל החבילות`
                      : activePromo.discountAmountCents
                        ? `${Math.round(activePromo.discountAmountCents / 100)}₪ הנחה`
                        : 'הנחה מיוחדת'}
                    {activePromo.couponCode ? (
                      <span className="mr-2 font-mono font-black bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded text-amber-900">
                        קוד: {activePromo.couponCode}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Plan Cards */}
            <div className="grid grid-cols-1 gap-3">
              {VISIBLE_PLANS.map((key) => {
                const pkg = BILLING_PACKAGES[key];
                const isSelected = selectedPlan === key;
                const isPopular = key === 'the_empire';
                const displayPrice = activePromo?.discountPercent
                  ? Math.round(pkg.monthlyPrice * (1 - activePromo.discountPercent / 100))
                  : pkg.monthlyPrice;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedPlan(key);
                      if (key !== 'solo') setSelectedSoloModule(null);
                      setError(null);
                    }}
                    className={`relative w-full text-right rounded-2xl border-2 p-5 transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 shadow-lg shadow-indigo-100/50'
                        : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    {isPopular ? (
                      <div className="absolute -top-3 left-4 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-black">
                        הכי פופולרי
                      </div>
                    ) : null}

                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {PLAN_ICON[key] || <Target size={20} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900">{pkg.labelHe}</span>
                          <span className="text-lg">{PLAN_EMOJI[key]}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{PLAN_DESCRIPTION[key]}</div>
                        {key !== 'solo' ? (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {pkg.modules.map((m) => (
                              <span key={m} className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                                {getModuleLabel(m)} ({getModuleLabelHe(m)})
                              </span>
                            ))}
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-[10px] font-bold text-amber-600">
                              + Finance (כספים)
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="text-left shrink-0">
                        {activePromo?.discountPercent && displayPrice < pkg.monthlyPrice ? (
                          <div className="text-[10px] text-slate-400 line-through">{pkg.monthlyPrice}₪</div>
                        ) : null}
                        <div className={`text-lg font-black ${
                          activePromo?.discountPercent ? 'text-emerald-600' : 'text-slate-900'
                        }`}>{displayPrice}₪</div>
                        <div className="text-[10px] text-slate-400 font-bold">לחודש</div>
                      </div>

                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                      }`}>
                        {isSelected ? <Check size={14} strokeWidth={3} className="text-white" /> : null}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Build Your Own Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPlan('custom');
                  setSelectedSoloModule(null);
                  setError(null);
                }}
                className={`relative w-full text-right rounded-2xl border-2 p-5 transition-all ${
                  selectedPlan === 'custom'
                    ? 'border-violet-500 bg-violet-50/50 shadow-lg shadow-violet-100/50'
                    : 'border-dashed border-slate-300 bg-white/70 hover:border-violet-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    selectedPlan === 'custom' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Puzzle size={20} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900">בנה חבילה משלך 🧩</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">בחר בדיוק את המודולים שאתה צריך — שלם רק על מה שמשתמשים</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(CUSTOM_PLAN_PRICE_TABLE).map(([count, price]) => (
                        <span key={count} className="px-2 py-0.5 rounded-full bg-violet-50 text-[10px] font-bold text-violet-600">
                          {count} מודול{Number(count) > 1 ? 'ים' : ''} = {price}₪
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    {selectedPlan === 'custom' && customModules.size > 0 ? (
                      <>
                        <div className="text-lg font-black text-violet-700">{customPrice}₪</div>
                        <div className="text-[10px] text-slate-400 font-bold">לחודש</div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-black text-slate-400">מ-149₪</div>
                        <div className="text-[10px] text-slate-400 font-bold">לחודש</div>
                      </>
                    )}
                  </div>

                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedPlan === 'custom' ? 'border-violet-600 bg-violet-600' : 'border-slate-300'
                  }`}>
                    {selectedPlan === 'custom' ? <Check size={14} strokeWidth={3} className="text-white" /> : null}
                  </div>
                </div>
              </button>
            </div>

            {/* Solo module picker */}
            {selectedPlan === 'solo' ? (
              <div className="rounded-2xl border-2 border-indigo-100 bg-indigo-50/30 p-5">
                <div className="text-sm font-black text-slate-700 mb-3">בחר את המודול שלך:</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {soloModuleOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => { setSelectedSoloModule(opt.key); setError(null); }}
                      className={`px-4 py-3 rounded-xl text-sm font-black transition-all ${
                        selectedSoloModule === opt.key
                          ? 'bg-indigo-600 text-white shadow-lg'
                          : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="text-[10px] opacity-70">{opt.labelEn}</div>
                      <div>({opt.label})</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Custom module picker */}
            {selectedPlan === 'custom' ? (
              <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/30 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-black text-slate-700">בחר את המודולים שלך:</div>
                  {customModules.size > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{customModules.size} מודולים</span>
                      <span className="text-base font-black text-violet-700">{customPrice}₪/חודש</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">בחר לפחות מודול אחד</span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {MODULE_OPTIONS.map((mod) => {
                    const isChecked = customModules.has(mod.key);
                    const colors = MODULE_COLOR_CLASSES[mod.color];
                    return (
                      <button
                        key={mod.key}
                        type="button"
                        onClick={() => toggleCustomModule(mod.key)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-right ${
                          isChecked
                            ? `${colors.bg} ${colors.border} shadow-sm`
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                          isChecked ? `${colors.border.replace('border', 'bg').replace('-300', '-500')} border-transparent` : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked ? <Check size={12} strokeWidth={3} className="text-white" /> : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-slate-900">{mod.labelEn}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>{mod.labelHe}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{mod.desc}</div>
                        </div>
                        {isChecked ? (
                          <CheckCircle2 size={16} className={`shrink-0 ${colors.text}`} />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                {customModules.size > 0 ? (
                  <div className="mt-4 pt-4 border-t border-violet-100 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      + Finance (כספים) — מתנה לכל חבילה
                    </div>
                    <div className="text-base font-black text-violet-700">
                      סה״כ: {customPrice}₪/חודש
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handlePlanContinue}
              disabled={!canProceedFromPlan || isSaving}
              className="h-13 w-full py-4 rounded-2xl font-black text-base bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-200/50 hover:shadow-2xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  המשך
                  <ArrowLeft size={18} />
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-400 text-center">
              ללא כרטיס אשראי · בטל בכל עת · 7 ימי ניסיון מלא
            </p>

            {/* AI Chat Help Widget */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => { setShowAiChat(v => !v); setAiAnswer(null); }}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle size={16} className="text-indigo-500" />
                  <span className="text-sm font-black text-slate-700">לא בטוח איזו חבילה מתאימה? שאל אותנו</span>
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${showAiChat ? 'rotate-180' : ''}`} />
              </button>

              {showAiChat ? (
                <div className="border-t border-slate-100 p-4">
                  {aiAnswer ? (
                    <div className="mb-4">
                      <div className="bg-indigo-50 rounded-2xl p-4 text-sm text-slate-700 leading-relaxed border border-indigo-100">
                        {aiAnswer.split('**').map((part, i) =>
                          i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAiAnswer(null)}
                        className="mt-2 text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                      >
                        <X size={12} /> שאלה נוספת
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mb-3">בחר שאלה נפוצה:</p>
                  )}
                  {!aiAnswer ? (
                    <div className="flex flex-col gap-2">
                      {AI_QUESTIONS.map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setAiAnswer(item.a)}
                          className="text-right px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-sm text-slate-700 font-medium transition-colors"
                        >
                          {item.q}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ═══════════════════════════════════════ */}
        {/* STEP: Business Details                  */}
        {/* ═══════════════════════════════════════ */}
        {step === 'details' ? (
          <>
            {/* Plan Summary */}
            {planDef ? (
              <div className="mb-6 rounded-2xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{PLAN_EMOJI[planDef.key] || '📦'}</span>
                    <span className="font-black text-slate-900">{planDef.labelHe}</span>
                  </div>
                  <div className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                    7 ימי ניסיון חינם
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {planModules.map((m) => (
                    <span key={m} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-indigo-100 text-[11px] font-bold text-indigo-700">
                      <Check size={10} strokeWidth={3} />
                      {getModuleLabelHe(m)}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100 text-[11px] font-bold text-amber-700">
                    🎁 Finance (כספים) — מתנה
                  </span>
                </div>
                {planDef.key === 'custom' ? (
                  <div className="mt-2 text-sm font-black text-violet-700">
                    סה״כ: {calculateCustomPlanPrice(planModules.length)}₪/חודש
                  </div>
                ) : null}
                {props.seats && props.seats > 1 ? (
                  <div className="mt-2 text-xs text-slate-500">
                    {props.seats} משתמשים
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Form */}
            <form onSubmit={handleDetailsSubmit} className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-black text-slate-700 mb-2">
                    <Building2 size={15} className="text-slate-400" />
                    שם העסק
                  </label>
                  <Input
                    value={companyName}
                    onChange={(e) => { setCompanyName(e.target.value); setError(null); }}
                    placeholder="לדוגמה: סטודיו לעיצוב"
                    aria-invalid={error === 'שם עסק חובה'}
                    className="h-12 rounded-2xl"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-black text-slate-700 mb-2">
                    <Phone size={15} className="text-slate-400" />
                    טלפון
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setError(null); }}
                    placeholder="050-0000000"
                    type="tel"
                    dir="ltr"
                    style={{ textAlign: 'left' }}
                    aria-invalid={error === 'טלפון חובה'}
                    className="h-12 rounded-2xl"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-black text-slate-700 mb-2">
                    <Mail size={15} className="text-slate-400" />
                    אימייל עסקי
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    placeholder="name@company.com"
                    dir="ltr"
                    style={{ textAlign: 'left' }}
                    aria-invalid={error === 'אימייל חובה'}
                    required
                    className="h-12 rounded-2xl"
                  />
                </div>

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={!canSubmitDetails || isSaving}
                  className="h-13 w-full py-4 rounded-2xl font-black text-base bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-200/50 hover:shadow-2xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      מפעילים את החשבון שלך...
                    </>
                  ) : (
                    <>
                      התחל ניסיון חינם
                      <ArrowLeft size={18} />
                    </>
                  )}
                </button>

                {needsPlanSelection ? (
                  <button
                    type="button"
                    onClick={() => { setStep('plan'); setError(null); }}
                    disabled={isSaving}
                    className="w-full py-2.5 rounded-2xl font-bold text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <ArrowLeft size={14} className="rotate-180" />
                    חזרה לבחירת חבילה
                  </button>
                ) : null}

                <p className="text-[11px] text-slate-400 text-center">
                  ללא כרטיס אשראי · בטל בכל עת · 7 ימי ניסיון מלא
                </p>
              </div>
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
}
