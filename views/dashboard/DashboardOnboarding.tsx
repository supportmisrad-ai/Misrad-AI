'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Check, ChevronRight, Rocket } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type OnboardingStep = {
    id: number;
    label: string;
    subLabel: string;
    done: boolean;
    icon: LucideIcon;
    action: () => void;
    color: string;
};

interface DashboardOnboardingProps {
    steps: OnboardingStep[];
    progressPercent: number;
    onDismiss: () => void;
}

export const DashboardOnboarding: React.FC<DashboardOnboardingProps> = ({
    steps,
    progressPercent,
    onDismiss,
}) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="relative overflow-hidden rounded-[2.5rem] p-1 shadow-2xl mb-8"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-20"></div>

            <div className="relative bg-white/90 backdrop-blur-xl rounded-[2.3rem] p-8 md:p-10 border border-white/50 overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

                <button
                    type="button"
                    onClick={onDismiss} 
                    className="absolute top-6 left-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-20"
                    aria-label="סגור תדריך התחלה"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col lg:flex-row gap-10 relative z-10">
                    <div className="lg:w-1/3 flex flex-col justify-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-bold w-fit mb-6 shadow-lg shadow-slate-900/20">
                            <Rocket size={12} className="text-yellow-400" />
                            <span>צעדים ראשונים</span>
                        </div>
                        
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight tracking-tight mb-4">
                            ברוכים הבאים ל-<br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">MISRAD AI</span>
                        </h2>
                        
                        <p className="text-slate-500 text-sm leading-relaxed mb-6 max-w-sm">
                            המערכת שתעשה לך סדר בראש ובעסק. השלם את הצעדים כדי להתחיל ברגל ימין.
                        </p>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                                <span>התקדמות</span>
                                <span>{Math.round(progressPercent)}%</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }} 
                                    animate={{ width: `${progressPercent}%` }} 
                                    transition={{ duration: 1, ease: "easeOut" }} 
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.4)] relative"
                                >
                                    <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
                                </motion.div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {steps.map((step) => {
                            const isDone = step.done;
                            return (
                                <button 
                                    key={step.id}
                                    onClick={step.action}
                                    disabled={isDone}
                                    className={`relative group flex flex-col p-5 rounded-3xl border text-right transition-all duration-300 overflow-hidden ${
                                        isDone 
                                        ? 'bg-slate-50 border-slate-200 opacity-60' 
                                        : 'bg-white border-slate-200/70 shadow-lg shadow-slate-200/50 hover:border-indigo-200 hover:bg-indigo-50/30 hover:shadow-xl hover:-translate-y-1'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                                            isDone 
                                            ? 'bg-green-100 text-green-600' 
                                            : 'bg-slate-50 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                                        }`}>
                                            {isDone ? <Check size={20} strokeWidth={3} /> : <step.icon size={22} />}
                                        </div>
                                        {!isDone && (
                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                <ChevronRight size={16} />
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="mt-auto">
                                        <h3 className={`font-bold text-base mb-1 ${isDone ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                            {step.label}
                                        </h3>
                                        <p className={`text-xs ${isDone ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {step.subLabel}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
