'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { getModuleLabelHe } from '@/lib/os/modules/registry';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import { SalesFaq } from '@/components/landing/SalesFaq';
import { DemoVideoModal } from '@/components/landing/DemoVideoModal';
import { Target, Users, Briefcase, BarChart3, Lightbulb, Archive, Play } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function NexusMarketingPage() {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <Navbar />
      <main className="pt-20">
        <section className="relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[520px] h-[520px] bg-slate-200/50 rounded-full blur-[130px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 w-[620px] h-[620px] bg-indigo-200/15 rounded-full blur-[160px] pointer-events-none" />
          <div className="max-w-6xl mx-auto px-6 py-16 sm:py-20 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
              <span>{getModuleLabelHe('nexus')}</span>
            </div>
            <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black leading-tight">
              {getModuleLabelHe('nexus')}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900">
                חדר המנהלים שלך
              </span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">
              Nexus הוא מרכז השליטה של Misrad AI: תמונת מצב אחת לצוות, משימות, הרשאות ותהליכים — כדי שתוכל לנהל את העסק מהר ובביטחון.
            </p>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6 hover:border-slate-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                  <Users size={24} className="text-slate-700" />
                </div>
                <div className="text-xs font-black text-slate-500">ניהול צוות</div>
                <div className="mt-2 text-lg font-black">מי עושה מה ומתי</div>
                <div className="mt-2 text-sm text-slate-600">תמונה רחבה, עומסים, משימות ותיעדוף.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6 hover:border-slate-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                  <Target size={24} className="text-slate-700" />
                </div>
                <div className="text-xs font-black text-slate-500">Sales Pipeline</div>
                <div className="mt-2 text-lg font-black">מעקב מכירות מתקדם</div>
                <div className="mt-2 text-sm text-slate-600">8 שלבים מוגדרים, דשבורד מכירות, יעדים וביצועים.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6 hover:border-slate-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                  <Lightbulb size={24} className="text-slate-700" />
                </div>
                <div className="text-xs font-black text-slate-500">Intelligence</div>
                <div className="mt-2 text-lg font-black">תובנות עסקיות</div>
                <div className="mt-2 text-sm text-slate-600">ניתוח נתונים, זיהוי מגמות, והמלצות אסטרטגיות.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6 hover:border-slate-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                  <Archive size={24} className="text-slate-700" />
                </div>
                <div className="text-xs font-black text-slate-500">ניהול נכסים</div>
                <div className="mt-2 text-lg font-black">Assets Management</div>
                <div className="mt-2 text-sm text-slate-600">ניהול נכסים, מסמכים, וקבצים ארגוניים.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6 hover:border-slate-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                  <BarChart3 size={24} className="text-slate-700" />
                </div>
                <div className="text-xs font-black text-slate-500">דוחות</div>
                <div className="mt-2 text-lg font-black">דוחות כספיים</div>
                <div className="mt-2 text-sm text-slate-600">דוחות מתקדמים משולבים עם מודול Finance.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6 hover:border-slate-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                  <Briefcase size={24} className="text-slate-700" />
                </div>
                <div className="text-xs font-black text-slate-500">סנכרון</div>
                <div className="mt-2 text-lg font-black">חיבור לכל המודולים</div>
                <div className="mt-2 text-sm text-slate-600">נגיעה אחת שמחברת System, Client, Social, Finance ו-Operations.</div>
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-slate-900 text-white font-bold shadow-xl shadow-slate-900/10"
              >
                התחל חינם
              </Link>
              <button
                onClick={() => setIsVideoModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-white via-indigo-50/50 to-purple-50/50 border-2 border-indigo-200 text-slate-900 font-bold hover:border-indigo-300 hover:scale-105 transition-all"
              >
                <Play size={18} className="text-indigo-600" />
                צפייה במערכת
              </button>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <TestimonialsSection />

        {/* FAQ Section */}
        <SalesFaq variant="system" />
      </main>
      <Footer />
      <DemoVideoModal 
        isOpen={isVideoModalOpen} 
        onClose={() => setIsVideoModalOpen(false)} 
      />
    </div>
  );
}
