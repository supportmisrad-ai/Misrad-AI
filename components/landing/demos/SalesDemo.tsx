'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Phone, Mail } from 'lucide-react';

export const SalesDemo = () => {
    const [revenue, setRevenue] = useState(145000);
    const [activities, setActivities] = useState([
        { text: 'דני סגר עסקה (₪5,000)', type: 'deal', time: 'עכשיו' },
        { text: 'שיחה חדשה נכנסה', type: 'call', time: 'לפני דקה' },
        { text: 'הצעת מחיר נשלחה', type: 'mail', time: 'לפני 5 דק׳' },
    ]);

    useEffect(() => {
        const interval = setInterval(() => {
            setActivities(prev => [
                { text: 'ליד חדש נקלט', type: 'lead', time: 'עכשיו' },
                ...prev.slice(0, 2)
            ]);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-full bg-[#0B1221] rounded-xl border border-slate-800 p-5 relative overflow-hidden flex flex-col font-sans select-none">
            {/* Live Feed Widget (Floating) */}
            <motion.div 
                className="absolute top-4 left-4 z-20 w-48 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-3 shadow-2xl"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
            >
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">פעילות בזמן אמת</span>
                </div>
                <div className="space-y-2">
                    <AnimatePresence mode='popLayout'>
                        {activities.map((act, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex items-center gap-2 text-[10px]"
                            >
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                    act.type === 'deal' ? 'bg-emerald-500/20 text-emerald-400' :
                                    act.type === 'call' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-slate-700 text-slate-400'
                                }`}>
                                    {act.type === 'deal' ? <DollarSign size={10} /> : act.type === 'call' ? <Phone size={10} /> : <Mail size={10} />}
                                </div>
                                <div className="text-slate-300 truncate">{act.text}</div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Header */}
            <div className="flex justify-between items-center mb-6 z-10 pl-56">
                <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                    ₪{revenue.toLocaleString()}
                </div>
            </div>

            {/* Pipeline Cols */}
            <div className="grid grid-cols-3 gap-3 flex-1 z-10 relative">
                {[
                    { title: 'לידים', count: 12, color: 'bg-blue-500' },
                    { title: 'מו״מ', count: 5, color: 'bg-yellow-500' },
                    { title: 'סגירה', count: 8, color: 'bg-emerald-500' }
                ].map((col, i) => (
                    <div key={i} className="flex flex-col h-full">
                        <div className="flex justify-between items-center mb-2 px-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{col.title}</span>
                            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 rounded">{col.count}</span>
                        </div>
                        <div className="flex-1 bg-slate-800/30 rounded-lg border border-slate-800/50 p-1.5 space-y-2 relative">
                            {/* Static Cards */}
                            {[1, 2].map((_, idx) => (
                                <div key={idx} className="bg-slate-700/40 h-8 rounded border border-slate-600/30"></div>
                            ))}
                            
                            {/* The Moving Deal */}
                            <motion.div 
                                className="absolute top-1.5 left-1.5 right-1.5 h-10 bg-white rounded shadow-lg z-20 flex items-center justify-center border-l-4 border-indigo-500"
                                initial={{ x: 0, opacity: 0 }}
                                animate={{ 
                                    x: [0, 0, -105, -105, -210, -210],
                                    y: [0, 0, 0, 0, 0, 50],
                                    opacity: [0, 1, 1, 1, 1, 0],
                                    scale: [0.8, 1, 1, 1, 1, 0.5]
                                }}
                                transition={{ 
                                    duration: 4, 
                                    repeat: Infinity, 
                                    times: [0, 0.1, 0.4, 0.5, 0.8, 1],
                                    repeatDelay: 0.5 
                                }}
                                onUpdate={(latest) => {
                                    if (typeof latest.x === 'number' && latest.x <= -200 && Math.random() > 0.95) {
                                        setRevenue(prev => prev + 150);
                                    }
                                }}
                            >
                                <div className="flex flex-col gap-1 w-full px-2">
                                    <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                                    <div className="w-8 h-1 bg-slate-100 rounded-full opacity-50"></div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98105_1px,transparent_1px),linear-gradient(to_bottom,#10b98105_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        </div>
    );
};
