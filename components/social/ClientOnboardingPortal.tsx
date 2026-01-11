'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, BrainCircuit, Building, Loader2, Save, X, Camera, Facebook, Instagram, Linkedin, Video, Globe, MessageCircle, Twitter, Share2, PinIcon, MessageSquare, CreditCard } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { SocialPlatform } from '@/types/social';
import { updateClient } from '@/app/actions/client-clients';

const PLATFORM_ICONS: Record<SocialPlatform, any> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  tiktok: Video,
  twitter: Twitter,
  google: Globe,
  whatsapp: MessageCircle,
  threads: Share2,
  youtube: Video,
  pinterest: PinIcon,
  portal: MessageSquare
};

export default function ClientOnboardingPortal() {
  const { 
    activeClient, 
    platformConfigs,
    setClients,
    setIsOnboardingMode,
    addToast 
  } = useApp();

  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState(activeClient?.companyName === 'ממתין להזנה' ? '' : activeClient?.companyName || '');
  const [logo, setLogo] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState('');
  const [invoiceName, setInvoiceName] = useState('');
  const [activePlatforms, setActivePlatforms] = useState<SocialPlatform[]>([]);
  const [brandSummary, setBrandSummary] = useState('');
  const [dna, setDna] = useState({ formal: 50, funny: 50, length: 50 });
  const [lovedWords, setLovedWords] = useState('');
  const [forbiddenWords, setForbiddenWords] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!activeClient) return null;

  const totalPrice = activePlatforms.reduce((sum, pId) => {
    const config = platformConfigs.find(c => c.id === pId);
    return sum + (config?.basePrice || 0);
  }, 0);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogo(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const togglePlatform = (id: SocialPlatform) => {
    setActivePlatforms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };


  const handleComplete = async () => {
    if (!companyName) {
      addToast('נא למלא שם עסק', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Prepare update data
      const updateData = {
        companyName,
        avatar: logo || activeClient.avatar,
        businessId: businessId || activeClient.businessId,
        activePlatforms,
        dna: {
          ...activeClient.dna,
          brandSummary,
          voice: dna,
          vocabulary: {
            loved: lovedWords.split(',').map(w => w.trim()).filter(Boolean),
            forbidden: forbiddenWords.split(',').map(w => w.trim()).filter(Boolean)
          }
        },
        onboardingStatus: 'completed' as const,
        status: 'Active' as const,
        paymentStatus: 'paid' as const
      };

      // Save to database
      const result = await updateClient(activeClient.id, updateData);

      if (!result.success) {
        addToast(result.error || 'שגיאה בשמירת הנתונים', 'error');
        setIsSubmitting(false);
        return;
      }

      // Update local state
      setClients(prev => prev.map(c => 
        c.id === activeClient.id 
          ? {
              ...c,
              ...updateData
            }
          : c
      ));
      
      setIsSubmitting(false);
      setIsOnboardingMode(false);
      addToast('הגדרות הלקוח והתשלום הושלמו בהצלחה! 🎉');
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      addToast('שגיאה בשמירת הנתונים: ' + (error.message || 'שגיאה לא ידועה'), 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-4xl bg-white rounded-[48px] shadow-2xl overflow-hidden">
        <div className="p-8 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl">
              S
            </div>
            <h1 className="text-2xl font-black">הקמת חשבון</h1>
          </div>
          <button onClick={() => setIsOnboardingMode(false)} className="p-2 hover:bg-slate-100 rounded-xl">
            <X size={24} />
          </button>
        </div>

        <div className="p-10 overflow-y-auto max-h-[80vh]">
          <div className="flex items-center gap-4 mb-8">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                  step === s ? 'bg-slate-900 text-white' : 
                  step > s ? 'bg-green-500 text-white' : 
                  'bg-slate-100 text-slate-400'
                }`}>
                  {step > s ? <CheckCircle2 size={20} /> : s}
                </div>
                {s < 4 && <div className={`w-12 h-1 ${step > s ? 'bg-green-500' : 'bg-slate-100'}`} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <h2 className="text-2xl font-black mb-6">פרטי העסק</h2>
              <div>
                <label className="block text-sm font-black text-slate-400 mb-2">שם העסק *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-lg outline-none focus:ring-4 ring-blue-50"
                  placeholder="שם העסק"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-400 mb-2">לוגו</label>
                <div className="flex items-center gap-4">
                  {logo && <img src={logo} className="w-20 h-20 rounded-2xl object-cover" alt="Logo" />}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black flex items-center gap-2"
                  >
                    <Camera size={20} />
                    העלה לוגו
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-black text-slate-400 mb-2">ח.פ / ע.מ</label>
                <input
                  type="text"
                  value={businessId}
                  onChange={e => setBusinessId(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-lg outline-none focus:ring-4 ring-blue-50"
                  placeholder="מספר עסק"
                />
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!companyName}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg disabled:opacity-50"
              >
                המשך <ArrowRight size={20} className="inline mr-2" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <h2 className="text-2xl font-black mb-6">בחר רשתות</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {platformConfigs.filter(p => p.isEnabled).map(config => {
                  const Icon = PLATFORM_ICONS[config.id as SocialPlatform];
                  const isSelected = activePlatforms.includes(config.id as SocialPlatform);
                  return (
                    <button
                      key={config.id}
                      onClick={() => togglePlatform(config.id as SocialPlatform)}
                      className={`p-6 rounded-3xl border-2 transition-all ${
                        isSelected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 bg-white'
                      }`}
                    >
                      {Icon && <Icon size={32} />}
                      <p className="font-black text-sm mt-2">{config.label}</p>
                      <p className="text-xs font-bold opacity-70 mt-1">₪{config.basePrice}</p>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black">
                  חזרה
                </button>
                <button onClick={() => setStep(3)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black">
                  המשך <ArrowRight size={20} className="inline mr-2" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <h2 className="text-2xl font-black mb-6">זהות המותג</h2>
              <div>
                <label className="block text-sm font-black text-slate-400 mb-2">סיכום המותג</label>
                <textarea
                  value={brandSummary}
                  onChange={e => setBrandSummary(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 h-32"
                  placeholder="תאר את העסק שלך..."
                />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-400 mb-2">מילים אהובות (מופרדות בפסיק)</label>
                <input
                  type="text"
                  value={lovedWords}
                  onChange={e => setLovedWords(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50"
                  placeholder="פינוק, איכות, מקצועיות"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-400 mb-2">מילים אסורות (מופרדות בפסיק)</label>
                <input
                  type="text"
                  value={forbiddenWords}
                  onChange={e => setForbiddenWords(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50"
                  placeholder="זול, פשוט"
                />
              </div>
              <div className="flex gap-4">
                <button onClick={() => setStep(2)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black">
                  חזרה
                </button>
                <button onClick={() => setStep(4)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black">
                  המשך <ArrowRight size={20} className="inline mr-2" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <h2 className="text-2xl font-black mb-6">סיכום ותשלום</h2>
              <div className="bg-slate-50 p-6 rounded-3xl">
                <p className="font-black text-lg mb-4">סה"כ לתשלום: ₪{totalPrice}</p>
                <p className="text-sm font-bold text-slate-400">כולל {activePlatforms.length} רשתות</p>
              </div>
              <button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-xl flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={24} className="animate-spin" />
                    מעבד...
                  </>
                ) : (
                  <>
                    <CreditCard size={24} />
                    השלם תשלום והגדר
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

