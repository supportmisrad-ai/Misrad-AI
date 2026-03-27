'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  BarChart3,
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  getAllPromotions,
  upsertGlobalPromotion,
  deleteGlobalPromotion,
  type GlobalPromotion,
} from '@/app/actions/global-promotion';

export default function GlobalPromotionsClient() {
  const router = useRouter();
  const [promotions, setPromotions] = useState<GlobalPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    discountPercent: 50,
    discountAmountCents: 0,
    badgeText: '⚡ מבצע בזק',
    ctaText: 'תפוס את ההזדמנות',
    urgencyMessage: '',
    startsAt: new Date().toISOString().slice(0, 16),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    isActive: true,
    displayOnSignup: true,
    displayOnPricing: true,
    couponCode: '',
    usePercent: true,
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    setLoading(true);
    try {
      const result = await getAllPromotions();
      if (result.success && result.data) {
        setPromotions(result.data);
      }
    } catch (error) {
      showMessage('error', 'שגיאה בטעינת מבצעים');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      showMessage('error', 'כותרת היא שדה חובה');
      return;
    }

    setSaving(true);
    try {
      const result = await upsertGlobalPromotion({
        id: editingId || undefined,
        title: formData.title,
        subtitle: formData.subtitle || undefined,
        discountPercent: formData.usePercent ? formData.discountPercent : undefined,
        discountAmountCents: !formData.usePercent ? formData.discountAmountCents : undefined,
        badgeText: formData.badgeText || undefined,
        ctaText: formData.ctaText || undefined,
        urgencyMessage: formData.urgencyMessage || undefined,
        startsAt: new Date(formData.startsAt),
        expiresAt: new Date(formData.expiresAt),
        isActive: formData.isActive,
        displayOnSignup: formData.displayOnSignup,
        displayOnPricing: formData.displayOnPricing,
        couponCode: formData.couponCode || undefined,
      });

      if (result.success) {
        showMessage('success', editingId ? 'מבצע עודכן בהצלחה!' : 'מבצע נוצר בהצלחה!');
        setShowForm(false);
        setEditingId(null);
        resetForm();
        await loadPromotions();
        // Efficient refresh - reload promotions data only
        window.location.reload();
      } else {
        showMessage('error', result.error || 'שגיאה בשמירת מבצע');
      }
    } catch (error) {
      showMessage('error', 'שגיאה בשמירת מבצע');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (promo: GlobalPromotion) => {
    setEditingId(promo.id);
    setFormData({
      title: promo.title,
      subtitle: promo.subtitle || '',
      discountPercent: promo.discountPercent || 50,
      discountAmountCents: promo.discountAmountCents || 0,
      badgeText: promo.badgeText || '',
      ctaText: promo.ctaText || '',
      urgencyMessage: promo.urgencyMessage || '',
      startsAt: new Date(promo.startsAt).toISOString().slice(0, 16),
      expiresAt: new Date(promo.expiresAt).toISOString().slice(0, 16),
      isActive: promo.isActive,
      displayOnSignup: promo.displayOnSignup,
      displayOnPricing: promo.displayOnPricing,
      couponCode: promo.couponCode || '',
      usePercent: promo.discountPercent !== null,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('האם למחוק מבצע זה?')) return;

    try {
      const result = await deleteGlobalPromotion(id);
      if (result.success) {
        showMessage('success', 'מבצע נמחק בהצלחה');
        await loadPromotions();
        // Efficient refresh - reload promotions data only
        window.location.reload();
      } else {
        showMessage('error', result.error || 'שגיאה במחיקת מבצע');
      }
    } catch (error) {
      showMessage('error', 'שגיאה במחיקת מבצע');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      discountPercent: 50,
      discountAmountCents: 0,
      badgeText: '⚡ מבצע בזק',
      ctaText: 'תפוס את ההזדמנות',
      urgencyMessage: '',
      startsAt: new Date().toISOString().slice(0, 16),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      isActive: true,
      displayOnSignup: true,
      displayOnPricing: true,
      couponCode: '',
      usePercent: true,
    });
  };

  const getTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diff = new Date(expiresAt).getTime() - now.getTime();
    if (diff <= 0) return 'פג תוקף';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} ימים ו-${hours} שעות`;
    return `${hours} שעות`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-blue-600" />
            מבצעים גלובליים
          </h1>
          <p className="text-slate-600 mt-2">
            ניהול מבצעים והנחות שמופיעים בדפי הרשמה ותמחור
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) {
              setEditingId(null);
              resetForm();
            }
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {showForm ? (
            <>
              <XCircle className="w-4 h-4 ml-2" />
              ביטול
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 ml-2" />
              מבצע חדש
            </>
          )}
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-xl border-2 ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white border-2 border-blue-200 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-black text-slate-900">
            {editingId ? 'עריכת מבצע' : 'מבצע חדש'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="md:col-span-2">
              <Label htmlFor="title">כותרת המבצע *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="🔥 הנחת השקה מטורפת!"
                className="mt-2"
              />
            </div>

            {/* Subtitle */}
            <div className="md:col-span-2">
              <Label htmlFor="subtitle">כותרת משנה</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="קבל 50% הנחה על 3 החודשים הראשונים"
                className="mt-2"
              />
            </div>

            {/* Discount Type */}
            <div>
              <Label>סוג הנחה</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.usePercent}
                    onChange={() => setFormData({ ...formData, usePercent: true })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">אחוזים (%)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!formData.usePercent}
                    onChange={() => setFormData({ ...formData, usePercent: false })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">סכום קבוע (₪)</span>
                </label>
              </div>
            </div>

            {/* Discount Value */}
            <div>
              <Label htmlFor="discount">
                {formData.usePercent ? 'אחוז הנחה' : 'סכום הנחה (בסנטים)'}
              </Label>
              <Input
                id="discount"
                type="number"
                min="1"
                max={formData.usePercent ? 100 : undefined}
                value={formData.usePercent ? formData.discountPercent : formData.discountAmountCents}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    [formData.usePercent ? 'discountPercent' : 'discountAmountCents']: parseInt(
                      e.target.value
                    ) || 0,
                  })
                }
                className="mt-2"
              />
            </div>

            {/* Badge Text */}
            <div>
              <Label htmlFor="badge">טקסט תג</Label>
              <Input
                id="badge"
                value={formData.badgeText}
                onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                placeholder="⚡ מבצע בזק"
                className="mt-2"
              />
            </div>

            {/* CTA Text */}
            <div>
              <Label htmlFor="cta">טקסט כפתור</Label>
              <Input
                id="cta"
                value={formData.ctaText}
                onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                placeholder="תפוס את ההזדמנות"
                className="mt-2"
              />
            </div>

            {/* Urgency Message */}
            <div className="md:col-span-2">
              <Label htmlFor="urgency">הודעת דחיפות (FOMO)</Label>
              <Textarea
                id="urgency"
                value={formData.urgencyMessage}
                onChange={(e) => setFormData({ ...formData, urgencyMessage: e.target.value })}
                placeholder="⏰ נותרו רק 48 שעות למבצע! אל תפספסו!"
                className="mt-2"
                rows={2}
              />
            </div>

            {/* Dates */}
            <div>
              <Label htmlFor="starts">תאריך התחלה</Label>
              <Input
                id="starts"
                type="datetime-local"
                value={formData.startsAt}
                onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="expires">תאריך סיום *</Label>
              <Input
                id="expires"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="mt-2"
              />
            </div>

            {/* Coupon Code */}
            <div className="md:col-span-2">
              <Label htmlFor="coupon">קוד קופון (אופציונלי)</Label>
              <Input
                id="coupon"
                value={formData.couponCode}
                onChange={(e) => setFormData({ ...formData, couponCode: e.target.value })}
                placeholder="LAUNCH50"
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-1">
                אם מוגדר - המבצע יקושר לקוד קופון קיים במערכת
              </p>
            </div>

            {/* Checkboxes */}
            <div className="md:col-span-2 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked as boolean })
                  }
                />
                <span className="text-sm font-medium">פעיל (רק מבצע אחד יכול להיות פעיל בו-זמנית)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={formData.displayOnSignup}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, displayOnSignup: checked as boolean })
                  }
                />
                <span className="text-sm font-medium">הצג בדפי הרשמה</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={formData.displayOnPricing}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, displayOnPricing: checked as boolean })
                  }
                />
                <span className="text-sm font-medium">הצג בדף תמחור</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSubmit} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  {editingId ? 'עדכן מבצע' : 'צור מבצע'}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                resetForm();
              }}
            >
              ביטול
            </Button>
          </div>
        </div>
      )}

      {/* Promotions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : promotions.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-12 text-center">
            <Megaphone className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-600 mb-2">אין מבצעים פעילים</h3>
            <p className="text-sm text-slate-500">צור מבצע חדש כדי להתחיל</p>
          </div>
        ) : (
          promotions.map((promo) => {
            const isExpired = new Date(promo.expiresAt) <= new Date();
            const isActive = promo.isActive && !isExpired;

            return (
              <div
                key={promo.id}
                className={`bg-white border-2 rounded-xl p-6 ${
                  isActive ? 'border-green-300 bg-green-50/30' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-black text-slate-900">{promo.title}</h3>
                      {promo.badgeText && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                          {promo.badgeText}
                        </span>
                      )}
                      {isActive && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          פעיל כעת
                        </span>
                      )}
                      {isExpired && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                          פג תוקף
                        </span>
                      )}
                    </div>
                    {promo.subtitle && <p className="text-slate-600 mb-3">{promo.subtitle}</p>}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">הנחה:</span>
                        <span className="font-bold text-slate-900 mr-2">
                          {promo.discountPercent
                            ? `${promo.discountPercent}%`
                            : `₪${(promo.discountAmountCents! / 100).toFixed(2)}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">זמן נותר:</span>
                        <span className="font-bold text-slate-900 mr-2">
                          {getTimeRemaining(promo.expiresAt)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">הצגה:</span>
                        <div className="flex gap-2 mr-2">
                          {promo.displayOnSignup && (
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded">הרשמה</span>
                          )}
                          {promo.displayOnPricing && (
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded">תמחור</span>
                          )}
                        </div>
                      </div>
                      {promo.couponCode && (
                        <div>
                          <span className="text-slate-500">קוד:</span>
                          <span className="font-mono font-bold text-slate-900 mr-2">
                            {promo.couponCode}
                          </span>
                        </div>
                      )}
                    </div>

                    {promo.urgencyMessage && (
                      <p className="mt-3 text-sm text-orange-600 font-medium">
                        ⚠️ {promo.urgencyMessage}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(promo)}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(promo.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
