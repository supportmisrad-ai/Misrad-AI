'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import Image from 'next/image';

export const Navbar = () => {
    const router = useRouter();
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const logoText = 'Misrad OS - מערכת צמיחה';
    const isLanding = pathname === '/';

    const handleNavClick = (id: string) => {
        setIsMenuOpen(false);
        if (!isLanding) {
            router.push('/');
            setTimeout(() => {
                const element = document.getElementById(id);
                if (element) element.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } else {
            const element = document.getElementById(id);
            if (element) element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-slate-800/50">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
                    <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-emerald-600/20 border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
                        <Image src="/icons/misrad-icon.svg" alt="MISRAD" width={36} height={36} className="w-full h-full object-contain p-1.5" priority />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-xl font-black text-white tracking-tight">{logoText || 'Misrad'}</span>
                        <span className="text-[10px] text-slate-400 font-medium">מבית MISRAD</span>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-8 bg-slate-900/50 px-6 py-2 rounded-full border border-slate-800">
                    <button onClick={() => handleNavClick('features')} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">פיצ׳רים</button>
                    <button onClick={() => window.open('/login?redirect=/app', '_blank', 'noopener,noreferrer')} className="text-sm font-medium text-indigo-400 hover:text-white transition-colors">מרכז הבקרה</button>
                    <button onClick={() => handleNavClick('comparison')} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">למה אנחנו</button>
                    <button onClick={() => handleNavClick('pricing')} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">מחירים</button>
                </div>

                <div className="hidden md:flex items-center gap-4">
                    <button onClick={() => router.push('/login')} className="text-sm font-bold text-white hover:text-indigo-400 transition-colors">
                        התחברות
                    </button>
                    <button onClick={() => router.push('/sign-up')} className="bg-white text-black px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors shadow-lg shadow-white/10 hover:shadow-white/20">
                        התחל חינם
                    </button>
                </div>

                <button 
                    className="md:hidden text-white" 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label={isMenuOpen ? 'סגור תפריט' : 'פתח תפריט'}
                >
                    {isMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="md:hidden bg-slate-900 border-b border-slate-800 overflow-hidden"
                    >
                        <div className="p-6 space-y-4 flex flex-col">
                            <button onClick={() => { setIsMenuOpen(false); handleNavClick('features'); }} className="text-lg font-medium text-slate-300 text-right">פיצ׳רים</button>
                            <button onClick={() => { setIsMenuOpen(false); window.open('/login?redirect=/app', '_blank', 'noopener,noreferrer'); }} className="text-lg font-medium text-indigo-400 text-right">מרכז הבקרה</button>
                            <button onClick={() => { setIsMenuOpen(false); handleNavClick('pricing'); }} className="text-lg font-medium text-slate-300 text-right">מחירים</button>
                            <div className="h-px bg-slate-800 my-2"></div>
                            <button onClick={() => router.push('/sign-up')} className="bg-indigo-600 text-white w-full py-3 rounded-xl font-bold">התחל חינם</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};
