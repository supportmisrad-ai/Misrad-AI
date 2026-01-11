'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Copy, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { createSubscriptionOrder, getSubscriptionPaymentConfig, submitSubscriptionPaymentProof } from '@/app/actions/subscription-orders';

type BillingCycle = 'monthly' | 'yearly';

function safeBillingCycle(value: string | null): BillingCycle {
  return value === 'yearly' ? 'yearly' : 'monthly';
}

function calcAmount(plan: string, billing: BillingCycle): number {
  const baseByPlan: Record<string, number> = {
    starter: 199,
    pro: 499,
    enterprise: 1500,
    solo: 99,
  };
  const base = baseByPlan[plan] ?? 199;
  return billing === 'yearly' ? Math.round(base * 0.8) : base;
}

function inferPackageType(system: string | null): 'the_closer' | 'the_authority' | 'the_mentor' {
  if (system === 'client') return 'the_mentor';
  if (system === 'system') return 'the_closer';
  return 'the_authority';
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function SubscribeCheckoutContent({ initialUserId }: { initialUserId: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();

  const plan = (searchParams.get('plan') || 'starter').toLowerCase();
  const billingCycle = safeBillingCycle(searchParams.get('billing'));
  const system = searchParams.get('system');
  const packageType = useMemo(() => inferPackageType(system), [system]);

  const amount = useMemo(() => {
    const amountParam = searchParams.get('amount');
    const parsed = amountParam ? Number(amountParam) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return calcAmount(plan, billingCycle);
  }, [billingCycle, plan, searchParams]);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [paymentTitle, setPaymentTitle] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [instructionsText, setInstructionsText] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'manual' | 'automatic'>('manual');
  const [externalPaymentUrl, setExternalPaymentUrl] = useState<string | null>(null);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderOrgKey, setOrderOrgKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [isPendingVerification, setIsPendingVerification] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    setOrderId(null);
    setOrderOrgKey(null);
    setError(null);
    setProofFile(null);
    setIsSuccess(false);
    setIsPendingVerification(false);
    setPaymentMethod('manual');
    setExternalPaymentUrl(null);
  }, [plan, billingCycle, system]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const result = await getSubscriptionPaymentConfig(packageType as any);
        if (!result.success) return;
        setPaymentTitle(result.data?.title ?? null);
        setQrImageUrl(result.data?.qrImageUrl ?? null);
        setInstructionsText(result.data?.instructionsText ?? null);
        setPaymentMethod(result.data?.paymentMethod === 'automatic' ? 'automatic' : 'manual');
        setExternalPaymentUrl(result.data?.externalPaymentUrl ?? null);
      } catch {
        // ignore
      }
    };
    loadConfig();
  }, [packageType]);

  const handleCreateOrder = async () => {
    if (!isSignedIn || !initialUserId) {
      const qs = new URLSearchParams({
        redirect: 'subscribe-checkout',
        plan,
        billing: billingCycle,
      });
      if (system) qs.set('system', system);
      router.push(`/sign-up?${qs.toString()}`);
      return;
    }

    const name = customerName.trim();
    const email = customerEmail.trim();
    const phone = customerPhone.trim();

    if (!name) {
      setError('שם מלא חובה');
      return;
    }
    if (!phone) {
      setError('טלפון חובה');
      return;
    }
    if (!email) {
      setError('מייל חובה');
      return;
    }
    if (!isValidEmail(email)) {
      setError('מייל לא תקין');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await createSubscriptionOrder({
        billingCycle,
        amount,
        packageType,
        planKey: plan,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
      });

      if (!result.success || !result.data?.id) {
        throw new Error(result.error || 'שגיאה ביצירת הזמנה');
      }

      setOrderId(result.data.id);
      setOrderOrgKey((result.data as any).organizationId || null);
    } catch (e: any) {
      setError(e?.message || 'שגיאה ביצירת הזמנה');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!orderId) return;

    setIsSubmittingProof(true);
    setError(null);

    try {
      const result = await submitSubscriptionPaymentProof({
        orderId,
        proofFile: proofFile || undefined,
      });
      if (!result.success) {
        throw new Error(result.error || 'שגיאה בשליחת אישור. אם העלית קובץ, ייתכן ש-bucket בשם media לא קיים בסופאבייס.');
      }
      setIsPendingVerification(true);
      setIsSuccess(true);
    } catch (e: any) {
      setError(e?.message || 'שגיאה בשליחת אישור');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const lobbyUrl = useMemo(() => {
    const orgKey = orderOrgKey || 'me';
    return `/w/${encodeURIComponent(orgKey)}/lobby`;
  }, [orderOrgKey]);

  const bitPayText = useMemo(() => {
    const lines = [
      `סכום לתשלום: ₪${amount}`,
      `תוכנית: ${plan}`,
      `חיוב: ${billingCycle === 'yearly' ? 'שנתי' : 'חודשי'}`,
      orderId ? `מספר הזמנה: ${orderId}` : null,
    ].filter(Boolean);
    return lines.join('\n');
  }, [amount, billingCycle, orderId, plan]);

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-200" dir="rtl">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 sm:p-10 text-center">
            <CheckCircle2 className="w-20 h-20 text-emerald-400 mx-auto mb-6" />
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-3">הבקשה נשלחה בהצלחה! אנחנו מאמתים את התשלום כעת.</h1>
            <p className="text-sm sm:text-base text-slate-300 mb-6">
              ברגע שנאשר, המערכת תיפתח עבורך אוטומטית ותקבל מייל אישור.
            </p>

            <button
              onClick={() => router.push(lobbyUrl)}
              className="w-full rounded-xl bg-white text-slate-900 font-black py-3 hover:bg-slate-100"
            >
              חזרה ללובי
            </button>

            <div className="text-xs text-slate-500 mt-4">הסטטוס שלך כרגע: ממתין לאימות</div>
          </div>
        </div>
      </div>
    );
  }

  const copyDetails = async () => {
    try {
      await navigator.clipboard.writeText(bitPayText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <button
          onClick={() => router.back()}
          className="text-slate-400 hover:text-white mb-6 inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft size={16} /> חזרה
        </button>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">תשלום בביט</h1>
          <p className="text-sm text-slate-400 mb-6">כרגע התשלום ידני. אחרי שתשלם בביט אנחנו נאשר ונפתח לך גישה.</p>

          <div className="grid grid-cols-1 gap-4 mb-6">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-sm text-slate-400">סיכום</div>
              <div className="mt-2 text-white font-bold">₪{amount} • {billingCycle === 'yearly' ? 'שנתי' : 'חודשי'} • {plan}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="שם מלא*"
                className="w-full rounded-xl bg-slate-950/40 border border-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-600"
              />
              <input
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="טלפון*"
                className="w-full rounded-xl bg-slate-950/40 border border-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-600"
              />
              <input
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                placeholder="אימייל*"
                className="w-full rounded-xl bg-slate-950/40 border border-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-600"
              />
            </div>

            <button
              onClick={handleCreateOrder}
              disabled={isCreating}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3"
            >
              {isCreating ? 'יוצר הזמנה...' : 'קבל הוראות תשלום בביט'}
            </button>

            {error && <div className="text-sm text-red-400">{error}</div>}

            {orderId && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/10 p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 text-emerald-300 font-bold">
                      <CheckCircle2 size={18} /> הזמנה נוצרה
                    </div>
                    <div className="text-sm text-slate-300 mt-2 whitespace-pre-line">{bitPayText}</div>
                  </div>
                  <button
                    onClick={copyDetails}
                    className="shrink-0 rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm hover:bg-slate-800 inline-flex items-center gap-2"
                  >
                    <Copy size={16} /> {copied ? 'הועתק' : 'העתק'}
                  </button>
                </div>

                <div className="mt-3 text-xs text-slate-400">
                  שלח/שלם בביט לפי הפרטים, ואז נחזור אליך לאישור. (בשלב הבא נוסיף אישור אוטומטי / קישור תשלום מלא)
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  {paymentMethod === 'automatic' ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                      <div className="text-white font-bold">תשלום מאובטח</div>
                      {instructionsText && <div className="text-sm text-slate-300 whitespace-pre-line">{instructionsText}</div>}
                      {externalPaymentUrl ? (
                        <>
                          <a
                            href={externalPaymentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full rounded-xl bg-white text-slate-900 font-black py-3 hover:bg-slate-100 text-center block"
                          >
                            פתח עמוד תשלום
                          </a>
                          <div className="rounded-xl border border-slate-800 overflow-hidden">
                            <iframe
                              src={externalPaymentUrl}
                              title="External Payment"
                              className="w-full h-[520px] bg-white"
                            />
                          </div>
                          <div className="text-xs text-slate-500">
                            אם ה־iframe נחסם, השתמש בכפתור "פתח עמוד תשלום".
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-amber-300">
                          חסר קישור סליקה (external_payment_url) לחבילה זו. נא להגדיר באדמין.
                        </div>
                      )}
                    </div>
                  ) : (
                    (paymentTitle || instructionsText || qrImageUrl) && (
                      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                        {paymentTitle && <div className="text-white font-bold mb-2">{paymentTitle}</div>}
                        {instructionsText && <div className="text-sm text-slate-300 whitespace-pre-line">{instructionsText}</div>}
                        {qrImageUrl && (
                          <div className="mt-3">
                            <img src={qrImageUrl} alt="QR" className="max-w-full rounded-xl border border-slate-800" />
                          </div>
                        )}
                      </div>
                    )
                  )}

                  {paymentMethod === 'manual' ? (
                    <>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                        <div className="text-sm text-slate-300 mb-3">העלה צילום מסך של אישור התשלום (אופציונלי)</div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                          className="w-full text-sm text-slate-300"
                        />
                      </div>

                      <button
                        onClick={handleSubmitProof}
                        disabled={isSubmittingProof || isPendingVerification}
                        className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3"
                      >
                        {isPendingVerification
                          ? 'נשלח! ממתין לאימות'
                          : isSubmittingProof
                            ? 'שולח...'
                            : 'שלחתי כסף - אשר לי גישה'}
                      </button>

                      <div className="text-xs text-slate-400">
                        אחרי הלחיצה ההזמנה תסומן כ־"ממתין לאימות" ותופיע אצלך באדמין.
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-400">
                      לאחר ביצוע התשלום, נא לחזור לכאן. בשלב הבא נחבר Webhook לאישור אוטומטי.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscribeCheckoutPageClient({ initialUserId }: { initialUserId: string | null }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">טוען...</div>}>
      <SubscribeCheckoutContent initialUserId={initialUserId} />
    </Suspense>
  );
}
