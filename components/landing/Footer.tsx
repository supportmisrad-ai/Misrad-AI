'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export const Footer = () => {
    const router = useRouter();
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        } else {
            router.push('/');
            setTimeout(() => {
                const el = document.getElementById(id);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    };

    return (
        <footer className="border-t border-slate-200 bg-white pt-12 md:pt-16 pb-8 px-4 sm:px-6 relative z-10 font-sans overflow-hidden" dir="rtl">
            <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white pointer-events-none"></div>
            <div className="absolute -top-24 -right-24 w-[420px] h-[420px] bg-slate-200/25 rounded-full blur-[110px] pointer-events-none"></div>
            <div className="absolute -bottom-32 -left-24 w-[520px] h-[520px] bg-indigo-200/20 rounded-full blur-[130px] pointer-events-none"></div>
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-12">
                <div className="col-span-1 sm:col-span-2 md:col-span-1">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                        </div>
                        <span className="text-lg font-bold text-slate-900">MISRAD CRM</span>
                    </div>
                    <p className="text-slate-600 text-sm">
                        מערכת מודרנית לעסקים בצמיחה.
                    </p>
                </div>

                <div>
                    <h4 className="text-slate-900 font-bold mb-3 sm:mb-4 text-sm sm:text-base">מוצר</h4>
                    <ul className="space-y-2 text-sm text-slate-600">
                        <li><button onClick={() => scrollToSection('features')} className="hover:text-slate-900 transition-colors">פיצ׳רים</button></li>
                        <li><button onClick={() => scrollToSection('pricing')} className="hover:text-slate-900 transition-colors">מחירים</button></li>
                        <li><button onClick={() => router.push('/blog')} className="hover:text-slate-900 transition-colors">עדכונים</button></li>
                        <li><button onClick={() => window.open('https://api.nexus-os.co/docs', '_blank')} className="hover:text-slate-900 transition-colors">API</button></li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-slate-900 font-bold mb-3 sm:mb-4 text-sm sm:text-base">חברה</h4>
                    <ul className="space-y-2 text-sm text-slate-600">
                        <li><button onClick={() => router.push('/about')} className="hover:text-slate-900 transition-colors">אודות</button></li>
                        <li><button onClick={() => router.push('/careers')} className="hover:text-slate-900 transition-colors">קריירה</button></li>
                        <li><button onClick={() => router.push('/blog')} className="hover:text-slate-900 transition-colors">בלוג</button></li>
                        <li><button onClick={() => router.push('/contact')} className="hover:text-slate-900 transition-colors">צור קשר</button></li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-slate-900 font-bold mb-3 sm:mb-4 text-sm sm:text-base">משפטי</h4>
                    <ul className="space-y-2 text-sm text-slate-600">
                        <li><button onClick={() => router.push('/privacy')} className="hover:text-slate-900 transition-colors">פרטיות</button></li>
                        <li><button onClick={() => router.push('/terms')} className="hover:text-slate-900 transition-colors">תנאי שימוש</button></li>
                        <li><button onClick={() => router.push('/refund-policy')} className="hover:text-slate-900 transition-colors">מדיניות החזרים</button></li>
                        <li><button onClick={() => router.push('/accessibility')} className="hover:text-slate-900 transition-colors">נגישות</button></li>
                        <li><button onClick={() => router.push('/security')} className="hover:text-slate-900 transition-colors">אבטחת מידע</button></li>
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto border-t border-slate-200 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
                <p className="text-center sm:text-right text-slate-600">&copy; {new Date().getFullYear()} MISRAD CRM. כל הזכויות שמורות.</p>
                <div className="flex gap-3 sm:gap-4 flex-wrap justify-center sm:justify-start">
                    <span className="text-slate-600 hover:text-slate-900 cursor-pointer transition-colors whitespace-nowrap">טוויטר</span>
                    <span className="text-slate-600 hover:text-slate-900 cursor-pointer transition-colors whitespace-nowrap">לינקדאין</span>
                    <span className="text-slate-600 hover:text-slate-900 cursor-pointer transition-colors whitespace-nowrap">אינסטגרם</span>
                </div>
            </div>
        </footer>
    );
};
