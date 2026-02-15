'use client';

import React, { useState, useTransition } from 'react';
import { X, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

type AddOrganizationToClientModalProps = {
  isOpen: boolean;
  clientId: string;
  clientName: string;
  primaryContactUserId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AddOrganizationToClientModal({
  isOpen,
  clientId,
  clientName,
  primaryContactUserId,
  onClose,
  onSuccess,
}: AddOrganizationToClientModalProps) {
  const [isPending, startTransition] = useTransition();
  
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  
  // Subscription
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>('');
  const [seatsAllowed, setSeatsAllowed] = useState<number>(5);
  const [trialDays, setTrialDays] = useState<number>(7);
  const [couponCode, setCouponCode] = useState('');
  
  // Modules
  const [hasNexus, setHasNexus] = useState(true);
  const [hasSocial, setHasSocial] = useState(false);
  const [hasFinance, setHasFinance] = useState(false);
  const [hasClient, setHasClient] = useState(false);
  const [hasOperations, setHasOperations] = useState(false);
  
  // Settings
  const [isShabatProtected, setIsShabatProtected] = useState(true);
  
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!orgName.trim()) {
      setError('שם ארגון הוא שדה חובה');
      return;
    }

    if (!primaryContactUserId) {
      setError('לקוח זה חייב להיות עם איש קשר ראשי לפני יצירת ארגון');
      return;
    }

    startTransition(async () => {
      try {
        const { createOrganizationForClient } = await import('@/app/actions/business-clients');
        
        const result = await createOrganizationForClient(clientId, primaryContactUserId, {
          name: orgName.trim(),
          slug: orgSlug.trim() || undefined,
          subscription_plan: subscriptionPlan || undefined,
          seats_allowed: seatsAllowed,
          trial_days: trialDays,
          coupon_code: couponCode.trim() || undefined,
          has_nexus: hasNexus,
          has_social: hasSocial,
          has_finance: hasFinance,
          has_client: hasClient,
          has_operations: hasOperations,
          is_shabbat_protected: isShabatProtected,
        });

        if (!result.ok) {
          setError(result.error || 'שגיאה ביצירת ארגון');
          return;
        }

        onSuccess();
        onClose();
        resetForm();
      } catch (err) {
        console.error('Failed to create organization:', err);
        setError('שגיאה לא צפויה');
      }
    });
  };

  const resetForm = () => {
    setOrgName('');
    setOrgSlug('');
    setSubscriptionPlan('');
    setSeatsAllowed(5);
    setTrialDays(7);
    setCouponCode('');
    setHasNexus(true);
    setHasSocial(false);
    setHasFinance(false);
    setHasClient(false);
    setHasOperations(false);
    setIsShabatProtected(true);
    setError('');
  };

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const autoGenerateSlug = () => {
    if (!orgName.trim()) return;
    
    const slug = orgName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 50);
    
    setOrgSlug(slug);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">יצירת ארגון</h2>
              <p className="text-sm text-gray-500">{clientName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isPending}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {!primaryContactUserId && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>שים לב:</strong> לפני יצירת ארגון, יש להוסיף איש קשר ראשי ללקוח זה.
              </p>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-700 border-b pb-2">
              פרטי ארגון
            </div>
            
            <div>
              <Label htmlFor="orgName">שם ארגון *</Label>
              <Input
                id="orgName"
                type="text"
                placeholder="לדוגמה: מחלקת שיווק - ABC"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={isPending || !primaryContactUserId}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                הארגון ישויך ללקוח העסקי "{clientName}"
              </p>
            </div>

            <div>
              <Label htmlFor="orgSlug">Slug (מזהה ייחודי)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="orgSlug"
                  type="text"
                  placeholder="abc-marketing"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  disabled={isPending || !primaryContactUserId}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={autoGenerateSlug}
                  disabled={isPending || !orgName.trim() || !primaryContactUserId}
                >
                  יצירה אוטומטית
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                אם ריק, המערכת תייצר אוטומטית
              </p>
            </div>
          </div>

          {/* Subscription & Billing */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-700 border-b pb-2">
              חבילה ומנויים
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="subscriptionPlan">חבילת מנוי</Label>
                <select
                  id="subscriptionPlan"
                  value={subscriptionPlan}
                  onChange={(e) => {
                    const plan = e.target.value;
                    setSubscriptionPlan(plan);
                    if (plan === 'solo') {
                      setHasNexus(false); setHasSocial(false); setHasFinance(false); setHasClient(false); setHasOperations(false);
                    } else if (plan === 'the_closer') {
                      setHasNexus(true); setHasSocial(false); setHasFinance(false); setHasClient(false); setHasOperations(false);
                    } else if (plan === 'the_authority') {
                      setHasNexus(true); setHasSocial(true); setHasFinance(false); setHasClient(true); setHasOperations(false);
                    } else if (plan === 'the_operator') {
                      setHasNexus(true); setHasSocial(false); setHasFinance(true); setHasClient(false); setHasOperations(true);
                    } else if (plan === 'the_empire') {
                      setHasNexus(true); setHasSocial(true); setHasFinance(true); setHasClient(true); setHasOperations(true);
                      setSeatsAllowed(5);
                    }
                  }}
                  disabled={isPending || !primaryContactUserId}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">ללא חבילה (ניסיון)</option>
                  <option value="solo">🎯 מודול בודד — ₪149</option>
                  <option value="the_closer">💼 מכירות — ₪249</option>
                  <option value="the_authority">🎨 שיווק ומיתוג — ₪349</option>
                  <option value="the_operator">🔧 תפעול ושטח — ₪349</option>
                  <option value="the_empire">👑 הכל כלול — ₪499</option>
                </select>
              </div>

              <div>
                <Label htmlFor="seatsAllowed">מספר מקומות</Label>
                <Input
                  id="seatsAllowed"
                  type="number"
                  min="1"
                  max="999"
                  value={seatsAllowed}
                  onChange={(e) => setSeatsAllowed(parseInt(e.target.value) || 5)}
                  disabled={isPending || !primaryContactUserId}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">כמה משתמשים מותרים</p>
              </div>

              <div>
                <Label htmlFor="trialDays">ימי ניסיון</Label>
                <Input
                  id="trialDays"
                  type="number"
                  min="0"
                  max="365"
                  value={trialDays}
                  onChange={(e) => setTrialDays(parseInt(e.target.value) || 7)}
                  disabled={isPending || !primaryContactUserId}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">ברירת מחדל: 7 ימים</p>
              </div>
            </div>

            <div>
              <Label htmlFor="couponCode">קוד קופון (אופציונלי)</Label>
              <Input
                id="couponCode"
                type="text"
                placeholder="DISCOUNT20"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                disabled={isPending || !primaryContactUserId}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                הזן קוד קופון להנחה
              </p>
            </div>
          </div>

          {/* Modules */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-700 border-b pb-2">
              מודולים פעילים
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasNexus"
                  checked={hasNexus}
                  onCheckedChange={(checked: boolean) => setHasNexus(checked as boolean)}
                  disabled={isPending || !primaryContactUserId}
                />
                <Label htmlFor="hasNexus" className="cursor-pointer">
                  ✅ Nexus (ניהול צוות ומשימות)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasSocial"
                  checked={hasSocial}
                  onCheckedChange={(checked: boolean) => setHasSocial(checked as boolean)}
                  disabled={isPending || !primaryContactUserId}
                />
                <Label htmlFor="hasSocial" className="cursor-pointer">
                  📱 Social Media (ניהול תוכן)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasFinance"
                  checked={hasFinance}
                  onCheckedChange={(checked: boolean) => setHasFinance(checked as boolean)}
                  disabled={isPending || !primaryContactUserId}
                />
                <Label htmlFor="hasFinance" className="cursor-pointer">
                  💰 Finance (כספים)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasClient"
                  checked={hasClient}
                  onCheckedChange={(checked: boolean) => setHasClient(checked as boolean)}
                  disabled={isPending || !primaryContactUserId}
                />
                <Label htmlFor="hasClient" className="cursor-pointer">
                  👥 Client (ניהול לקוחות)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasOperations"
                  checked={hasOperations}
                  onCheckedChange={(checked: boolean) => setHasOperations(checked as boolean)}
                  disabled={isPending || !primaryContactUserId}
                />
                <Label htmlFor="hasOperations" className="cursor-pointer">
                  ⚙️ Operations (תפעול)
                </Label>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-700 border-b pb-2">
              הגדרות נוספות
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Checkbox
                id="isShabbatProtected"
                checked={isShabatProtected}
                onCheckedChange={(checked: boolean) => setIsShabatProtected(checked as boolean)}
                disabled={isPending || !primaryContactUserId}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="isShabbatProtected" className="cursor-pointer font-medium">
                  🕎 החרגת שבת
                </Label>
                <p className="text-xs text-blue-700 mt-1">
                  חסימת פעולות במערכת בשבת ומועדים (ברירת מחדל: מופעל)
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>מידע:</strong> הארגון ייווצר עם תקופת ניסיון של 7 ימים ויקושר אוטומטית ללקוח העסקי.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="submit"
              disabled={isPending || !primaryContactUserId}
              className="flex-1"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  יוצר ארגון...
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4 mr-2" />
                  צור ארגון
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
