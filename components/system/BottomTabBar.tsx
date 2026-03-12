'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface TabItem {
    path: string;
    label: string;
    icon: LucideIcon;
}

interface BottomTabBarProps {
    items: TabItem[];
    activePath: string;
    onTabClick: (path: string) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ items, activePath, onTabClick }) => {
    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 pointer-events-none">
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent pointer-events-none"></div>
            
            <nav className="relative flex items-center justify-around bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-2xl pointer-events-auto max-w-md mx-auto ring-1 ring-white/5">
                {items.map((item) => {
                    const isActive = activePath === item.path;
                    return (
                        <button
                            key={item.path}
                            onClick={() => onTabClick(item.path)}
                            className="relative flex flex-col items-center justify-center py-2 px-1 flex-1 transition-all active:scale-90"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="bottomTabActive"
                                    className="absolute inset-0 bg-rose-600/20 rounded-xl border border-rose-600/30"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                            
                            <item.icon 
                                size={22} 
                                className={`relative z-10 transition-colors duration-300 ${
                                    isActive ? 'text-rose-400' : 'text-slate-500'
                                }`}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            
                            <span className={`relative z-10 text-[10px] font-bold mt-1 transition-colors duration-300 ${
                                isActive ? 'text-white' : 'text-slate-500'
                            }`}>
                                {item.label}
                            </span>
                            
                            {isActive && (
                                <motion.div 
                                    className="absolute -top-1 w-1 h-1 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(225,29,72,0.8)]"
                                    layoutId="bottomTabDot"
                                />
                            )}
                        </button>
                    );
                })}
            </nav>
            
            {/* Safe Area Spacer for iOS Home Bar */}
            <div className="h-safe-bottom"></div>
        </div>
    );
};
