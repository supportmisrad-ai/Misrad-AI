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
                        ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                        : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                }`}
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm transition-all ${
                                isOpen 
                                    ? 'bg-indigo-500 text-white scale-110' 
                                    : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-700'
                            }`}>
                                {index + 1}
                            </div>
                            <span className={`text-xl font-black transition-colors ${
                                isOpen ? 'text-slate-900' : 'text-slate-900 group-hover:text-indigo-700'
                            }`}>
                                {q}
                            </span>
                        </div>
                        {isOpen && (
                            <motion.p 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="text-slate-600 leading-relaxed mt-4 text-base"
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
                                : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-700'
                        }`}
                    >
                        <ChevronDown size={20} />
                    </motion.div>
                </div>
            </button>
        </motion.div>
    );
};
