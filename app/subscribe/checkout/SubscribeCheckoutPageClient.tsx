'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Copy, CircleCheckBig } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { createSubscriptionOrder, getSubscriptionPaymentConfig, submitSubscriptionPaymentProof } from '@/app/actions/subscription-orders';
import { getModuleLabelHe, modulesRegistry } from '@/lib/os/modules/registry';
import type { SystemFeatureFlags } from '@/lib/server/featureFlags';
import type { OSModuleKey } from '@/lib/os/modules/types';
import { BILLING_PACKAGES, calculateOrderAmount, PackageType } from '@/lib/billing/pricing';

type BillingCycle = 'monthly' | 'yearly';

function safeBillingCycle(value: string | null): BillingCycle {
  return value === 'yearly' ? 'yearly' : 'monthly';
}

function applyYearlyDiscount(amount: number, billing: BillingCycle): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (billing !== 'yearly') return amount;
  return Math.round(amount * 0.8);
}

function safePackageType(value: string | null): PackageType {
  const v = String(value || '').trim();
  if (v && Object.prototype.hasOwnProperty.call(BILLING_PACKAGES, v)) return v as PackageType;
  return 'solo';
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function SubscribeCheckoutContent({
  initialUserId,
  initialSystemFlags,
}: {
  initialUserId: string | null;
  initialSystemFlags: SystemFeatureFlags | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();

  const enablePaymentManual = initialSystemFlags?.enable_payment_manual !== false;
  const enablePaymentCreditCard = Boolean(initialSystemFlags?.enable_payment_credit_card);
  const hasAnyPaymentOption = enablePaymentManual || enablePaymentCreditCard;
  const shouldShowPaymentSelector = enablePaymentManual && enablePaymentCreditCard;

  const [selectedPaymentOption, setSelectedPaymentOption] = useState<'manual' | 'credit_card'>(() => {
    if (!enablePaymentManual && enablePaymentCreditCard) return 'credit_card';
    return 'manual';
  });

  const billingCycle = safeBillingCycle(searchParams.get('billing'));
  const packageParam = searchParams.get('package');
  const moduleParam = searchParams.get('module');
  const packageType = useMemo(() => safePackageType(packageParam), [packageParam]);
  const plan = (searchParams.get('plan') || String(packageType)).toLowerCase();
  const soloModuleKey = useMemo(() => {
    if (packageType !== 'solo') return null;
    const mk = String(moduleParam || '').trim();
    return mk ? (mk as OSModuleKey) : null;
  }, [moduleParam, packageType]);

  const productLabel = useMemo(() => {
    if (packageType === 'solo') {
      return soloModuleKey ? getModuleLabelHe(soloModuleKey) : 'מודול בודד';
    }
    return BILLING_PACKAGES[packageType]?.labelHe || packageType;
  }, [packageType, soloModuleKey]);

  const includedModulesLabels = useMemo(() => {
    const pkg = BILLING_PACKAGES[packageType];
    if (!pkg?.modules?.length) {
      if (packageType === 'solo' && soloModuleKey) {
        return [modulesRegistry[soloModuleKey]?.labelHe || soloModuleKey];
      }
      return [];
    }
    return pkg.modules.map(m => modulesRegistry[m]?.labelHe || m);
  }, [packageType, soloModuleKey]);

  const monthlyBasePrice = useMemo(() => {
    return packageType === 'solo' ? 149 : (BILLING_PACKAGES[packageType]?.monthlyPrice || 0);
  }, [packageType]);

  const yearlySavings = useMemo(() => {
    if (billingCycle !== 'yearly') return 0;
    return (monthlyBasePrice * 12) - (Math.round(monthlyBasePrice * 0.8) * 12);
  }, [billingCycle, monthlyBasePrice]);

  const seats = useMemo(() => {
    const seatsParam = searchParams.get('seats');
    const parsed = seatsParam ? Number(seatsParam) : NaN;
    if (!Number.isFinite(parsed)) return null;
    const normalized = Math.floor(parsed);
    if (normalized <= 0) return null;
    return normalized;
  }, [searchParams]);

  const amount = useMemo(() => {
    try {
      const calc = calculateOrderAmount({
        packageType,
        soloModuleKey,
        billingCycle,
        seats: seats ?? null,
      });
      return calc.amount;
    } catch {
      // Failsafe
      return applyYearlyDiscount(149, billingCycle);
    }
  }, [billingCycle, packageType, seats, soloModuleKey]);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [partnerReferralCode, setPartnerReferralCode] = useState(() => {
    const raw = searchParams.get('partner') || searchParams.get('partner_code') || '';
    return String(raw).trim();
  });
  const [couponCode, setCouponCode] = useState(() => {
    const raw = searchParams.get('coupon') || searchParams.get('coupon_code') || '';
    return String(raw).trim();
  });

  const [orderAmount, setOrderAmount] = useState<number | null>(null);

  const [paymentTitle, setPaymentTitle] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [instructionsText, setInstructionsText] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'manual' | 'automatic'>('manual');
  const [externalPaymentUrl, setExternalPaymentUrl] = useState<string | null>(null);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  const [acceptedLegal, setAcceptedLegal] = useState(false);

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
    setAcceptedLegal(false);
    setOrderAmount(null);
    setSelectedPaymentOption(() => {
      if (!enablePaymentManual && enablePaymentCreditCard) return 'credit_card';
      return 'manual';
    });
  }, [plan, billingCycle, packageType, soloModuleKey]);

  const amountToPay = orderAmount ?? amount;

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const result = await getSubscriptionPaymentConfig(packageType);
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
      const checkoutQs = new URLSearchParams({
        plan,
        billing: billingCycle,
      });
      if (packageType) checkoutQs.set('package', packageType);
      if (packageType === 'solo' && soloModuleKey) checkoutQs.set('module', String(soloModuleKey));
      if (seats) checkoutQs.set('seats', String(seats));
      if (partnerReferralCode.trim()) checkoutQs.set('partner', partnerReferralCode.trim());
      if (couponCode.trim()) checkoutQs.set('coupon', couponCode.trim());

      const redirectUrl = `/subscribe/checkout?${checkoutQs.toString()}`;
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    if (!acceptedLegal) {
      setError('יש לאשר את תנאי השימוש ומדיניות הפרטיות לפני המשך.');
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
        packageType,
        soloModuleKey: soloModuleKey ?? undefined,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        seats: seats ?? undefined,
        partnerReferralCode: partnerReferralCode.trim() || undefined,
        couponCode: couponCode.trim() || undefined,
      });

      if (!result.success || !result.data?.id) {
        throw new Error(result.error || 'שגיאה ביצירת הזמנה');
      }

      setOrderId(result.data.id);
      const orgId = (result.data as Record<string, unknown>).organizationId;
      setOrderOrgKey(typeof orgId === 'string' ? orgId : null);
      setOrderAmount(typeof result.data.amount === 'number' ? result.data.amount : null);
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : String(e)) || 'שגיאה ביצירת הזמנה');
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
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : String(e)) || 'שגיאה בשליחת אישור');
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
      billingCycle === 'yearly'
        ? `סכום לתשלום: ₪${amountToPay * 12} לשנה (₪${amountToPay}/חודש, כולל מע"מ)`
        : `סכום לתשלום: ₪${amountToPay}/חודש (כולל מע"מ)`,
      productLabel ? `חבילה: ${productLabel}` : null,
      seats ? `משתמשים: ${seats}` : null,
      `מחזור חיוב: ${billingCycle === 'yearly' ? 'שנתי' : 'חודשי'}`,
      orderId ? `מספר הזמנה: ${orderId}` : null,
    ].filter(Boolean);
    return lines.join('\n');
  }, [amountToPay, billingCycle, orderId, productLabel, seats]);

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 text-center shadow-sm">
            <CircleCheckBig className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">ההזמנה התקבלה בהצלחה</h1>
            <p className="text-sm sm:text-base text-slate-600 mb-6">
              אנו מאמתים את התשלום. ברגע שנאשר — המערכת תיפתח עבורך אוטומטית ותקבל מייל אישור.
            </p>

            <button
              onClick={() => router.push(lobbyUrl)}
              className="w-full rounded-xl bg-indigo-600 text-white font-black py-3 hover:bg-indigo-500 shadow-sm"
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
    <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      {/* Mini Navbar */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-black text-slate-900 tracking-tight">MISRAD AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors">
              מחירים
            </Link>
            <Link href="/support" className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors">
              תמיכה
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <button
          onClick={() => router.back()}
          className="text-slate-600 hover:text-slate-900 mb-6 inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft size={16} /> חזרה
        </button>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
            {selectedPaymentOption === 'credit_card' ? 'תשלום באשראי' : 'השלמת רכישה'}
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            {selectedPaymentOption === 'credit_card'
              ? 'תשלום מאובטח באשראי דרך סליקה ישראלית.'
              : 'מלא את הפרטים, בצע הזמנה ונפתח לך גישה מלאה למערכת.'}
          </p>

          <div className="grid grid-cols-1 gap-4 mb-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-slate-700">סיכום הזמנה</div>
                <div className="text-xs text-slate-500">{billingCycle === 'yearly' ? 'חיוב שנתי' : 'חיוב חודשי'}</div>
              </div>
              <div className="text-slate-900 font-black text-2xl">
                ₪{amountToPay}<span className="text-sm font-bold text-slate-500 mr-1">/חודש</span>
                <span className="text-xs font-medium text-slate-400 mr-2">(כולל מע&quot;מ)</span>
                {billingCycle === 'yearly' && monthlyBasePrice > amountToPay && (
                  <span className="text-xs text-slate-400 line-through mr-1">₪{monthlyBasePrice}</span>
                )}
              </div>
              {billingCycle === 'yearly' && (
                <div className="mt-1.5 text-xs font-bold text-slate-600">
                  סה״כ לשנה: <span className="text-indigo-700">₪{amountToPay * 12}</span> (חיוב שנתי מראש)
                </div>
              )}
              <div className="mt-2 text-sm font-bold text-slate-800">
                {productLabel}{seats ? ` · ${seats} משתמשים` : ''}
              </div>
              {includedModulesLabels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {includedModulesLabels.map(label => (
                    <span key={label} className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-bold text-slate-600">
                      {label}
                    </span>
                  ))}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-700">
                    🎁 כספים
                  </span>
                </div>
              )}
              {billingCycle === 'yearly' && yearlySavings > 0 && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
                  ✅ חיסכון שנתי: ₪{yearlySavings} (לעומת חודשי)
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedLegal}
                  onChange={(e) => setAcceptedLegal(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-slate-300"
                />
                <div className="text-sm text-slate-700 leading-relaxed">
                  אני מאשר/ת את
                  {' '}
                  <Link href="/terms" className="text-indigo-700 hover:text-indigo-900 underline">תנאי השימוש</Link>
                  {' '}
                  ואת
                  {' '}
                  <Link href="/privacy" className="text-indigo-700 hover:text-indigo-900 underline">מדיניות הפרטיות</Link>
                  {' '}
                  וכן קראתי את
                  {' '}
                  <Link href="/refund-policy" className="text-indigo-700 hover:text-indigo-900 underline">מדיניות ההחזרים</Link>
                  .
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="שם מלא*"
                className="w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400"
              />
              <input
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="טלפון*"
                className="w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400"
              />
              <input
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                placeholder="אימייל*"
                className="w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <input
              value={partnerReferralCode}
              onChange={e => setPartnerReferralCode(e.target.value)}
              placeholder='קוד שותף / רו"ח (אופציונלי)'
              className="w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400"
            />

            <input
              value={couponCode}
              onChange={e => setCouponCode(e.target.value)}
              placeholder='קוד קופון (אופציונלי)'
              className="w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400"
            />

            {shouldShowPaymentSelector && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-600 mb-3">בחר שיטת תשלום</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentOption('manual')}
                    className={`rounded-xl border px-4 py-3 text-right ${
                      selectedPaymentOption === 'manual'
                        ? 'border-indigo-300 bg-white text-slate-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">העברה בנקאית / Bit</div>
                    <div className="text-xs text-slate-500 mt-1">הוראות + העלאת אישור</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentOption('credit_card')}
                    className={`rounded-xl border px-4 py-3 text-right ${
                      selectedPaymentOption === 'credit_card'
                        ? 'border-indigo-300 bg-white text-slate-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">תשלום באשראי</div>
                    <div className="text-xs text-slate-500 mt-1">סליקה מאובטחת</div>
                  </button>
                </div>
              </div>
            )}

            {!hasAnyPaymentOption && (
              <div className="text-sm text-amber-700">
                כרגע אין אפשרות תשלום זמינה. נא לפנות לתמיכה.
              </div>
            )}

            {enablePaymentCreditCard && selectedPaymentOption === 'credit_card' && (
              <button
                onClick={handleCreateOrder}
                disabled={isCreating}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 shadow-sm"
              >
                {isCreating ? 'יוצר הזמנה...' : 'המשך לתשלום באשראי'}
              </button>
            )}

            {enablePaymentManual && selectedPaymentOption === 'manual' && (
              <button
                onClick={handleCreateOrder}
                disabled={isCreating}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 shadow-sm"
              >
                {isCreating ? 'מעבד...' : 'אשר הזמנה'}
              </button>
            )}

            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 font-medium">{error}</div>}

            {/* Cancellation Rights Notice - required by Israeli Consumer Protection Law */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 leading-relaxed">
              <div className="font-bold mb-1">זכות ביטול לפי חוק הגנת הצרכן</div>
              ניתן לבטל את העסקה תוך 14 ימים ממועד ביצועה. דמי ביטול: עד 5% מסכום העסקה או 100 ₪ — הנמוך מביניהם.
              {' '}
              <Link href="/cancel" className="text-indigo-700 hover:text-indigo-900 underline underline-offset-2 font-bold">פרטים מלאים על ביטול עסקה</Link>
              {' | '}
              <Link href="/refund-policy" className="text-indigo-700 hover:text-indigo-900 underline underline-offset-2 font-bold">מדיניות החזרים</Link>
            </div>

            {orderId && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 text-emerald-700 font-bold">
                      <CircleCheckBig size={18} /> הזמנה נוצרה
                    </div>
                    <div className="text-sm text-slate-700 mt-2 whitespace-pre-line">{bitPayText}</div>
                  </div>
                  <button
                    onClick={copyDetails}
                    className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 inline-flex items-center gap-2"
                  >
                    <Copy size={16} /> {copied ? 'הועתק' : 'העתק'}
                  </button>
                </div>

                <div className="mt-3 text-xs text-slate-600">
                  בצע את התשלום בהתאם לפרטים ונחזור אליך עם אישור.
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  {paymentMethod === 'automatic' && enablePaymentCreditCard && selectedPaymentOption === 'credit_card' ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
                      <div className="text-slate-900 font-bold">תשלום מאובטח</div>
                      {instructionsText && <div className="text-sm text-slate-600 whitespace-pre-line">{instructionsText}</div>}
                      {externalPaymentUrl ? (
                        <>
                          <a
                            href={externalPaymentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full rounded-xl bg-indigo-600 text-white font-black py-3 hover:bg-indigo-500 text-center block shadow-sm"
                          >
                            פתח עמוד תשלום
                          </a>
                          <div className="rounded-xl border border-slate-200 overflow-hidden">
                            <iframe
                              src={externalPaymentUrl}
                              title="External Payment"
                              className="w-full h-[520px] bg-white"
                            />
                          </div>
                          <div className="text-xs text-slate-500">
                            אם ה־iframe נחסם, השתמש בכפתור ״פתח עמוד תשלום״.
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-amber-700">
                          חסר קישור סליקה (external_payment_url) לחבילה זו. נא להגדיר באדמין.
                        </div>
                      )}
                    </div>
                  ) : (
                    enablePaymentManual && selectedPaymentOption === 'manual' && (paymentTitle || instructionsText || qrImageUrl) && (
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        {paymentTitle && <div className="text-slate-900 font-bold mb-2">{paymentTitle}</div>}
                        {instructionsText && <div className="text-sm text-slate-600 whitespace-pre-line">{instructionsText}</div>}
                        {qrImageUrl && (
                          <div className="mt-3">
                            <img src={qrImageUrl} alt="QR" className="max-w-full rounded-xl border border-slate-200" />
                          </div>
                        )}
                      </div>
                    )
                  )}

                  {paymentMethod === 'manual' && enablePaymentManual && selectedPaymentOption === 'manual' ? (
                    <>
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-sm text-slate-600 mb-3">העלה צילום מסך של אישור התשלום (אופציונלי)</div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                          className="w-full text-sm text-slate-700"
                        />
                      </div>

                      <button
                        onClick={handleSubmitProof}
                        disabled={isSubmittingProof || isPendingVerification}
                        className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3"
                      >
                        {isPendingVerification
                          ? 'נשלח — ממתין לאישור'
                          : isSubmittingProof
                            ? 'שולח...'
                            : 'שלחתי תשלום — אשרו לי גישה'}
                      </button>

                      <div className="text-xs text-slate-400">
                        לאחר הלחיצה ההזמנה תועבר לאישור. תקבל מייל ברגע שנאשר.
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-400">
                      לאחר ביצוע התשלום, תקבל אישור במייל.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Trust Badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              SSL מאובטח
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-700">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              הצפנת AES-256
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-[11px] font-bold text-purple-700">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
              חוק הגנת הפרטיות
            </span>
          </div>

          {/* Business Details Footer - required by Israeli law + payment processor */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 text-center text-xs text-slate-500 space-y-2">
            <div className="font-bold text-slate-700 text-sm">MISRAD AI</div>
            <div>ע.מ 314885518 &bull; הפסנתר 9, ראשון לציון, ישראל</div>
            <div>
              <a href="mailto:support@misrad-ai.com" className="hover:text-slate-700">support@misrad-ai.com</a>
              {' '}&bull;{' '}
              <a href="https://wa.me/972512239520" target="_blank" rel="noreferrer" className="hover:text-slate-700" dir="ltr">051-2239520</a>
              {' '}&bull;{' '}
              <a href="https://misrad-ai.com" className="hover:text-slate-700">misrad-ai.com</a>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Link href="/terms" className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2">תנאי שימוש</Link>
              <span>&bull;</span>
              <Link href="/privacy" className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2">פרטיות</Link>
              <span>&bull;</span>
              <Link href="/refund-policy" className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2">מדיניות החזרים</Link>
              <span>&bull;</span>
              <Link href="/cancel" className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2">ביטול עסקה</Link>
              <span>&bull;</span>
              <Link href="/accessibility" className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2">נגישות</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscribeCheckoutPageClient({
  initialUserId,
  initialSystemFlags,
}: {
  initialUserId: string | null;
  initialSystemFlags: SystemFeatureFlags | null;
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 text-center shadow-sm">
            טוען...
          </div>
        </div>
      </div>
    }>
      <SubscribeCheckoutContent initialUserId={initialUserId} initialSystemFlags={initialSystemFlags} />
    </Suspense>
  );
}
