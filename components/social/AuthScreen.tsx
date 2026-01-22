'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import CustomAuth from './CustomAuth';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';

export default function AuthScreen() {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col md:flex-row overflow-hidden" dir="rtl">
      <div className="hidden md:flex md:w-[55%] bg-slate-950 relative flex-col items-center justify-center p-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-blue-600/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[120px]" style={{ animationDelay: '2s' }}></div>
        </div>
        
        <div className="relative z-10 flex flex-col gap-12 text-white text-right w-full max-w-lg">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => router.push('/')} 
            className="flex items-center gap-4 cursor-pointer group mb-4"
          >
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-950 font-black text-3xl shadow-[0_0_40px_rgba(255,255,255,0.3)] group-hover:scale-110 transition-all duration-500">S</div>
            <span className="font-black text-4xl tracking-tighter">Social</span>
          </motion.div>

          <div className="flex flex-col gap-6">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tighter"
            >
              המרכז הדיגיטלי <br />
              של <span className="text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-indigo-400">הסוכנות שלך.</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-slate-300 font-bold leading-relaxed"
            >
              נהלו לקוחות, צרו תוכן, גבו תשלומים - הכל במקום אחד, שקט ומאורגן.
            </motion.p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-20 bg-white">
        <div className="w-full max-w-md">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 font-bold transition-colors"
          >
            <ArrowLeft size={20} />
            חזרה לעמוד הבית
          </button>

          <div className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 mb-3">ברוכים הבאים</h1>
            <p className="text-slate-400 font-bold">התחברו לחשבון שלכם כדי להמשיך</p>
          </div>

          <div className="flex justify-center">
            <CustomAuth mode="sign-in" />
          </div>
        </div>
      </div>
    </div>
  );
}

