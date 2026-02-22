'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { X, DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';
import { CustomSelect } from '@/components/CustomSelect';

type ManageBillingModalProps = {
  isOpen: boolean;
  organizationId: string;
  organizationName: string;
  currentBilling: {
    subscription_plan?: string | null;
    billing_cycle?: string | null;
    seats_allowed?: number | null;
    active_users_count?: number | null;
    billing_email?: string | null;
    payment_method_id?: string | null;
    mrr?: number | null;
    arr?: number | null;
    next_billing_date?: Date | string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
};

const PLANS = [
  { value: 'starter', label: 'Starter - בסיסי', price: 49 },
  { value: 'pro', label: 'Pro - מקצועי', price: 99 },
  { value: 'agency', label: 'Agency - סוכנות', price: 149 },
  { value: 'custom', label: 'Custom - מותאם אישית', price: 199 },
];

export default function ManageBillingModal({
  isOpen,
  organizationId,
  organizationName,
  currentBilling,
  onClose,
  onSuccess,
}: ManageBillingModalProps) {
  const [isPending, startTransition] = useTransition();
  
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>(currentBilling.subscription_plan || '');
  const [billingCycle, setBillingCycle] = useState<string>(currentBilling.billing_cycle || 'monthly');
  const [seatsAllowed, setSeatsAllowed] = useState<number>(currentBilling.seats_allowed || 5);
  const [billingEmail, setBillingEmail] = useState<string>(currentBilling.billing_email || '');
  const [paymentMethodId, setPaymentMethodId] = useState<string>(currentBilling.payment_method_id || '');
  
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSubscriptionPlan(currentBilling.subscription_plan || '');
      setBillingCycle(currentBilling.billing_cycle || 'monthly');
      setSeatsAllowed(currentBilling.seats_allowed || 5);
      setBillingEmail(currentBilling.billing_email || '');
      setPaymentMethodId(currentBilling.payment_method_id || '');
    }
  }, [isOpen, currentBilling]);
  useBackButtonClose(isOpen, onClose);

  if (!isOpen) return null;

  const calculateEstimatedMRR = () => {
    const plan = PLANS.find(p => p.value === subscriptionPlan);
    if (!plan) return 0;
    
    let mrr = plan.price * seatsAllowed;
    if (billingCycle === 'yearly') {
      mrr = mrr * 0.85; // 15% discount for yearly
    }
    
    return Math.round(mrr * 100) / 100;
  };

  const estimatedMRR = calculateEstimatedMRR();
  const estimatedARR = estimatedMRR * 12;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!subscriptionPlan) {
      setError('יש לבחור חבילת מנוי');
      return;
    }

    if (seatsAllowed < 1 || seatsAllowed > 999) {
      setError('מספר מקומות חייב להיות בין 1 ל-999');
      return;
    }

    if (billingEmail && !billingEmail.includes('@')) {
      setError('כתובת מייל לחיוב לא תקינה');
      return;
    }

    startTransition(async () => {
      try {
        const { updateOrganizationBilling } = await import('@/app/actions/billing-actions');
        
        const result = await updateOrganizationBilling(organizationId, {
          subscription_plan: subscriptionPlan,
          billing_cycle: billingCycle as 'monthly' | 'yearly',
          seats_allowed: seatsAllowed,
          billing_email: billingEmail.trim() || undefined,
          payment_method_id: paymentMethodId.trim() || undefined,
        });

        if (!result.ok) {
          setError(result.error || 'שגיאה בעדכון פרטי חיוב');
          return;
        }

        onSuccess();
        onClose();
      } catch (err) {
        console.error('Failed to update billing:', err);
        setError('שגיאה לא צפויה בעדכון פרטי חיוב');
      }
    });
  };

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">ניהול חיובים</h2>
              <p className="text-sm text-slate-500">{organizationName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isPending}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Subscription Plan */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-700 border-b pb-2">
              חבילת מנוי
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subscriptionPlan">תוכנית *</Label>
                <CustomSelect
                  value={subscriptionPlan}
                  onChange={(val) => setSubscriptionPlan(val)}
                  disabled={isPending}
                  placeholder="בחר חבילה..."
                  options={PLANS.map((plan) => ({ value: plan.value, label: `${plan.label} (₪${plan.price}/מקום)` }))}
                />
              </div>

              <div>
                <Label htmlFor="billingCycle">מחזור חיוב</Label>
                <CustomSelect
                  value={billingCycle}
                  onChange={(val) => setBillingCycle(val)}
                  disabled={isPending}
                  options={[
                    { value: 'monthly', label: 'חודשי' },
                    { value: 'yearly', label: 'שנתי (חסכון 15%)' },
                  ]}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="seatsAllowed">מספר מקומות (משתמשים)</Label>
              <Input
                id="seatsAllowed"
                type="number"
                min="1"
                max="999"
                value={seatsAllowed}
                onChange={(e) => setSeatsAllowed(parseInt(e.target.value) || 5)}
                disabled={isPending}
                className="mt-1"
              />
              {currentBilling.active_users_count != null && (
                <div className="mt-2">
                  <p className="text-sm text-slate-600">
                    בשימוש כרגע: <span className="font-semibold">{currentBilling.active_users_count}</span> משתמשים
                  </p>
                  {currentBilling.active_users_count > seatsAllowed && (
                    <p className="text-sm text-red-600 font-medium mt-1">
                      ⚠️ אזהרה: יש לך {currentBilling.active_users_count} משתמשים פעילים, אבל רק {seatsAllowed} מקומות!
                    </p>
                  )}
                  {currentBilling.active_users_count >= seatsAllowed * 0.9 && currentBilling.active_users_count <= seatsAllowed && (
                    <p className="text-sm text-orange-600 font-medium mt-1">
                      ⚡ התקרבת לגבול: {currentBilling.active_users_count}/{seatsAllowed} מקומות בשימוש
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-500 mt-1">
                כמה משתמשים יכולים לגשת למערכת
              </p>
            </div>
          </div>

          {/* Billing Contact */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-700 border-b pb-2">
              פרטי חיוב
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="billingEmail">מייל לחיובים</Label>
                <Input
                  id="billingEmail"
                  type="email"
                  placeholder="billing@company.com"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  disabled={isPending}
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  כתובת המייל לקבלת חשבוניות
                </p>
              </div>

              <div>
                <Label htmlFor="paymentMethodId">Payment Method ID</Label>
                <Input
                  id="paymentMethodId"
                  type="text"
                  placeholder="pm_xxx (Stripe)"
                  value={paymentMethodId}
                  onChange={(e) => setPaymentMethodId(e.target.value)}
                  disabled={isPending}
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  מזהה אמצעי תשלום (Stripe/Gateway)
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3">סיכום מחירים</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-700">חבילה:</span>
                <span className="font-medium">
                  {subscriptionPlan ? PLANS.find(p => p.value === subscriptionPlan)?.label : 'לא נבחר'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700">מקומות:</span>
                <span className="font-medium">{seatsAllowed} משתמשים</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700">מחזור:</span>
                <span className="font-medium">
                  {billingCycle === 'monthly' ? 'חודשי' : 'שנתי'}
                  {billingCycle === 'yearly' && <span className="text-green-600 mr-2">(חסכון 15%)</span>}
                </span>
              </div>
              <div className="border-t border-blue-300 pt-2 mt-2">
                <div className="flex justify-between text-base">
                  <span className="font-semibold text-slate-900">MRR (חודשי):</span>
                  <span className="font-bold text-blue-900">₪{estimatedMRR.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base mt-1">
                  <span className="font-semibold text-slate-900">ARR (שנתי):</span>
                  <span className="font-bold text-blue-900">₪{estimatedARR.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Current vs New */}
          {currentBilling.mrr && currentBilling.mrr > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">השוואה</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-600">MRR נוכחי:</p>
                  <p className="font-medium">₪{Number(currentBilling.mrr).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-600">MRR חדש:</p>
                  <p className="font-medium text-blue-600">₪{estimatedMRR.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Next Billing */}
          {currentBilling.next_billing_date && (
            <div className="text-sm text-slate-600">
              <strong>חיוב הבא:</strong>{' '}
              {new Date(currentBilling.next_billing_date).toLocaleDateString('he-IL')}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  מעדכן...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  עדכן פרטי חיוב
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              ביטול
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
