'use client';

import React, { useState, useTransition } from 'react';
import { X, Tag, Loader2, CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

type ApplyCouponModalProps = {
  isOpen: boolean;
  organizationId: string;
  organizationName: string;
  currentMRR: number;
  onClose: () => void;
  onSuccess: () => void;
};

type ValidatedCoupon = {
  id: string;
  code: string;
  discount_type: string;
  discount_percent: number | null;
  discount_amount: number | null;
  ends_at: Date | null;
  max_redemptions_total: number | null;
  current_redemptions: number;
  max_users: number | null;
  allowed_modules: string[];
};

const MODULE_LABELS_HE: Record<string, string> = {
  nexus: 'נקסוס',
  system: 'מערכת',
  social: 'סושיאל',
  finance: 'פיננסים',
  client: 'לקוחות',
  operations: 'תפעול',
};

export default function ApplyCouponModal({
  isOpen,
  organizationId,
  organizationName,
  currentMRR,
  onClose,
  onSuccess,
}: ApplyCouponModalProps) {
  const [isPending, startTransition] = useTransition();
  const [isValidating, setIsValidating] = useState(false);
  
  const [couponCode, setCouponCode] = useState('');
  const [validatedCoupon, setValidatedCoupon] = useState<ValidatedCoupon | null>(null);
  const [error, setError] = useState('');
  useBackButtonClose(isOpen, onClose);

  if (!isOpen) return null;

  const handleValidate = async () => {
    setError('');
    setValidatedCoupon(null);

    if (!couponCode.trim()) {
      setError('יש להזין קוד קופון');
      return;
    }

    setIsValidating(true);
    try {
      const { validateCoupon } = await import('@/app/actions/billing-actions');
      const result = await validateCoupon(couponCode);

      if (!result.ok || !result.coupon) {
        setError(result.error || 'קופון לא תקין');
        return;
      }

      setValidatedCoupon(result.coupon);
    } catch (err) {
      console.error('Failed to validate coupon:', err);
      setError('שגיאה בבדיקת קופון');
    } finally {
      setIsValidating(false);
    }
  };

  const handleApply = async () => {
    if (!validatedCoupon) return;

    setError('');
    startTransition(async () => {
      try {
        const { applyCouponToOrganization } = await import('@/app/actions/billing-actions');
        
        const result = await applyCouponToOrganization(organizationId, validatedCoupon.code);

        if (!result.ok) {
          setError(result.error || 'שגיאה בהחלת קופון');
          return;
        }

        onSuccess();
        onClose();
        resetForm();
      } catch (err) {
        console.error('Failed to apply coupon:', err);
        setError('שגיאה לא צפויה');
      }
    });
  };

  const resetForm = () => {
    setCouponCode('');
    setValidatedCoupon(null);
    setError('');
  };

  const handleClose = () => {
    if (isPending || isValidating) return;
    resetForm();
    onClose();
  };

  const calculateDiscount = () => {
    if (!validatedCoupon) return { amount: 0, newMRR: currentMRR };

    let discountAmount = 0;
    if (validatedCoupon.discount_type === 'PERCENT' && validatedCoupon.discount_percent) {
      discountAmount = (currentMRR * validatedCoupon.discount_percent) / 100;
    } else if (validatedCoupon.discount_type === 'FIXED_AMOUNT' && validatedCoupon.discount_amount) {
      discountAmount = validatedCoupon.discount_amount;
    }

    const newMRR = Math.max(0, currentMRR - discountAmount);
    return { amount: discountAmount, newMRR };
  };

  const { amount: discountAmount, newMRR } = calculateDiscount();
  const savings = discountAmount * 12; // Annual savings

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Tag className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">החלת קופון</h2>
              <p className="text-sm text-slate-500">{organizationName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isPending || isValidating}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Coupon Input */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
              קוד קופון
            </div>
            
            <div>
              <Label htmlFor="couponCode">הזן קוד קופון</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="couponCode"
                  type="text"
                  placeholder="WELCOME20"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setValidatedCoupon(null);
                    setError('');
                  }}
                  disabled={isPending || isValidating}
                  className="flex-1 font-mono text-lg"
                />
                <Button
                  type="button"
                  onClick={handleValidate}
                  disabled={isPending || isValidating || !couponCode.trim()}
                  variant="outline"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      בודק...
                    </>
                  ) : (
                    'בדוק'
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Validated Coupon */}
          {validatedCoupon && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CircleCheck className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 mb-2">✅ קופון תקף!</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-700">קוד:</span>
                      <span className="font-mono font-medium">{validatedCoupon.code}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-700">הנחה:</span>
                      <span className="font-medium text-green-700">
                        {validatedCoupon.discount_type === 'PERCENT' && validatedCoupon.discount_percent
                          ? `${validatedCoupon.discount_percent}%`
                          : validatedCoupon.discount_type === 'FIXED_AMOUNT' && validatedCoupon.discount_amount
                          ? `₪${validatedCoupon.discount_amount.toFixed(2)}`
                          : 'N/A'}
                      </span>
                    </div>

                    {validatedCoupon.ends_at && (
                      <div className="flex justify-between">
                        <span className="text-slate-700">תוקף עד:</span>
                        <span className="font-medium">
                          {new Date(validatedCoupon.ends_at).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                    )}

                    {validatedCoupon.max_redemptions_total && (
                      <div className="flex justify-between">
                        <span className="text-slate-700">שימושים:</span>
                        <span className="font-medium">
                          {validatedCoupon.current_redemptions} / {validatedCoupon.max_redemptions_total}
                        </span>
                      </div>
                    )}

                    {validatedCoupon.max_users && (
                      <div className="flex justify-between items-center pt-1 mt-1 border-t border-green-200">
                        <span className="text-slate-700">מקסימום משתמשים:</span>
                        <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-xs">
                          עד {validatedCoupon.max_users} משתמשים
                        </span>
                      </div>
                    )}

                    {validatedCoupon.allowed_modules.length > 0 && (
                      <div className="flex justify-between items-start pt-1 mt-1 border-t border-green-200">
                        <span className="text-slate-700 shrink-0 mt-1">מודולים מותרים:</span>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {validatedCoupon.allowed_modules.map(m => (
                            <span key={m} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {MODULE_LABELS_HE[m] || m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Savings Calculation */}
          {validatedCoupon && discountAmount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">💰 חישוב חיסכון</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-700">MRR נוכחי:</span>
                  <span className="font-medium">₪{currentMRR.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-green-600">
                  <span>הנחה חודשית:</span>
                  <span className="font-medium">-₪{discountAmount.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between border-t border-blue-300 pt-2 mt-2">
                  <span className="font-semibold text-slate-900">MRR חדש:</span>
                  <span className="font-bold text-blue-900">₪{newMRR.toFixed(2)}</span>
                </div>

                <div className="flex justify-between bg-blue-100 rounded p-2 mt-2">
                  <span className="font-semibold text-blue-900">חיסכון שנתי:</span>
                  <span className="font-bold text-blue-900 text-lg">₪{savings.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Info */}
          {!validatedCoupon && !error && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
              הזן קוד קופון ולחץ "בדוק" כדי לראות את פרטי ההנחה
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button
              onClick={handleApply}
              disabled={isPending || isValidating || !validatedCoupon}
              className="flex-1"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  מחיל קופון...
                </>
              ) : (
                <>
                  <Tag className="w-4 h-4 mr-2" />
                  החל קופון
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending || isValidating}
            >
              ביטול
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
