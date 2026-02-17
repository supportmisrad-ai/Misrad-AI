'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CircleUser, LifeBuoy, Menu, X, CircleHelp, Type, User, LogIn, Settings } from 'lucide-react';
import Image from 'next/image';
import { getSystemIconUrl } from '@/lib/metadata';
interface NavbarProps {
    initialLogo?: string | null;
    initialLogoText?: string | null;
    isSignedIn?: boolean;
}

export const Navbar = ({ initialLogo, initialLogoText, isSignedIn = false }: NavbarProps) => {
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isFabOpen, setIsFabOpen] = useState(false);
    const [fontScale, setFontScale] = useState(100);
    const [highContrast, setHighContrast] = useState(false);
    const [logoSrc, setLogoSrc] = useState<string | null>(initialLogo || null);
    const [logoText, setLogoText] = useState(initialLogoText || 'MISRAD AI');


    useEffect(() => {
        try {
            const savedScaleRaw = window.localStorage.getItem('landing_a11y_fontScale');
            const savedContrastRaw = window.localStorage.getItem('landing_a11y_highContrast');
            const savedScale = savedScaleRaw ? Number(savedScaleRaw) : null;
            if (typeof savedScale === 'number' && Number.isFinite(savedScale)) {
                setFontScale(Math.min(200, Math.max(100, savedScale)));
            }
            if (savedContrastRaw === '1') setHighContrast(true);
        } catch {
            // ignore
        }
    }, []);

    // Close FAB when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.fab-container')) {
                setIsFabOpen(false);
            }
        };
        if (isFabOpen) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isFabOpen]);

    useEffect(() => {
        const root = document.documentElement;
        root.style.fontSize = `${fontScale}%`;
        if (highContrast) {
            root.classList.add('high-contrast');
        } else {
            root.classList.remove('high-contrast');
        }
        try {
            window.localStorage.setItem('landing_a11y_fontScale', String(fontScale));
            window.localStorage.setItem('landing_a11y_highContrast', highContrast ? '1' : '0');
        } catch {
            // ignore
        }
        return () => {
            root.style.fontSize = '';
            root.classList.remove('high-contrast');
        };
    }, [fontScale, highContrast]);

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
        <>
            {/* FAB - כפתור עזרה קבוע עם dropdown */}
            <div className="fab-container fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-[70]">
                <motion.button
                    type="button"
                    onClick={() => setIsFabOpen((v) => !v)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-xl border-2 border-slate-200/40 flex items-center justify-center transition-all hover:shadow-slate-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ring-offset-2"
                    aria-label="עזרה ונגישות"
                    aria-expanded={isFabOpen}
                >
                    <motion.div
                        animate={{ rotate: isFabOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {isFabOpen ? <X size={18} className="sm:w-5 sm:h-5" strokeWidth={2} /> : <Settings size={20} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2} />}
                    </motion.div>
                </motion.button>
                <AnimatePresence>
                    {isFabOpen ? (
                        <motion.div
                            initial={{ opacity: 0, y: 16, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 16, scale: 0.9 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                            className="absolute bottom-[72px] left-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.25)] border border-slate-200/80 w-[280px] overflow-hidden"
                        >
                            {/* Header */}
                            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                                <div className="font-black text-slate-900 text-sm flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center">
                                        <CircleUser size={14} className="text-white" />
                                    </div>
                                    עזרה ונגישות
                                </div>
                            </div>

                            {/* תמיכה */}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsFabOpen(false);
                                    router.push('/support');
                                }}
                                className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-transparent transition-all text-right group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center group-hover:bg-emerald-700 transition-colors">
                                    <LifeBuoy size={18} />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 text-sm">תמיכה</div>
                                    <div className="text-xs text-slate-500">פתיחת קריאת שירות</div>
                                </div>
                            </button>

                            {/* נגישות - גודל טקסט */}
                            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                                        <Type size={16} />
                                    </div>
                                    <div className="text-xs font-bold text-slate-700">גודל טקסט</div>
                                </div>
                                <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 border border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => setFontScale((v) => Math.max(100, v - 10))}
                                        className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                                        aria-label="הקטן טקסט"
                                    >
                                        −
                                    </button>
                                    <div className="flex-1 text-center">
                                        <div className="text-lg font-black text-slate-900">{fontScale}%</div>
                                        <div className="text-[10px] text-slate-400 -mt-0.5">גודל</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFontScale((v) => Math.min(200, v + 10))}
                                        className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                                        aria-label="הגדל טקסט"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* ניגודיות גבוהה */}
                            <div className="px-5 pb-4">
                                <button
                                    type="button"
                                    onClick={() => setHighContrast((v) => !v)}
                                    className={`w-full px-4 py-3 rounded-xl font-bold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 flex items-center justify-center gap-2 ${
                                        highContrast 
                                            ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg shadow-slate-300 hover:from-slate-700 hover:to-slate-800' 
                                            : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                        highContrast ? 'border-white bg-white' : 'border-slate-300'
                                    }`}>
                                        {highContrast && <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />}
                                    </span>
                                    ניגודיות גבוהה
                                </button>
                            </div>

                            {/* הצהרת נגישות */}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsFabOpen(false);
                                    router.push('/accessibility');
                                }}
                                className="w-full px-5 py-3.5 border-t border-slate-200 flex items-center gap-3 hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent transition-all text-right group bg-slate-50/30"
                            >
                                <div className="w-10 h-10 rounded-xl bg-slate-600 text-white flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                                    <CircleUser size={20} />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 text-sm">הצהרת נגישות</div>
                                    <div className="text-xs text-slate-500">מידע על התאמות הנגישות</div>
                                </div>
                            </button>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            <motion.nav
                initial={{ y: -10, opacity: 1 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-xl shadow-slate-200/40"
            >
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
                        <div className="w-10 h-10 flex items-center justify-center">
                            {logoSrc ? (
                                <img 
                                    src={logoSrc} 
                                    alt="MISRAD" 
                                    className="w-full h-full object-contain" 
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        setLogoSrc(null);
                                    }}
                                />
                            ) : (
                                <Image src={getSystemIconUrl('misrad')} alt="MISRAD" width={40} height={40} className="w-full h-full object-contain" priority />
                            )}
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-xl font-black text-slate-900 tracking-tight">{logoText || 'MISRAD AI'}</span>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-8 bg-white/60 backdrop-blur-md px-6 py-2 rounded-full border border-slate-200/70 shadow-lg shadow-slate-200/50">
                        <button onClick={() => handleNavClick('features')} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">יכולות</button>
                        <button onClick={() => handleNavClick('comparison')} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">יתרונות</button>
                        <button onClick={() => router.push('/pricing')} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">מחירים</button>
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        {isSignedIn ? (
                            <button 
                                onClick={() => router.push('/me')} 
                                className="flex items-center gap-2 bg-gradient-to-r from-slate-900 to-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:from-slate-800 hover:to-slate-600 transition-all shadow-xl shadow-slate-900/20"
                            >
                                <User size={16} />
                                למערכת שלי
                            </button>
                        ) : (
                            <>
                                <button onClick={() => router.push('/login')} className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-indigo-600 transition-colors">
                                    <LogIn size={16} />
                                    כניסה
                                </button>
                                <button onClick={() => router.push('/login?mode=sign-up&redirect=/workspaces/onboarding')} className="bg-gradient-to-r from-slate-900 to-slate-700 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:from-slate-800 hover:to-slate-600 transition-all shadow-xl shadow-slate-900/10">
                                    התחילו חינם
                                </button>
                            </>
                        )}
                    </div>

                    <div className="md:hidden flex items-center gap-3">
                        {isSignedIn ? (
                            <button 
                                onClick={() => router.push('/me')} 
                                className="flex items-center gap-1.5 bg-gradient-to-r from-slate-900 to-slate-700 text-white px-3 py-2 rounded-lg text-xs font-bold hover:from-slate-800 hover:to-slate-600 transition-all shadow-lg"
                            >
                                <User size={14} />
                                למערכת
                            </button>
                        ) : (
                            <button 
                                onClick={() => router.push('/login')} 
                                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors"
                            >
                                <LogIn size={14} />
                                כניסה
                            </button>
                        )}
                        <button
                            className="text-slate-900"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label={isMenuOpen ? 'סגור תפריט' : 'פתח תפריט'}
                        >
                            {isMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
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
                                <div className="text-xs font-black text-slate-500 uppercase tracking-wider">חבילות</div>
                                <button onClick={() => { setIsMenuOpen(false); router.push('/the-closer'); }} className="text-lg font-medium text-slate-700 text-right hover:text-indigo-600 transition-colors">חבילת מכירות</button>
                                <button onClick={() => { setIsMenuOpen(false); router.push('/the-authority'); }} className="text-lg font-medium text-slate-700 text-right hover:text-indigo-600 transition-colors">חבילת שיווק ומיתוג</button>
                                <button onClick={() => { setIsMenuOpen(false); router.push('/the-operator'); }} className="text-lg font-medium text-slate-700 text-right hover:text-indigo-600 transition-colors">חבילת תפעול ושטח</button>
                                <button onClick={() => { setIsMenuOpen(false); router.push('/the-empire'); }} className="text-lg font-medium text-slate-700 text-right hover:text-indigo-600 transition-colors">הכל כלול</button>
                                <div className="h-px bg-slate-200 my-2"></div>
                                <button onClick={() => { setIsMenuOpen(false); router.push('/pricing'); }} className="text-lg font-bold text-slate-900 text-right">כל החבילות והמחירים</button>
                                {!isSignedIn && (
                                    <>
                                        <div className="h-px bg-slate-200 my-2"></div>
                                        <button onClick={() => router.push('/login?mode=sign-up&redirect=/workspaces/onboarding')} className="bg-gradient-to-r from-slate-900 to-slate-700 text-white w-full py-3 rounded-full font-bold shadow-xl shadow-slate-900/10">התחילו חינם</button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </motion.nav>
        </>
    );
};
