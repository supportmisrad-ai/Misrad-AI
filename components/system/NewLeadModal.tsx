'use client';




import React, { useState } from 'react';
import { X, User, Building, Phone, Mail, Globe, DollarSign, Flame, Save, CircleCheck, CircleAlert, Clock, Package } from 'lucide-react';
import { Lead, ProductType } from './types';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

interface NewLeadModalProps {
  onClose: () => void;
  onSave: (lead: Lead) => void | Promise<void>;
}

const NewLeadModal: React.FC<NewLeadModalProps> = ({ onClose, onSave }) => {
  useBackButtonClose(true, onClose);
  const [formData, setFormData] = useState({
    name: '', 
    company: '', 
    phone: '', 
    email: '', 
    source: 'פייסבוק', 
    value: 5000, 
    isHot: false,
    productInterest: 'mastermind_group' as ProductType
  });
  const [errors, setErrors] = useState<{phone?: string, email?: string}>({});
  const [touched, setTouched] = useState<{phone?: boolean, email?: boolean}>({});
  const [isSaving, setIsSaving] = useState(false);

  const validatePhone = (phone: string) => {
      const phoneRegex = /^05\d-?\d{7}$/;
      return phoneRegex.test(phone);
  };

  const validateEmail = (email: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
  };

  const handleBlur = (field: 'phone' | 'email') => {
      setTouched(prev => ({ ...prev, [field]: true }));
      if (field === 'phone') {
          if (!validatePhone(formData.phone)) setErrors(prev => ({ ...prev, phone: 'מספר לא תקין' }));
          else setErrors(prev => ({ ...prev, phone: undefined }));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!validatePhone(formData.phone)) return;

    const newLead: Lead = {
      id: `manual_${Date.now()}`,
      ...formData,
      status: 'incoming',
      value: Number(formData.value),
      lastContact: new Date(),
      createdAt: new Date(),
      activities: [{ id: `act_${Date.now()}`, type: 'system' as const, content: 'ליד נוצר ידנית במערכת', timestamp: new Date() }],
      location: { x: 50, y: 50 },
      score: 50
    };

    setIsSaving(true);
    try {
      const result = onSave(newLead);
      if (result && typeof (result as Promise<void>).then === 'function') {
        await result;
      }
    } catch {
      // Parent handles error display
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-center items-end md:items-center animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white w-full h-full md:h-auto md:max-w-2xl rounded-none md:rounded-[48px] shadow-2xl overflow-hidden flex flex-col ring-1 ring-slate-900/5 animate-slide-up md:animate-scale-in" 
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-slate-50 p-6 md:p-10 border-b border-slate-100 flex justify-between items-center shrink-0 safe-area-top">
             <div>
                 <h3 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-3">
                     <User size={24} className="text-primary" />
                     ליד חדש
                 </h3>
                 <p className="text-sm text-slate-500 font-medium mt-1">הזנת פרטים ראשונית למערכת</p>
             </div>
             <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white p-3 rounded-full border border-slate-200 hover:bg-slate-100 transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-8 md:p-12 overflow-y-auto flex-1 custom-scrollbar safe-area-bottom">
            <form id="new-lead-form" onSubmit={handleSubmit} className="space-y-10 pb-20 md:pb-0">
                
                <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Package size={18} className="text-slate-400" />
                        מה סוג השירות המבוקש?
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { id: 'mastermind_group', label: 'קבוצה', desc: 'מאסטרמיינד', val: 15000 },
                            { id: 'premium_1on1', label: 'פרימיום', desc: 'ליווי אישי', val: 45000 },
                            { id: 'digital_course', label: 'קורס', desc: 'מוצר דיגיטלי', val: 3000 }
                        ].map((prod) => (
                            <div 
                                key={prod.id}
                                onClick={() => setFormData({ ...formData, productInterest: prod.id as ProductType, value: prod.val })}
                                className={`cursor-pointer p-4 rounded-[24px] border-2 flex flex-col gap-2 transition-all ${formData.productInterest === prod.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                            >
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.productInterest === prod.id ? 'border-white' : 'border-slate-300'}`}>
                                    {formData.productInterest === prod.id && <div className="w-2.5 h-2.5 rounded-full bg-white animate-scale-in"></div>}
                                </div>
                                {/** Corrected JSX to display labels correctly */}
                                <div>
                                    <div className="font-bold text-sm">{prod.label}</div>
                                    <div className={`text-xs opacity-70`}>{prod.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700">שם מלא</label>
                        <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-full px-6 py-4 text-sm focus:ring-4 focus:ring-primary/10 focus:bg-white outline-none transition-all shadow-sm" placeholder="ישראל ישראלי" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-700">מספר טלפון</label>
                            <input type="tel" required className="w-full bg-slate-50 border border-slate-200 rounded-full px-6 py-4 text-sm focus:ring-4 focus:ring-primary/10 focus:bg-white outline-none transition-all shadow-sm" placeholder="050-0000000" dir="ltr" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-700">כתובת אימייל</label>
                            <input type="email" className="w-full bg-slate-50 border border-slate-200 rounded-full px-6 py-4 text-sm focus:ring-4 focus:ring-primary/10 focus:bg-white outline-none transition-all shadow-sm" placeholder="דוא&quot;ל" dir="ltr" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Globe size={18} className="text-slate-400" />
                            מקור הליד
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {['פייסבוק', 'אינסטגרם', 'גוגל', 'הפניה', 'אתר', 'וואטסאפ', 'טלפוני', 'אחר'].map((src) => (
                                <button
                                    key={src}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, source: src })}
                                    className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${
                                        formData.source === src
                                            ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                    {src}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-rose-50/50 border border-rose-100 p-6 rounded-[32px] flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all hover:bg-rose-50" onClick={() => setFormData({...formData, isHot: !formData.isHot})}>
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-full ${formData.isHot ? 'bg-primary text-white shadow-lg' : 'bg-white text-rose-300'}`}>
                            <Flame size={28} fill={formData.isHot ? "currentColor" : "none"} />
                        </div>
                        <div>
                            <div className="font-bold text-slate-800 text-lg">זה ליד "חם" סגירה? 🔥</div>
                            <div className="text-xs text-slate-500 font-medium">המערכת תתעדף אותו אוטומטית</div>
                        </div>
                    </div>
                    <div dir="ltr" className={`w-14 h-8 rounded-full p-1 transition-colors ${formData.isHot ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <div className={`w-6 h-6 rounded-full bg-white shadow-sm transform transition-transform ${formData.isHot ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                </div>
            </form>
        </div>

        <div className="p-8 md:p-10 border-t border-slate-100 bg-slate-50 flex gap-4 shrink-0 safe-area-bottom">
            <button onClick={onClose} disabled={isSaving} className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-4 rounded-full hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">ביטול</button>
            <button type="submit" form="new-lead-form" disabled={isSaving} className="flex-1 bg-onyx-900 text-white font-bold py-4 rounded-full hover:bg-black transition-all shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                <Save size={20} /> {isSaving ? 'שומר...' : 'שמור ליד'}
            </button>
        </div>
      </div>
    </div>
  );
};
export default NewLeadModal;