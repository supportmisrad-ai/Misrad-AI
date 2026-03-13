'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Select } from '@/components/ui/select';
import { Plus, Trash2, ToggleLeft, ToggleRight, Copy, Tag, Users, Calendar, Percent, DollarSign, AlertCircle, CheckCircle2, Loader2, Lock, Layers } from 'lucide-react';
import { createCoupon, listCoupons, updateCouponStatus, deleteCoupon } from '@/app/actions/billing-actions';

const ALL_MODULES = ['nexus', 'system', 'social', 'finance', 'client', 'operations'] as const;
const MODULE_LABELS: Record<string, string> = {
  nexus: 'נקסוס',
  system: 'מערכת',
  social: 'סושיאל',
  finance: 'פיננסים',
  client: 'לקוחות',
  operations: 'תפעול',
};

type CouponItem = {
  id: string;
  codeLast4: string | null;
  name: string | null;
  status: string;
  discountType: string;
  discountPercent: number | null;
  discountAmount: number | null;
  minOrderAmount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  maxRedemptionsTotal: number | null;
  currentRedemptions: number;
  maxUsers: number | null;
  allowedModules: string[];
  createdAt: string | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

function discountLabel(c: CouponItem): string {
  if (c.discountType === 'PERCENT' && c.discountPercent != null) return `${c.discountPercent}%`;
  if (c.discountType === 'FIXED_AMOUNT' && c.discountAmount != null) return `₪${c.discountAmount}`;
  return '—';
}

export default function CouponsAdminClient() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDiscountType, setNewDiscountType] = useState<'PERCENT' | 'FIXED_AMOUNT'>('PERCENT');
  const [newDiscountPercent, setNewDiscountPercent] = useState(10);
  const [newDiscountAmount, setNewDiscountAmount] = useState(50);
  const [newMinOrder, setNewMinOrder] = useState(0);
  const [newStartsAt, setNewStartsAt] = useState('');
  const [newEndsAt, setNewEndsAt] = useState('');
  const [newMaxRedemptions, setNewMaxRedemptions] = useState(0);
  const [newMaxUsers, setNewMaxUsers] = useState(0);
  const [newAllowedModules, setNewAllowedModules] = useState<string[]>([]);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listCoupons();
      if (result.ok && 'data' in result) {
        setCoupons(result.data as CouponItem[]);
      } else {
        setError('error' in result ? (result.error ?? 'שגיאה') : 'שגיאה');
      }
    } catch {
      setError('שגיאה בטעינה');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCoupons(); }, [loadCoupons]);

  const handleCreate = async () => {
    if (!newCode.trim()) { setError('חובה להזין קוד קופון'); return; }
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await createCoupon({
        code: newCode,
        name: newName || undefined,
        discountType: newDiscountType,
        discountPercent: newDiscountType === 'PERCENT' ? newDiscountPercent : undefined,
        discountAmount: newDiscountType === 'FIXED_AMOUNT' ? newDiscountAmount : undefined,
        minOrderAmount: newMinOrder > 0 ? newMinOrder : undefined,
        startsAt: newStartsAt || null,
        endsAt: newEndsAt || null,
        maxRedemptionsTotal: newMaxRedemptions > 0 ? newMaxRedemptions : null,
        maxUsers: newMaxUsers > 0 ? newMaxUsers : null,
        allowedModules: newAllowedModules.length > 0 ? newAllowedModules : [],
      });
      if (result.ok) {
        setSuccess(`קופון נוצר בהצלחה! קוד: ${newCode.toUpperCase()}`);
        setShowCreate(false);
        setNewCode('');
        setNewName('');
        setNewDiscountPercent(10);
        setNewDiscountAmount(50);
        setNewMinOrder(0);
        setNewStartsAt('');
        setNewEndsAt('');
        setNewMaxRedemptions(0);
        setNewMaxUsers(0);
        setNewAllowedModules([]);
        await loadCoupons();
      } else {
        setError('error' in result ? (result.error ?? 'שגיאה') : 'שגיאה ביצירה');
      }
    } catch {
      setError('שגיאה ביצירת קופון');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (couponId: string, currentStatus: string) => {
    setActionLoading(couponId);
    setError(null);
    setSuccess(null);
    try {
      const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
      const result = await updateCouponStatus(couponId, newStatus as 'active' | 'disabled');
      if (result.ok) {
        setSuccess(`קופון ${newStatus === 'active' ? 'הופעל' : 'הושבת'} בהצלחה`);
        await loadCoupons();
      } else {
        setError('error' in result ? (result.error ?? 'שגיאה') : 'שגיאה');
      }
    } catch {
      setError('שגיאה בעדכון');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (couponId: string) => {
    if (!confirm('למחוק את הקופון? פעולה זו אינה הפיכה.')) return;
    setActionLoading(couponId);
    setError(null);
    setSuccess(null);
    try {
      const result = await deleteCoupon(couponId);
      if (result.ok) {
        setSuccess('קופון נמחק');
        await loadCoupons();
      } else {
        setError('error' in result ? (result.error ?? 'שגיאה') : 'שגיאה');
      }
    } catch {
      setError('שגיאה במחיקה');
    } finally {
      setActionLoading(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => undefined);
    setSuccess(`קוד הועתק: ****${code}`);
    setTimeout(() => setSuccess(null), 2000);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">ניהול קופונים</h1>
          <p className="text-sm text-slate-500 mt-1">יצירה, ניהול והפצת קופוני הנחה ללקוחות ושותפים</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-sm transition-colors"
        >
          <Plus size={16} />
          צור קופון חדש
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-lg space-y-4">
          <h2 className="text-lg font-black text-slate-900">קופון חדש</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">קוד קופון *</label>
              <input
                value={newCode}
                onChange={e => setNewCode(e.target.value.toUpperCase())}
                placeholder="לדוגמה: PARTNER50"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 tracking-wider"
                dir="ltr"
              />
              <p className="text-[10px] text-slate-400 mt-1">הקוד ישמר מוצפן — הלקוח מזין אותו בצ&apos;קאוט</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">שם / תיאור</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder='לדוגמה: הנחת שותף רו"ח'
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">סוג הנחה</label>
              <Select
                value={newDiscountType}
                onChange={e => setNewDiscountType(e.target.value as 'PERCENT' | 'FIXED_AMOUNT')}
              >
                <option value="PERCENT">אחוזים (%)</option>
                <option value="FIXED_AMOUNT">סכום קבוע (₪)</option>
              </Select>
            </div>
            {newDiscountType === 'PERCENT' ? (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">אחוז הנחה</label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newDiscountPercent}
                    onChange={e => setNewDiscountPercent(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900"
                  />
                  <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">סכום הנחה (₪)</label>
                <input
                  type="number"
                  min={1}
                  value={newDiscountAmount}
                  onChange={e => setNewDiscountAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">מינימום הזמנה (₪)</label>
              <input
                type="number"
                min={0}
                value={newMinOrder}
                onChange={e => setNewMinOrder(Number(e.target.value))}
                placeholder="0 = ללא מינימום"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">תאריך התחלה</label>
              <input
                type="date"
                value={newStartsAt}
                onChange={e => setNewStartsAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">תאריך סיום</label>
              <input
                type="date"
                value={newEndsAt}
                onChange={e => setNewEndsAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">מקסימום מימושים</label>
              <input
                type="number"
                min={0}
                value={newMaxRedemptions}
                onChange={e => setNewMaxRedemptions(Number(e.target.value))}
                placeholder="0 = ללא הגבלה"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            <div className="flex items-center gap-1.5">
              <Lock size={13} className="text-slate-500" />
              <span className="text-xs font-bold text-slate-700">הגבלות (אופציונלי)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">מקסימום משתמשים</label>
                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={newMaxUsers}
                  onChange={e => setNewMaxUsers(Math.max(0, Number(e.target.value)))}
                  placeholder="0 = ללא הגבלה"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">גבול עליון לכמות המשתמשים בארגון</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  מודולים מותרים
                  <span className="font-normal text-slate-400 mr-1">(ריק = הכל מותר)</span>
                </label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1.5">
                  {ALL_MODULES.map(m => (
                    <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newAllowedModules.includes(m)}
                        onChange={e => {
                          if (e.target.checked) {
                            setNewAllowedModules(prev => [...prev, m]);
                          } else {
                            setNewAllowedModules(prev => prev.filter(x => x !== m));
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-slate-700">{MODULE_LABELS[m]}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">אם מסומן — רק מודולים אלה נגישים לארגון</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm"
            >              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {creating ? 'יוצר...' : 'צור קופון'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Coupons List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-slate-400" />
          <span className="mr-2 text-sm text-slate-500">טוען קופונים...</span>
        </div>
      ) : coupons.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Tag size={40} className="mx-auto text-slate-300 mb-4" />
          <div className="text-lg font-black text-slate-400">אין קופונים עדיין</div>
          <div className="text-sm text-slate-400 mt-1">לחץ על &quot;צור קופון חדש&quot; כדי להתחיל</div>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map(c => {
            const isActive = c.status === 'active';
            const isExpired = c.endsAt ? new Date(c.endsAt) < new Date() : false;
            const isMaxed = c.maxRedemptionsTotal ? c.currentRedemptions >= c.maxRedemptionsTotal : false;

            return (
              <div
                key={c.id}
                className={`rounded-2xl border bg-white p-5 transition-all ${
                  isActive && !isExpired && !isMaxed
                    ? 'border-emerald-200 shadow-sm'
                    : 'border-slate-200 opacity-75'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive && !isExpired ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Tag size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 text-sm tracking-wider" dir="ltr">
                          ****{c.codeLast4 || '????'}
                        </span>
                        {c.codeLast4 && (
                          <button onClick={() => copyCode(c.codeLast4!)} className="text-slate-400 hover:text-slate-600">
                            <Copy size={12} />
                          </button>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive && !isExpired && !isMaxed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isExpired
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : isMaxed
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {isExpired ? 'פג תוקף' : isMaxed ? 'מיצה מימושים' : isActive ? 'פעיל' : 'מושבת'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {c.name || 'ללא שם'}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Stats */}
                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      {c.discountType === 'PERCENT' ? <Percent size={13} /> : <DollarSign size={13} />}
                      <span className="font-bold">{discountLabel(c)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users size={13} />
                      <span className="font-bold">{c.currentRedemptions}{c.maxRedemptionsTotal ? `/${c.maxRedemptionsTotal}` : ''}</span>
                    </div>
                    {c.endsAt && (
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} />
                        <span className="font-bold">{formatDate(c.endsAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(c.id, c.status)}
                      disabled={actionLoading === c.id}
                      className={`p-2 rounded-lg transition-colors ${
                        isActive
                          ? 'text-emerald-600 hover:bg-emerald-50'
                          : 'text-slate-400 hover:bg-slate-50'
                      }`}
                      title={isActive ? 'השבת קופון' : 'הפעל קופון'}
                    >
                      {actionLoading === c.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : isActive ? (
                        <ToggleRight size={18} />
                      ) : (
                        <ToggleLeft size={18} />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={actionLoading === c.id}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="מחק קופון"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {((c.maxUsers != null && c.maxUsers > 0) || c.allowedModules.length > 0) && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    {c.maxUsers != null && c.maxUsers > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Users size={10} />
                        עד {c.maxUsers} משתמשים
                      </span>
                    )}
                    {c.allowedModules.length > 0 && (
                      <>
                        <span className="inline-flex items-center gap-1 px-1.5 py-1 text-[11px] text-slate-400">
                          <Layers size={10} />
                          מודולים:
                        </span>
                        {c.allowedModules.map(m => (
                          <span key={m} className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {MODULE_LABELS[m] || m}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info Panel */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-xs text-slate-500 space-y-2">
        <div className="font-bold text-slate-700 text-sm">איך קופונים עובדים</div>
        <ul className="space-y-1.5 list-disc list-inside">
          <li><strong>יצירת קופון:</strong> בחר קוד, סוג הנחה ותנאים. הקוד נשמר מוצפן.</li>
          <li><strong>הפצה:</strong> שתף את הקוד עם לקוחות או שותפים. הם מזינים אותו בעמוד הצ&apos;קאוט.</li>
          <li><strong>מימוש:</strong> בצ&apos;קאוט, המערכת מוודאת תוקף ומחילה הנחה אוטומטית.</li>
          <li><strong>שותפים:</strong> צור קוד ייעודי לכל שותף (למשל: <span dir="ltr" className="font-mono">ROECOH10</span>) ועקוב אחר מימושים.</li>
          <li><strong>הגבלת משתמשים:</strong> הגדר מקסימום משתמשים לארגון — יחויב גם בהרשמה וגם בהוספת עובדים חדשים.</li>
          <li><strong>הגבלת מודולים:</strong> בחר אילו מודולים נגישים לארגון — שאר המודולים יחסמו אוטומטית בזמן אמת.</li>
          <li><strong>ביטול:</strong> השבת קופון כדי למנוע מימוש חדש (מימושים קיימים נשמרים).</li>
        </ul>
      </div>
    </div>
  );
}
