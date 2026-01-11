'use client';

import React, { useState } from 'react';
import { BrainCircuit, Loader2, Save, Target, Lightbulb, TrendingUp, Info, Zap, Quote } from 'lucide-react';
import { Client } from '@/types/social';
import { motion } from 'framer-motion';

interface DNATabProps {
  client: Client;
  onUpdateDNA: (clientId: string, dna: Client['dna']['voice']) => void;
}

const DNATab: React.FC<DNATabProps> = ({ client, onUpdateDNA }) => {
  const [dnaState, setDnaState] = useState(client.dna.voice);
  const [isDnaDirty, setIsDnaDirty] = useState(false);
  const [isSavingDna, setIsSavingDna] = useState(false);

  const handleDnaChange = (key: keyof typeof dnaState, val: number) => {
    setDnaState(prev => ({ ...prev, [key]: val }));
    setIsDnaDirty(true);
  };

  const handleSaveDna = () => {
    setIsSavingDna(true);
    setTimeout(() => {
      onUpdateDNA(client.id, dnaState);
      setIsDnaDirty(false);
      setIsSavingDna(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-10">
      {/* 1. Marketing Manifesto Section (New Strategic Insight) */}
      <section className="bg-slate-900 p-12 rounded-[64px] text-white shadow-2xl relative overflow-hidden group">
         <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-8 flex flex-col gap-6">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-900/50"><Target size={24}/></div>
                  <h3 className="text-2xl font-black">מניפסט אסטרטגי - AI Analysis</h3>
               </div>
               <div className="relative">
                  <Quote className="absolute -top-6 -right-6 text-white/10" size={80} />
                  <p className="text-2xl md:text-3xl font-black leading-tight tracking-tight relative z-10 italic text-blue-100">
                    "{client.dna.strategy?.aiStrategySummary || "ה-AI ינתח את נתוני המותג לאחר השלמת שאלון האיפיון."}"
                  </p>
               </div>
               <div className="flex flex-wrap gap-3 mt-4">
                  <span className="px-4 py-1.5 bg-white/10 rounded-xl text-[10px] font-black uppercase border border-white/10">🎯 מטרה: {client.dna.strategy?.mainGoal || "טרם הוגדר"}</span>
                  <span className="px-4 py-1.5 bg-white/10 rounded-xl text-[10px] font-black uppercase border border-white/10">👥 קהל: {client.dna.strategy?.targetAudience || "טרם הוגדר"}</span>
               </div>
            </div>
            <div className="lg:col-span-4 flex flex-col items-center justify-center text-center bg-white/5 border border-white/10 rounded-[48px] p-10 backdrop-blur-md">
               <Zap className="text-amber-400 mb-4" size={48} />
               <p className="text-xs font-bold text-slate-400 leading-relaxed">האסטרטגיה הזו מזינה את 'המכונה' ומבטיחה שכל פוסט שנכתב עבור {client.companyName} פוגע בול במטרה.</p>
            </div>
         </div>
         <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-[140px]"></div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* DNA Voice Sliders */}
        <div className="bg-white p-12 rounded-[56px] border border-slate-200 shadow-xl flex flex-col gap-10">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black flex items-center gap-3"><BrainCircuit className="text-blue-600" size={28}/> טון הדיבור והסגנון</h3>
            {isDnaDirty && (
              <button onClick={handleSaveDna} disabled={isSavingDna} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black shadow-lg flex items-center gap-2">
                {isSavingDna ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} שמור שינויים
              </button>
            )}
          </div>
          <div className="flex flex-col gap-10">
            {[
              { k: 'formal', l: 'רמת רשמיות', a: 'חברי', b: 'רשמי' },
              { k: 'funny', l: 'רמת הומור', a: 'רציני', b: 'מצחיק' },
              { k: 'length', l: 'אורך הפוסטים', a: 'קצר ופאנצ׳י', b: 'מעמיק' },
            ].map(d => (
              <div key={d.k} className="flex flex-col gap-4">
                <div className="flex justify-between font-black text-[10px] uppercase tracking-widest">
                  <span className="text-slate-400">{d.a}</span>
                  <span className="text-blue-600">{d.l} ({dnaState[d.k as keyof typeof dnaState]}%)</span>
                  <span className="text-slate-400">{d.b}</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={dnaState[d.k as keyof typeof dnaState]} 
                  onChange={e => handleDnaChange(d.k as any, parseInt(e.target.value))} 
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Strategy Deep Dive Table */}
        <div className="bg-white p-12 rounded-[56px] border border-slate-200 shadow-xl flex flex-col gap-8">
           <h3 className="text-2xl font-black flex items-center gap-3"><Lightbulb className="text-amber-500" size={28}/> איפיון אסטרטגי מלא</h3>
           <div className="flex flex-col gap-6">
              {[
                { label: 'קהל יעד', val: client.dna.strategy?.targetAudience },
                { label: 'כאבי לקוח', val: client.dna.strategy?.painPoints },
                { label: 'ערך ייחודי', val: client.dna.strategy?.uniqueValue },
                { label: 'מתחרים עיקריים', val: client.dna.strategy?.competitors },
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-1 border-b border-slate-200 pb-4 last:border-0">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                   <p className="font-bold text-slate-800">{item.val || "לא הוזן בנתוני האיפיון"}</p>
                </div>
              ))}
           </div>
           <div className="mt-auto bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
              <Info className="text-blue-600 shrink-0" size={20}/>
              <p className="text-xs font-bold text-blue-800 leading-relaxed">נתונים אלו הוזנו על ידי הלקוח בשלב ה-Onboarding ומשמשים את המערכת לדיוק תוכן ה-AI.</p>
           </div>
        </div>
      </div>

      <div className="bg-white p-12 rounded-[56px] border border-slate-200 shadow-xl flex flex-col gap-10">
        <h3 className="text-2xl font-black">אוצר מילים (DNA)</h3>
        <div className="flex flex-col gap-8">
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-4 mb-3 block">מילים אהובות לשימוש</label>
            <div className="flex flex-wrap gap-2">
              {client.dna.vocabulary.loved.map(word => (
                <span key={word} className="px-4 py-2 bg-green-50 text-green-700 font-black text-xs rounded-xl border border-green-100">{word}</span>
              ))}
              <button className="px-4 py-2 bg-slate-50 text-slate-400 font-black text-xs rounded-xl border border-slate-200 hover:bg-slate-100 hover:text-slate-600 transition-all">+</button>
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-4 mb-3 block">מילים אסורות</label>
            <div className="flex flex-wrap gap-2">
              {client.dna.vocabulary.forbidden.map(word => (
                <span key={word} className="px-4 py-2 bg-red-50 text-red-700 font-black text-xs rounded-xl border border-red-100">{word}</span>
              ))}
              <button className="px-4 py-2 bg-slate-50 text-slate-400 font-black text-xs rounded-xl border border-slate-200 hover:bg-slate-100 hover:text-slate-600 transition-all">+</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DNATab;

