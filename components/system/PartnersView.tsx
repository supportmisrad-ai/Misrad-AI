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
  ExternalLink,
  Loader2,
  Link2,
  BarChart3,
} from 'lucide-react';

type PartnerRow = {
  id: string;
  name: string;
  referralCode: string;
  createdAt: string | null;
  orgsCount: number;
  paidRevenue: number;
  paidOrders: number;
};

interface PartnersViewProps {
  orgSlug?: string;
}

const PartnersView: React.FC<PartnersViewProps> = ({ orgSlug }) => {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // New partner form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadPartners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${orgSlug}/partners`);
      if (!res.ok) throw new Error('שגיאה בטעינת שותפים');
      const json = await res.json();
      setPartners(json.partners || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת שותפים');
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    if (orgSlug) void loadPartners();
    else setLoading(false);
  }, [orgSlug, loadPartners]);

  const handleCopyCode = (code: string) => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${code}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleAddPartner = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${orgSlug}/partners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), referralCode: newCode.trim() || undefined }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'שגיאה ביצירת שותף');
      }
      setNewName('');
      setNewCode('');
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
  const totalOrders = partners.reduce((s, p) => s + p.paidOrders, 0);

  return (
    <div className="p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <Network className="text-slate-700" strokeWidth={2} />
            שותפים והפניות
          </h2>
          <p className="text-sm text-slate-500 mt-1">ניהול תוכנית שותפים, קודי הפניה ועמלות</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-2xl text-sm font-black shadow-lg shadow-slate-900/20 transition-all inline-flex items-center gap-2"
        >
          <Plus size={16} /> שותף חדש
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
          <div className="text-2xl font-black text-slate-900">{totalOrders}</div>
          <div className="text-xs text-slate-500 font-bold mt-1">הזמנות ששולמו</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <DollarSign size={18} className="text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono" dir="ltr">
            {totalRevenue > 0 ? `${totalRevenue.toLocaleString()}` : '0'}
          </div>
          <div className="text-xs text-slate-500 font-bold mt-1">הכנסות מהפניות</div>
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
              <label className="text-xs font-bold text-slate-600 mb-1 block">שם השותף</label>
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
                placeholder="PARTNER2024"
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((partner) => (
            <div
              key={partner.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg">
                    {partner.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{partner.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {partner.createdAt
                        ? new Date(partner.createdAt).toLocaleDateString('he-IL')
                        : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* Referral Code */}
              <div className="bg-slate-50 rounded-xl p-3 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link2 size={14} className="text-slate-400" />
                  <span className="text-sm font-mono font-bold text-slate-700" dir="ltr">
                    {partner.referralCode}
                  </span>
                </div>
                <button
                  onClick={() => handleCopyCode(partner.referralCode)}
                  className="p-2 rounded-lg hover:bg-white transition-colors text-slate-500"
                  title="העתק קישור הפניה"
                >
                  {copiedCode === partner.referralCode ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-lg font-black text-slate-900">{partner.orgsCount}</div>
                  <div className="text-[10px] text-slate-500 font-bold">ארגונים</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-black text-slate-900">{partner.paidOrders}</div>
                  <div className="text-[10px] text-slate-500 font-bold">הזמנות</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-black text-emerald-700 font-mono" dir="ltr">
                    {partner.paidRevenue > 0 ? partner.paidRevenue.toLocaleString() : '0'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">הכנסות</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PartnersView;
