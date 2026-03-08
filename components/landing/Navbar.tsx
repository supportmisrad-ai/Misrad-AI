'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleUser, LifeBuoy, Menu, X, Type, User, LogIn, Accessibility, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getSystemIconUrl } from '@/lib/metadata';
interface NavbarProps {
    initialLogo?: string | null;
    initialLogoText?: string | null;
    isSignedIn?: boolean;
}

export const Navbar = ({ initialLogo, initialLogoText, isSignedIn = false }: NavbarProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isFabOpen, setIsFabOpen] = useState(false);
    const [isModulesOpen, setIsModulesOpen] = useState(false);
    const [isPackagesOpen, setIsPackagesOpen] = useState(false);
    const modulesRef = useRef<HTMLDivElement>(null);
    const packagesRef = useRef<HTMLDivElement>(null);
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

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (modulesRef.current && !modulesRef.current.contains(e.target as Node)) {
                setIsModulesOpen(false);
            }
            if (packagesRef.current && !packagesRef.current.contains(e.target as Node)) {
                setIsPackagesOpen(false);
            }
        };
        if (isModulesOpen || isPackagesOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isModulesOpen, isPackagesOpen]);

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

    const handleNavClick = useCallback((id: string) => {
        setIsMenuOpen(false);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }, []);

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
                        {isFabOpen ? <X size={18} className="sm:w-5 sm:h-5" strokeWidth={2} /> : <Accessibility size={20} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2} />}
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
                            <Link
                                href="/support"
                                onClick={() => setIsFabOpen(false)}
                                className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-transparent transition-all text-right group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center group-hover:bg-emerald-700 transition-colors">
                                    <LifeBuoy size={18} />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 text-sm">תמיכה</div>
                                    <div className="text-xs text-slate-500">פתיחת קריאת שירות</div>
                                </div>
                            </Link>

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
                            <Link
                                href="/accessibility"
                                onClick={() => setIsFabOpen(false)}
                                className="w-full px-5 py-3.5 border-t border-slate-200 flex items-center gap-3 hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent transition-all text-right group bg-slate-50/30"
                            >
                                <div className="w-10 h-10 rounded-xl bg-slate-600 text-white flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                                    <CircleUser size={20} />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 text-sm">הצהרת נגישות</div>
                                    <div className="text-xs text-slate-500">מידע על התאמות הנגישות</div>
                                </div>
                            </Link>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            <nav
                className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-xl shadow-slate-200/40"
            >
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3" prefetch={false}>
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
                    </Link>

                    <div className="hidden md:flex items-center gap-8 bg-white/60 backdrop-blur-md px-6 py-2 rounded-full border border-slate-200/70 shadow-lg shadow-slate-200/50">
                        <div
                            className="relative"
                            ref={modulesRef}
                            onMouseEnter={() => setIsModulesOpen(true)}
                            onMouseLeave={() => setIsModulesOpen(false)}
                        >
                            <button
                                type="button"
                                onClick={() => setIsModulesOpen((v) => !v)}
                                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1"
                            >
                                מודולים
                                <ChevronDown size={14} className={`transition-transform duration-200 ${isModulesOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isModulesOpen && (
                                <div className="absolute top-full right-0 pt-2 z-50">
                                    <div className="w-56 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200/80 overflow-hidden py-1">
                                        {[
                                            { label: 'ניהול מכירות ולידים', en: 'System', href: '/system' },
                                            { label: 'ניהול משימות וצוות', en: 'Nexus', href: '/nexus' },
                                            { label: 'ניהול לקוחות', en: 'Client', href: '/client' },
                                            { label: 'שיווק ומיתוג', en: 'Social', href: '/the-authority' },
                                            { label: 'תפעול ושטח', en: 'Operations', href: '/operations' },
                                            { label: 'כספים', en: 'Finance', href: '/finance-landing' },
                                        ].map((item) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setIsModulesOpen(false)}
                                                className="block w-full text-right px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                            >
                                                {item.label} <span className="text-[10px] text-slate-400 font-normal">· {item.en}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div
                            className="relative"
                            ref={packagesRef}
                            onMouseEnter={() => setIsPackagesOpen(true)}
                            onMouseLeave={() => setIsPackagesOpen(false)}
                        >
                            <button
                                type="button"
                                onClick={() => setIsPackagesOpen((v) => !v)}
                                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1"
                            >
                                חבילות
                                <ChevronDown size={14} className={`transition-transform duration-200 ${isPackagesOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isPackagesOpen && (
                                <div className="absolute top-full right-0 pt-2 z-50">
                                    <div className="w-56 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200/80 overflow-hidden py-1">
                                        {[
                                            { label: 'חבילת מכירות', href: '/the-closer' },
                                            { label: 'חבילת שיווק ומיתוג', href: '/the-authority' },
                                            { label: 'חבילת תפעול ושטח', href: '/the-operator' },
                                            { label: 'הכל כלול', href: '/the-empire' },
                                        ].map((item) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setIsPackagesOpen(false)}
                                                className="block w-full text-right px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                            >
                                                {item.label}
                                            </Link>
                                        ))}
                                        <div className="border-t border-slate-100 mt-1 pt-1">
                                            <Link
                                                href="/pricing"
                                                onClick={() => setIsPackagesOpen(false)}
                                                className="block w-full text-right px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50 transition-colors"
                                            >
                                                כל החבילות והמחירים
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">מחירים</Link>
                        <Link href="/why-misrad" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">למה אנחנו?</Link>
                        <Link href="/contact" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">צור קשר</Link>
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        {isSignedIn ? (
                            <Link
                                href="/me"
                                className="flex items-center gap-2 bg-gradient-to-r from-slate-900 to-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:from-slate-800 hover:to-slate-600 transition-all shadow-xl shadow-slate-900/20"
                            >
                                <User size={16} />
                                למערכת שלי
                            </Link>
                        ) : (
                            <>
                                <Link href="/login" className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-indigo-600 transition-colors">
                                    <LogIn size={16} />
                                    כניסה
                                </Link>
                                <Link href="/login?mode=sign-up&redirect=/workspaces/onboarding" className="bg-gradient-to-r from-slate-900 to-slate-700 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:from-slate-800 hover:to-slate-600 transition-all shadow-xl shadow-slate-900/10">
                                    התחילו חינם
                                </Link>
                            </>
                        )}
                    </div>

                    <div className="md:hidden flex items-center gap-3">
                        {isSignedIn ? (
                            <Link 
                                href="/me" 
                                className="flex items-center gap-1.5 bg-gradient-to-r from-slate-900 to-slate-700 text-white px-3 py-2 rounded-lg text-xs font-bold hover:from-slate-800 hover:to-slate-600 transition-all shadow-lg"
                            >
                                <User size={14} />
                                למערכת
                            </Link>
                        ) : (
                            <Link 
                                href="/login" 
                                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors"
                            >
                                <LogIn size={14} />
                                כניסה
                            </Link>
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
                                <div className="text-xs font-black text-slate-500 uppercase tracking-wider">מודולים</div>
                                <Link onClick={() => setIsMenuOpen(false)} href="/system" className="text-lg font-medium text-slate-700 text-right hover:text-indigo-600 transition-colors">ניהול מכירות ולידים <span className="text-xs text-slate-400 font-normal">· System</span></Link>
                                <Link onClick={() => setIsMenuOpen(false)} href="/nexus" className="text-lg font-medium text-slate-700 text-right hover:text-indigo-600 transition-colors">ניהול משימות וצוות <span className="text-xs text-slate-400 font-normal">· Nexus</span></Link>
                                <Link onClick={() => setIsMenuOpen(false)} href="/client" className="text-lg font-medium text-slate-700 text-right hover:text-indigo-600 transition-colors">ניהול לקוחות <span className="text-xs text-slate-400 font-normal">· Client</span></Link>
                                <Link onClick={() => setIsMenuOpen(false)} href="/operations" className="text-lg font-medium text-slate-700 text-right hover:text-indigo-600 transition-colors">תפעול ושטח <span className="text-xs text-slate-400 font-normal">· Operations</span></Link>
                                <Link onClick={() => setIsMenuOpen(false)} href="/finance-landing" className="text-lg font-medium text-slate-700 text-right hover:text-indigo-600 transition-colors">כספים <span className="text-xs text-slate-400 font-normal">· Finance</span></Link>
                                <div className="h-px bg-slate-200 my-2"></div>
                                <div className="text-xs font-black text-slate-500 uppercase tracking-wider">חבילות</div>
                                <Link onClick={() => setIsMenuOpen(false)} href="/the-closer" className="text-lg font-medium text-slate-700 text-right hover:text-indigo-600 transition-colors">חבילת מכירות</Link>
                                <Link onClick={() => setIsMenuOpen(false)} href="/the-authority" className="text-lg font-medium text-slate-700 text-right hover:text-indigo-600 transition-colors">חבילת שיווק ומיתוג</Link>
                                <Link onClick={() => setIsMenuOpen(false)} href="/the-operator" className="text-lg font-medium text-slate-700 text-right hover:text-indigo-600 transition-colors">חבילת תפעול ושטח</Link>
                                <Link onClick={() => setIsMenuOpen(false)} href="/the-empire" className="text-lg font-medium text-slate-700 text-right hover:text-indigo-600 transition-colors">הכל כלול</Link>
                                <div className="h-px bg-slate-200 my-2"></div>
                                <Link onClick={() => setIsMenuOpen(false)} href="/why-misrad" className="text-lg font-medium text-slate-700 text-right hover:text-indigo-600 transition-colors">למה MISRAD AI?</Link>
                                <Link onClick={() => setIsMenuOpen(false)} href="/pricing" className="text-lg font-bold text-slate-900 text-right">כל החבילות והמחירים</Link>
                                {!isSignedIn && (
                                    <>
                                        <div className="h-px bg-slate-200 my-2"></div>
                                        <Link href="/login?mode=sign-up&redirect=/workspaces/onboarding" className="block text-center bg-gradient-to-r from-slate-900 to-slate-700 text-white w-full py-3 rounded-full font-bold shadow-xl shadow-slate-900/10">התחילו חינם</Link>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </nav>
        </>
    );
};
