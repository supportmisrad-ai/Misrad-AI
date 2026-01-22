
import React from 'react';
import { Client } from '../../types';
import { Dna, Microscope, Sparkles, Zap, Activity } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { Skeleton } from '@/components/ui/skeletons';

interface ClientPulseTabProps {
  client: Client;
  aiInsight: { insight: string; action: string } | null;
  isInsightLoading: boolean;
  onGenerateInsight: () => void;
}

export const ClientPulseTab: React.FC<ClientPulseTabProps> = ({ client, aiInsight, isInsightLoading, onGenerateInsight }) => {
  
  const getDnaData = (c: Client) => {
      const roiScore = Math.min(100, (c.roiHistory.length * 25)); // Mock calc
      return [
          { subject: 'יחסים', A: c.healthBreakdown.sentiment, fullMark: 100 },
          { subject: 'כסף (ROI)', A: roiScore || 40, fullMark: 100 },
          { subject: 'רווח', A: c.healthBreakdown.financial, fullMark: 100 },
          { subject: 'מעורבות', A: c.healthBreakdown.engagement, fullMark: 100 },
          { subject: 'חזון', A: c.healthScore > 80 ? 90 : 50, fullMark: 100 },
      ];
  };

  return (
    <div className="space-y-8 animate-slide-up">
        
        <div className="flex justify-between items-end mb-4">
            <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Dna size={20} className="text-nexus-accent"/> מה המצב שלהם?
                </h3>
                <p className="text-sm text-gray-500">בדיקה מקיפה של כל המדדים החשובים.</p>
            </div>
            <button 
                onClick={onGenerateInsight}
                className="flex items-center gap-2 px-4 py-2 bg-nexus-primary text-white rounded-xl text-xs font-bold hover:bg-nexus-accent transition-colors shadow-lg shadow-nexus-primary/20"
            >
                <Microscope size={16} /> בדוק לעומק
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left: The Radar Chart */}
            <div className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center relative min-h-[400px] bg-white/90">
                <div className="absolute top-4 left-4 text-xs font-bold bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                    ציון: {client.healthScore}
                </div>
                <ResponsiveContainer width="100%" height={350}>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getDnaData(client)}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 12, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                            name="Client Health"
                            dataKey="A"
                            stroke="#0F172A"
                            strokeWidth={3}
                            fill="#C5A572"
                            fillOpacity={0.4}
                        />
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                            itemStyle={{ color: '#0F172A', fontWeight: 'bold' }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
                <div className="text-center mt-4">
                    <span className="text-xs text-gray-400 font-medium">האיזון בין המדדים השונים</span>
                </div>
            </div>

            {/* Right: AI Diagnosis & Action */}
            <div className="flex flex-col gap-6">
                
                {/* The Insight */}
                <div className="glass-card p-6 rounded-2xl border-l-4 border-l-nexus-accent bg-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-nexus-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <Sparkles size={16} className="text-nexus-accent" /> מה ה-AI חושב?
                        </h4>
                        {isInsightLoading && <Skeleton className="w-4 h-4 rounded-full" />}
                    </div>
                    
                    <div className="space-y-4 relative z-10">
                        {aiInsight ? (
                            <>
                                <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                    "{aiInsight.insight}"
                                </p>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg shadow-sm text-nexus-primary">
                                        <Zap size={16} />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">תכל'ס לעשות</span>
                                        <span className="text-sm font-bold text-nexus-primary">{aiInsight.action}</span>
                                    </div>
                                    <button className="mr-auto text-xs font-bold text-nexus-accent hover:underline">
                                        בצע
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
                                <Activity size={24} className="opacity-20" />
                                <span className="text-xs">בודק נתונים...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Weak Spots & Repair Plan */}
                <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-6">
                    <h4 className="font-bold text-gray-900 text-sm mb-4">איפה כואב להם?</h4>
                    <div className="space-y-3">
                        {getDnaData(client).sort((a,b) => a.A - b.A).slice(0, 2).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 border border-red-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-red-500 font-bold text-xs shadow-sm">
                                        {item.A}
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-gray-800 block">{item.subject}</span>
                                        <span className="text-[10px] text-red-600">ציון נמוך</span>
                                    </div>
                                </div>
                                <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 hover:text-nexus-primary hover:border-nexus-primary transition-colors">
                                    איך מתקנים?
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};
