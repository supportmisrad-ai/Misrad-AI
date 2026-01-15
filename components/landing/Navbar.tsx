'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import Image from 'next/image';

export const Navbar = () => {
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const logoText = 'MISRAD CRM';

    const handleNavClick = (id: string) => {
        setIsMenuOpen(false);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            return;
        }
        router.push('/');
        setTimeout(() => {
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    return (
        <motion.nav
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-xl shadow-slate-200/40"
        >
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
                    <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-white/70 border border-slate-200/70 shadow-lg shadow-slate-200/60">
                        <Image src="/icons/misrad-icon.svg" alt="MISRAD" width={36} height={36} className="w-full h-full object-contain p-1.5" priority />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-xl font-black text-slate-900 tracking-tight">{logoText || 'Misrad'}</span>
                        <span className="text-[10px] text-slate-400 font-medium">מבית MISRAD</span>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-8 bg-white/60 backdrop-blur-md px-6 py-2 rounded-full border border-slate-200/70 shadow-lg shadow-slate-200/50">
                    <button onClick={() => handleNavClick('features')} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">פיצ׳רים</button>
                    <button onClick={() => window.open('/login?redirect=/app', '_blank', 'noopener,noreferrer')} className="text-sm font-medium text-slate-900 hover:text-slate-700 transition-colors">מרכז הבקרה</button>
                    <button onClick={() => handleNavClick('comparison')} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">למה אנחנו</button>
                    <button onClick={() => handleNavClick('pricing')} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">מחירים</button>
                </div>

                <div className="hidden md:flex items-center gap-4">
                    <button onClick={() => router.push('/login')} className="text-sm font-bold text-slate-700 hover:text-indigo-600 transition-colors">
                        התחברות
                    </button>
                    <button onClick={() => router.push('/sign-up')} className="bg-gradient-to-r from-slate-900 to-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:from-slate-800 hover:to-slate-600 transition-all shadow-xl shadow-slate-900/10">
                        התחל חינם
                    </button>
                </div>

                <button 
                    className="md:hidden text-slate-900" 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label={isMenuOpen ? 'סגור תפריט' : 'פתח תפריט'}
                >
                    {isMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMenuOpen ? (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="md:hidden bg-white/70 backdrop-blur-xl border-b border-slate-200/60 overflow-hidden shadow-2xl shadow-slate-200/50"
                    >
                        <div className="p-6 space-y-4 flex flex-col">
                            <button onClick={() => { setIsMenuOpen(false); handleNavClick('features'); }} className="text-lg font-medium text-slate-700 text-right">פיצ׳רים</button>
                            <button onClick={() => { setIsMenuOpen(false); window.open('/login?redirect=/app', '_blank', 'noopener,noreferrer'); }} className="text-lg font-medium text-slate-900 text-right">מרכז הבקרה</button>
                            <button onClick={() => { setIsMenuOpen(false); handleNavClick('pricing'); }} className="text-lg font-medium text-slate-700 text-right">מחירים</button>
                            <div className="h-px bg-slate-200 my-2"></div>
                            <button onClick={() => router.push('/sign-up')} className="bg-gradient-to-r from-slate-900 to-slate-700 text-white w-full py-3 rounded-xl font-bold shadow-xl shadow-slate-900/10">התחל חינם</button>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </motion.nav>
    );
};
