'use client';

import React, { useState, useRef, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Share2, MousePointer2, Calendar as CalendarIcon, Download, Loader2, CheckCircle, ChevronDown, X, Facebook, Instagram, Linkedin, Video, Globe, MessageCircle, Twitter, PinIcon, MessageSquare, Briefcase, DollarSign, Clock, AlertTriangle, Sparkles, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { SocialPlatform, Client } from '@/types/social';
import { getBusinessAuditAction } from '@/app/actions/ai-actions';
import { Avatar } from '@/components/Avatar';

const PLATFORM_ICONS: Record<SocialPlatform, any> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  tiktok: Video,
  twitter: Twitter,
  google: Globe,
  whatsapp: MessageCircle,
  threads: Share2,
  youtube: Video,
  pinterest: PinIcon,
  portal: MessageSquare
};

const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  facebook: 'text-blue-600',
  instagram: 'text-purple-600',
  linkedin: 'text-blue-800',
  tiktok: 'text-black',
  twitter: 'text-slate-900',
  google: 'text-slate-700',
  whatsapp: 'text-green-500',
  threads: 'text-slate-900',
  youtube: 'text-red-600',
  pinterest: 'text-red-700',
  portal: 'text-blue-500'
};

export default function Analytics() {
  const { clients, posts, setIsReportModalOpen, addToast } = useApp();
  const [activeTab, setActiveTab] = useState<'social' | 'business'>('social');
  const [period, setPeriod] = useState('30 ימים אחרונים');
  const [isExporting, setIsExporting] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<SocialPlatform>('instagram');
  const [chartData, setChartData] = useState([40, 60, 45, 90, 65, 80, 50, 70, 85, 40, 55, 75]);
  const [audits, setAudits] = useState<Record<string, string>>({});
  const [isLoadingAudit, setIsLoadingAudit] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsPeriodMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setIsReportModalOpen(true);
    }, 2000);
  };

  const runAudit = async (client: Client) => {
    setIsLoadingAudit(client.id);
    const result = await getBusinessAuditAction(client.id);
    setAudits(prev => ({ ...prev, [client.id]: result }));
    setIsLoadingAudit(null);
  };

  const changePeriod = (p: string) => {
    setPeriod(p);
    setChartData(prev => [...prev].sort(() => Math.random() - 0.5));
    setIsPeriodMenuOpen(false);
    addToast(`הנתונים עודכנו עבור: ${p}`);
  };

  const renderSocialView = () => (
    <div className="flex flex-col gap-8 animate-in fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'חשיפה כוללת', value: '452.1K', trend: '+12%', icon: Users, color: 'blue' },
          { label: 'מעורבות', value: '18.4K', trend: '+5%', icon: Share2, color: 'purple' },
          { label: 'קליקים', value: '5,230', trend: '-2%', icon: MousePointer2, color: 'orange' },
          { label: 'שיעור צמיחה', value: '4.2%', trend: '+0.8%', icon: TrendingUp, color: 'green' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col gap-6">
               <div className="flex items-center justify-between">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.color === 'blue' ? 'bg-blue-50 text-blue-600' : stat.color === 'purple' ? 'bg-purple-50 text-purple-600' : stat.color === 'orange' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                    <Icon size={28} />
                  </div>
                  <span className={`text-xs font-black px-3 py-1.5 rounded-xl ${stat.trend.startsWith('+') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{stat.trend}</span>
               </div>
               <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p><p className="text-4xl font-black mt-1">{stat.value}</p></div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm h-[450px] flex flex-col">
           <h3 className="font-black text-2xl mb-10">ביצועים לאורך זמן</h3>
           <div className="flex-1 flex items-end gap-3 px-2">
              {chartData.map((h, i) => (
                <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-blue-600/10 hover:bg-blue-600 transition-all rounded-t-2xl relative group cursor-pointer" />
              ))}
           </div>
        </div>

        <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm flex flex-col h-[450px]">
           <h3 className="font-black text-2xl mb-10 tracking-tight">פילוח לפי פלטפורמה</h3>
           <div className="flex flex-col gap-6 flex-1 overflow-y-auto no-scrollbar">
              {['facebook', 'instagram', 'tiktok', 'linkedin', 'google', 'whatsapp'].map((p, i) => {
                const Icon = PLATFORM_ICONS[p as SocialPlatform];
                const color = PLATFORM_COLORS[p as SocialPlatform];
                const value = Math.floor(Math.random() * 40) + 10;
                return Icon ? (
                  <div key={i} className="flex flex-col gap-3">
                     <div className="flex justify-between items-center text-base font-black">
                        <div className="flex items-center gap-3">
                           <Icon size={18} className={color}/>
                           <span className="text-slate-800 capitalize">{p}</span>
                        </div>
                        <span className="text-blue-600 font-black">{value}%</span>
                     </div>
                     <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden shadow-inner">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} className={`h-full ${(color || '').replace('text-', 'bg-')} rounded-full`} />
                     </div>
                  </div>
                ) : null;
              })}
           </div>
           <div className="mt-8 pt-8 border-t border-slate-200">
              <button onClick={() => setIsDetailModalOpen(true)} className="w-full py-5 bg-slate-50 text-blue-600 font-black text-sm hover:bg-blue-600 hover:text-white transition-all rounded-3xl">צפה בפירוט מלא</button>
           </div>
        </div>
      </div>
    </div>
  );

  const renderBusinessView = () => (
    <div className="flex flex-col gap-10 animate-in slide-in-from-bottom">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {clients.map(client => {
          const m = client.businessMetrics;
          const hourlyRate = (client.monthlyFee || 0) / (m.timeSpentMinutes / 60);
          const isHealthy = hourlyRate > 350;

          return (
            <div key={client.id} className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-xl flex flex-col gap-6 relative overflow-hidden group">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <Avatar
                       src={String(client.avatar || '')}
                       name={String(client.companyName || client.name || '')}
                       alt={String(client.companyName || '')}
                       size="lg"
                       rounded="2xl"
                       className="shadow-lg border-2 border-white"
                     />
                     <div>
                        <h4 className="text-xl font-black text-slate-800">{client.companyName}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase">ריטיינר: ₪{client.monthlyFee?.toLocaleString()}</p>
                     </div>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isHealthy ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {isHealthy ? <TrendingUp size={24}/> : <AlertTriangle size={24}/>}
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-3xl">
                     <p className="text-[9px] font-black text-slate-400 uppercase mb-1">זמן שהושקע</p>
                     <p className="text-lg font-black text-slate-800 flex items-center gap-2"><Clock size={16} className="text-blue-500"/> {(m.timeSpentMinutes / 60).toFixed(1)} ש׳</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-3xl">
                     <p className="text-[9px] font-black text-slate-400 uppercase mb-1">שכר שעתי אפקטיבי</p>
                     <p className={`text-lg font-black ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>₪{hourlyRate.toFixed(0)}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-3xl">
                     <p className="text-[9px] font-black text-slate-400 uppercase mb-1">עמידה בזמנים</p>
                     <p className="text-lg font-black text-slate-800">{m.punctualityScore}%</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-3xl">
                     <p className="text-[9px] font-black text-slate-400 uppercase mb-1">סבבי תיקונים</p>
                     <p className="text-lg font-black text-slate-800">{m.revisionCount}</p>
                  </div>
               </div>

               <div className="pt-6 border-t border-slate-200 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black text-slate-900 flex items-center gap-2"><Sparkles size={14} className="text-blue-600"/> תובנת AI עסקית</h5>
                    <button 
                      onClick={() => runAudit(client)} 
                      disabled={isLoadingAudit === client.id}
                      className="text-[10px] font-black text-blue-600 hover:underline"
                    >
                      {isLoadingAudit === client.id ? 'מנתח...' : 'עדכן ניתוח'}
                    </button>
                  </div>
                  <p className="text-xs font-bold text-slate-500 leading-relaxed bg-blue-50/50 p-4 rounded-2xl italic">
                    {audits[client.id] || client.businessMetrics.lastAIBusinessAudit}
                  </p>
               </div>
               
               {/* Profitability Indicator Bar */}
               <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-100 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${Math.min(100, (hourlyRate / 500) * 100)}%` }} 
                    className={`h-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`}
                  />
               </div>
            </div>
          );
        })}
      </div>

      {/* Global Agency Insights */}
      <section className="bg-slate-900 p-12 rounded-[56px] text-white shadow-2xl relative overflow-hidden">
         <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
               <h3 className="text-3xl font-black mb-6">מפת הדרכים לצמיחה</h3>
               <p className="text-slate-400 font-bold leading-relaxed text-lg mb-8">
                 המערכת מנתחת את כל תיק הלקוחות שלך. הנה ההמלצות לשיפור הרווחיות של המשרד החודש:
               </p>
               <div className="flex flex-col gap-4">
                  {[].map((tip, i) => (
                    <div key={i} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                       <Zap size={20} className="text-blue-400 shrink-0"/>
                       <span className="font-bold text-sm">{tip}</span>
                    </div>
                  ))}
               </div>
            </div>
            <div className="flex flex-col items-center justify-center bg-white/5 rounded-[40px] p-10 border border-white/5">
               <p className="text-sm font-black text-blue-400 uppercase tracking-widest mb-2">רווחיות משרד ממוצעת</p>
               <p className="text-7xl font-black mb-2">₪412</p>
               <p className="text-sm font-bold text-slate-400">שכר שעתי אפקטיבי (נטו)</p>
               <div className="mt-10 w-full h-4 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[72%] rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)]"></div>
               </div>
               <p className="mt-4 text-[10px] font-black text-slate-500">72% מהיעד החודשי (₪570/שעה)</p>
            </div>
         </div>
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[120px] opacity-20"></div>
      </section>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-20 animate-in fade-in">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-extrabold tracking-tight">אנליטיקה וביצועים</h2>
          <div className="flex bg-slate-100 p-1 rounded-2xl">
             <button onClick={() => setActiveTab('social')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'social' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}>סושיאל</button>
             <button onClick={() => setActiveTab('business')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'business' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}>עסקי ורווחיות</button>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsPeriodMenuOpen(!isPeriodMenuOpen)}
              className={`flex items-center gap-3 bg-white border px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-sm hover:border-blue-600 group ${isPeriodMenuOpen ? 'border-blue-600 ring-4 ring-blue-50' : 'border-slate-200'}`}
            >
              <CalendarIcon size={18} className={isPeriodMenuOpen ? 'text-blue-600' : 'text-slate-400'} />
              <span>{period}</span>
              <ChevronDown size={16} className={`transition-transform duration-300 ${isPeriodMenuOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
            </button>
            <AnimatePresence>
              {isPeriodMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-3 bg-white border border-slate-100 rounded-[28px] shadow-2xl py-3 w-56 z-[100] overflow-hidden"
                >
                   {['7 ימים אחרונים', '30 ימים אחרונים', 'רבעון נוכחי', 'חצי שנה אחרונה'].map(p => (
                     <button 
                        key={p} 
                        onClick={() => changePeriod(p)} 
                        className={`w-full text-right px-6 py-4 text-sm font-bold transition-all flex items-center justify-between group ${period === p ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
                      >
                        {p}
                        {period === p && <CheckCircle size={14} className="text-blue-600" />}
                      </button>
                   ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-2xl font-extrabold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            <span>{isExporting ? 'מייצא דוח...' : 'הורד דוח מלא'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'social' ? renderSocialView() : renderBusinessView()}

      <AnimatePresence>
        {isDetailModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsDetailModalOpen(false)}>
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e=>e.stopPropagation()} className="bg-white w-full max-w-5xl rounded-[56px] shadow-2xl overflow-hidden flex flex-col h-full max-h-[90vh]">
                <div className="p-10 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur">
                   <h2 className="text-3xl font-black">פירוט רשתות חברתיות</h2>
                   <button onClick={() => setIsDetailModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl"><X size={28}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-10 flex flex-col gap-10">
                   {/* Modal content... */}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
