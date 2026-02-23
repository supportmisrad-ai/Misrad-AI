'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Network, Users, Link, DollarSign, Trophy, Copy,
  TrendingUp, UserPlus, Wallet, Percent, CircleCheck,
  X, Loader2, Trash2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  getSystemPartners,
  createSystemPartner,
  markPartnerPaid,
  deleteSystemPartner,
  type SystemPartnerRow,
} from '@/app/actions/system-partners';

function CrownIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-yellow-400 fill-yellow-400">
      <path d="M2 4l3 12h14l3-12-6 7-4-13-4 13-6-7zm3 16h14v2H5v-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PartnersView: React.FC = () => {
  const [partners, setPartners] = useState<SystemPartnerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newPartner, setNewPartner] = useState({ name: '', type: 'affiliate', commissionRate: 10 });
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getSystemPartners();
      if (res.success && res.data) setPartners(res.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newPartner.name.trim()) return;
    setIsCreating(true);
    try {
      const res = await createSystemPartner(newPartner);
      if (res.success) {
        showToast('שותף נוצר בהצלחה');
        setShowInviteModal(false);
        setNewPartner({ name: '', type: 'affiliate', commissionRate: 10 });
        await load();
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handlePay = async (id: string) => {
    const res = await markPartnerPaid(id);
    if (res.success) {
      showToast('תשלום עמלה סומן כבוצע');
      await load();
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deleteSystemPartner(id);
    if (res.success) {
      showToast('שותף נמחק');
      await load();
    }
  };

  const copyLink = (id: string) => {
    const link = `https://misrad-ai.com/subscribe/checkout?ref=${id}`;
    navigator.clipboard.writeText(link);
    showToast('קישור שותף הועתק ללוח');
  };

  const filtered = partners.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = partners.reduce((s, p) => s + p.revenue, 0);
  const totalCommissions = partners.reduce((s, p) => s + (p.revenue * p.commissionRate / 100), 0);
  const totalPending = partners.reduce((s, p) => s + p.unpaidCommission, 0);

  return (
    <div className="p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20 space-y-8" dir="rtl">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Network className="text-violet-600" strokeWidth={2.5} />
            שותפים
          </h2>
          <p className="text-sm text-slate-500 mt-1">ניהול תוכנית שותפים, הפניות ועמלות</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-gradient-to-br from-violet-600 to-purple-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-violet-200 hover:shadow-xl transition-all flex items-center gap-2 hover:-translate-y-0.5"
        >
          <UserPlus size={18} />
          צור שותף חדש
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-3xl p-6 bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-lg shadow-violet-200 border-none">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm"><TrendingUp size={24} /></div>
            <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-lg">סה&quot;כ הכנסות</span>
          </div>
          <h3 className="text-3xl font-black">₪{totalRevenue.toLocaleString()}</h3>
          <p className="text-violet-200 text-xs font-medium mt-1">הכנסות שנוצרו משותפים</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100"><Wallet size={24} /></div>
            <span className="text-xs font-bold text-slate-400 uppercase">עמלות ששולמו</span>
          </div>
          <h3 className="text-3xl font-black text-slate-800">₪{Math.max(0, totalCommissions - totalPending).toLocaleString()}</h3>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: totalCommissions > 0 ? `${Math.min(100, ((totalCommissions - totalPending) / totalCommissions) * 100)}%` : '0%' }} />
          </div>
        </div>
        <div className="rounded-3xl border-amber-200 bg-amber-50/50 border p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl border border-amber-200"><DollarSign size={24} /></div>
            <span className="text-xs font-bold text-amber-700 uppercase bg-amber-100 px-2 py-1 rounded-lg">לתשלום</span>
          </div>
          <h3 className="text-3xl font-black text-slate-800">₪{totalPending.toLocaleString()}</h3>
          <p className="text-slate-500 text-xs font-medium mt-1">ממתין להעברה</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Partners List */}
          <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white flex flex-col overflow-hidden min-h-[400px] shadow-sm">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-slate-400" />
                <h3 className="font-bold text-slate-800 text-lg">רשימת השותפים</h3>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">{partners.length}</span>
              </div>
              <input
                type="text"
                placeholder="חיפוש..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-4 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all w-48"
              />
            </div>
            <div className="overflow-x-auto flex-1">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Network size={40} className="text-slate-300 mb-3" />
                  <p className="text-slate-500 font-bold">{partners.length === 0 ? 'אין שותפים עדיין' : 'לא נמצאו תוצאות'}</p>
                  <p className="text-slate-400 text-xs mt-1">לחץ &quot;צור שותף חדש&quot; כדי להתחיל</p>
                </div>
              ) : (
                <table className="w-full text-sm text-right">
                  <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">שם השותף</th>
                      <th className="px-6 py-4">הפניות</th>
                      <th className="px-6 py-4">הכנסות</th>
                      <th className="px-6 py-4">עמלה</th>
                      <th className="px-6 py-4">יתרה לתשלום</th>
                      <th className="px-6 py-4 text-center">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((partner) => (
                      <tr key={partner.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-xs border border-violet-100">
                              {partner.name.split(/\s+/).map(w => w.charAt(0)).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{partner.name}</div>
                              <div className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-0.5">
                                {partner.type === 'customer' ? 'לקוח ממליץ' : partner.type === 'influencer' ? 'משפיען' : 'שותף עסקי'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">{partner.referrals}</td>
                        <td className="px-6 py-4 text-slate-600 font-mono">₪{partner.revenue.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-1 rounded-lg w-fit font-bold text-xs">
                            <Percent size={10} /> {partner.commissionRate}%
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {partner.unpaidCommission > 0 ? (
                            <span className="text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                              ₪{partner.unpaidCommission.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                              <CircleCheck size={12} /> שולם
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => copyLink(partner.id)}
                              className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 hover:text-violet-600 transition-colors"
                              title="העתק קישור שותף"
                            >
                              <Link size={16} />
                            </button>
                            {partner.unpaidCommission > 0 && (
                              <button
                                onClick={() => handlePay(partner.id)}
                                className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors"
                                title="סמן כשולם"
                              >
                                <DollarSign size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(partner.id)}
                              className="p-2 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                              title="מחק שותף"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Sidebar: Leaderboard */}
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-6 relative z-10 text-yellow-400">
                <Trophy size={20} fill="currentColor" />
                <h3 className="font-bold text-lg uppercase tracking-wider">טבלת המובילים</h3>
              </div>
              <div className="space-y-4 relative z-10">
                {[...partners].sort((a, b) => b.revenue - a.revenue).slice(0, 3).map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-4 bg-white/10 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
                    <div className={`w-8 h-8 flex items-center justify-center font-bold rounded-lg text-slate-900 ${
                      idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-slate-300' : 'bg-orange-400'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{p.name}</div>
                      <div className="text-[10px] text-white/60">גייס: ₪{p.revenue.toLocaleString()}</div>
                    </div>
                    {idx === 0 && <CrownIcon />}
                  </div>
                ))}
                {partners.length === 0 && (
                  <p className="text-white/40 text-sm text-center py-4">אין שותפים עדיין</p>
                )}
              </div>
            </div>

            {/* Quick Copy Link */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Copy size={16} className="text-violet-500" />
                קישור הפניה
              </h3>
              <p className="text-xs text-slate-500 mb-3">שתף קישור הפניה כללי שמוביל לדף הרישום:</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('https://misrad-ai.com/subscribe/checkout');
                  showToast('קישור הועתק');
                }}
                className="w-full flex items-center justify-center gap-2 bg-violet-50 text-violet-700 px-4 py-3 rounded-xl text-sm font-bold border border-violet-100 hover:bg-violet-100 transition-colors"
              >
                <Copy size={14} />
                העתק קישור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Partner Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInviteModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 md:inset-auto md:top-[15%] md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-[201] bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 md:p-8"
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">שותף חדש</h3>
                    <p className="text-xs text-slate-500">הוסף שותף לתוכנית</p>
                  </div>
                </div>
                <button onClick={() => setShowInviteModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">שם השותף</label>
                  <input
                    value={newPartner.name}
                    onChange={(e) => setNewPartner((p) => ({ ...p, name: e.target.value }))}
                    placeholder="שם מלא"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">סוג שותף</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'affiliate', label: 'שותף עסקי' },
                      { id: 'customer', label: 'לקוח ממליץ' },
                      { id: 'influencer', label: 'משפיען' },
                    ] as const).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setNewPartner((p) => ({ ...p, type: t.id }))}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                          newPartner.type === t.id
                            ? 'bg-violet-50 border-violet-300 text-violet-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">אחוז עמלה</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newPartner.commissionRate}
                    onChange={(e) => setNewPartner((p) => ({ ...p, commissionRate: Number(e.target.value) || 0 }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={isCreating || !newPartner.name.trim()}
                className="w-full mt-6 bg-gradient-to-br from-violet-600 to-purple-700 text-white font-black py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isCreating ? 'יוצר...' : 'צור שותף'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PartnersView;
