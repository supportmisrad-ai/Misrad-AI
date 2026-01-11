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
        <footer className="border-t border-slate-800 bg-[#020617] pt-12 md:pt-16 pb-8 px-4 sm:px-6 relative z-10 font-sans" dir="rtl">
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-12">
                <div className="col-span-1 sm:col-span-2 md:col-span-1">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                        </div>
                        <span className="text-lg font-bold text-white">Misrad</span>
                    </div>
                    <p className="text-slate-300 text-sm">
                        מערכת מודרנית לעסקים בצמיחה.
                    </p>
                </div>

                <div>
                    <h4 className="text-white font-bold mb-3 sm:mb-4 text-sm sm:text-base">מוצר</h4>
                    <ul className="space-y-2 text-sm text-slate-300">
                        <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">פיצ׳רים</button></li>
                        <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">מחירים</button></li>
                        <li><button onClick={() => router.push('/blog')} className="hover:text-white transition-colors">עדכונים</button></li>
                        <li><button onClick={() => window.open('https://api.nexus-os.co/docs', '_blank')} className="hover:text-white transition-colors">API</button></li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-white font-bold mb-3 sm:mb-4 text-sm sm:text-base">חברה</h4>
                    <ul className="space-y-2 text-sm text-slate-300">
                        <li><button onClick={() => router.push('/about')} className="hover:text-white transition-colors">אודות</button></li>
                        <li><button onClick={() => router.push('/careers')} className="hover:text-white transition-colors">קריירה</button></li>
                        <li><button onClick={() => router.push('/blog')} className="hover:text-white transition-colors">בלוג</button></li>
                        <li><button onClick={() => router.push('/contact')} className="hover:text-white transition-colors">צור קשר</button></li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-white font-bold mb-3 sm:mb-4 text-sm sm:text-base">משפטי</h4>
                    <ul className="space-y-2 text-sm text-slate-300">
                        <li><button onClick={() => router.push('/privacy')} className="hover:text-white transition-colors">פרטיות</button></li>
                        <li><button onClick={() => router.push('/terms')} className="hover:text-white transition-colors">תנאי שימוש</button></li>
                        <li><button onClick={() => router.push('/security')} className="hover:text-white transition-colors">אבטחת מידע</button></li>
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto border-t border-slate-800 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
                <p className="text-center sm:text-right text-slate-300">&copy; {new Date().getFullYear()} Misrad. כל הזכויות שמורות.</p>
                <div className="flex gap-3 sm:gap-4 flex-wrap justify-center sm:justify-start">
                    <span className="text-slate-300 hover:text-slate-200 cursor-pointer transition-colors whitespace-nowrap">טוויטר</span>
                    <span className="text-slate-300 hover:text-slate-200 cursor-pointer transition-colors whitespace-nowrap">לינקדאין</span>
                    <span className="text-slate-300 hover:text-slate-200 cursor-pointer transition-colors whitespace-nowrap">אינסטגרם</span>
                </div>
            </div>
        </footer>
    );
};
