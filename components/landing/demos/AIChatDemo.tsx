'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export const AIChatDemo = () => {
    return (
        <div className="w-full h-full bg-[#1e1e2e] rounded-xl border border-slate-700 p-0 flex flex-col font-sans text-xs relative overflow-hidden">
            {/* Sidebar Mock */}
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-[#181825] border-l border-white/5 flex flex-col items-center py-4 gap-4 z-10">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white"><Sparkles size={14} /></div>
                <div className="w-6 h-6 rounded bg-white/10"></div>
                <div className="w-6 h-6 rounded bg-white/10"></div>
            </div>

            <div className="flex-1 p-6 pr-20 flex flex-col gap-4 overflow-hidden relative">
                 <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="self-start flex gap-3 max-w-[90%]"
                >
                    <div className="w-8 h-8 rounded-full bg-slate-700 border border-white/10 flex items-center justify-center shrink-0">
                         <span className="font-bold text-slate-400">You</span>
                    </div>
                    <div className="bg-[#313244] text-slate-200 p-3 rounded-2xl rounded-tr-none border border-white/5 shadow-sm">
                        נתח את רווחיות פרויקט "אלפא" ברבעון האחרון.
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ delay: 1.5, duration: 1.5 }}
                    className="self-end text-indigo-400 flex gap-1 mr-2"
                >
                    <Sparkles size={12} className="animate-pulse" /> מעבד נתונים...
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 3 }}
                    className="self-end flex gap-3 max-w-[95%] flex-row-reverse"
                >
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                         <Sparkles size={14} className="text-white" />
                    </div>
                    <div className="bg-[#181825] border border-indigo-500/30 text-slate-300 p-4 rounded-2xl rounded-tl-none shadow-xl w-full">
                        <div className="mb-2 font-bold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            ניתוח הושלם
                        </div>
                        <p className="mb-3 leading-relaxed">פרויקט אלפא הציג רווחיות של <span className="text-green-400 font-bold">24%</span>, עליה של 5% מהרבעון הקודם.</p>
                        
                        {/* Mini Chart Mock */}
                        <div className="h-16 flex items-end gap-1 mt-2 border-b border-white/10 pb-1">
                             {[30, 45, 60, 50, 75, 80].map((h, i) => (
                                 <motion.div 
                                    key={i}
                                    className="flex-1 bg-indigo-500/20 hover:bg-indigo-500/40 transition-colors rounded-t-sm"
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    transition={{ delay: 3.5 + (i * 0.1), duration: 0.5 }}
                                 ></motion.div>
                             ))}
                        </div>
                    </div>
                </motion.div>
            </div>
            
            {/* Input Bar Mock */}
            <div className="p-4 pr-20 border-t border-white/5 bg-[#181825]">
                <div className="w-full bg-[#1e1e2e] h-10 rounded-lg border border-white/10 flex items-center px-3 gap-2 text-slate-500">
                    <Sparkles size={14} />
                    <span>שאל את Nexus כל דבר...</span>
                </div>
            </div>
        </div>
    );
};
