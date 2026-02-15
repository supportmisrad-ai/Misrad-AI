'use client';

import React, { useState } from 'react';
import { X, Send, Copy, Check, MessageCircle, Link as LinkIcon, Zap, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { PricingPlan } from '@/types/social';
import { createClientForWorkspace, createClientInvitationLinkForWorkspace, inviteClientForWorkspace } from '@/app/actions/clients';
import { useUser } from '@clerk/nextjs';
import { translateError } from '@/lib/errorTranslations';
import { usePathname, useRouter } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';

const PLANS = [
  { id: 'starter' as PricingPlan, name: 'Starter', price: 1490, desc: '2 פוסטים בשבוע' },
  { id: 'pro' as PricingPlan, name: 'Professional', price: 2990, desc: '3 פוסטים + AI אקטיבי' },
  { id: 'agency' as PricingPlan, name: 'Agency', price: 5490, desc: 'ניהול מלא + קמפיין' },
];

export default function InviteClientModal() {
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const routeInfo = parseWorkspaceRoute(pathname);
  const { 
    isInviteModalOpen, 
    setIsInviteModalOpen, 
    clients, 
    setClients,
    setActiveClientId,
    setIsOnboardingMode,
    addToast 
  } = useApp();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan>('pro');
  const [monthlyFee, setMonthlyFee] = useState<number>(PLANS.find(p => p.id === 'pro')?.price ?? 2990);
  const [generatedLink, setGeneratedLink] = useState('');
  const [newClientId, setNewClientId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>('');

  if (!isInviteModalOpen) return null;

  const handleGenerate = async () => {
    if (!user?.id) {
      addToast('נא להתחבר כדי ליצור לקוח', 'error');
      return;
    }

    const orgSlug = routeInfo.orgSlug;
    if (!orgSlug) {
      addToast('שגיאה: לא נמצא ארגון פעיל בכתובת. נא להיכנס דרך /w/[orgSlug]/social', 'error');
      return;
    }

    // Validate name
    if (!name || !name.trim()) {
      setError('נא למלא שם לקוח');
      return;
    }
    if (name.trim().length < 2) {
      setError('שם הלקוח חייב להכיל לפחות 2 תווים');
      return;
    }

    setError('');
    setIsGenerating(true);
    const planObj = PLANS.find(p => p.id === selectedPlan)!;
    
    try {
      // Create client using Server Action
      const result = await createClientForWorkspace(orgSlug, {
        name,
        companyName: name,
        avatar: '',
        brandVoice: '',
        dna: {
          brandSummary: '',
          voice: { formal: 50, funny: 50, length: 50 },
          vocabulary: { loved: [], forbidden: [] },
          colors: { primary: '#1e293b', secondary: '#334155' }
        },
        credentials: [],
        activePlatforms: [],
        quotas: [],
        postingRhythm: selectedPlan === 'starter' ? 'פעמיים בשבוע' : selectedPlan === 'pro' ? '3 פעמים בשבוע' : 'יומי',
        status: 'Onboarding',
        onboardingStatus: 'invited',
        color: '#1e293b',
        plan: selectedPlan,
        monthlyFee,
        paymentStatus: 'pending',
        autoRemindersEnabled: true,
        businessMetrics: {
          timeSpentMinutes: 0,
          expectedHours: selectedPlan === 'starter' ? 5 : selectedPlan === 'pro' ? 10 : 20,
          punctualityScore: 100,
          responsivenessScore: 100,
          revisionCount: 0,
        }
      }, user.id);

      if (!result.success || !result.data) {
        const errorMsg = result.error ? translateError(result.error) : 'שגיאה ביצירת לקוח';
        setError(errorMsg);
        addToast(errorMsg, 'error');
        setIsGenerating(false);
        return;
      }

      const newClient = result.data;
      setClients(prev => [...prev, newClient]);

      const invitationResult = await createClientInvitationLinkForWorkspace({
        orgSlug,
        clientId: newClient.id,
        clerkUserId: user.id,
        source: 'social',
        metadata: {
          plan: selectedPlan,
          monthlyFee,
        },
      });

      if (!invitationResult.success || !invitationResult.token) {
        const errorMsg = invitationResult.error ? translateError(invitationResult.error) : 'שגיאה ביצירת לינק הזמנה';
        setError(errorMsg);
        addToast(errorMsg, 'error');
        setIsGenerating(false);
        return;
      }

      // Generate invitation link
      const invitationLink = `${window.location.origin}/invite/${invitationResult.token}`;
      setGeneratedLink(invitationLink);
      setNewClientId(newClient.id);
      
      // Send invitation email if email is provided
      if (newClient.email) {
        const inviteResult = await inviteClientForWorkspace(orgSlug, newClient.id, invitationLink);
        if (inviteResult.success) {
          addToast('מייל הזמנה נשלח בהצלחה!');
        } else {
          const errorMsg = inviteResult.error ? translateError(inviteResult.error) : 'הלקוח נוצר אך המייל לא נשלח';
          addToast('הלקוח נוצר אך המייל לא נשלח: ' + errorMsg, 'error');
        }
      }
      
      setIsGenerating(false);
      setStep(2);
      addToast('לינק הקמה נוצר בהצלחה!');
    } catch (error: unknown) {
      console.error('Error creating client:', error);
      const errorMsg = error instanceof Error && error.message ? translateError(error.message) : 'שגיאה ביצירת לקוח';
      setError(errorMsg);
      addToast('שגיאה ביצירת לקוח: ' + errorMsg, 'error');
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('הקישור הועתק!');
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`היי ${name}, שלחתי לך לינק להקמת חשבון ב-Social. שם תוכלו למלא פרטים, להגדיר DNA ולהעלות חומרים: ${generatedLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleSimulate = () => {
    if (newClientId) {
      const orgSlug = routeInfo.orgSlug;
      if (!orgSlug) {
        addToast('שגיאה: לא נמצא ארגון פעיל בכתובת. נא להיכנס דרך /w/[orgSlug]/social', 'error');
        return;
      }

      setActiveClientId(newClientId);
      setIsOnboardingMode(true);
      setIsInviteModalOpen(false);
      router.push(`/w/${orgSlug}/social/workspace?clientId=${encodeURIComponent(newClientId)}&onboarding=1`);
      addToast('פותח כרטיס לקוח...', 'info');
    }
  };

  const reset = () => {
    setStep(1);
    setName('');
    setGeneratedLink('');
    setNewClientId(null);
    setError('');
    setIsInviteModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-start sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" onClick={reset}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-xl rounded-none sm:rounded-[48px] shadow-2xl overflow-hidden flex flex-col min-h-screen sm:min-h-0 max-h-screen sm:max-h-[95vh] my-0 sm:my-4"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <div className="p-4 sm:p-8 border-b flex items-center justify-between bg-blue-50/30 relative">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-blue-600 text-white rounded-xl sm:rounded-2xl shadow-lg">
              <LinkIcon size={20} className="sm:w-6 sm:h-6"/>
            </div>
            <h2 className="text-lg sm:text-2xl font-black">שלח לינק הקמה ללקוח</h2>
          </div>
          <button onClick={reset} className="p-2 hover:bg-slate-100 rounded-xl transition-all" aria-label="סגור">
            <X size={20} className="sm:w-6 sm:h-6"/>
          </button>
        </div>

        <div className="p-4 sm:p-10 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6 sm:gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">שם הלקוח / העסק</label>
                  <input 
                    autoFocus
                    value={name}
                    onChange={e => {
                      setName(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="מי הלקוח החדש?"
                    className={`bg-slate-50 border rounded-2xl sm:rounded-[28px] px-4 sm:px-6 py-4 sm:py-5 text-lg sm:text-xl font-black outline-none min-h-[48px] transition-all ${
                      error 
                        ? 'border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
                        : 'border-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  {error && (
                    <p className="text-xs text-red-500 mt-1">{error}</p>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">בחר חבילת שירות ללינק</label>
                  <div className="grid grid-cols-1 gap-3">
                    {PLANS.map(plan => (
                      <button 
                        key={plan.id}
                        onClick={() => {
                          setSelectedPlan(plan.id);
                          setMonthlyFee(plan.price);
                        }}
                        disabled={isGenerating}
                        className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 flex items-center justify-between transition-all ${
                          selectedPlan === plan.id 
                            ? 'border-green-600 bg-green-50/50 shadow-sm' 
                            : 'border-slate-100 hover:border-slate-300 hover:shadow-md'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <div className="flex flex-col text-right">
                          <span className="font-black text-base sm:text-lg">{plan.name}</span>
                          <span className="text-xs font-bold text-slate-400">{plan.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">מחיר חודשי ללקוח (₪)</label>
                  <input
                    type="number"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(Number(e.target.value))}
                    min={0}
                    disabled={isGenerating}
                    className="bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-[28px] px-4 sm:px-6 py-4 sm:py-5 text-lg sm:text-xl font-black outline-none min-h-[48px] transition-all focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="לדוגמה: 2990"
                  />
                  <p className="text-xs text-slate-400 font-bold px-1">ברירת המחדל מגיעה מהחבילה שבחרת — אפשר לערוך לפני יצירת הלינק.</p>
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={!name || !name.trim() || name.trim().length < 2 || isGenerating}
                  className="w-full bg-slate-900 text-white py-4 sm:py-6 rounded-2xl sm:rounded-[28px] font-black text-lg sm:text-xl shadow-xl flex items-center justify-center gap-3 sm:gap-4 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 min-h-[48px] sm:min-h-[56px]"
                >
                  {isGenerating ? (
                    <>מעבד...</>
                  ) : (
                    <><Zap size={20} className="sm:w-6 sm:h-6" /> צור לינק הקמה</>
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.div key="s2" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center gap-6 sm:gap-8 py-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-green-100">
                  <Check size={32} className="sm:w-10 sm:h-10" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black mb-2">הלינק מוכן לשליחה!</h3>
                  <p className="text-sm sm:text-base text-slate-400 font-bold max-w-sm mx-auto px-4">
                    הלקוח {name} יוכל להשלים את כל ההגדרות וה-DNA בעצמו דרך הלינק הזה.
                  </p>
                </div>

                <div className="w-full bg-slate-50 p-4 sm:p-8 rounded-2xl sm:rounded-[40px] border border-slate-200 flex flex-col gap-3 sm:gap-4">
                  <div className="bg-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-100 w-full font-black text-blue-600 break-all sm:truncate text-center select-all text-sm sm:text-base">
                    {generatedLink}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <button 
                      onClick={handleCopy}
                      className={`flex-1 py-4 sm:py-5 rounded-xl sm:rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3 transition-all min-h-[48px] ${
                        copied ? 'bg-green-500 text-white' : 'bg-green-600 text-white shadow-lg shadow-green-100 hover:bg-green-700'
                      }`}
                    >
                      {copied ? <><Check size={20} className="sm:w-6 sm:h-6" /> הועתק!</> : <><Copy size={20} className="sm:w-6 sm:h-6" /> העתק</>}
                    </button>
                    <button 
                      onClick={handleWhatsApp}
                      className="flex-1 py-4 sm:py-5 bg-green-500 text-white rounded-xl sm:rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3 shadow-lg shadow-green-100 hover:bg-green-600 transition-all min-h-[48px]"
                    >
                      <MessageCircle size={20} className="sm:w-6 sm:h-6" /> וואטסאפ
                    </button>
                  </div>
                </div>

                <div className="w-full h-px bg-slate-100 my-2"></div>

                <button 
                  onClick={handleSimulate}
                  className="w-full py-3 sm:py-4 bg-slate-100 text-slate-600 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 sm:gap-3 hover:bg-green-600 hover:text-white transition-all group min-h-[44px]"
                >
                  <Eye size={16} className="sm:w-[18px] sm:h-[18px] group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">פתח כרטיס לקוח</span>
                  <span className="sm:hidden">כרטיס לקוח</span>
                </button>
                
                <button onClick={reset} className="text-slate-400 font-bold hover:text-slate-600 underline text-xs">
                  סיום וחזרה ללוח לקוחות
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

