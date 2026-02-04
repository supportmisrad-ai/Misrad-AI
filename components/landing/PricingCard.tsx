'use client';

import React, { useState } from 'react';
import { Check, ArrowRight, Sparkles, Zap, Crown, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface PricingCardProps {
    title: string;
    price: number;
    features: (string | React.ReactNode)[];
    recommended?: boolean;
    onSelect: () => void;
    billingCycle: 'monthly' | 'yearly';
    subtitle?: string;
    systemSubtitle?: string; // שם קטן בעברית: "לידים ומכירות", "ניהול לקוחות", "ניהול עסק"
    accent?: 'indigo' | 'gold';
}

export const PricingCard = ({ title, price, features, recommended = false, onSelect, billingCycle, subtitle, systemSubtitle, accent = 'indigo' }: PricingCardProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const finalPrice = billingCycle === 'yearly' ? Math.round(price * 0.8) : price;
    const monthlySavings = billingCycle === 'yearly' ? Math.round(price * 0.2) : 0;

    const isGold = accent === 'gold';

    return (
        <motion.div
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            whileHover={{ y: recommended ? -8 : -4 }}
            className={`relative pt-8 sm:pt-12 pb-6 sm:pb-8 px-4 sm:px-6 md:px-8 rounded-2xl sm:rounded-3xl border-2 flex flex-col h-full transition-all duration-500 group ${
                recommended 
                    ? `bg-white ${isGold ? 'border-[#C5A572]/40' : 'border-indigo-300'} shadow-xl z-10 scale-105` 
                    : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
            }`}
            style={{ 
                boxSizing: 'border-box',
                overflow: 'visible',
                isolation: 'isolate'
            }}
        >
            {/* Animated Background Glow */}
            {recommended && (
                <>
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl ${
                        isGold
                            ? 'bg-gradient-to-r from-[#FFD700]/10 via-[#FFD700]/10 to-[#FFD700]/10'
                            : 'bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5'
                    }`} />
                    <motion.div
                        className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none ${isGold ? 'bg-[#FFD700]/20' : 'bg-indigo-500/20'}`}
                        animate={{
                            scale: isHovered ? [1, 1.2, 1] : 1,
                            opacity: isHovered ? [0.3, 0.5, 0.3] : 0.2,
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{ willChange: 'transform, opacity' }}
                    />
                </>
            )}

            {/* Recommended Badge - Enhanced */}
            {recommended && (
                <motion.div
                    initial={{ scale: 0, rotate: -12 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
                    style={{ willChange: 'transform' }}
                >
                    <div className="relative">
                        <div className={`absolute inset-0 blur-xl opacity-75 animate-pulse -z-10 ${isGold ? 'bg-[#C5A572]' : 'bg-indigo-500'}`} />
                        <div className={`relative text-white text-xs font-black px-5 py-2 rounded-full uppercase tracking-wider shadow-2xl border-2 border-white/20 backdrop-blur-sm whitespace-nowrap ${
                            isGold
                                ? 'bg-gradient-to-r from-[#C5A572] via-[#D4AF6E] to-[#E5C17A]'
                                : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500'
                        }`}>
                            <div className="flex items-center gap-2">
                                <Crown size={14} className="fill-white/90 text-white/90 shrink-0" />
                                <span>הכי משתלם</span>
                                <Sparkles size={12} className="text-white/90 shrink-0" />
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Header Section */}
            <div className="mb-6 sm:mb-8 relative z-10 mt-2">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className={`text-xl sm:text-2xl font-black mb-1 ${recommended ? `text-transparent bg-clip-text bg-gradient-to-r ${isGold ? 'from-[#C5A572] to-[#E5C17A]' : 'from-indigo-600 to-purple-600'}` : 'text-slate-900'}`}>
                            {title}
                        </h3>
                        {systemSubtitle && (
                            <p className={`text-xs font-bold mb-2 leading-tight ${isGold ? 'text-[#C5A572]' : 'text-indigo-600'}`}>
                                {systemSubtitle}
                            </p>
                        )}
                        {subtitle && (
                            <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">{subtitle}</p>
                        )}
                    </div>
                    {recommended && (
                        <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                            className="shrink-0 ml-2"
                        >
                            <Zap size={20} className={isGold ? 'text-[#C5A572] fill-[#C5A572]/30' : 'text-indigo-200 fill-indigo-200/30'} />
                        </motion.div>
                    )}
                </div>

                {/* Price Display - Enhanced */}
                <div className="relative">
                    <div className="flex items-baseline gap-1.5 sm:gap-2 mb-2">
                        <span className={`text-4xl sm:text-5xl font-black ${recommended ? `text-transparent bg-clip-text bg-gradient-to-r ${isGold ? 'from-[#C5A572] to-[#E5C17A]' : 'from-indigo-600 to-purple-600'}` : 'text-slate-900'}`}>
                            ₪{finalPrice}
                        </span>
                        <span className="text-slate-400 text-xs sm:text-sm font-bold">/חודש</span>
                    </div>
                    
                    {billingCycle === 'yearly' && (
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 mt-2"
                        >
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
                                <TrendingUp size={12} className="text-emerald-600" />
                                <span className="text-xs text-emerald-700 font-bold">
                                    חסוך ₪{monthlySavings}/חודש
                                </span>
                            </div>
                            <span className="text-xs text-slate-500 line-through">₪{price}</span>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Features List - Enhanced */}
            <ul className="space-y-2.5 sm:space-y-3.5 mb-6 sm:mb-8 flex-1 relative z-10 overflow-y-auto min-h-0">
                {features.map((feature, i) => (
                    <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm break-words"
                    >
                        {typeof feature === 'string' ? (
                            <>
                                <motion.div
                                    whileHover={{ scale: 1.2, rotate: 360 }}
                                    transition={{ duration: 0.3 }}
                                    className={`mt-0.5 rounded-full p-1 shrink-0 ${
                                        recommended 
                                            ? (isGold ? 'bg-[#C5A572]/10 text-[#C5A572] border border-[#C5A572]/20' : 'bg-indigo-50 text-indigo-700 border border-indigo-100') 
                                            : 'bg-slate-50 text-slate-500 border border-slate-200'
                                    }`}
                                >
                                    <Check size={14} strokeWidth={3} className={recommended ? (isGold ? 'text-[#C5A572]' : 'text-indigo-700') : 'text-slate-500'} />
                                </motion.div>
                                <span className={`flex-1 leading-relaxed break-words ${recommended ? 'text-slate-700 font-medium' : 'text-slate-600'}`}>
                                    {feature}
                                </span>
                            </>
                        ) : (
                            <span className="w-full">{feature}</span>
                        )}
                    </motion.li>
                ))}
            </ul>

            {/* CTA Button - Enhanced */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSelect}
                className={`relative w-full py-3 sm:py-4 rounded-full font-black text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden group/btn ${
                    recommended
                        ? (isGold
                            ? 'bg-gradient-to-r from-[#C5A572] via-[#D4AF6E] to-[#E5C17A] text-slate-900 shadow-xl shadow-[#C5A572]/20 hover:shadow-2xl hover:shadow-[#C5A572]/30 mb-6'
                            : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white shadow-xl shadow-indigo-900/40 hover:shadow-2xl hover:shadow-indigo-900/60 mb-6'
                        )
                        : (isGold
                            ? 'bg-[#C5A572]/10 text-slate-900 hover:bg-[#C5A572]/15 border border-[#C5A572]/30 shadow-sm hover:shadow-md mb-6'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 shadow-sm hover:shadow-md mb-6'
                        )
                }`}
            >
                {/* Button Shine Effect */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.6 }}
                />
                
                <span className="relative z-10 flex items-center gap-2">
                    {recommended ? 'התחל עכשיו' : 'בחר חבילה'}
                    <ArrowRight 
                        size={18} 
                        className="rotate-180 group-hover/btn:translate-x-[-4px] transition-transform" 
                    />
                </span>
            </motion.button>

            {/* Popular Indicator */}
            {recommended && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-slate-500 flex items-center gap-1 pointer-events-none mb-2"
                    style={{ marginBottom: '0.5rem' }}
                >
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                    <span className="whitespace-nowrap">הכי פופולרי</span>
                </motion.div>
            )}
        </motion.div>
    );
};
