'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Copy, CircleCheckBig, RefreshCw, Shield, Building2 } from 'lucide-react';
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
        throw new Error(result.error || 'שגיאה בשליחת אישור.');
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
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6" dir="rtl">
        <div className="w-full max-w-[540px] bg-white border border-slate-200/60 rounded-[24px] p-10 text-center shadow-sm">
          <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-8 ring-1 ring-emerald-100">
            <CircleCheckBig className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">ההזמנה התקבלה</h1>
          <p className="text-slate-500 mb-10 leading-relaxed font-medium">
            אנו מאמתים את התשלום ברגעים אלו. ברגע שנאשר — המערכת תיפתח עבורך אוטומטית ותקבל מייל אישור לכתובת {customerEmail}.
          </p>

          <button
            type="button"
            onClick={() => router.push(lobbyUrl)}
            className="w-full rounded-xl bg-slate-900 text-white font-black py-4 hover:bg-slate-800 transition-all shadow-none"
          >
            חזרה ללובי המערכת
          </button>

          <div className="mt-8 pt-8 border-t border-slate-50">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">סטטוס הזמנה: ממתין לאימות</div>
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans" dir="rtl">
      {/* Top Progress Bar or Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-black text-slate-900 tracking-tight">MISRAD AI</span>
          </Link>
          <div className="hidden sm:flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-black">1</div>
              <span className="text-xs font-bold text-slate-900">פרטי הזמנה</span>
            </div>
            <div className="w-8 h-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 text-[10px] flex items-center justify-center font-black">2</div>
              <span className="text-xs font-bold text-slate-400">אישור תשלום</span>
            </div>
          </div>
          <button type="button" onClick={() => router.back()} className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">
            ביטול וחזרה
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: Form */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {selectedPaymentOption === 'credit_card' ? 'תשלום באשראי' : 'פרטי לקוח'}
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              נא למלא את הפרטים הבאים להשלמת הגישה למערכת.
            </p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider mr-1">שם מלא</label>
                <input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="ישראל ישראלי"
                  className="w-full rounded-xl bg-white border border-slate-200 px-4 py-3.5 text-sm text-slate-900 focus:border-slate-900 focus:ring-0 transition-all outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider mr-1">טלפון ליצירת קשר</label>
                <input
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="050-0000000"
                  className="w-full rounded-xl bg-white border border-slate-200 px-4 py-3.5 text-sm text-slate-900 focus:border-slate-900 focus:ring-0 transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider mr-1">כתובת אימייל</label>
              <input
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                placeholder="me@example.com"
                className="w-full rounded-xl bg-white border border-slate-200 px-4 py-3.5 text-sm text-slate-900 focus:border-slate-900 focus:ring-0 transition-all outline-none"
              />
            </div>

            {shouldShowPaymentSelector && (
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider mr-1">שיטת תשלום</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentOption('manual')}
                    className={`flex flex-col p-4 rounded-xl border text-right transition-all ${
                      selectedPaymentOption === 'manual'
                        ? 'border-slate-900 bg-white shadow- luxury ring-1 ring-slate-900'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <div className={`font-bold text-sm ${selectedPaymentOption === 'manual' ? 'text-slate-900' : ''}`}>העברה בנקאית / Bit</div>
                    <div className="text-[10px] opacity-70 mt-1">העלאת אישור ידני</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentOption('credit_card')}
                    className={`flex flex-col p-4 rounded-xl border text-right transition-all ${
                      selectedPaymentOption === 'credit_card'
                        ? 'border-slate-900 bg-white shadow-luxury ring-1 ring-slate-900'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <div className={`font-bold text-sm ${selectedPaymentOption === 'credit_card' ? 'text-slate-900' : ''}`}>כרטיס אשראי</div>
                    <div className="text-[10px] opacity-70 mt-1">סליקה מאובטחת ומיידית</div>
                  </button>
                </div>
              </div>
            )}

            <div className="pt-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input
                    type="checkbox"
                    checked={acceptedLegal}
                    onChange={(e) => setAcceptedLegal(e.target.checked)}
                    className="peer appearance-none w-5 h-5 rounded-md border-2 border-slate-200 checked:bg-slate-900 checked:border-slate-900 transition-all cursor-pointer"
                  />
                  <CircleCheckBig className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-all" strokeWidth={3} />
                </div>
                <div className="text-[13px] text-slate-500 leading-relaxed font-medium">
                  אני מאשר/ת את
                  {' '}
                  <Link href="/terms" className="text-slate-900 font-bold underline underline-offset-4 hover:text-indigo-600 transition-colors">תנאי השימוש</Link>
                  ,
                  {' '}
                  <Link href="/privacy" className="text-slate-900 font-bold underline underline-offset-4 hover:text-indigo-600 transition-colors">מדיניות הפרטיות</Link>
                  {' '}
                  וכן קראתי את
                  {' '}
                  <Link href="/refund-policy" className="text-slate-900 font-bold underline underline-offset-4 hover:text-indigo-600 transition-colors">מדיניות ההחזרים</Link>.
                </div>
              </label>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleCreateOrder}
              disabled={isCreating}
              className="group w-full rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 shadow-luxury transition-all flex items-center justify-center gap-2"
            >
              {isCreating ? 'מעבד הזמנה...' : (
                <>
                  {selectedPaymentOption === 'credit_card' ? 'המשך לסליקה מאובטחת' : 'אישור הזמנה והמשך'}
                  <RefreshCw className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all group-hover:rotate-180" />
                </>
              )}
            </button>
          </div>

          <div className="pt-8 flex items-center justify-center gap-8 opacity-40 grayscale group-hover:grayscale-0 transition-all">
            <Shield className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Secure 256-bit SSL</span>
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Right: Summary Card */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 space-y-6">
            <div className="bg-white border border-slate-200/60 rounded-[24px] p-8 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black text-slate-900">סיכום הזמנה</h3>
                <div className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-md uppercase tracking-wider">
                  {billingCycle === 'yearly' ? 'שנתי' : 'חודשי'}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-baseline justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-black text-slate-900 text-xl">{productLabel}</div>
                    <div className="text-xs text-slate-500 font-medium">{seats || 1} מושבים פעילים</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-slate-900">₪{amountToPay}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">לחודש</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 py-4 border-y border-slate-50">
                  {includedModulesLabels.map(label => (
                    <span key={label} className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-600">
                      {label}
                    </span>
                  ))}
                  <span className="inline-flex items-center px-2 py-1 rounded-lg bg-amber-50 border border-amber-100 text-[10px] font-bold text-amber-700">
                    🎁 כספים (כלול)
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-slate-500">מחיר מחירון</span>
                    <span className="text-slate-900">₪{monthlyBasePrice}</span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <div className="flex justify-between text-sm font-medium text-emerald-600">
                      <span>הנחת תשלום שנתי (20%)</span>
                      <span>-₪{monthlyBasePrice - amountToPay}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-4 border-t border-slate-100">
                    <span className="text-base font-black text-slate-900">סה״כ לתשלום</span>
                    <div className="text-right">
                      <div className="text-2xl font-black text-indigo-600">₪{billingCycle === 'yearly' ? amountToPay * 12 : amountToPay}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">כולל מע״מ</div>
                    </div>
                  </div>
                </div>
              </div>

              {billingCycle === 'yearly' && yearlySavings > 0 && (
                <div className="mt-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <CircleCheckBig className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-xs font-bold text-emerald-700">
                    חסכת ₪{yearlySavings} בתשלום שנתי!
                  </div>
                </div>
              )}
            </div>

            {/* Manual Payment Instructions after order creation */}
            {orderId && selectedPaymentOption === 'manual' && (
              <div className="bg-white border border-slate-200/60 rounded-[24px] p-8 shadow-luxury animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-slate-900">הוראות תשלום</h3>
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{bitPayText}</div>
                    <button
                      type="button"
                      onClick={copyDetails}
                      className="shrink-0 rounded-xl bg-white border border-slate-200 p-2 text-xs hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      {copied ? 'הועתק!' : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {instructionsText && (
                    <div className="text-sm text-slate-600 bg-blue-50/50 p-4 rounded-xl border border-blue-100 leading-relaxed">
                      {instructionsText}
                    </div>
                  )}

                  {qrImageUrl && (
                    <div className="p-2 border border-slate-100 rounded-2xl bg-white shadow-sm">
                      <img src={qrImageUrl} alt="QR" className="w-full rounded-xl" />
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">העלה אישור תשלום (צילום מסך)</label>
                    <div className="relative group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[11px] file:font-black file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitProof}
                    disabled={isSubmittingProof || isPendingVerification}
                    className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-4 shadow-luxury transition-all"
                  >
                    {isPendingVerification ? 'נשלח לאימות' : isSubmittingProof ? 'שולח...' : 'שלחתי תשלום - אשר לי גישה'}
                  </button>
                </div>
              </div>
            )}
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
