
import React from 'react';
import { Client, Opportunity, SuccessGoal } from '../../types';
import { Trophy, Check, TrendingUp, Plus, Zap, Target, CreditCard, Calendar, ArrowRight, Gauge } from 'lucide-react';

interface ClientStrategyTabProps {
  client: Client;
  opportunities: Opportunity[];
  onAddOpportunity: () => void;
}

export const ClientStrategyTab: React.FC<ClientStrategyTabProps> = ({ client, opportunities, onAddOpportunity }) => {
  const totalROI = client.roiHistory?.reduce((acc, r) => acc + r.value, 0) || 0;
  
  return (
    <div className="space-y-8 animate-slide-up">
        
        {/* 1. Success Goals Tracker (Transparency & Motivation) */}
        <section>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Target size={20} className="text-nexus-accent"/> יעדים ומדדי הצלחה
                </h3>
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'הוספת יעד חדש — הפיצ׳ר בפיתוח.', type: 'info' } }))}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:border-nexus-primary transition-colors flex items-center gap-2 shadow-sm"
                >
                    <Plus size={14} /> יעד חדש
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {client.successGoals.map(goal => {
                    const progress = Math.min(100, Math.round((goal.metricCurrent / goal.metricTarget) * 100));
                    return (
                        <div key={goal.id} className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${goal.status === 'ACHIEVED' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                        <Gauge size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">{goal.title}</h4>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">דד-ליין: {goal.deadline}</span>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                                    goal.status === 'ACHIEVED' ? 'bg-green-50 text-green-600 border-green-200' : 
                                    goal.status === 'AT_RISK' ? 'bg-red-50 text-red-600 border-red-200' : 
                                    'bg-blue-50 text-blue-600 border-blue-200'
                                }`}>
                                    {goal.status === 'ACHIEVED' ? 'הושלם' : goal.status === 'AT_RISK' ? 'בסיכון' : 'בביצוע'}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase">בשטח</span>
                                        <span className="text-xl font-mono font-black text-slate-900">{goal.metricCurrent}{goal.unit}</span>
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase">המטרה</span>
                                        <span className="text-xl font-mono font-black text-nexus-accent">{goal.metricTarget}{goal.unit}</span>
                                    </div>
                                </div>

                                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${goal.status === 'ACHIEVED' ? 'bg-green-500' : 'bg-nexus-primary'}`} 
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                    <span className="text-gray-400">עודכן לאחרונה: {goal.lastUpdated}</span>
                                    <span className="text-nexus-primary bg-nexus-primary/5 px-2 py-0.5 rounded">{progress}% הושלמו</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>

        {/* 2. Value Hero (ROI) */}
        <section className="glass-card p-0 rounded-2xl overflow-hidden flex flex-col md:flex-row">
            <div className={`p-8 flex-1 relative overflow-hidden text-white ${totalROI >= 0 ? 'bg-nexus-primary' : 'bg-red-900'}`}>
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <h3 className="text-nexus-accent font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                        <Trophy size={14} /> {totalROI >= 0 ? 'תועלת כספית מצטברת ללקוח' : 'מאזן תועלת שלילי'}
                    </h3>
                    <div className="text-5xl font-display font-bold mb-2">₪{totalROI.toLocaleString()}</div>
                    <p className="text-gray-400 text-sm italic">סה"כ רווחים שהפקנו עבור הלקוח (בניכוי החזרים)</p>
                </div>
            </div>
            <div className="p-6 bg-white flex-1">
                <h4 className="text-gray-900 font-bold text-sm mb-4 italic">פירוט הצלחות ואירועים</h4>
                <div className="space-y-3">
                    {client.roiHistory?.map((r, i) => (
                        <div key={i} className="flex items-start justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                            <div className="flex gap-3">
                                <div className={`mt-1 p-1 rounded-full ${r.value < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                    {r.value < 0 ? <CreditCard size={10}/> : <Check size={10}/>}
                                </div>
                                <div>
                                    <span className={`font-bold block ${r.value < 0 ? 'text-red-700' : 'text-gray-800'}`}>{r.description}</span>
                                    <span className="text-[10px] text-gray-500">{r.date}</span>
                                </div>
                            </div>
                            <span className={`font-mono font-bold ${r.value < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {r.value < 0 ? '' : '+'}{r.value.toLocaleString()}
                            </span>
                        </div>
                    ))}
                    {(!client.roiHistory || client.roiHistory.length === 0) && <div className="text-gray-400 italic">אין עדיין נתונים</div>}
                </div>
            </div>
        </section>

        {/* 3. Opportunities (Growth) */}
        <section>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp size={20} className="text-nexus-primary" /> הצעות להגדלת רווחים
                </h3>
                <button
                    onClick={onAddOpportunity}
                    className="px-4 py-2 bg-nexus-accent text-white rounded-xl text-xs font-bold hover:bg-nexus-accent/90 transition-colors flex items-center gap-2 shadow-lg shadow-nexus-accent/20"
                >
                    <Plus size={16} /> הצעה חדשה
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {opportunities.map(opp => (
                    <div key={opp.id} className="glass-card p-5 rounded-xl border hover:border-nexus-accent/40 transition-all group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-nexus-accent/10 rounded-lg text-nexus-accent"><Zap size={18} /></div>
                            <span className="text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-500">{opp.status}</span>
                        </div>
                        <h4 className="font-bold text-gray-900 mb-1">{opp.title}</h4>
                        <div className="text-lg font-mono font-black text-nexus-primary">₪{opp.value.toLocaleString()}</div>
                    </div>
                ))}
            </div>
        </section>
    </div>
  );
};
