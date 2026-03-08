'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Megaphone, TrendingUp, Target, DollarSign, ExternalLink, Pause, Play, Edit3, ArrowRight } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Client } from '@/types/social';
import EditCampaignModal from './modals/EditCampaignModal';
import { getCampaigns, updateCampaign, type Campaign } from '@/app/actions/campaigns';
import { translateError } from '@/lib/errorTranslations';
import { Avatar } from '@/components/Avatar';
import { SkeletonGrid } from '@/components/ui/skeletons';

export default function Campaigns() {
  const { clients, setIsCampaignWizardOpen, addToast, orgSlug } = useApp();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load campaigns on mount
  useEffect(() => {
    loadCampaigns();
  }, [orgSlug]);

  const loadCampaigns = async () => {
    if (!orgSlug) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const result = await getCampaigns(undefined, orgSlug);
    if (result.success && result.data) {
      setCampaigns(result.data);
    } else {
      const errorMsg = result.error ? translateError(result.error) : 'שגיאה בטעינת קמפיינים';
      addToast(errorMsg, 'error');
    }
    setIsLoading(false);
  };

  const toggleStatus = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const campaign = campaigns.find(c => c.id === id);
    if (!campaign || !orgSlug) return;

    const nextStatus = campaign.status === 'active' ? 'paused' : 'active';
    const result = await updateCampaign({ orgSlug, campaignId: id, updates: { status: nextStatus } });
    
    if (result.success) {
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: nextStatus } : c));
      addToast(`קמפיין "${campaign.name}" הועבר למצב ${nextStatus === 'active' ? 'פעיל' : 'מושהה'}`);
    } else {
      const errorMsg = result.error ? translateError(result.error) : 'שגיאה בעדכון סטטוס הקמפיין';
      addToast(errorMsg, 'error');
    }
  };

  const handleUpdateCampaign = async (updatedCampaign: Campaign) => {
    if (!orgSlug) return;
    const result = await updateCampaign({ 
      orgSlug, 
      campaignId: updatedCampaign.id, 
      updates: {
        name: updatedCampaign.name,
        status: updatedCampaign.status,
        objective: updatedCampaign.objective,
        budget: updatedCampaign.budget
      }
    });
    if (result.success) {
      setCampaigns(prev => prev.map(c => c.id === updatedCampaign.id ? updatedCampaign : c));
      addToast('הגדרות הקמפיין עודכנו בהצלחה ✨');
    } else {
      const errorMsg = result.error ? translateError(result.error) : 'שגיאה בעדכון הקמפיין';
      addToast(errorMsg, 'error');
    }
  };

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  if (selectedCampaignId && selectedCampaign) {
    const client = clients.find(c => c.id === selectedCampaign.clientId);
    return (
      <div className="max-w-7xl mx-auto flex flex-col gap-10 pb-20 animate-in slide-in-from-left duration-500">
         <EditCampaignModal 
            isOpen={isEditModalOpen} 
            onClose={() => setIsEditModalOpen(false)} 
            campaign={selectedCampaign as unknown as Parameters<typeof EditCampaignModal>[0]['campaign']} 
            clients={clients as Client[]} 
            onUpdate={handleUpdateCampaign as (updatedCampaign: unknown) => void} 
         />
         
         <button onClick={() => setSelectedCampaignId(null)} className="flex items-center gap-3 text-slate-400 font-black text-sm hover:text-slate-900 transition-all self-start">
            <ArrowRight size={20}/> חזרה לכל הקמפיינים
         </button>
         
         <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-6">
               <Avatar
                  src={String(client?.avatar || '')}
                  name={String(client?.companyName || client?.name || '')}
                  alt={String(client?.companyName || '')}
                  size="xl"
                  rounded="3xl"
                  className="w-24 h-24 shadow-xl"
               />
               <div>
                  <h2 className="text-4xl font-black text-slate-800">{selectedCampaign.name}</h2>
                  <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest">{client?.companyName} • מזהה קמפיין: {selectedCampaign.id}</p>
               </div>
            </div>
            <div className="flex gap-4">
               <button onClick={() => setIsEditModalOpen(true)} className="bg-slate-100 px-8 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all flex items-center gap-2">
                  <Edit3 size={18} /> ערוך הגדרות
               </button>
               <button onClick={(e) => toggleStatus(selectedCampaign.id, e)} className={`px-8 py-4 rounded-2xl font-black text-sm text-white shadow-xl transition-all ${selectedCampaign.status === 'active' ? 'bg-red-500 shadow-red-100' : 'bg-green-600 shadow-green-100'}`}>
                  {selectedCampaign.status === 'active' ? 'השהה קמפיין' : 'הפעל קמפיין'}
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'חשיפה', val: (selectedCampaign.impressions || 0).toLocaleString(), sub: 'אנשים ייחודיים' },
              { label: 'קליקים', val: (selectedCampaign.clicks || 0).toLocaleString(), sub: 'CTR: 2.7%' },
              { label: 'תקציב שנוצל', val: `₪${selectedCampaign.spent.toLocaleString()}`, sub: `מתוך ₪${selectedCampaign.budget.toLocaleString()}` },
              { label: 'ROAS', val: `${selectedCampaign.roas}x`, sub: 'החזר על הוצאה' },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-10 rounded-[44px] border border-slate-100 shadow-sm">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
                 <p className="text-3xl font-black text-slate-800">{stat.val}</p>
                 <p className="text-[11px] font-bold text-slate-400 mt-2">{stat.sub}</p>
              </div>
            ))}
         </div>

         <div className="bg-white p-10 rounded-[56px] border border-slate-100 shadow-xl min-h-[400px] flex flex-col">
            <h3 className="text-2xl font-black mb-10">ביצועים יומיים</h3>
            <div className="flex-1 flex items-end gap-2">
               {(() => {
                 const total = selectedCampaign.spent || 0;
                 const days = 14;
                 const bars = Array.from({ length: days }, (_, i) => {
                   const base = total > 0 ? Math.round((total / days) * (0.5 + Math.sin(i * 0.7) * 0.5)) : 0;
                   return base;
                 });
                 const maxBar = Math.max(...bars, 1);
                 return bars.map((val, i) => {
                   const h = Math.max(5, Math.round((val / maxBar) * 100));
                   return (
                     <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-slate-900/10 hover:bg-slate-900 transition-all rounded-t-xl group relative cursor-pointer">
                       <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100">₪{val.toLocaleString()}</div>
                     </div>
                   );
                 });
               })()}
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-10 pb-20 animate-in fade-in">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">קמפיינים ממומנים</h2>
          <p className="text-slate-500 font-bold mt-1">נהל את תקציבי הפרסום של הלקוחות שלך במקום אחד</p>
        </div>
        <button 
          onClick={() => setIsCampaignWizardOpen(true)}
          className="bg-slate-900 text-white px-10 py-5 rounded-[24px] font-black shadow-2xl shadow-slate-200 active:scale-95 transition-all flex items-center gap-3"
        >
          <Plus size={24} /> קמפיין חדש
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm flex items-center gap-6">
           <div className="w-16 h-16 bg-slate-50 text-slate-900 rounded-[20px] flex items-center justify-center"><DollarSign size={32}/></div>
           <div><p className="text-3xl font-black">₪{campaigns.reduce((a, b) => a + b.spent, 0).toLocaleString()}</p><p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">הוצאה חודשית</p></div>
        </div>
        <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm flex items-center gap-6">
           <div className="w-16 h-16 bg-green-50 text-green-600 rounded-[20px] flex items-center justify-center"><TrendingUp size={32}/></div>
           <div><p className="text-3xl font-black">{campaigns.length > 0 ? `${(campaigns.reduce((a, b) => a + b.roas, 0) / campaigns.length).toFixed(1)}x` : '—'}</p><p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">ROAS ממוצע</p></div>
        </div>
        <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm flex items-center gap-6">
           <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-[20px] flex items-center justify-center"><Target size={32}/></div>
           <div><p className="text-3xl font-black">{campaigns.filter(c => c.status === 'active').length}</p><p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">קמפיינים פעילים</p></div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-10">
          <SkeletonGrid cards={6} columns={3} />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white p-20 rounded-[48px] border border-slate-200 text-center">
          <p className="text-xl font-black text-slate-400 mb-4">אין קמפיינים במערכת</p>
          <p className="text-sm font-bold text-slate-300">צור קמפיין ראשון כדי להתחיל</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {campaigns.map(camp => {
            const client = clients.find(c => c.id === camp.clientId);
            return (
              <div key={camp.id} onClick={() => setSelectedCampaignId(camp.id)} className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-10 items-center group hover:shadow-2xl transition-all cursor-pointer">
                <div className="flex items-center gap-6 w-full md:w-1/3">
                  <Avatar
                    src={String(client?.avatar || '')}
                    name={String(client?.companyName || client?.name || '')}
                    alt={String(client?.companyName || '')}
                    size="xl"
                    rounded="3xl"
                    className="w-20 h-20 shadow-xl group-hover:scale-105 transition-transform"
                  />
                  <div>
                    <p className="font-black text-2xl text-slate-800">{camp.name}</p>
                    <p className="text-xs font-black text-slate-900 uppercase tracking-widest mt-1">{client?.companyName}</p>
                  </div>
                </div>
                <div className="flex-1 w-full flex justify-around items-center">
                   <div className="text-center"><p className="text-[10px] font-black text-slate-300 uppercase mb-2">סטטוס</p><span className={`px-5 py-2 rounded-full font-black text-[10px] uppercase ${camp.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>{camp.status === 'active' ? 'פעיל' : 'מושהה'}</span></div>
                   <div className="text-center"><p className="text-[10px] font-black text-slate-300 uppercase mb-2">נוצל</p><p className="text-xl font-black">₪{camp.spent.toLocaleString()}</p></div>
                   <div className="text-center"><p className="text-[10px] font-black text-slate-300 uppercase mb-2">ROAS</p><p className="text-xl font-black text-slate-900">{camp.roas}x</p></div>
                </div>
                <div className="flex gap-4">
                   <button onClick={(e) => toggleStatus(camp.id, e)} className="w-16 h-16 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-[24px] flex items-center justify-center active:scale-95 transition-all shadow-sm">{camp.status === 'active' ? <Pause size={28}/> : <Play size={28}/>}</button>
                   <button className="px-10 py-5 bg-slate-100 text-slate-900 font-black rounded-[24px] hover:bg-slate-900 hover:text-white transition-all shadow-sm">צפה בביצועים</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
