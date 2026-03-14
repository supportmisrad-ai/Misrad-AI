'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Network,
  Plus,
  Copy,
  Check,
  Users,
  DollarSign,
  TrendingUp,
  Search,
  Building2,
  Loader2,
  Link2,
  BarChart3,
  Calendar,
  Gift,
  Wallet,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

type PartnerRow = {
  id: string;
  name: string;
  referralCode: string;
  createdAt: string | null;
  orgsCount: number;
  paidRevenue: number;
  paidOrders: number;
  commissionRate: number;
  unpaidCommission: number;
  totalEarned: number;
  email?: string | null;
  phone?: string | null;
  status: string;
};

type MonthlyStats = {
  month: string;
  referrals: number;
  revenue: number;
  commissions: number;
};

export default function AdminPartnersClient() {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);

  // New partner form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Monthly stats
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const loadPartners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/partners');
      if (!res.ok) throw new Error('שגיאה בטעינת שותפים');
      const json = await res.json();
      setPartners(json.partners || []);
      setMonthlyStats(json.monthlyStats || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת שותפים');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPartners();
  }, [loadPartners]);

  const handleCopyCode = (code: string) => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${code}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyLink = (code: string, page: string = 'signup') => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/${page}?ref=${code}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedCode(`${code}-${page}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleAddPartner = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          referralCode: newCode.trim() || undefined,
          email: newEmail.trim() || undefined,
          phone: newPhone.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'שגיאה ביצירת שותף');
      }
      setNewName('');
      setNewCode('');
      setNewEmail('');
      setNewPhone('');
      setShowAddForm(false);
      void loadPartners();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה ביצירת שותף');
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = partners.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.referralCode.toLowerCase().includes(search.toLowerCase())
  );

  const totalOrgs = partners.reduce((s, p) => s + p.orgsCount, 0);
  const totalRevenue = partners.reduce((s, p) => s + p.paidRevenue, 0);
  const totalCommission = partners.reduce((s, p) => s + p.unpaidCommission, 0);
  const totalEarned = partners.reduce((s, p) => s + p.totalEarned, 0);

  // Calculate commission for a partner
  const calculateCommission = (partner: PartnerRow) => {
    // 10% of revenue
    const monthlyCommission = Math.round(partner.paidRevenue * 0.1);
    // Bonus: 150₪ per org after 3 months (simplified)
    const bonus = Math.round(partner.orgsCount * 150 * 0.3); // ~30% reach 3 months
    return {
      monthly: monthlyCommission,
      bonus,
      total: monthlyCommission + bonus,
    };
  };

  return (
    <div className="p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <Network className="text-slate-700" strokeWidth={2} />
            ניהול שותפים והפניות
          </h2>
          <p className="text-sm text-slate-500 mt-1">פאנל סופר אדמין - ניהול תוכנית שותפים, עמלות ותשלומים</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-2xl text-sm font-black shadow-lg shadow-slate-900/20 transition-all inline-flex items-center gap-2"
        >
          <Plus size={16} /> שותף חדש
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Users size={18} className="text-slate-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{partners.length}</div>
          <div className="text-xs text-slate-500 font-bold mt-1">שותפים פעילים</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Building2 size={18} className="text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalOrgs}</div>
          <div className="text-xs text-slate-500 font-bold mt-1">ארגונים מופנים</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <BarChart3 size={18} className="text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono" dir="ltr">
            {totalRevenue > 0 ? `₪${totalRevenue.toLocaleString()}` : '₪0'}
          </div>
          <div className="text-xs text-slate-500 font-bold mt-1">הכנסות מהפניות</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Wallet size={18} className="text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono" dir="ltr">
            {totalCommission > 0 ? `₪${totalCommission.toLocaleString()}` : '₪0'}
          </div>
          <div className="text-xs text-slate-500 font-bold mt-1">עמלות לתשלום</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Gift size={18} className="text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-green-700 font-mono" dir="ltr">
            {totalEarned > 0 ? `₪${totalEarned.toLocaleString()}` : '₪0'}
          </div>
          <div className="text-xs text-slate-500 font-bold mt-1">סה״כ שולם</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="חיפוש שותף או קוד..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-2xl pr-11 pl-4 py-3.5 text-sm focus:ring-4 focus:ring-slate-100 focus:border-slate-300 outline-none"
        />
      </div>

      {/* Add Partner Form */}
      {showAddForm && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 mb-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">הוספת שותף חדש</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">שם השותף *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="שם מלא / חברה"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">קוד הפניה (אופציונלי)</label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200 font-mono"
                dir="ltr"
                placeholder="DANIEL123"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">אימייל</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="partner@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">טלפון</label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="050-123-4567"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              ביטול
            </button>
            <button
              onClick={() => void handleAddPartner()}
              disabled={!newName.trim() || isSaving}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'הוסף שותף'}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 text-sm text-red-700 font-bold">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Network size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-500 font-bold">
            {partners.length === 0 ? 'אין שותפים עדיין. הוסף את השותף הראשון!' : 'לא נמצאו תוצאות'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((partner) => {
            const commission = calculateCommission(partner);
            const isExpanded = expandedPartner === partner.id;

            return (
              <div
                key={partner.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Main Row */}
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg">
                        {partner.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-lg">{partner.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span className="font-mono font-bold">{partner.referralCode}</span>
                          {partner.createdAt && (
                            <span>• {new Date(partner.createdAt).toLocaleDateString('he-IL')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Quick Stats */}
                      <div className="hidden md:flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-black text-slate-900">{partner.orgsCount}</div>
                          <div className="text-[10px] text-slate-500 font-bold">הפניות</div>
                        </div>
                        <div className="text-center">
                          <div className="font-black text-emerald-700 font-mono" dir="ltr">
                            ₪{partner.paidRevenue.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold">הכנסות</div>
                        </div>
                        <div className="text-center">
                          <div className="font-black text-amber-700 font-mono" dir="ltr">
                            ₪{commission.total.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold">עמלה</div>
                        </div>
                      </div>

                      {/* Expand Button */}
                      <button
                        onClick={() => setExpandedPartner(isExpanded ? null : partner.id)}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
                      >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Referral Links */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleCopyLink(partner.referralCode, 'signup')}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
                    >
                      {copiedCode === `${partner.referralCode}-signup` ? (
                        <Check size={12} className="text-emerald-600" />
                      ) : (
                        <Link2 size={12} />
                      )}
                      לינק הרשמה
                    </button>
                    <button
                      onClick={() => handleCopyLink(partner.referralCode, 'pricing')}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
                    >
                      {copiedCode === `${partner.referralCode}-pricing` ? (
                        <Check size={12} className="text-emerald-600" />
                      ) : (
                        <Link2 size={12} />
                      )}
                      לינק חבילות
                    </button>
                    <button
                      onClick={() => handleCopyCode(partner.referralCode)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-700 transition-colors"
                    >
                      {copiedCode === partner.referralCode ? (
                        <Check size={12} className="text-emerald-600" />
                      ) : (
                        <Copy size={12} />
                      )}
                      העתק לינק מלא
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50 p-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Commission Breakdown */}
                      <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <div className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-2">
                          <Wallet size={14} /> חישוב עמלות
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600">עמלה חודשית (10%)</span>
                            <span className="font-bold font-mono" dir="ltr">₪{commission.monthly.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">בונוס משוער</span>
                            <span className="font-bold font-mono text-green-700" dir="ltr">₪{commission.bonus.toLocaleString()}</span>
                          </div>
                          <div className="border-t border-slate-200 pt-2 flex justify-between">
                            <span className="font-bold text-slate-900">סה״כ לתשלום</span>
                            <span className="font-black text-amber-700 font-mono" dir="ltr">₪{commission.total.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <div className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-2">
                          <BarChart3 size={14} /> סטטיסטיקה
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600">הפניות</span>
                            <span className="font-bold">{partner.orgsCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">הזמנות ששולמו</span>
                            <span className="font-bold">{partner.paidOrders}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">הכנסות</span>
                            <span className="font-bold font-mono" dir="ltr">₪{partner.paidRevenue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">שולם עד כה</span>
                            <span className="font-bold font-mono text-green-700" dir="ltr">₪{partner.totalEarned.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <div className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-2">
                          <Users size={14} /> פרטי קשר
                        </div>
                        <div className="space-y-2 text-sm">
                          {partner.email && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-600">אימייל:</span>
                              <a href={`mailto:${partner.email}`} className="text-indigo-600 hover:underline">
                                {partner.email}
                              </a>
                            </div>
                          )}
                          {partner.phone && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-600">טלפון:</span>
                              <a href={`tel:${partner.phone}`} className="text-indigo-600 hover:underline" dir="ltr">
                                {partner.phone}
                              </a>
                            </div>
                          )}
                          {!partner.email && !partner.phone && (
                            <div className="text-slate-400 text-xs">אין פרטי קשר</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-3">
                      <a
                        href={`/w/${partner.referralCode.toLowerCase()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
                      >
                        <ExternalLink size={14} />
                        צפה בארגונים
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
