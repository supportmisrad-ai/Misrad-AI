
import React, { useState } from 'react';
import { X, Megaphone, Target, DollarSign, Layout, CirclePlus, ArrowLeft } from 'lucide-react';
import { Campaign } from '../types';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';
import { CustomSelect } from '@/components/CustomSelect';

interface NewCampaignModalProps {
  onClose: () => void;
  onSubmit: (campaign: Pick<Campaign, 'name' | 'platform' | 'budget' | 'status'>) => void;
}

const NewCampaignModal: React.FC<NewCampaignModalProps> = ({ onClose, onSubmit }) => {
  useBackButtonClose(true, onClose);
  const [name, setName] = useState('');
  const [platformMode, setPlatformMode] = useState<'select' | 'custom'>('select');
  const [platform, setPlatform] = useState<string>('facebook');
  const [customPlatform, setCustomPlatform] = useState('');
  const [budget, setBudget] = useState<string>('1000');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      platform: (platformMode === 'custom' ? customPlatform : platform) as string,
      budget: Number(budget),
      status: 'active'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden ring-1 ring-slate-900/5 transform transition-all animate-scale-in" 
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
             <div>
                 <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                     <Megaphone size={20} className="text-indigo-600" />
                     הקמת קמפיין חדש
                 </h3>
                 <p className="text-sm text-slate-500 font-medium mt-1">הגדרת מקור תנועה ותקציב</p>
             </div>
             <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full border border-slate-200 hover:bg-slate-100 transition-colors">
                 <X size={20} />
             </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Target size={16} className="text-slate-400" />
                    שם הקמפיין
                </label>
                <input 
                    type="text" 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm"
                    placeholder="לדוגמה: קמפיין שותפים, רדיו מקומי, שלטי חוצות"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Layout size={16} className="text-slate-400" />
                            פלטפורמה
                        </div>
                        {platformMode === 'select' && (
                             <button 
                                type="button" 
                                onClick={() => setPlatformMode('custom')}
                                className="text-[10px] text-indigo-600 hover:underline font-medium flex items-center gap-1"
                             >
                                 <CirclePlus size={10} /> הוסף חדש
                             </button>
                        )}
                        {platformMode === 'custom' && (
                             <button 
                                type="button" 
                                onClick={() => setPlatformMode('select')}
                                className="text-[10px] text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1"
                             >
                                 <ArrowLeft size={10} /> חזרה לרשימה
                             </button>
                        )}
                    </label>
                    
                    {platformMode === 'select' ? (
                        <div className="relative">
                            <CustomSelect
                                value={platform}
                                onChange={(val) => setPlatform(val)}
                                options={[
                                    { value: 'facebook', label: 'Facebook' },
                                    { value: 'google', label: 'Google Ads' },
                                    { value: 'instagram', label: 'Instagram' },
                                    { value: 'tiktok', label: 'TikTok' },
                                    { value: 'linkedin', label: 'LinkedIn' },
                                    { value: 'youtube', label: 'YouTube' },
                                    { value: 'outbrain', label: 'Outbrain / Taboola' },
                                ]}
                            />
                        </div>
                    ) : (
                        <input 
                            type="text" 
                            required
                            autoFocus
                            className="w-full border border-indigo-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/20 shadow-sm"
                            placeholder="הזן שם פלטפורמה (למשל: רדיו 99)"
                            value={customPlatform}
                            onChange={e => setCustomPlatform(e.target.value)}
                        />
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <DollarSign size={16} className="text-slate-400" />
                        תקציב חודשי
                    </label>
                    <div className="relative">
                        <input 
                            type="number" 
                            required
                            min="100"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white shadow-sm transition-all"
                            value={budget}
                            onChange={e => setBudget(e.target.value)}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₪</span>
                    </div>
                </div>
            </div>

            <div className="pt-6 flex gap-3 border-t border-slate-100 mt-2">
                <button 
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                    ביטול
                </button>
                <button 
                    type="submit"
                    className="flex-1 bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 hover:-translate-y-0.5"
                >
                    הפעל קמפיין
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default NewCampaignModal;
