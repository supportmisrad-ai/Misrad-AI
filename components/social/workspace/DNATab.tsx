'use client';

import React, { useState } from 'react';
import { Save, Target, Lightbulb, TrendingUp, Info, Zap, Quote } from 'lucide-react';
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
  const [lovedWords, setLovedWords] = useState(client.dna.vocabulary.loved);
  const [forbiddenWords, setForbiddenWords] = useState(client.dna.vocabulary.forbidden);
  const [newLovedWord, setNewLovedWord] = useState('');
  const [newForbiddenWord, setNewForbiddenWord] = useState('');
  const [showLovedInput, setShowLovedInput] = useState(false);
  const [showForbiddenInput, setShowForbiddenInput] = useState(false);

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

  const handleAddLovedWord = () => {
    if (!newLovedWord.trim()) return;
    setLovedWords(prev => [...prev, newLovedWord.trim()]);
    setNewLovedWord('');
    setShowLovedInput(false);
  };

  const handleRemoveLovedWord = (word: string) => {
    setLovedWords(prev => prev.filter(w => w !== word));
  };

  const handleAddForbiddenWord = () => {
    if (!newForbiddenWord.trim()) return;
    setForbiddenWords(prev => [...prev, newForbiddenWord.trim()]);
    setNewForbiddenWord('');
    setShowForbiddenInput(false);
  };

  const handleRemoveForbiddenWord = (word: string) => {
    setForbiddenWords(prev => prev.filter(w => w !== word));
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* DNA Voice Sliders */}
        <div className="bg-white p-12 rounded-[56px] border border-slate-200 shadow-xl flex flex-col gap-10">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black flex items-center gap-3"><Zap className="text-blue-600" size={28}/> טון הדיבור והסגנון</h3>
            {isDnaDirty && (
              <button onClick={handleSaveDna} disabled={isSavingDna} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black shadow-lg flex items-center gap-2">
                <Save size={14} className={isSavingDna ? 'opacity-60' : undefined} /> {isSavingDna ? 'שומר...' : 'שמור שינויים'}
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
                  onChange={(e) => handleDnaChange(d.k as 'formal' | 'funny' | 'length', Number(e.target.value))} 
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
              {lovedWords.map(word => (
                <span key={word} className="px-4 py-2 bg-green-50 text-green-700 font-black text-xs rounded-xl border border-green-100 flex items-center gap-2 group">
                  {word}
                  <button onClick={() => handleRemoveLovedWord(word)} className="opacity-0 group-hover:opacity-100 text-green-400 hover:text-green-600 transition-all">×</button>
                </span>
              ))}
              {showLovedInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newLovedWord}
                    onChange={e => setNewLovedWord(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddLovedWord()}
                    placeholder="מילה חדשה..."
                    autoFocus
                    className="px-3 py-2 border border-green-200 rounded-xl text-xs font-bold outline-none focus:border-green-400 w-32"
                  />
                  <button onClick={handleAddLovedWord} className="px-3 py-2 bg-green-500 text-white font-black text-xs rounded-xl hover:bg-green-600">✓</button>
                  <button onClick={() => { setShowLovedInput(false); setNewLovedWord(''); }} className="px-3 py-2 bg-slate-200 text-slate-600 font-black text-xs rounded-xl hover:bg-slate-300">×</button>
                </div>
              ) : (
                <button onClick={() => setShowLovedInput(true)} className="px-4 py-2 bg-slate-50 text-slate-400 font-black text-xs rounded-xl border border-slate-200 hover:bg-slate-100 hover:text-slate-600 transition-all">+</button>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-4 mb-3 block">מילים אסורות</label>
            <div className="flex flex-wrap gap-2">
              {forbiddenWords.map(word => (
                <span key={word} className="px-4 py-2 bg-red-50 text-red-700 font-black text-xs rounded-xl border border-red-100 flex items-center gap-2 group">
                  {word}
                  <button onClick={() => handleRemoveForbiddenWord(word)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all">×</button>
                </span>
              ))}
              {showForbiddenInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newForbiddenWord}
                    onChange={e => setNewForbiddenWord(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddForbiddenWord()}
                    placeholder="מילה חדשה..."
                    autoFocus
                    className="px-3 py-2 border border-red-200 rounded-xl text-xs font-bold outline-none focus:border-red-400 w-32"
                  />
                  <button onClick={handleAddForbiddenWord} className="px-3 py-2 bg-red-500 text-white font-black text-xs rounded-xl hover:bg-red-600">✓</button>
                  <button onClick={() => { setShowForbiddenInput(false); setNewForbiddenWord(''); }} className="px-3 py-2 bg-slate-200 text-slate-600 font-black text-xs rounded-xl hover:bg-slate-300">×</button>
                </div>
              ) : (
                <button onClick={() => setShowForbiddenInput(true)} className="px-4 py-2 bg-slate-50 text-slate-400 font-black text-xs rounded-xl border border-slate-200 hover:bg-slate-100 hover:text-slate-600 transition-all">+</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DNATab;

