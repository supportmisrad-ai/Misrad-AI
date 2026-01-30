'use client';

import React, { useState } from 'react';
import { ShieldAlert, DollarSign, MessageCircle, Mail, Zap, Lock, ArrowUpRight, Phone } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Avatar } from '@/components/Avatar';

export default function CollectionCockpit() {
  const { clients, setIsPaymentModalOpen, setActiveClientId, addToast } = useApp();
  const [isSyncing, setIsSyncing] = useState(false);
  const overdueClients = clients.filter(c => c.paymentStatus === 'overdue' || (c.businessMetrics.daysOverdue && c.businessMetrics.daysOverdue > 0));
  
  const totalDebt = overdueClients.reduce((sum, c) => sum + (c.nextPaymentAmount || 0), 0);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // TODO: Implement real Morning API sync
      // This is a placeholder - needs actual API integration
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsSyncing(false);
      addToast('תכונה בפיתוח - סנכרון אוטומטי עם מורנינג יושם בקרוב', 'info');
    } catch (error) {
      setIsSyncing(false);
      addToast('שגיאה בסנכרון', 'error');
    }
  };

  const handleManualNudge = (client: typeof clients[0]) => {
    if (client.phone) {
      const text = encodeURIComponent(`היי ${client.name}, רציתי לוודא שהלינק לתשלום הגיע אליך. חשוב לנו להמשיך ברצף העבודה על הסושיאל שלך.`);
      window.open(`https://wa.me/972${client.phone.substring(1)}?text=${text}`, '_blank');
      addToast(`נפתחה תזכורת ב-WhatsApp עבור ${client.companyName}`, 'success');
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-10 pb-20 animate-in fade-in" dir="rtl">
      <section className="bg-gradient-to-r from-rose-500 via-rose-400 to-pink-500 p-8 md:p-10 rounded-3xl text-white shadow-lg relative overflow-hidden group">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/30 backdrop-blur-sm rounded-xl shadow-lg border border-white/40"><ShieldAlert size={20} className="text-white"/></div>
              <span className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-sm">מרכז גבייה ואוטומציה</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white drop-shadow-lg">ניהול סיכוני הכנסה</h2>
            <p className="text-sm md:text-base text-white font-bold leading-relaxed drop-shadow-md">
              נכון לעכשיו קיימים {overdueClients.length} לקוחות בפיגור תשלום. המערכת מפעילה חוקי אוטומציה כדי להגן על הרווחיות שלך.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="bg-white text-rose-600 px-6 py-3 rounded-xl font-black text-sm hover:bg-rose-50 transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <Zap size={18} className={isSyncing ? 'opacity-60' : undefined} />
                {isSyncing ? 'מסנכרן...' : 'סנכרן חשבוניות מורנינג'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/30 border border-white/40 p-6 rounded-2xl flex flex-col gap-2 backdrop-blur-sm shadow-lg">
              <p className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-sm">חוב מצטבר</p>
              <p className="text-2xl md:text-3xl font-black text-white drop-shadow-md">₪{totalDebt.toLocaleString()}</p>
            </div>
            <div className="bg-white/30 border border-white/40 p-6 rounded-2xl flex flex-col gap-2 backdrop-blur-sm shadow-lg">
              <p className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-sm">לקוחות בסיכון</p>
              <p className="text-2xl md:text-3xl font-black text-white drop-shadow-md">{overdueClients.length}</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </section>

      <div className="bg-white p-10 rounded-[56px] border border-slate-200 shadow-xl flex flex-col gap-8">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-2xl font-black">לקוחות בפיגור תשלום</h3>
        </div>

        <div className="flex flex-col gap-4">
          {overdueClients.map(client => {
            const days = client.businessMetrics.daysOverdue || 5;
            const isLocked = days >= 5;
            
            return (
              <div key={client.id} className={`p-8 rounded-[40px] border-2 transition-all flex flex-col md:flex-row items-center justify-between group hover:shadow-2xl ${isLocked ? 'border-red-100 bg-red-50/20' : 'border-slate-50 bg-white'}`}>
                <div className="flex items-center gap-6 md:w-1/3">
                  <div className="relative">
                    <Avatar
                      src={String(client.avatar || '')}
                      name={String(client.companyName || client.name || '')}
                      alt={String(client.companyName || '')}
                      size="lg"
                      rounded="2xl"
                      className="w-16 h-16 shadow-lg"
                    />
                    {isLocked && <div className="absolute -top-2 -right-2 bg-red-600 text-white p-1.5 rounded-full shadow-lg"><Lock size={14}/></div>}
                  </div>
                  <div>
                    <p className="font-black text-xl text-slate-800">{client.companyName}</p>
                    <p className="text-xs font-bold text-slate-400">פיגור של {days} ימים</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 md:w-1/3 justify-center">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">חוב פתוח</p>
                    <p className="text-2xl font-black text-red-600">₪{client.nextPaymentAmount?.toLocaleString() || 0}</p>
                  </div>
                </div>

                <div className="flex gap-3 md:w-1/3 justify-end">
                  <button onClick={() => handleManualNudge(client)} className="px-6 py-3 bg-green-50 text-green-600 rounded-xl font-black text-xs hover:bg-green-100 transition-all flex items-center gap-2">
                    <MessageCircle size={16}/> תזכורת וואטסאפ
                  </button>
                  <button onClick={() => { setActiveClientId(client.id); setIsPaymentModalOpen(true); }} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-all flex items-center gap-2">
                    <DollarSign size={16}/> צור לינק תשלום
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

