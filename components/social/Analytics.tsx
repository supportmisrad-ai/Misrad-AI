'use client';

import React, { useState, useRef, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Share2, MousePointer2, Calendar as CalendarIcon, Download, CircleCheck, ChevronDown, X, Facebook, Instagram, Linkedin, Video, Globe, MessageCircle, Twitter, Pin, MessageSquare, Briefcase, DollarSign, Clock, TriangleAlert, Sparkles, Zap, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { SocialPlatform, SocialPost, Client } from '@/types/social';
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
  pinterest: Pin,
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
  // Helper to safely read optional numeric metrics that may exist on DB-returned posts
  const getNum = (post: SocialPost, key: string): number => {
    const val = (post as unknown as Record<string, unknown>)[key];
    return typeof val === 'number' ? val : 0;
  };

  // Compute real metrics from posts data
  const totalPosts = posts.length;
  const publishedPosts = posts.filter(p => p.status === 'published');
  const totalEngagement = publishedPosts.reduce((sum, p) => sum + getNum(p, 'engagement'), 0);
  const totalReach = publishedPosts.reduce((sum, p) => sum + getNum(p, 'reach'), 0);
  const totalClicks = publishedPosts.reduce((sum, p) => sum + getNum(p, 'clicks'), 0);
  const growthRate = publishedPosts.length > 0 ? ((publishedPosts.length / Math.max(totalPosts, 1)) * 100) : 0;
  const hasData = publishedPosts.length > 0;

  // Build chart data from real posts (last 12 periods)
  const [chartData] = useState(() => {
    if (publishedPosts.length === 0) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    // Group posts by approximate period
    const bins = new Array(12).fill(0);
    publishedPosts.forEach((p, i) => {
      const bin = Math.floor((i / publishedPosts.length) * 12);
      bins[Math.min(bin, 11)] += getNum(p, 'engagement');
    });
    const maxVal = Math.max(...bins, 1);
    return bins.map(v => Math.round((v / maxVal) * 100));
  });

  // Compute platform distribution from real posts
  const platformCounts: Record<string, number> = {};
  publishedPosts.forEach(p => {
    const platforms = Array.isArray(p.platforms) ? p.platforms : [];
    platforms.forEach(pl => { platformCounts[pl] = (platformCounts[pl] || 0) + 1; });
  });
  const totalPlatformPosts = Object.values(platformCounts).reduce((a, b) => a + b, 0) || 1;
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
    setIsPeriodMenuOpen(false);
    addToast(`הנתונים עודכנו עבור: ${p}`);
  };

  const renderSocialView = () => (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="flex items-start gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
        <Info className="shrink-0 text-indigo-500 mt-0.5" size={16} />
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-bold text-indigo-900">נתונים פנימיים בלבד</p>
          <p className="text-[11px] font-medium text-indigo-700/80 leading-relaxed">
            הנתונים המוצגים כאן מחושבים מפעילות הפוסטים במערכת (כמות, סטטוס, פלטפורמות).
            נתוני engagement אמיתיים (לייקים, תגובות, חשיפות) מהרשתות החברתיות יהיו זמינים
            כשתחובר אינטגרציה ישירה עם Meta / LinkedIn / TikTok API.
          </p>
        </div>
      </div>
      {!hasData && (
        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6 text-center shadow-sm">
          <p className="text-amber-800 font-bold text-sm">אין נתונים להצגה</p>
          <p className="text-amber-600/80 text-xs mt-1 font-medium">פרסם תכנים כדי לראות סטטיסטיקות אמיתיות כאן</p>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'חשיפה כוללת', value: totalReach > 1000 ? `${(totalReach / 1000).toFixed(1)}K` : String(totalReach), trend: hasData ? `${publishedPosts.length} פוסטים` : '—', icon: Users, color: 'indigo' },
          { label: 'מעורבות', value: totalEngagement > 1000 ? `${(totalEngagement / 1000).toFixed(1)}K` : String(totalEngagement), trend: hasData ? `ממוצע ${Math.round(totalEngagement / publishedPosts.length)}` : '—', icon: Share2, color: 'purple' },
          { label: 'קליקים', value: totalClicks.toLocaleString(), trend: hasData ? `${((totalClicks / Math.max(totalReach, 1)) * 100).toFixed(1)}% CTR` : '—', icon: MousePointer2, color: 'emerald' },
          { label: 'שיעור פרסום', value: `${growthRate.toFixed(1)}%`, trend: `${publishedPosts.length}/${totalPosts}`, icon: TrendingUp, color: 'rose' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4 group hover:border-indigo-100 transition-all">
               <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : stat.color === 'purple' ? 'bg-purple-50 text-purple-600' : stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <Icon size={20} />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-50 text-slate-500 border border-slate-100">{stat.trend}</span>
               </div>
               <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p><p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p></div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm h-[380px] flex flex-col">
           <h3 className="font-bold text-lg text-slate-900 mb-6">ביצועים לאורך זמן</h3>
           <div className="flex-1 flex items-end gap-2 px-1">
              {chartData.map((h, i) => (
                <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-indigo-50 hover:bg-indigo-500 transition-all rounded-t-lg relative group cursor-pointer border border-indigo-100/50 hover:border-indigo-600" />
              ))}
           </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[380px]">
           <h3 className="font-bold text-lg text-slate-900 mb-6">פילוח לפי פלטפורמה</h3>
           <div className="flex flex-col gap-4 flex-1 overflow-y-auto no-scrollbar">
              {['facebook', 'instagram', 'tiktok', 'linkedin', 'google', 'whatsapp'].map((p, i) => {
                const Icon = PLATFORM_ICONS[p as SocialPlatform];
                const color = PLATFORM_COLORS[p as SocialPlatform];
                const count = platformCounts[p] || 0;
                const value = Math.round((count / totalPlatformPosts) * 100);
                return Icon ? (
                  <div key={i} className="flex flex-col gap-2 group">
                     <div className="flex justify-between items-center text-xs font-bold">
                        <div className="flex items-center gap-2">
                           <Icon size={14} className={`${color} opacity-80 group-hover:opacity-100 transition-opacity`}/>
                           <span className="text-slate-700 capitalize">{p}</span>
                        </div>
                        <span className="text-slate-500 font-medium">{count > 0 ? `${value}%` : '—'}</span>
                     </div>
                     <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} className={`h-full ${(color || '').replace('text-', 'bg-')} rounded-full opacity-80`} />
                     </div>
                  </div>
                ) : null;
              })}
           </div>
           <div className="mt-6 pt-5 border-t border-slate-100">
              <button onClick={() => setIsDetailModalOpen(true)} className="w-full py-3 bg-slate-50 text-slate-600 font-bold text-xs hover:bg-indigo-50 hover:text-indigo-700 border border-slate-100 transition-all rounded-xl">צפה בפירוט מלא</button>
           </div>
        </div>
      </div>
    </div>
  );

  const renderBusinessView = () => (
    <div className="flex flex-col gap-6 animate-in slide-in-from-bottom">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map(client => {
          const m = client.businessMetrics;
          const hourlyRate = (client.monthlyFee || 0) / (m.timeSpentMinutes / 60);
          const isHealthy = hourlyRate > 350;

          return (
            <div key={client.id} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-6 relative overflow-hidden group">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <Avatar
                       src={String(client.avatar || '')}
                       name={String(client.companyName || client.name || '')}
                       alt={String(client.companyName || '')}
                       size="md"
                       rounded="xl"
                       className="shadow-sm border border-slate-100"
                     />
                     <div>
                        <h4 className="text-lg font-bold text-slate-800">{client.companyName}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">ריטיינר: ₪{client.monthlyFee?.toLocaleString()}</p>
                     </div>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isHealthy ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {isHealthy ? <TrendingUp size={20}/> : <TriangleAlert size={20}/>}
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100/50">
                     <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">זמן שהושקע</p>
                     <p className="text-base font-bold text-slate-800 flex items-center gap-1.5"><Clock size={14} className="text-indigo-500"/> {(m.timeSpentMinutes / 60).toFixed(1)} ש׳</p>
                  </div>
                  <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100/50">
                     <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">שכר שעתי אפקטיבי</p>
                     <p className={`text-base font-bold ${isHealthy ? 'text-emerald-600' : 'text-rose-600'}`}>₪{hourlyRate.toFixed(0)}</p>
                  </div>
                  <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100/50">
                     <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">עמידה בזמנים</p>
                     <p className="text-base font-bold text-slate-800">{m.punctualityScore}%</p>
                  </div>
                  <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100/50">
                     <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">סבבי תיקונים</p>
                     <p className="text-base font-bold text-slate-800">{m.revisionCount}</p>
                  </div>
               </div>

               <div className="pt-5 border-t border-slate-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5"><Sparkles size={14} className="text-indigo-600"/> תובנת AI עסקית</h5>
                    <button 
                      onClick={() => runAudit(client)} 
                      disabled={isLoadingAudit === client.id}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline disabled:opacity-50"
                    >
                      {isLoadingAudit === client.id ? 'מנתח...' : 'עדכן ניתוח'}
                    </button>
                  </div>
                  <p className="text-[11px] font-medium text-slate-600 leading-relaxed bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/30">
                    {audits[client.id] || client.businessMetrics.lastAIBusinessAudit}
                  </p>
               </div>
               
               {/* Profitability Indicator Bar */}
               <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-50 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${Math.min(100, (hourlyRate / 500) * 100)}%` }} 
                    className={`h-full ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  />
               </div>
            </div>
          );
        })}
      </div>

      {/* Global Agency Insights */}
      <section className="bg-slate-900 p-8 md:p-10 rounded-3xl text-white shadow-lg relative overflow-hidden">
         <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            <div>
               <h3 className="text-2xl md:text-3xl font-bold mb-4">מפת הדרכים לצמיחה</h3>
               <p className="text-slate-400 font-medium leading-relaxed text-base md:text-lg mb-8">
                 המערכת מנתחת את כל תיק הלקוחות שלך. הנה ההמלצות לשיפור הרווחיות של המשרד החודש:
               </p>
               <div className="flex flex-col gap-3">
                  {[].map((tip, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
                       <Zap size={18} className="text-indigo-400 shrink-0"/>
                       <span className="font-bold text-sm text-slate-100">{tip}</span>
                    </div>
                  ))}
               </div>
            </div>
            <div className="flex flex-col items-center justify-center bg-white/5 rounded-2xl p-8 border border-white/10">
               {(() => {
                 const avgRate = clients.length > 0
                   ? Math.round(clients.reduce((sum, c) => sum + ((c.monthlyFee || 0) / Math.max(c.businessMetrics.timeSpentMinutes / 60, 1)), 0) / clients.length)
                   : 0;
                 const goalRate = 570;
                 const pct = Math.min(100, Math.round((avgRate / goalRate) * 100));
                 return (
                   <>
                     <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">רווחיות משרד ממוצעת</p>
                     <p className="text-6xl font-bold mb-1">{clients.length > 0 ? `\u20AA${avgRate}` : '\u2014'}</p>
                     <p className="text-xs font-medium text-slate-400">שכר שעתי אפקטיבי (נטו)</p>
                     <div className="mt-8 w-full h-3 bg-white/10 rounded-full overflow-hidden">
                       <div className={`h-full bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]`} style={{ width: `${pct}%` }} />
                     </div>
                     <p className="mt-3 text-[10px] font-bold text-slate-400">{pct}% מהיעד החודשי (\u20AA{goalRate}/שעה)</p>
                   </>
                 );
               })()}
            </div>
         </div>
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-[100px] opacity-20"></div>
      </section>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-20 animate-in fade-in">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">אנליטיקה וביצועים</h2>
          <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-100 w-fit">
             <button onClick={() => setActiveTab('social')} className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'social' ? 'bg-white shadow-sm border border-slate-200/50 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>סושיאל</button>
             <button onClick={() => setActiveTab('business')} className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'business' ? 'bg-white shadow-sm border border-slate-200/50 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>עסקי ורווחיות</button>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial" ref={menuRef}>
            <button 
              onClick={() => setIsPeriodMenuOpen(!isPeriodMenuOpen)}
              className={`flex items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm hover:border-indigo-300 border ${isPeriodMenuOpen ? 'border-indigo-400 ring-4 ring-indigo-50' : 'border-slate-200 text-slate-700'} w-full md:w-auto`}
            >
              <div className="flex items-center gap-2">
                 <CalendarIcon size={16} className={isPeriodMenuOpen ? 'text-indigo-600' : 'text-slate-400'} />
                 <span>{period}</span>
              </div>
              <ChevronDown size={14} className={`transition-transform duration-300 ${isPeriodMenuOpen ? 'rotate-180 text-indigo-600' : 'text-slate-400'}`} />
            </button>
            <AnimatePresence>
              {isPeriodMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 w-full md:w-56 z-[100] overflow-hidden"
                >
                   {['7 ימים אחרונים', '30 ימים אחרונים', 'רבעון נוכחי', 'חצי שנה אחרונה'].map(p => (
                     <button 
                        key={p} 
                        onClick={() => changePeriod(p)} 
                        className={`w-full text-right px-4 py-3 text-xs font-bold transition-all flex items-center justify-between group ${period === p ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'}`}
                      >
                        {p}
                        {period === p && <CircleCheck size={14} className="text-indigo-600" />}
                      </button>
                   ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-70 flex-1 md:flex-initial whitespace-nowrap"
          >
            <Download size={14} className={isExporting ? 'opacity-60' : undefined} />
            <span>{isExporting ? 'מייצא...' : 'הורד דוח'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'social' ? renderSocialView() : renderBusinessView()}

      <AnimatePresence>
        {isDetailModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)}>
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e=>e.stopPropagation()} className="bg-white w-full max-w-4xl rounded-3xl shadow-xl overflow-hidden flex flex-col h-full max-h-[85vh]">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 shrink-0">
                   <h2 className="text-xl font-bold text-slate-900">פירוט רשתות חברתיות</h2>
                   <button onClick={() => setIsDetailModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 rounded-full transition-colors"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                     {['facebook', 'instagram', 'tiktok', 'linkedin', 'google', 'whatsapp'].map(p => {
                       const Icon = PLATFORM_ICONS[p as SocialPlatform];
                       const color = PLATFORM_COLORS[p as SocialPlatform];
                       const count = platformCounts[p] || 0;
                       const pct = Math.round((count / Math.max(totalPlatformPosts, 1)) * 100);
                       return Icon ? (
                         <div key={p} className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col gap-4 shadow-sm hover:border-indigo-100 transition-colors">
                           <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-xl bg-slate-50 ${color}`}><Icon size={18}/></div>
                             <span className="text-sm font-bold capitalize text-slate-800">{p}</span>
                           </div>
                           <div className="grid grid-cols-2 gap-3 mt-2">
                             <div className="bg-slate-50 rounded-xl p-3">
                               <p className="text-[10px] font-black text-slate-400 uppercase">פוסטים</p>
                               <p className="text-2xl font-black">{count}</p>
                             </div>
                             <div>
                               <p className="text-[10px] font-black text-slate-400 uppercase">נתח רלטיבי</p>
                               <p className="text-2xl font-black">{count > 0 ? `${pct}%` : '\u2014'}</p>
                             </div>
                           </div>
                           <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                             <div className={`h-full ${(color || '').replace('text-', 'bg-')} rounded-full`} style={{ width: `${pct}%` }} />
                           </div>
                         </div>
                       ) : null;
                     })}
                   </div>
                   {!hasData && (
                     <div className="text-center py-12 text-slate-400 font-bold">אין נתונים להצגה. פרסם תכנים כדי לראות פירוט.</div>
                   )}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
