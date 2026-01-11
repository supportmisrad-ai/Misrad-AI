'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export const FAQItem = ({ q, a, index }: { q: string, a: string, index: number }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="group"
        >
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-6 rounded-2xl border transition-all duration-300 text-right ${
                    isOpen 
                        ? 'bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border-indigo-500/50 shadow-2xl shadow-indigo-900/20' 
                        : 'bg-slate-900/30 border-slate-800 hover:border-indigo-500/30 hover:bg-slate-900/50'
                }`}
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm transition-all ${
                                isOpen 
                                    ? 'bg-indigo-500 text-white scale-110' 
                                    : 'bg-slate-800 text-slate-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-400'
                            }`}>
                                {index + 1}
                            </div>
                            <span className={`text-xl font-black transition-colors ${
                                isOpen ? 'text-white' : 'text-slate-200 group-hover:text-white'
                            }`}>
                                {q}
                            </span>
                        </div>
                        {isOpen && (
                            <motion.p 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="text-slate-300 leading-relaxed mt-4 text-base"
                            >
                                {a}
                            </motion.p>
                        )}
                    </div>
                    <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                        className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            isOpen 
                                ? 'bg-indigo-500 text-white' 
                                : 'bg-slate-800 text-slate-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-400'
                        }`}
                    >
                        <ChevronDown size={20} />
                    </motion.div>
                </div>
            </button>
        </motion.div>
    );
};
