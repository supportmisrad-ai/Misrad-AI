'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { upsertCustomerAccountForCurrentOrganization } from '@/app/actions/customer-accounts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function WorkspaceOnboardingClient(props: {
  organizationKey: string;
  initialCompanyName: string;
  initialPhone: string;
  initialEmail: string;
}) {
  const router = useRouter();

  const [companyName, setCompanyName] = useState(props.initialCompanyName);
  const [phone, setPhone] = useState(props.initialPhone);
  const [email, setEmail] = useState(props.initialEmail);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        companyName: name,
        phone: p,
        email: emailValue,
      });

      if (!res.success) {
        throw new Error(res.error || 'שגיאה בשמירה');
      }

      router.push(`/w/${encodeURIComponent(props.organizationKey)}`);
    } catch (err: any) {
      setError(err?.message || 'שגיאה בשמירה');
    } finally {
      setIsSaving(false);
    }
  };

  const companyInvalid = error === 'שם עסק חובה';
  const phoneInvalid = error === 'טלפון חובה';
  const emailInvalid = error === 'אימייל חובה';

  return (
    <div className="min-h-screen bg-[#F8FAFC]" dir="rtl">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[520px] h-[520px] bg-indigo-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[420px] h-[420px] bg-purple-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[520px] h-[520px] bg-emerald-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative mx-auto max-w-xl px-6 py-14">
        <div className="mb-8">
          <div className="text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase">Onboarding</div>
          <h1 className="text-3xl font-black text-slate-900 mt-2">מגדירים את העסק שלך</h1>
          <p className="text-sm text-slate-600 mt-2">ניסיון חינם מלא ל-7 ימים — בלי כרטיס. צריך רק כמה פרטים כדי להתחיל.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-black text-slate-600 mb-2">שם העסק *</label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="לדוגמה: משרד דהן"
                aria-invalid={companyInvalid}
                className="h-12 rounded-2xl"
              />
            </div>

            <div>
              <label className="block text-sm font-black text-slate-600 mb-2">טלפון *</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-0000000"
                aria-invalid={phoneInvalid}
                className="h-12 rounded-2xl"
              />
            </div>

            <div>
              <label className="block text-sm font-black text-slate-600 mb-2">אימייל *</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                aria-invalid={emailInvalid}
                required
                className="h-12 rounded-2xl"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={!canSubmit || isSaving}
              className="h-12 w-full rounded-2xl"
            >
              {isSaving ? 'שומר...' : 'התחל ניסיון חינם (בלי כרטיס)'}
            </Button>

            <div className="text-xs text-slate-500">
              בהמשך תוכל לעדכן פרטים ולבחור חבילה. כרגע נכנסים לניסיון.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
