'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowUpRight, MoreHorizontal, Check } from 'lucide-react';

export const ClientOSDemo = () => {
    const [view, setView] = useState<'list' | 'analytics' | 'activity'>('list');

    const activeTabClass = "text-slate-100 border-b border-slate-100";
    const inactiveTabClass = "text-slate-400 border-b border-transparent hover:text-slate-300";

    return (
        <div className="w-full h-full relative flex items-center justify-center p-4 select-none font-sans font-display">
            {/* Main Card */}
            <div className="w-full max-w-[550px] bg-[#0F111A] rounded-xl border border-slate-800 shadow-2xl shadow-black/50 flex flex-col h-[400px] relative z-10 overflow-hidden">
                {/* Header / Navigation */}
                <div className="flex items-center justify-between px-6 pt-5 pb-0 border-b border-slate-800/50 bg-[#0F111A]">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">תיק לקוחות</span>
                    </div>
                    
                    <div className="flex gap-6">
                        <button onClick={() => setView('list')} className={`text-[11px] font-bold py-3 transition-all ${view === 'list' ? activeTabClass : inactiveTabClass}`}>
                            רשימה
                        </button>
                        <button onClick={() => setView('analytics')} className={`text-[11px] font-bold py-3 transition-all ${view === 'analytics' ? activeTabClass : inactiveTabClass}`}>
                            מדדים
                        </button>
                        <button onClick={() => setView('activity')} className={`text-[11px] font-bold py-3 transition-all ${view === 'activity' ? activeTabClass : inactiveTabClass}`}>
                            פעולות
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 relative bg-[#0B0D14] p-5">
                    {/* VIEW 1: CLIENT LIST */}
                    <AnimatePresence mode="wait">
                        {view === 'list' && (
                            <motion.div 
                                key="list"
                                className="absolute inset-0 p-5 overflow-hidden flex flex-col gap-3"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="flex justify-between items-end mb-1">
                                    <div className="text-sm text-slate-400">לקוחות פעילים</div>
                                    <div className="flex gap-2 text-[10px] text-slate-400">
                                        <span>סינון</span>
                                        <span>מיון</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-400 font-bold px-2 mb-1">
                                    <div className="col-span-5">שם הלקוח</div>
                                    <div className="col-span-3">סטטוס</div>
                                    <div className="col-span-4 text-left">שווי תיק</div>
                                </div>

                                <div className="space-y-1">
                                    {[
                                        { name: "Strauss Group", status: "Active", val: "₪45,000", risk: false },
                                        { name: "CyberArk", status: "Risk", val: "₪120,000", risk: true },
                                        { name: "Bank Leumi", status: "Active", val: "₪85,000", risk: false },
                                        { name: "Wix HQ", status: "Review", val: "₪32,500", risk: false },
                                    ].map((client, i) => (
                                        <div key={i} className="grid grid-cols-12 gap-2 items-center p-2.5 rounded bg-[#131620] border border-slate-800/50 hover:border-slate-700 transition-colors group">
                                            <div className="col-span-5 flex items-center gap-2">
                                                <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-[8px] text-slate-300 font-bold border border-slate-700">
                                                    {client.name.substring(0,1)}
                                                </div>
                                                <span className="text-xs text-slate-200 font-medium group-hover:text-white transition-colors truncate">{client.name}</span>
                                            </div>
                                            <div className="col-span-3">
                                                {client.risk ? (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[9px] text-red-400 font-medium">בסיכון</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/5 border border-emerald-500/10 text-[9px] text-emerald-400/80 font-medium">פעיל</span>
                                                )}
                                            </div>
                                            <div className="col-span-4 text-left text-xs font-mono text-slate-400 group-hover:text-slate-200">
                                                {client.val}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="mt-auto bg-amber-900/10 border-r-2 border-amber-600 p-2.5 flex items-start gap-2">
                                    <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                        <div className="text-[10px] text-amber-200 font-bold">התראת נטישה</div>
                                        <div className="text-[10px] text-amber-500/80 leading-tight">זוהתה ירידה בפעילות בתיק CyberArk. מומלץ ליזום שיחה.</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* VIEW 2: ANALYTICS */}
                    <AnimatePresence mode="wait">
                        {view === 'analytics' && (
                            <motion.div 
                                key="analytics"
                                className="absolute inset-0 p-6 flex flex-col gap-6"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg bg-[#131620] border border-slate-800">
                                        <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">הכנסה חודשית קבועה</div>
                                        <div className="text-2xl font-light text-white tracking-tight">₪248,500</div>
                                        <div className="text-[10px] text-emerald-500 flex items-center gap-1 mt-1">
                                            <ArrowUpRight size={10} /> +12% החודש
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-lg bg-[#131620] border border-slate-800">
                                        <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">שביעות רצון (CSAT)</div>
                                        <div className="text-2xl font-light text-white tracking-tight">9.4<span className="text-sm text-slate-600 font-normal">/10</span></div>
                                        <div className="text-[10px] text-emerald-500 flex items-center gap-1 mt-1">
                                            <ArrowUpRight size={10} /> יציב
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 bg-[#131620] border border-slate-800 rounded-lg p-4 relative flex flex-col">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-4 flex justify-between">
                                        <span>מגמת צמיחה (Q3)</span>
                                        <MoreHorizontal size={12} />
                                    </div>
                                    
                                    <div className="flex-1 flex items-end justify-between gap-2 px-2">
                                        {[40, 65, 50, 80, 70, 95, 85].map((h, i) => (
                                            <motion.div 
                                                key={i}
                                                className="w-full bg-slate-800 rounded-t-sm relative group hover:bg-slate-700 transition-colors"
                                                initial={{ height: 0 }}
                                                animate={{ height: `${h}%` }}
                                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                            >
                                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                    {h * 1000}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between mt-2 text-[9px] text-slate-600 font-mono">
                                        <span>JUL</span>
                                        <span>AUG</span>
                                        <span>SEP</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* VIEW 3: ACTIVITY */}
                    <AnimatePresence mode="wait">
                        {view === 'activity' && (
                            <motion.div 
                                key="activity"
                                className="absolute inset-0 p-5 flex flex-col gap-3"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="text-[11px] text-slate-400 font-bold mb-1">משימות לטיפול היום</div>
                                
                                {[
                                    { task: "הכנת הצעת מחיר לחידוש חוזה", client: "Intel Corp", time: "14:00", urgent: true },
                                    { task: "שיחת סטטוס רבעונית", client: "Amdocs", time: "16:30", urgent: false },
                                    { task: "שליחת דוח סיכום חודש", client: "Fiverr", time: "מחר", urgent: false },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded border border-slate-800 bg-[#131620]">
                                        <div className={`w-1 h-8 rounded-full ${item.urgent ? 'bg-amber-500' : 'bg-slate-700'}`}></div>
                                        <div className="flex-1">
                                            <div className="text-xs text-slate-200 font-medium">{item.task}</div>
                                            <div className="text-[10px] text-slate-400 mt-0.5 flex gap-2">
                                                <span>{item.client}</span>
                                                <span className="text-slate-700">•</span>
                                                <span>{item.time}</span>
                                            </div>
                                        </div>
                                        <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400 transition-colors">
                                            <Check size={14} />
                                        </button>
                                    </div>
                                ))}

                                <div className="mt-4 pt-4 border-t border-slate-800">
                                    <div className="text-[11px] text-slate-400 font-bold mb-2">סיכום אוטומטי (AI)</div>
                                    <div className="text-[11px] text-slate-400 leading-relaxed p-3 bg-slate-900/50 rounded border border-slate-800/50 italic">
                                        "בפגישה האחרונה עם Intel עלתה דרישה להרחבת חבילת השירות. יש לשלוח הצעת מחיר מעודכנת עד סוף היום..."
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-slate-800/20 blur-[100px] pointer-events-none rounded-full"></div>
        </div>
    );
};
