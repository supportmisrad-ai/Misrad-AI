
import React from 'react';
import { useData } from '../context/DataContext';
import { TrendingUp, Users, DollarSign, Target, ArrowUpRight, BarChart3, Clock, Trophy } from 'lucide-react';
import { LeadStatus } from '../types';
import { motion } from 'framer-motion';

export const SalesDashboard: React.FC = () => {
    const { leads, monthlyGoals } = useData();

    // Sales Calculations
    const wonLeads = leads.filter(l => l.status === LeadStatus.WON);
    const activeLeads = leads.filter(l => l.status !== LeadStatus.WON && l.status !== LeadStatus.LOST);
    
    const currentRevenue = wonLeads.reduce((acc, l) => acc + l.value, 0);
    const pipelineValue = activeLeads.reduce((acc, l) => acc + l.value, 0);
    const targetRevenue = monthlyGoals.revenue || 100000;
    const progress = Math.min((currentRevenue / targetRevenue) * 100, 100);
    
    const winRate = (wonLeads.length / (leads.filter(l => l.status === LeadStatus.WON || l.status === LeadStatus.LOST).length || 1)) * 100;

    const formatCurrency = (val: number) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-8">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">הכנסות החודש</p>
                            <h3 className="text-3xl font-black text-white">{formatCurrency(currentRevenue)}</h3>
                        </div>
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold relative z-10">
                        <span className="text-emerald-400 flex items-center gap-1"><ArrowUpRight size={14} /> 12%</span>
                        <span className="text-slate-500">מהחודש שעבר</span>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group"
                >
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">שווי צנרת עסקאות</p>
                            <h3 className="text-3xl font-black text-white">{formatCurrency(pipelineValue)}</h3>
                        </div>
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: '45%' }}></div>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group"
                >
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">יחס סגירה (Win Rate)</p>
                            <h3 className="text-3xl font-black text-white">{Math.round(winRate)}%</h3>
                        </div>
                        <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                            <Trophy size={20} />
                        </div>
                    </div>
                    <div className="text-xs text-slate-500">
                        מתוך {leads.length} לידים שנפתחו
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-emerald-600 to-teal-800 border border-emerald-500/30 p-6 rounded-2xl relative overflow-hidden text-white"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-10 translate-x-10"></div>
                    <div className="relative z-10">
                        <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">יעד חודשי</p>
                        <h3 className="text-3xl font-black mb-4">{Math.round(progress)}%</h3>
                        <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden backdrop-blur-sm">
                            <motion.div 
                                initial={{ width: 0 }} 
                                animate={{ width: `${progress}%` }} 
                                transition={{ duration: 1.5, ease: "easeOut" }} 
                                className="h-full bg-white rounded-full" 
                            />
                        </div>
                        <div className="flex justify-between text-[10px] font-bold mt-2 opacity-80">
                            <span>{formatCurrency(currentRevenue)}</span>
                            <span>{formatCurrency(targetRevenue)}</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Main Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Deals List */}
                <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-6">
                        <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2"><Target size={18} className="sm:w-5 sm:h-5 text-emerald-500" /> עסקאות חמות</h3>
                        <button className="text-xs text-emerald-400 hover:text-emerald-300 font-bold whitespace-nowrap">לכל העסקאות</button>
                    </div>
                    <div className="space-y-3">
                        {activeLeads.slice(0, 5).map(lead => (
                            <div key={lead.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-emerald-500/50 transition-colors group cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 text-sm">
                                        {lead.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{lead.name}</h4>
                                        <p className="text-xs text-slate-500">{lead.company || 'לקוח פרטי'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-white font-mono">{formatCurrency(lead.value)}</div>
                                    <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full inline-block mt-1">
                                        {lead.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Clock size={20} className="text-blue-500" /> פעילות אחרונה</h3>
                    <div className="space-y-6 relative">
                        <div className="absolute top-2 bottom-2 right-[19px] w-px bg-slate-800"></div>
                        {[1, 2, 3, 4].map((_, i) => (
                            <div key={i} className="flex gap-4 relative z-10">
                                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                                    {i % 2 === 0 ? <Users size={16} className="text-blue-400" /> : <DollarSign size={16} className="text-emerald-400" />}
                                </div>
                                <div>
                                    <p className="text-sm text-slate-300">
                                        <span className="font-bold text-white">איתמר</span> {i % 2 === 0 ? 'ביצע שיחת מכירה עם' : 'יצר עסקה חדשה עבור'} <span className="text-emerald-400">חברת טק בע״מ</span>
                                    </p>
                                    <p className="text-xs text-slate-600 mt-1">לפני {i * 15 + 5} דקות</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
