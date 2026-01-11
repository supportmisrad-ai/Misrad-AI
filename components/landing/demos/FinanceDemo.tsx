'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart3 } from 'lucide-react';

export const FinanceDemo = () => {
    return (
        <div className="w-full h-full bg-[#0F172A] rounded-xl border border-slate-700/50 p-6 relative overflow-hidden flex flex-col shadow-inner">
            <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">יתרה זמינה</div>
                    <div className="text-3xl font-black text-white tracking-tight">—</div>
                    <div className="text-xs text-emerald-400 flex items-center gap-1 mt-1 font-bold">
                        <TrendingUp size={12} /> —
                    </div>
                </div>
                <div className="p-2 bg-slate-800 rounded-lg border border-slate-700 text-slate-400">
                    <BarChart3 size={20} />
                </div>
            </div>

            {/* Fake Credit Card */}
            <motion.div 
                className="absolute -right-4 top-20 w-48 h-28 bg-gradient-to-bl from-indigo-500 to-purple-600 rounded-xl shadow-2xl shadow-indigo-900/40 border-t border-white/20 p-4 flex flex-col justify-between z-10 rotate-[-12deg]"
                animate={{ y: [0, -10, 0], rotate: [-12, -10, -12] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
                <div className="flex justify-between items-start">
                     <div className="text-white/80 font-bold italic text-xs">Nexus Card</div>
                     <div className="w-6 h-4 bg-white/20 rounded"></div>
                </div>
                <div>
                    <div className="text-white/90 text-[10px] tracking-widest mb-1">•••• •••• •••• ••••</div>
                    <div className="text-white/60 text-[8px]">—</div>
                </div>
            </motion.div>

            {/* Chart Area */}
            <div className="flex-1 mt-auto relative z-0">
                {/* Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                    <div className="border-t border-slate-500 w-full"></div>
                    <div className="border-t border-slate-500 w-full"></div>
                    <div className="border-t border-slate-500 w-full"></div>
                </div>
                
                {/* SVG Area Chart */}
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <motion.path 
                        d="M0,80 C20,70 40,90 60,60 C80,30 100,50 120,40 C140,30 160,10 200,5 C240,0 280,30 320,20 L320,100 L0,100 Z"
                        fill="url(#chartGradient)"
                        initial={{ opacity: 0, pathLength: 0 }}
                        animate={{ opacity: 1, pathLength: 1 }}
                        transition={{ duration: 1.5 }}
                    />
                    <motion.path 
                        d="M0,80 C20,70 40,90 60,60 C80,30 100,50 120,40 C140,30 160,10 200,5 C240,0 280,30 320,20"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.5 }}
                        strokeLinecap="round"
                    />
                </svg>
            </div>
        </div>
    );
};
