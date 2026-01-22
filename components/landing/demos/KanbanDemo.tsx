'use client';

import React from 'react';
import { motion } from 'framer-motion';

export const KanbanDemo = () => {
    return (
        <div className="w-full h-full bg-[#0F1117] rounded-xl border border-slate-800/60 p-5 flex flex-col gap-4 overflow-hidden relative select-none shadow-inner">
            {/* Fake Header */}
            <div className="flex justify-between items-center border-b border-slate-800/50 pb-3">
                <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-[#C5A572]/15 border border-[#C5A572]/45"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                </div>
                <div className="flex gap-2 text-slate-400">
                    <div className="w-8 h-2 bg-slate-800 rounded"></div>
                    <div className="w-6 h-2 bg-slate-800 rounded"></div>
                </div>
            </div>

            <div className="flex gap-3 sm:gap-4 h-full overflow-x-auto no-scrollbar">
                <div className="flex gap-3 sm:gap-4 h-full min-w-max">
                {['ממתין', 'בביצוע', 'בוצע'].map((col, i) => (
                        <div key={col} className="flex flex-col gap-3 min-w-[100px] sm:min-w-[120px] w-[100px] sm:w-auto sm:flex-1">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                            {col} <span className="bg-slate-800 px-1.5 rounded text-slate-400">{i === 1 ? 3 : 2}</span>
                        </div>
                        
                        {/* Static Cards */}
                        <div className="bg-[#1E212B] p-3 rounded-lg border border-slate-700/50 shadow-sm flex flex-col gap-2 group hover:border-indigo-500/30 transition-colors">
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] text-slate-400">NX-{100 + i}</span>
                                <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500"></div>
                            </div>
                            <div className="h-2 w-3/4 bg-slate-700 rounded-full"></div>
                            <div className="h-2 w-1/2 bg-slate-700/50 rounded-full"></div>
                        </div>

                        {i === 1 && (
                             <motion.div 
                                layoutId="moving-card"
                                className="bg-[#1E212B] p-3 rounded-lg border border-indigo-500/50 shadow-lg shadow-indigo-500/10 flex flex-col gap-2 relative z-10"
                                animate={{ y: [0, 10, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <div className="flex justify-between items-start">
                                    <span className="text-[10px] text-indigo-400 font-bold">NX-204</span>
                                    <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-[8px] text-white font-bold">D</div>
                                </div>
                                <div className="text-[11px] text-slate-200 font-medium leading-tight">עיצוב מחדש לדף הבית</div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[9px] border border-red-500/20">דחוף</span>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px]">Frontend</span>
                                </div>
                            </motion.div>
                        )}
                    </div>
                ))}
                </div>
            </div>
            
            {/* Gradient Overlay */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0F1117] to-transparent pointer-events-none"></div>
        </div>
    );
};
