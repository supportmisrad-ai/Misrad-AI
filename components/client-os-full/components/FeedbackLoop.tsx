'use client';

import React, { useState, useEffect } from 'react';
import { FeedbackItem } from '../types';
import { MessageSquareQuote, TrendingUp, TrendingDown, MessageCircle, AlertCircle, Sparkles, Send, Settings, Mail, BellRing } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';
import { getClientOSFeedbacks } from '@/app/actions/client-portal-clinic';

const FeedbackLoop: React.FC = () => {
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const orgId = (typeof window !== 'undefined'
    ? (((window as unknown) as { [key: string]: unknown }).__CLIENT_OS_USER__ as { organizationId?: string | null } | undefined)?.organizationId
    : null) ?? null;

  useEffect(() => {
    const loadFeedbacks = async () => {
      if (!orgId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const feedbacks = await getClientOSFeedbacks(orgId);
        setFeedback(feedbacks as FeedbackItem[]);
      } catch (error: unknown) {
        console.error('[FeedbackLoop] error loading feedbacks', {
          error: (error instanceof Error ? error.message : String(error)),
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadFeedbacks();
  }, [orgId]);

  // NPS Calculation
  const totalResponses = feedback.length;
  const promoters = feedback.filter(f => f.score >= 9).length;
  const passives = feedback.filter(f => f.score >= 7 && f.score <= 8).length;
  const detractors = feedback.filter(f => f.score <= 6).length;
  
  const npsScore = totalResponses > 0 ? Math.round(((promoters - detractors) / totalResponses) * 100) : 0;
  const averageScore = totalResponses > 0 ? (feedback.reduce((acc, f) => acc + f.score, 0) / totalResponses).toFixed(1) : '0';

  // Keyword Aggregation for Word Cloud
  const keywordMap: Record<string, { count: number, sentiment: string }> = {};
  
  feedback.forEach(f => {
    f.keywords.forEach(word => {
        if (!keywordMap[word]) {
            keywordMap[word] = { count: 0, sentiment: f.sentiment };
        }
        keywordMap[word].count += 1;
        // If a word appears in both negative and positive contexts, simple logic: latest sentiment wins or mixed (omitted for simplicity)
    });
  });

  const sortedKeywords = Object.entries(keywordMap)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 15); // Top 15 words

  const getSentimentColor = (sentiment: string) => {
      switch(sentiment) {
          case 'POSITIVE': return 'text-signal-success';
          case 'NEGATIVE': return 'text-signal-danger';
          default: return 'text-gray-400';
      }
  };

  const getScoreColor = (score: number) => {
      if (score >= 9) return 'bg-signal-success text-white border-signal-success';
      if (score >= 7) return 'bg-nexus-accent text-white border-nexus-accent';
      return 'bg-signal-danger text-white border-signal-danger';
  };

  const npsData = [
    { name: 'ממליצים (9-10)', value: promoters, color: '#059669' },
    { name: 'אדישים (7-8)', value: passives, color: '#7C3AED' },
    { name: 'מבקרים (0-6)', value: detractors, color: '#DC2626' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-end items-end border-b border-slate-200/70 pb-4">
        {/* Automation Control Panel */}
        <div className="glass-panel px-4 py-2 rounded-xl border border-slate-200/70 flex items-center gap-4">
             <div className="flex flex-col items-end">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">סקר אוטומטי</span>
                <span className={`text-xs font-bold flex items-center gap-1 ${automationEnabled ? 'text-signal-success' : 'text-gray-400'}`}>
                    {automationEnabled ? <><BellRing size={12} /> פעיל</> : 'כבוי'}
                </span>
             </div>
             <button 
                onClick={() => setAutomationEnabled(!automationEnabled)}
                className={`w-10 h-6 rounded-full p-1 transition-colors ${automationEnabled ? 'bg-nexus-primary' : 'bg-gray-300'}`}
                type="button"
             >
                 <div className={`w-4 h-4 bg-white rounded-full transition-transform ${automationEnabled ? 'translate-x-0' : '-translate-x-4'}`}></div>
             </button>
        </div>
      </header>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* NPS Score */}
          <div className="glass-card p-6 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-signal-danger via-nexus-accent to-signal-success"></div>
               <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">ציון NPS</h3>
               <div className="text-5xl font-display font-bold text-gray-900 mb-1">{npsScore > 0 ? `+${npsScore}` : npsScore}</div>
               <div className="flex items-center gap-2 text-xs">
                   <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-600">מצוין</span>
               </div>
          </div>

           {/* Avg Rating & Response */}
           <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
               <div className="flex justify-between items-start">
                   <div>
                       <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">ממוצע שביעות רצון</h3>
                       <div className="text-3xl font-display font-bold text-gray-900">{averageScore}<span className="text-lg text-gray-400">/10</span></div>
                   </div>
                   <div className="p-3 bg-nexus-primary/10 rounded-xl text-nexus-primary">
                       <Sparkles size={24} />
                   </div>
               </div>
               <div className="mt-4 w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                   <div className="h-full bg-nexus-primary" style={{ width: `${(parseFloat(averageScore) / 10) * 100}%` }}></div>
               </div>
           </div>

           {/* Breakdown Pie */}
           <div className="glass-card p-4 rounded-2xl flex items-center gap-4">
               <div className="h-24 w-24 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={npsData}
                        innerRadius={25}
                        outerRadius={40}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {npsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                         contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                         itemStyle={{ color: '#000' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
               </div>
               <div className="flex-1 space-y-2">
                   {npsData.map((d) => (
                       <div key={d.name} className="flex justify-between items-center text-xs">
                           <span className="flex items-center gap-1.5 text-gray-500">
                               <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                               {d.name.split(' ')[0]}
                           </span>
                           <span className="font-bold text-gray-900">{d.value}</span>
                       </div>
                   ))}
               </div>
           </div>
      </div>

      {/* Middle Row: Word Cloud Analysis */}
      <div className="glass-card p-6 rounded-2xl border border-slate-200/70 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-2 bg-nexus-accent/10 rounded-lg text-nexus-accent border border-nexus-accent/20">
                  <MessageSquareQuote size={20} />
              </div>
              <h3 className="text-lg font-display font-bold text-gray-900">על מה כולם מדברים?</h3>
              <span className="text-xs text-gray-500 border border-gray-200 px-2 py-0.5 rounded">{totalResponses} תגובות אחרונות</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 py-8 relative z-10 min-h-[200px]">
              {sortedKeywords.map(([word, data], index) => {
                  // Size Logic based on count (simple)
                  const sizeClass = 
                      index < 3 ? 'text-4xl' : 
                      index < 7 ? 'text-2xl' : 
                      'text-sm';
                  
                  const opacityClass = 
                      index < 3 ? 'opacity-100 font-bold' : 
                      index < 7 ? 'opacity-80 font-medium' : 
                      'opacity-60';

                  return (
                      <span 
                        key={word} 
                        className={`${sizeClass} ${opacityClass} ${getSentimentColor(data.sentiment)} cursor-default transition-all hover:scale-110 hover:opacity-100`}
                        title={`${data.count} הופעות`}
                      >
                          {word}
                      </span>
                  );
              })}
          </div>
          
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-white pointer-events-none"></div>
      </div>

      {/* Bottom Row: Feed */}
      <div className="grid grid-cols-1 gap-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest pl-1">פיד אחרון</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feedback.map((feedbackItem) => (
                  <div key={feedbackItem.id} className="glass-card p-5 rounded-xl border border-slate-200/70 hover:border-nexus-primary/30 transition-all flex flex-col gap-3 group">
                       <div className="flex justify-between items-start">
                           <div className="flex items-center gap-3">
                               <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold font-mono text-sm border ${getScoreColor(feedbackItem.score)}`}>
                                   {feedbackItem.score}
                               </div>
                               <div>
                                   <h4 className="font-bold text-gray-900 text-sm">{feedbackItem.clientName}</h4>
                                   <span className="text-[10px] text-gray-500">{feedbackItem.date} דרך {feedbackItem.source.replace('_', ' ')}</span>
                               </div>
                           </div>
                           {feedbackItem.score <= 6 && (
                               <button className="text-[10px] flex items-center gap-1 text-signal-danger border border-signal-danger/30 px-2 py-1 rounded bg-signal-danger/5 hover:bg-signal-danger/10 transition-colors">
                                   <AlertCircle size={10} /> טפל בזה
                               </button>
                           )}
                       </div>
                       
                       <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100 italic relative">
                           <span className="absolute -top-2 -right-2 text-gray-300 text-2xl">"</span>
                           {feedbackItem.comment}
                       </p>

                       <div className="flex gap-2 flex-wrap">
                           {feedbackItem.keywords.map((word, i) => (
                               <span key={i} className="text-[10px] px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-500">
                                   #{word}
                               </span>
                           ))}
                       </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

export default FeedbackLoop;
