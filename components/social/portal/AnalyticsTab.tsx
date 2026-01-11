'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Users, Share2, MousePointer2, 
  Download, Loader2, BarChart3, Globe, 
  CheckCircle2, Sparkles, Zap, Calendar, ArrowUpLeft, 
  History, Target, Award
} from 'lucide-react';
import { Client, SocialPost, SocialPlatform } from '@/types/social';
import { PLATFORM_ICONS, PLATFORM_COLORS } from '../SocialIcons';

interface AnalyticsTabProps {
  client: Client;
  posts: SocialPost[];
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ client, posts }) => {
  const [isExporting, setIsExporting] = useState(false);

  // Get baseline data from client onboarding or use defaults
  const baseline = (client.businessMetrics as any)?.baselineMetrics || {
    followers: (client.businessMetrics as any)?.followers || 0,
    avgReach: 0,
    engagement: 0
  };

  // Calculate current metrics from posts
  const publishedPosts = posts.filter(p => p.status === 'published');
  const current = {
    followers: (client.businessMetrics as any)?.followers || baseline.followers,
    avgReach: (client.businessMetrics as any)?.avgReach || baseline.avgReach,
    engagement: (client.businessMetrics as any)?.engagement || baseline.engagement
  };

  // If no baseline data, show message
  const hasBaselineData = baseline.followers > 0 || baseline.avgReach > 0;

  // Fulfillment Logic
  const publishedPostsCount = posts.filter(p => p.status === 'published').length;
  const scheduledPostsCount = posts.filter(p => p.status === 'scheduled' || p.status === 'pending_approval').length;
  
  const handleDownloadReport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/reports/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clientId: client.id,
          month: new Date().toLocaleString('he-IL', { month: 'long' }),
          year: new Date().getFullYear().toString()
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Create download link
        const link = document.createElement('a');
        link.href = data.pdfUrl;
        link.download = data.filename || 'report.pdf';
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        alert('שגיאה ביצירת PDF');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('שגיאה ביצירת PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="flex flex-col gap-10"
    >
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">איך המותג שלכם גדל?</h2>
          <p className="text-slate-500 font-bold mt-1">נתונים שקופים בזמן אמת על הפעילות שלנו החודש.</p>
        </div>
        <button 
          onClick={handleDownloadReport}
          disabled={isExporting}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all flex items-center gap-3"
        >
          {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
          הורד דוח ביצועים (PDF)
        </button>
      </div>

      {/* The Growth Journey (Baseline vs today) - Arrows Flipped for RTL */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 p-1 rounded-[56px] shadow-2xl">
         <div className="bg-white p-10 rounded-[52px] flex flex-col gap-10">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><History size={24}/></div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">מסע הצמיחה שלכם</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">מנקודת ההתחלה ועד היום</p>
                  </div>
               </div>
               <div className="hidden md:flex items-center gap-2 bg-green-50 px-4 py-2 rounded-xl text-green-600 font-black text-xs">
                  <Award size={16}/> שותפות של 6 חודשים
               </div>
            </div>

            {!hasBaselineData ? (
              <div className="bg-blue-50 border border-blue-200 rounded-3xl p-8 text-center">
                <p className="text-blue-600 font-bold">נתוני baseline יוצגו כאן לאחר איסוף נתונים ראשוני</p>
                <p className="text-sm text-blue-500 mt-2">הנתונים יתעדכנו אוטומטית לאחר פרסום הפוסטים הראשונים</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { label: 'קהל עוקבים', start: baseline.followers, end: current.followers, suffix: '' },
                  { label: 'חשיפה ממוצעת', start: baseline.avgReach, end: current.avgReach, suffix: '' },
                  { label: 'שיעור מעורבות', start: baseline.engagement, end: current.engagement, suffix: '%' },
                ].map((item, i) => {
                  const growth = item.start > 0 ? ((item.end - item.start) / item.start * 100).toFixed(0) : '0';
                  return (
                    <div key={i} className="bg-slate-50 p-8 rounded-[40px] flex flex-col gap-6 relative overflow-hidden group">
                       <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">{item.label}</p>
                       <div className="flex items-center justify-around">
                          <div className="text-center">
                             <p className="text-[10px] font-bold text-slate-300 uppercase">אז</p>
                             <p className="text-xl font-black text-slate-400">{item.start.toLocaleString()}{item.suffix}</p>
                          </div>
                          {/* Arrow flipped: Points from right to left */}
                          <ArrowUpLeft size={24} className="text-blue-200 -rotate-45" />
                          <div className="text-center">
                             <p className="text-[10px] font-bold text-blue-600 uppercase">היום</p>
                             <p className="text-3xl font-black text-slate-900">{item.end.toLocaleString()}{item.suffix}</p>
                          </div>
                       </div>
                       <div className="bg-white py-2 px-4 rounded-full self-center shadow-sm border border-blue-100">
                          <p className="text-blue-600 font-black text-sm">+{growth}% צמיחה</p>
                       </div>
                    </div>
                  );
                })}
              </div>
            )}
         </div>
      </section>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'חשיפה מצטברת', val: '142.5K', icon: Globe, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'עוקבים חדשים', val: '1,240', icon: Users, color: 'text-purple-500', bg: 'bg-purple-50' },
          { label: 'מעורבות קהל', val: '8.4%', icon: Share2, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'קליקים לאתר', val: '450', icon: MousePointer2, color: 'text-orange-500', bg: 'bg-orange-50' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-3xl font-black text-slate-900">{stat.val}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Fulfillment / Quota Card */}
        <div className="lg:col-span-7 bg-white p-10 rounded-[56px] border border-slate-200 shadow-xl flex flex-col gap-10">
          <div className="flex items-center justify-between">
             <h3 className="text-2xl font-black flex items-center gap-3">
               עמידה ביעדי פרסום <CheckCircle2 className="text-green-500" size={24}/>
             </h3>
             <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-3 py-1 rounded-lg">ינואר 2025</span>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {client.quotas.map(quota => {
              const Icon = PLATFORM_ICONS[quota.platform];
              const colorClass = PLATFORM_COLORS[quota.platform];
              const percentage = Math.min(100, (quota.currentUsage / quota.monthlyLimit) * 100);
              
              return Icon ? (
                <div key={quota.platform} className="flex flex-col gap-3">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-slate-50 ${colorClass}`}><Icon size={16}/></div>
                      <span className="font-black text-sm capitalize">{quota.platform}</span>
                    </div>
                    <span className="text-xs font-black text-slate-900">
                      {quota.currentUsage} מתוך {quota.monthlyLimit} פוסטים
                    </span>
                  </div>
                  <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-200">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${percentage}%` }} 
                      className={`h-full ${percentage === 100 ? 'bg-green-500' : 'bg-blue-600'} rounded-full shadow-inner`}
                    />
                  </div>
                </div>
              ) : null;
            })}
          </div>

          <div className="mt-4 p-6 bg-slate-900 rounded-[32px] text-white flex items-center justify-between">
             <div className="flex flex-col">
                <p className="text-[10px] font-black text-white/40 uppercase">סה"כ תפוקה החודש</p>
                <p className="text-2xl font-black">{publishedPostsCount + scheduledPostsCount} פוסטים</p>
             </div>
             <div className="w-px h-10 bg-white/10"></div>
             <div className="flex flex-col text-left">
                <p className="text-[10px] font-black text-white/40 uppercase text-left">סטטוס עבודה</p>
                <p className="text-sm font-black text-green-400 flex items-center gap-2">מתקדם כמתוכנן <Zap size={14}/></p>
             </div>
          </div>
        </div>

        {/* AI Insight Card for Client */}
        <div className="lg:col-span-5 flex flex-col gap-6">
           <div className="bg-slate-900 p-10 rounded-[56px] text-white shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-900/50"><Sparkles size={24}/></div>
                    <h3 className="text-xl font-black">התובנה של החודש</h3>
                 </div>
                 <p className="text-lg font-bold leading-relaxed text-slate-300 italic">
                   "הפוסט שלכם מיום שלישי האחרון זכה ל-240% יותר תגובות מהממוצע. הקהל שלכם מגיב מצוין לתוכן שכולל ויז׳ואל אותנטי מהעסק בשילוב עם הומור פנימי."
                 </p>
                 <div className="mt-10 flex items-center gap-4 text-blue-400 font-black text-xs uppercase tracking-widest">
                    <ArrowUpLeft size={16} className="-rotate-45"/> מומלץ: להמשיך בקו האותנטי בשבוע הקרוב
                 </div>
              </div>
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600 rounded-full blur-[100px] opacity-20 transition-transform duration-1000 group-hover:scale-150"></div>
           </div>

           <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-xl flex-1 flex flex-col gap-6">
              <h4 className="font-black text-lg">פעילות אחרונה</h4>
              <div className="flex flex-col gap-4">
                 {posts.filter(p => p.status === 'published').slice(0, 3).map(p => (
                   <div key={p.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-2xl transition-all">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                         {p.mediaUrl ? <img src={p.mediaUrl} className="w-full h-full object-cover" /> : <BarChart3 size={20} className="text-slate-300 m-auto mt-3"/>}
                      </div>
                      <div className="flex-1">
                         <p className="text-xs font-black truncate leading-none mb-1">פורסם ב-{p.platforms[0]}</p>
                         <p className="text-[10px] font-bold text-slate-400">{new Date(p.scheduledAt).toLocaleDateString('he-IL')}</p>
                      </div>
                      <div className="text-green-500 font-black text-xs">+320 לייקים</div>
                   </div>
                 ))}
              </div>
              <button className="mt-auto py-3 bg-slate-50 text-slate-400 font-black text-[10px] rounded-xl hover:bg-slate-100 transition-all">לכל היסטוריית הפרסומים</button>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AnalyticsTab;

