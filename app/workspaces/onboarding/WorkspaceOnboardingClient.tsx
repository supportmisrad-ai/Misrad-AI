'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Building2, Phone, Mail, ArrowLeft, Sparkles } from 'lucide-react';
import { upsertCustomerAccountForCurrentOrganization } from '@/app/actions/customer-accounts';
import { Input } from '@/components/ui/input';
import { BILLING_PACKAGES } from '@/lib/billing/pricing';
import type { PackageType } from '@/lib/billing/pricing';
import { getModuleLabelHe } from '@/lib/os/modules/registry';
import type { OSModuleKey } from '@/lib/os/modules/types';

const PLAN_EMOJI: Record<string, string> = {
  solo: '🎯',
  the_closer: '💼',
  the_authority: '🎨',
  the_operator: '🔧',
  the_empire: '👑',
  the_mentor: '🏆',
};

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

  const [companyName, setCompanyName] = useState(props.initialCompanyName);
  const [phone, setPhone] = useState(props.initialPhone);
  const [email, setEmail] = useState(props.initialEmail);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planDef = useMemo(() => {
    if (!props.planKey) return null;
    const key = props.planKey as PackageType;
    if (!Object.prototype.hasOwnProperty.call(BILLING_PACKAGES, key)) return null;
    return { key, ...BILLING_PACKAGES[key] };
  }, [props.planKey]);

  const planModules = useMemo(() => {
    if (!planDef) return [];
    if (planDef.key === 'solo' && props.soloModuleKey) {
      return [props.soloModuleKey as OSModuleKey];
    }
    return planDef.modules;
  }, [planDef, props.soloModuleKey]);

  const canSubmit = useMemo(() => {
    return Boolean(companyName.trim() && phone.trim() && email.trim());
  }, [companyName, phone, email]);

  const handleSubmit = async (event: React.FormEvent) => {
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

      router.push(`/w/${encodeURIComponent(props.organizationKey)}`);
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)) || 'שגיאה בשמירה');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" dir="rtl">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[520px] h-[520px] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-[-10%] left-[-10%] w-[420px] h-[420px] bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[520px] h-[520px] bg-emerald-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-xl px-6 py-14">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black mb-4">
            <Sparkles size={14} /> כמעט שם!
          </div>
          <h1 className="text-3xl font-black text-slate-900">עוד רגע מתחילים</h1>
          <p className="text-sm text-slate-500 mt-2">צריך רק כמה פרטים כדי להפעיל את הניסיון החינם שלך</p>
        </div>

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

        {/* Steps indicator */}
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black">
              <Check size={14} strokeWidth={3} />
            </div>
            <span className="text-xs font-bold text-emerald-600">נרשמת</span>
          </div>
          <div className="flex-1 h-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">2</div>
            <span className="text-xs font-black text-indigo-700">פרטי העסק</span>
          </div>
          <div className="flex-1 h-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-xs font-black">3</div>
            <span className="text-xs font-bold text-slate-400">מתחילים!</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="flex items-center gap-2 text-sm font-black text-slate-700 mb-2">
                <Building2 size={15} className="text-slate-400" />
                שם העסק
              </label>
              <Input
                value={companyName}
                onChange={(e) => { setCompanyName(e.target.value); setError(null); }}
                placeholder="לדוגמה: משרד דהן"
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
              disabled={!canSubmit || isSaving}
              className="h-13 w-full py-4 rounded-2xl font-black text-base bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-200/50 hover:shadow-2xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSaving ? (
                'שומר...'
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
      </div>
    </div>
  );
}
