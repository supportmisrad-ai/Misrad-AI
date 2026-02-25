'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getSystemIconUrl } from '@/lib/metadata';
import { ArrowUpRight, Mail, Sparkles } from 'lucide-react';

interface FooterProps {
    initialLogo?: string | null;
    initialLogoText?: string | null;
}

export const Footer = ({ initialLogo, initialLogoText }: FooterProps = {}) => {
    const [logoSrc, setLogoSrc] = useState<string | null>(initialLogo || null);
    const [logoText, setLogoText] = useState(initialLogoText || 'MISRAD AI');

    useEffect(() => {
        // Skip fetch if props were provided server-side
        if (initialLogo !== undefined || initialLogoText !== undefined) return;

        let cancelled = false;

        (async () => {
            try {
                const res = await fetch('/api/landing/settings');
                const data = await res.json().catch(() => null);
                if (cancelled) return;
                const nextLogo = typeof data?.logo === 'string' ? data.logo : null;
                const nextText = typeof data?.logoText === 'string' ? data.logoText : null;
                if (nextLogo) setLogoSrc(nextLogo);
                if (nextText) setLogoText(nextText || 'MISRAD AI');
            } catch {
                // ignore
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [initialLogo, initialLogoText]);

    const linkClasses = "group flex items-center gap-1.5 text-slate-400 hover:text-white transition-all duration-200";
    const arrowClasses = "w-0 opacity-0 group-hover:w-4 group-hover:opacity-100 transition-all duration-200";

    return (
        <footer className="relative bg-[#0a0a0f] overflow-hidden" dir="rtl">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
            </div>

            {/* Top Border Glow */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

            {/* Main Content */}
            <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-8">
                {/* Top Section - Brand + CTA */}
                <div className="flex flex-col lg:flex-row justify-between items-center gap-8 pb-12 border-b border-white/10">
                    {/* Brand */}
                    <div className="flex flex-col lg:flex-row items-center gap-4 text-center lg:text-right">
                        <div className="w-14 h-14 flex items-center justify-center">
                            {logoSrc ? (
                                <img src={logoSrc} alt="MISRAD" className="w-14 h-14 object-contain" />
                            ) : (
                                <svg viewBox="0 0 64 64" fill="none" className="w-14 h-14">
                                    <path 
                                        fill="#0F172A" 
                                        stroke="url(#footerGradient)" 
                                        strokeWidth="2.5"
                                        d="M32 4l20 9v17c0 14.5-8.5 27.5-20 30C20.5 57.5 12 44.5 12 30V13L32 4z"
                                    />
                                    <path fill="#FFFFFF" d="M22 24h4.8l5.2 9.2 5.2-9.2H42v16h-4.5V31l-4.7 8h-1.6l-4.7-8v9H22v-16z"/>
                                    <defs>
                                        <linearGradient id="footerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#818CF8" />
                                            <stop offset="100%" stopColor="#A855F7" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            )}
                        </div>
                        <div>
                            <Link href="/" className="text-xl font-black text-white tracking-tight hover:text-white/90 transition-colors">
                                {logoText || 'MISRAD AI'}
                            </Link>
                            <p className="text-xs text-slate-500 mt-0.5">מערכת AI לניהול עסקים</p>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <Link
                            href="/login?mode=sign-up&redirect=/workspaces/onboarding"
                            className="group px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-full hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                        >
                            <Sparkles size={18} />
                            התחל ניסיון חינם
                            <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </Link>
                        <a
                            href="mailto:support@misrad-ai.com"
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <Mail size={16} />
                            support@misrad-ai.com
                        </a>
                    </div>
                </div>

                {/* Links Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12">
                    {/* מוצרים */}
                    <div>
                        <h4 className="text-white font-bold text-sm mb-5 flex items-center gap-2">
                            <span className="w-8 h-0.5 bg-gradient-to-r from-indigo-500 to-transparent rounded-full" />
                            מוצרים
                        </h4>
                        <ul className="space-y-3 text-sm">
                            <li><Link href="/system" className={linkClasses}><span>מכירות ולידים</span><span className="text-[10px] text-slate-600 mr-1">System</span><ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                            <li><Link href="/nexus" className={linkClasses}><span>ניהול וצוות</span><span className="text-[10px] text-slate-600 mr-1">Nexus</span><ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                            <li><Link href="/the-authority" className={linkClasses}><span>שיווק ומיתוג</span><span className="text-[10px] text-slate-600 mr-1">Social</span><ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                            <li><Link href="/client" className={linkClasses}><span>לקוחות ומתאמנים</span><span className="text-[10px] text-slate-600 mr-1">Client</span><ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                            <li><Link href="/finance-landing" className={linkClasses}><span>כספים</span><span className="text-[10px] text-slate-600 mr-1">Finance</span><ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                            <li><Link href="/operations" className={linkClasses}><span>תפעול ושטח</span><span className="text-[10px] text-slate-600 mr-1">Operations</span><ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                        </ul>
                    </div>

                    {/* חבילות */}
                    <div>
                        <h4 className="text-white font-bold text-sm mb-5 flex items-center gap-2">
                            <span className="w-8 h-0.5 bg-gradient-to-r from-purple-500 to-transparent rounded-full" />
                            חבילות
                        </h4>
                        <ul className="space-y-3 text-sm">
                            <li><Link href="/pricing" className={linkClasses}>כל החבילות<ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                            <li><Link href="/solo" className={linkClasses}>מודול בודד<ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                            <li><Link href="/the-closer" className={linkClasses}>חבילת מכירות<ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                            <li><Link href="/the-authority" className={linkClasses}>חבילת שיווק ומיתוג<ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                            <li><Link href="/the-operator" className={linkClasses}>חבילת תפעול ושטח<ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                            <li><Link href="/the-empire" className={linkClasses}>הכל כלול<ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                        </ul>
                    </div>

                    {/* משאבים */}
                    <div>
                        <h4 className="text-white font-bold text-sm mb-5 flex items-center gap-2">
                            <span className="w-8 h-0.5 bg-gradient-to-r from-emerald-500 to-transparent rounded-full" />
                            משאבים
                        </h4>
                        <ul className="space-y-3 text-sm">
                            <li><Link href="/support" className={linkClasses}>תמיכה<ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                            <li>
                                <a href="https://api.misrad-ai.com/docs" className={linkClasses}>
                                    מרכז ידע<ArrowUpRight size={14} className={arrowClasses} />
                                </a>
                            </li>
                            <li><Link href="/security" className={linkClasses}>אבטחת מידע<ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                            <li><Link href="/save-time" className={linkClasses}>חוסכים זמן<ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                            <li><Link href="/contact" className={linkClasses}>צור קשר<ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                        </ul>
                    </div>

                    {/* חברה + משפטי */}
                    <div>
                        <h4 className="text-white font-bold text-sm mb-5 flex items-center gap-2">
                            <span className="w-8 h-0.5 bg-gradient-to-r from-amber-500 to-transparent rounded-full" />
                            חברה ומשפטי
                        </h4>
                        <ul className="space-y-3 text-sm">
                            <li><Link href="/about" className={linkClasses}>אודות<ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                            <li><Link href="/privacy" className={linkClasses}>פרטיות<ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                            <li><Link href="/terms" className={linkClasses}>תנאי שימוש<ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                            <li><Link href="/refund-policy" className={linkClasses}>מדיניות החזרים<ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                            <li><Link href="/accessibility" className={linkClasses}>נגישות<ArrowUpRight size={14} className={arrowClasses} /></Link></li>
                        </ul>
                    </div>
                </div>

                {/* Legal & Trust Strip */}
                <div className="pt-8 pb-4 border-t border-white/10">
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                        <Link href="/privacy" className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs font-bold text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all">
                            מדיניות פרטיות
                        </Link>
                        <Link href="/terms" className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs font-bold text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all">
                            תנאי שימוש
                        </Link>
                        <Link href="/security" className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs font-bold text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all">
                            אבטחת מידע
                        </Link>
                        <Link href="/refund-policy" className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs font-bold text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all">
                            מדיניות החזרים
                        </Link>
                        <Link href="/accessibility" className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs font-bold text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all">
                            נגישות
                        </Link>
                        <Link href="/cancel" className="px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-xs font-bold text-red-400 hover:text-white hover:border-red-500/30 hover:bg-red-500/10 transition-all">
                            ביטול עסקה
                        </Link>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                            הצפנת AES-256
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                            GDPR
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold text-purple-400">
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                            גיבוי יומי
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                            חוק הגנת הפרטיות
                        </span>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-6 border-t border-white/10 flex flex-col items-center gap-4">
                    <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                <span className="text-xs font-bold text-emerald-400">פעיל</span>
                            </div>
                            <span className="text-xs text-slate-500">מערכת ישראלית</span>
                        </div>

                        <p className="text-xs text-slate-500">
                            &copy; {new Date().getFullYear()} MISRAD AI. כל הזכויות שמורות.
                        </p>
                    </div>

                    <div className="text-xs text-slate-600 text-center leading-relaxed">
                        MISRAD AI &bull; ע.מ 314885518 &bull; הפסנתר 9, ראשון לציון &bull; support@misrad-ai.com &bull; 051-2239520 &bull; misrad-ai.com
                    </div>
                </div>
            </div>
        </footer>
    );
};
