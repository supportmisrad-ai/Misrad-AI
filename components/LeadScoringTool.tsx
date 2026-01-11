
import React, { useState, useEffect } from 'react';
import type { Lead } from './system/types';
import { Sparkles, Target, Zap, TrendingUp, AlertCircle, RefreshCw, BrainCircuit } from 'lucide-react';

interface LeadScoringToolProps {
  lead: Lead;
}

const LeadScoringTool: React.FC<LeadScoringToolProps> = ({ lead }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [verdict, setVerdict] = useState<string>('');
  const leadActivities = lead.activities ?? [];
  
  // Scoring parameters (simulated calculation based on lead data)
  const scoringBreakdown = {
    source: lead.source === 'חבר הביא' ? 95 : 70,
    interaction: leadActivities.length * 15 > 100 ? 100 : leadActivities.length * 15,
    budget: lead.value > 20000 ? 90 : 60,
    urgency: lead.isHot ? 100 : 40
  };

  const calculateAIVerdict = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = `Analyze this CRM lead:
        Name: ${lead.name}
        Status: ${lead.status}
        Value: ₪${lead.value}
        Source: ${lead.source}
        Hot: ${lead.isHot ? 'Yes' : 'No'}
        Recent Activities: ${leadActivities.slice(0, 3).map(a => a.content).join(', ')}
        
        Provide a concise 1-2 sentence "Sales Verdict" in Hebrew about how likely this lead is to close and what the main risk or opportunity is.`;

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: prompt, rawData: { leadId: lead.id } }),
      });

      const data = (await res.json().catch(() => ({}))) as any;
      setVerdict(String(data?.result?.summary || 'לא ניתן לייצר פסק דין כרגע.'));
    } catch (error) {
      console.error("Scoring analysis failed:", error);
      setVerdict("שגיאה בניתוח הנתונים.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!verdict && lead.id) {
        calculateAIVerdict();
    }
  }, [lead.id]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-rose-500';
  };

  return (
    <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-xl border border-white/10 overflow-hidden relative group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="flex justify-between items-center mb-6 relative z-10">
        <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/20 rounded-lg text-primary-glow">
                <Target size={16} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lead Health Score</span>
        </div>
        <button 
            onClick={calculateAIVerdict} 
            disabled={isAnalyzing}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
        >
            <RefreshCw size={14} className={isAnalyzing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Main Gauge UI */}
      <div className="flex items-center justify-between mb-8 px-2">
          <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90">
                  <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
                  <circle 
                    cx="40" cy="40" r="34" 
                    stroke="currentColor" 
                    strokeWidth="6" 
                    fill="transparent" 
                    strokeDasharray="213.6"
                    strokeDashoffset={213.6 - (213.6 * lead.score) / 100}
                    strokeLinecap="round"
                    className={`transition-all duration-1000 ${getScoreColor(lead.score)}`}
                  />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xl font-black font-mono ${getScoreColor(lead.score)}`}>{lead.score}</span>
              </div>
          </div>
          
          <div className="flex-1 mr-6 space-y-3">
              {[
                  { label: 'איכות מקור', val: scoringBreakdown.source, color: 'bg-indigo-400' },
                  { label: 'אינטראקציה', val: scoringBreakdown.interaction, color: 'bg-emerald-400' },
                  { label: 'בשלות כלכלית', val: scoringBreakdown.budget, color: 'bg-amber-400' }
              ].map((item, idx) => (
                  <div key={idx}>
                      <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase mb-1">
                          <span>{item.label}</span>
                          <span>{item.val}%</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} transition-all duration-700`} style={{ width: `${item.val}%` }}></div>
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* AI Verdict Box */}
      <div className="bg-white/5 rounded-2xl p-4 border border-white/5 relative group/verdict">
          <div className="flex items-center gap-2 mb-2">
              <Sparkles size={12} className="text-primary-glow animate-pulse" />
              <span className="text-[9px] font-black text-primary-glow uppercase tracking-wider">Nexus AI Verdict</span>
          </div>
          {isAnalyzing ? (
              <div className="space-y-2">
                  <div className="h-2 w-full bg-white/5 rounded animate-pulse"></div>
                  <div className="h-2 w-2/3 bg-white/5 rounded animate-pulse"></div>
              </div>
          ) : (
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {verdict}
              </p>
          )}
      </div>
    </div>
  );
};

export default LeadScoringTool;
