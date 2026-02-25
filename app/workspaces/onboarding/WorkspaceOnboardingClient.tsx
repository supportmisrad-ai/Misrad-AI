'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Building2, Phone, Mail, ArrowLeft, Sparkles, Crown, Briefcase, Palette, Wrench, Target, GraduationCap, Loader2 } from 'lucide-react';
import { upsertCustomerAccountForCurrentOrganization, selectPlanForCurrentOrganization } from '@/app/actions/customer-accounts';
import { Input } from '@/components/ui/input';
import { BILLING_PACKAGES } from '@/lib/billing/pricing';
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
};

const PLAN_ICON: Record<string, React.ReactNode> = {
  solo: <Target size={20} />,
  the_closer: <Briefcase size={20} />,
  the_authority: <Palette size={20} />,
  the_operator: <Wrench size={20} />,
  the_empire: <Crown size={20} />,
  the_mentor: <GraduationCap size={20} />,
};

const PLAN_DESCRIPTION: Record<string, string> = {
  solo: 'מודול אחד לבחירתך',
  the_closer: 'מודול SYSTEM (מכירות) + מודול NEXUS (נקסוס) - ניהול וצוות',
  the_authority: 'מודול SOCIAL (שיווק) + CLIENT (לקוחות) + NEXUS (נקסוס) - מיתוג ולקוחות',
  the_operator: 'מודול OPERATIONS (תפעול) + NEXUS (נקסוס) - שטח וצוות',
  the_empire: 'כל המודולים כלולים',
  the_mentor: 'כל המודולים + ליווי',
};

// Plans to show in the picker (excluding the_mentor which is special)
const VISIBLE_PLANS: PackageType[] = ['the_empire', 'the_closer', 'the_authority', 'the_operator', 'solo'];

type OnboardingStep = 'plan' | 'details';

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

  const [companyName, setCompanyName] = useState(props.initialCompanyName);
  const [phone, setPhone] = useState(props.initialPhone);
  const [email, setEmail] = useState(props.initialEmail);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    return planDef.modules;
  }, [planDef, activeSoloModule]);

  const canSubmitDetails = useMemo(() => {
    return Boolean(companyName.trim() && phone.trim() && email.trim());
  }, [companyName, phone, email]);

  const canProceedFromPlan = useMemo(() => {
    if (!selectedPlan) return false;
    if (selectedPlan === 'solo' && !selectedSoloModule) return false;
    return true;
  }, [selectedPlan, selectedSoloModule]);

  const handlePlanContinue = async () => {
    if (!canProceedFromPlan || isSaving) return;
    setError(null);
    setIsSaving(true);

    try {
      const res = await selectPlanForCurrentOrganization({
        orgSlug: props.organizationKey,
        planKey: String(selectedPlan),
        soloModuleKey: selectedPlan === 'solo' ? selectedSoloModule : null,
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
            <div className="grid grid-cols-1 gap-3">
              {VISIBLE_PLANS.map((key) => {
                const pkg = BILLING_PACKAGES[key];
                const isSelected = selectedPlan === key;
                const isPopular = key === 'the_empire';

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
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-500'
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
                        <div className="text-lg font-black text-slate-900">{pkg.monthlyPrice}₪</div>
                        <div className="text-[10px] text-slate-400 font-bold">לחודש</div>
                      </div>

                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600'
                          : 'border-slate-300'
                      }`}>
                        {isSelected ? <Check size={14} strokeWidth={3} className="text-white" /> : null}
                      </div>
                    </div>
                  </button>
                );
              })}
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
                        <span className="text-[10px] opacity-70">{opt.labelEn}</span>
                      <span>({opt.label})</span>
                    </button>
                  ))}
                </div>
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
                  {(planDef.key === 'the_operator' || planDef.key === 'the_empire') ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100 text-[11px] font-bold text-amber-700">
                      🎁 Finance
                    </span>
                  ) : null}
                </div>
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
