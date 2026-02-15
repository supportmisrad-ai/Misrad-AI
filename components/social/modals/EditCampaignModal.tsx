'use client';

import React, { useState, useEffect } from 'react';
import { X, Target, Users, DollarSign, Save, Rocket, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Client, type Campaign } from '@/types/social';

interface EditCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  clients: Client[];
  onUpdate: (updatedCampaign: unknown) => void;
}

const OBJECTIVES = [
  { id: 'awareness', label: 'חשיפה', desc: 'להגיע לכמה שיותר אנשים', icon: Users },
  { id: 'engagement', label: 'מעורבות', desc: 'לייקים, תגובות ושיתופים', icon: Rocket },
  { id: 'traffic', label: 'תנועה', desc: 'קליקים לאתר או לוואטסאפ', icon: Target },
  { id: 'sales', label: 'מכירות', desc: 'המרות ישירות באתר', icon: DollarSign },
];

const EditCampaignModal: React.FC<EditCampaignModalProps> = ({ isOpen, onClose, campaign, clients, onUpdate }) => {
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [budget, setBudget] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (campaign && isOpen) {
      setName(campaign.name);
      setObjective((campaign as unknown as Record<string, unknown>).objective as string || 'engagement');
      setBudget(campaign.budget as number);
    }
  }, [campaign, isOpen]);

  if (!isOpen || !campaign) return null;

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      onUpdate({
        ...campaign,
        name,
        objective,
        budget
      });
      setIsSaving(false);
      onClose();
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><Save size={24}/></div>
                  <h2 className="text-2xl font-black">עריכת הגדרות קמפיין</h2>
               </div>
               <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={24}/></button>
            </div>

            <div className="p-10 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-10">
               {/* Campaign Name */}
               <div className="flex flex-col gap-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-4">שם הקמפיין</label>
                  <div className="bg-slate-50 border border-slate-100 rounded-[28px] p-5 flex items-center gap-4 focus-within:ring-4 ring-blue-50 transition-all">
                     <Tag className="text-slate-300" size={24}/>
                     <input 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="שם הקמפיין..."
                        className="bg-transparent outline-none flex-1 text-xl font-black"
                     />
                  </div>
               </div>

               {/* Objective Selection */}
               <div className="flex flex-col gap-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-4">מטרת הקמפיין</label>
                  <div className="grid grid-cols-2 gap-4">
                     {OBJECTIVES.map(obj => {
                       const Icon = obj.icon;
                       return (
                         <button 
                          key={obj.id} 
                          onClick={() => setObjective(obj.id)} 
                          className={`p-6 rounded-[32px] border-4 text-right transition-all group ${objective === obj.id ? 'border-blue-600 bg-blue-50' : 'border-slate-50 hover:border-blue-100'}`}
                         >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${objective === obj.id ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:text-blue-600'}`}><Icon size={20}/></div>
                            <p className="font-black text-lg">{obj.label}</p>
                            <p className="text-[10px] font-bold text-slate-400">{obj.desc}</p>
                         </button>
                       );
                     })}
                  </div>
               </div>

               {/* Budget Slider */}
               <div className="flex flex-col gap-6 bg-slate-50 p-8 rounded-[40px] border">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-4 text-center">עדכון תקציב חודשי (₪)</label>
                  <input 
                    type="range" 
                    min="500" 
                    max="50000" 
                    step="500" 
                    value={budget} 
                    onChange={e => setBudget(parseInt(e.target.value))} 
                    className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between items-center px-2">
                     <p className="text-4xl font-black text-blue-600">₪{budget.toLocaleString()}</p>
                     <div className="text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase">תקציב יומי מוערך</p>
                        <p className="text-lg font-black text-slate-800">₪{(budget / 30).toFixed(0)}</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-200 flex gap-4">
               <button onClick={onClose} className="flex-1 py-5 rounded-2xl font-black text-slate-400 hover:bg-slate-100 transition-all">ביטול</button>
               <button 
                onClick={handleSave} 
                disabled={isSaving || !name} 
                className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
               >
                  <Save size={20} className={isSaving ? 'opacity-60' : undefined} /> {isSaving ? 'שומר...' : 'שמור שינויים'}
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EditCampaignModal;

