'use client';

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Building, CircleCheckBig, ArrowRight, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocialData } from '@/contexts/SocialDataContext';
import { useSocialUI } from '@/contexts/SocialUIContext';
import { useUser } from '@clerk/nextjs';
import { PricingPlan, SocialPlatform, Client } from '@/types/social';
import { createClientForWorkspace } from '@/app/actions/clients';
import { translateError } from '@/lib/errorTranslations';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';
import { safeBrowserUrl } from '@/lib/shared/safe-browser-url';

const PLANS = [
  { id: 'starter' as PricingPlan, name: 'Starter', price: 1490, desc: '2 פוסטים בשבוע' },
  { id: 'pro' as PricingPlan, name: 'Professional', price: 2990, desc: '3 פוסטים + AI' },
  { id: 'agency' as PricingPlan, name: 'Agency', price: 5490, desc: 'ניהול מלא' },
];

export default function AddClientModal() {
  const { user } = useUser();
  const pathname = usePathname();
  const routeInfo = parseWorkspaceRoute(pathname);
  const { clients, setClients } = useSocialData();
  const { isAddClientModalOpen, setIsAddClientModalOpen, addToast } = useSocialUI();
  useBackButtonClose(isAddClientModalOpen, () => setIsAddClientModalOpen(false));

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState('');
  const [invoiceName, setInvoiceName] = useState('');
  const [email, setEmail] = useState(''); // Optional email
  const [phone, setPhone] = useState(''); // Optional phone
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan>('pro');
  const [monthlyFee, setMonthlyFee] = useState<number>(PLANS.find(p => p.id === 'pro')?.price ?? 2990);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Refs for form fields
  const nameRef = useRef<HTMLInputElement>(null);
  const businessIdRef = useRef<HTMLInputElement>(null);
  const invoiceNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const nextStepButtonRef = useRef<HTMLButtonElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Handle Enter key to move to next field or submit
  const handleKeyDown = (e: React.KeyboardEvent, nextField?: React.RefObject<HTMLInputElement | HTMLButtonElement | null>, onEnter?: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (onEnter) {
        onEnter();
      } else if (nextField?.current) {
        if (nextField.current instanceof HTMLButtonElement) {
          if (!nextField.current.disabled) {
            nextField.current.click();
          }
        } else {
          nextField.current.focus();
        }
      }
    }
  };

  if (!isAddClientModalOpen) return null;

  const currentPlan = PLANS.find(p => p.id === selectedPlan)!;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogo(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Validation functions
  const isValidEmail = (email: string): boolean => {
    if (!email) return true; // Optional field
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPhone = (phone: string): boolean => {
    if (!phone) return true; // Optional field
    // Israeli phone format: 050-1234567 or 0501234567
    return /^0\d{1,2}-?\d{7}$/.test(phone.replace(/\s/g, ''));
  };

  const validateForm = (): { valid: boolean; error?: string; step?: number } => {
    if (!name || !name.trim()) {
      return { valid: false, error: 'נא למלא שם עסק', step: 1 };
    }
    if (name.trim().length < 2) {
      return { valid: false, error: 'שם העסק חייב להכיל לפחות 2 תווים', step: 1 };
    }
    if (email && !isValidEmail(email)) {
      return { valid: false, error: 'אימייל לא תקין', step: 2 };
    }
    if (phone && !isValidPhone(phone)) {
      return { valid: false, error: 'טלפון לא תקין. נא להזין בפורמט: 050-1234567', step: 2 };
    }
    return { valid: true };
  };


  const handlePayment = async () => {
    if (!user?.id) {
      addToast('נא להתחבר כדי ליצור לקוח', 'error');
      return;
    }

    const orgSlug = routeInfo.orgSlug;
    if (!orgSlug) {
      addToast('שגיאה: לא נמצא ארגון פעיל בכתובת. נא להיכנס דרך /w/[orgSlug]/social', 'error');
      return;
    }

    // Validate form before submitting
    const validation = validateForm();
    if (!validation.valid) {
      addToast(validation.error || 'נא למלא את כל השדות הנדרשים', 'error');
      if (validation.step) {
        setStep(validation.step);
      }
      return;
    }

    setErrors({});

    // Ensure companyName is valid (at least 2 characters)
    const finalCompanyName = (invoiceName && invoiceName.trim().length >= 2)
      ? invoiceName.trim()
      : (name && name.trim().length >= 2)
        ? name.trim()
        : name.trim() || 'לקוח חדש';

    const clientPayload = {
      name: name.trim(),
      companyName: finalCompanyName,
      ...(businessId && { businessId }),
      ...(phone && { phone }),
      ...(email && { email }),
      ...(logo && { avatar: logo }),
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
      status: 'Active' as const,
      onboardingStatus: 'completed' as const,
      color: '#1e293b',
      plan: selectedPlan,
      monthlyFee,
      paymentStatus: 'pending' as const,
      autoRemindersEnabled: true,
      businessMetrics: {
        timeSpentMinutes: 0,
        expectedHours: selectedPlan === 'starter' ? 5 : selectedPlan === 'pro' ? 10 : 20,
        punctualityScore: 100,
        responsivenessScore: 100,
        revisionCount: 0,
      },
    };

    // Optimistic: add client to list immediately & close modal
    const optimisticId = `optimistic-client-${Date.now()}`;
    const optimisticClient: Client = {
      id: optimisticId,
      organizationId: '',
      portalToken: '',
      avatar: logo || '',
      ...clientPayload,
    };
    setClients(prev => [...prev, optimisticClient]);
    resetAndClose();

    // Persist in background
    try {
      const result = await createClientForWorkspace(orgSlug, clientPayload as unknown as Partial<Client>, user.id);

      if (result.success && result.data) {
        // Replace optimistic client with real one
        setClients(prev => prev.map(c => c.id === optimisticId ? result.data! : c));
        addToast(`הלקוח ${name} נוסף בהצלחה למערכת`, 'success');
      } else {
        // Rollback: remove optimistic client
        setClients(prev => prev.filter(c => c.id !== optimisticId));
        const errorMsg = result.error ? translateError(result.error) : 'שגיאה ביצירת לקוח';
        console.error('Error creating client:', { error: result.error, name, companyName: invoiceName || name, email, phone, businessId });
        addToast(errorMsg, 'error');
      }
    } catch (error: unknown) {
      // Rollback: remove optimistic client
      setClients(prev => prev.filter(c => c.id !== optimisticId));
      const errObj = error instanceof Error ? error : null;
      console.error('Error creating client:', { error, message: errObj?.message, clientData: { name: name.trim(), companyName: invoiceName || name, email, phone, businessId } });
      const errorMsg = errObj?.message ? translateError(errObj.message) : 'שגיאה ביצירת לקוח';
      addToast('שגיאה ביצירת לקוח: ' + errorMsg, 'error');
    }
  };

  const resetAndClose = () => {
    setIsAddClientModalOpen(false);
    setTimeout(() => {
      setStep(1);
      setName('');
      setLogo(null);
      setBusinessId('');
      setInvoiceName('');
      setEmail('');
      setPhone('');
      setErrors({});
    }, 300);
  };

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-start md:items-center justify-center p-0 sm:p-2 md:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" onClick={resetAndClose}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-4xl rounded-none sm:rounded-2xl md:rounded-[48px] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-screen sm:min-h-0 md:min-h-[600px] max-h-screen sm:max-h-[95vh] md:max-h-none my-0 sm:my-4 md:my-0"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Sidebar - Compact on mobile, full on desktop */}
        <div className="w-full md:w-80 bg-slate-900 p-4 sm:p-6 md:p-12 text-white flex flex-row md:flex-col gap-4 md:gap-8 text-right shrink-0 overflow-x-hidden md:overflow-x-visible scrollbar-hide relative">
          {/* Mobile: Close button */}
          <button
            onClick={resetAndClose}
            className="md:hidden absolute top-4 left-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="סגור"
          >
            <X size={20} className="text-white" />
          </button>
          
          {/* Mobile: Horizontal compact view */}
          <div className="md:hidden flex items-center gap-2.5 min-w-max">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-900 font-bold text-lg shadow-sm shrink-0">S</div>
            <div className="flex gap-1.5">
              {[
                { s: 1, l: 'פרטי העסק' },
                { s: 2, l: 'חשבונאות' },
                { s: 3, l: 'גישה לרשתות' },
                { s: 4, l: 'בחירת חבילה' },
              ].map(item => (
                <div key={item.s} className={`flex items-center gap-1.5 ${step === item.s ? 'opacity-100' : 'opacity-50'}`} title={item.l}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                    step === item.s ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 
                    step > item.s ? 'bg-emerald-500 text-white' : 
                    'bg-slate-200/50 text-slate-500'
                  }`}>
                    {step > item.s ? <CircleCheckBig size={14} /> : item.s}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Desktop: Full vertical view */}
          <div className="hidden md:flex flex-col gap-6">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-900 font-bold text-2xl shadow-sm border border-slate-100">S</div>
            <h2 className="text-xl font-bold">הקמה ידנית</h2>
            <div className="flex flex-col gap-5">
              {[
                { s: 1, l: 'פרטי העסק' },
                { s: 2, l: 'חשבונאות' },
                { s: 3, l: 'גישה לרשתות' },
                { s: 4, l: 'בחירת חבילה' },
              ].map(item => (
                <div key={item.s} className={`flex gap-3 items-center transition-opacity ${step === item.s ? 'opacity-100' : 'opacity-50'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-colors ${
                    step === item.s ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 
                    step > item.s ? 'bg-emerald-500 text-white' : 
                    'bg-slate-200/50 text-slate-500'
                  }`}>
                    {step > item.s ? <CircleCheckBig size={18} /> : item.s}
                  </div>
                  <span className={`font-bold text-sm ${step === item.s ? 'text-slate-900' : 'text-slate-500'}`}>{item.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 p-5 md:p-8 overflow-y-auto max-h-[calc(100vh-120px)] md:max-h-none relative">
          {/* Desktop: Close button */}
          <button
            onClick={resetAndClose}
            className="hidden md:block absolute top-4 left-4 z-10 p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            aria-label="סגור"
          >
            <X size={20} className="text-slate-600" />
          </button>
          
          <AnimatePresence mode="sync">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
                <div>
                  <h3 className="text-xl font-bold mb-6 text-slate-900">פרטי העסק</h3>
                  <div className="flex flex-col gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">שם העסק</label>
                      <input
                        ref={nameRef}
                        type="text"
                        value={name}
                        onChange={e => {
                          setName(e.target.value);
                          if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                        }}
                        onKeyDown={(e) => handleKeyDown(e, nextStepButtonRef, () => name && setStep(2))}
                        className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl font-bold text-sm outline-none transition-all ${
                          errors.name 
                            ? 'border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/30' 
                            : 'border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white'
                        }`}
                        placeholder="הזן שם עסק"
                      />
                      {errors.name && (
                        <p className="text-[10px] font-bold text-rose-500 mt-1.5">{errors.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">לוגו (אופציונלי)</label>
                      <div className="flex items-center gap-4">
                        {safeBrowserUrl(logo) && <img src={safeBrowserUrl(logo)!} className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-sm" alt="Logo" />}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold flex items-center gap-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                        >
                          <Camera size={16} />
                          העלה לוגו
                        </button>
                        <input 
                          ref={fileInputRef} 
                          type="file" 
                          accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" 
                          onChange={handleLogoUpload} 
                          className="absolute opacity-0 pointer-events-none w-0 h-0" 
                          tabIndex={-1}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  ref={nextStepButtonRef}
                  onClick={() => {
                    if (!name || !name.trim()) {
                      setErrors(prev => ({ ...prev, name: 'נא למלא שם עסק' }));
                      return;
                    }
                    if (name.trim().length < 2) {
                      setErrors(prev => ({ ...prev, name: 'שם העסק חייב להכיל לפחות 2 תווים' }));
                      return;
                    }
                    setStep(2);
                  }}
                  disabled={!name}
                  className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-all shadow-sm mt-4"
                >
                  המשך <ArrowRight size={16} className="inline mr-2" />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
                <div>
                  <h3 className="text-xl font-bold mb-6 text-slate-900">חשבונאות</h3>
                  <div className="flex flex-col gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        ח.פ / ע.מ <span className="text-slate-400 font-medium normal-case">(אופציונלי)</span>
                      </label>
                      <input
                        ref={businessIdRef}
                        type="text"
                        value={businessId}
                        onChange={e => {
                          setBusinessId(e.target.value);
                          if (errors.businessId) setErrors(prev => ({ ...prev, businessId: '' }));
                        }}
                        onKeyDown={(e) => handleKeyDown(e, invoiceNameRef)}
                        className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl font-bold text-sm outline-none transition-all ${
                          errors.businessId 
                            ? 'border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/30' 
                            : 'border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white'
                        }`}
                        placeholder="הזן מספר עוסק"
                      />
                      {errors.businessId && (
                        <p className="text-[10px] font-bold text-rose-500 mt-1.5">{errors.businessId}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        שם לחשבונית <span className="text-slate-400 font-medium normal-case">(אופציונלי)</span>
                      </label>
                      <input
                        ref={invoiceNameRef}
                        type="text"
                        value={invoiceName}
                        onChange={e => setInvoiceName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, emailRef)}
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
                        placeholder="הזן שם לחשבונית"
                      />
                      <p className="text-[10px] font-medium text-slate-400 mt-1.5">אם לא יוזן, ייעשה שימוש בשם העסק</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">אימייל <span className="text-slate-400 font-medium normal-case">(אופציונלי)</span></label>
                      <input
                        ref={emailRef}
                        type="email"
                        value={email}
                        onChange={e => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                        }}
                        onKeyDown={(e) => handleKeyDown(e, phoneRef)}
                        onBlur={() => {
                          if (email && !isValidEmail(email)) {
                            setErrors(prev => ({ ...prev, email: 'אימייל לא תקין' }));
                          }
                        }}
                        className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl font-bold text-sm outline-none transition-all ${
                          errors.email 
                            ? 'border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/30' 
                            : 'border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white'
                        }`}
                        placeholder="email@example.com"
                        dir="ltr"
                      />
                      {errors.email && (
                        <p className="text-[10px] font-bold text-rose-500 mt-1.5">{errors.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">טלפון <span className="text-slate-400 font-medium normal-case">(אופציונלי)</span></label>
                      <input
                        ref={phoneRef}
                        type="tel"
                        value={phone}
                        onChange={e => {
                          setPhone(e.target.value);
                          if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                        }}
                        onKeyDown={(e) => handleKeyDown(e, undefined, () => setStep(3))}
                        onBlur={() => {
                          if (phone && !isValidPhone(phone)) {
                            setErrors(prev => ({ ...prev, phone: 'טלפון לא תקין. נא להזין בפורמט: 050-1234567' }));
                          }
                        }}
                        className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl font-bold text-sm outline-none transition-all ${
                          errors.phone 
                            ? 'border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/30' 
                            : 'border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white'
                        }`}
                        placeholder="050-1234567"
                        dir="ltr"
                      />
                      {errors.phone && (
                        <p className="text-[10px] font-bold text-rose-500 mt-1.5">{errors.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-2">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold text-sm transition-colors shadow-sm">
                    חזרה
                  </button>
                  <button onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-slate-800 transition-colors">
                    המשך <ArrowRight size={16} className="inline mr-2" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
                <div>
                  <h3 className="text-xl font-bold mb-4 text-slate-900">גישה לרשתות</h3>
                  <p className="text-slate-500 text-sm mb-4">
                    ניתן להוסיף גישה לרשתות החברתיות מאוחר יותר בהגדרות הלקוח.
                  </p>
                  <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
                    <p className="text-indigo-800 text-sm font-medium">
                      💡 טיפ: תוכל להוסיף את הגישות לרשתות החברתיות בהגדרות הלקוח לאחר היצירה.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold text-sm transition-colors shadow-sm">
                    חזרה
                  </button>
                  <button onClick={() => setStep(4)} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-slate-800 transition-colors">
                    המשך <ArrowRight size={16} className="inline mr-2" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
                <div>
                  <h3 className="text-xl font-bold mb-4 text-slate-900">בחירת חבילה</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                    {PLANS.map(plan => (
                      <button
                        key={plan.id}
                        onClick={() => {
                          setSelectedPlan(plan.id);
                          setMonthlyFee(plan.price);
                        }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          selectedPlan === plan.id 
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm' 
                            : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                        } disabled:opacity-50 disabled:cursor-not-allowed text-right`}
                      >
                        <p className="font-bold text-base mb-1">{plan.name}</p>
                        <p className={`text-xs font-medium ${selectedPlan === plan.id ? 'text-emerald-700' : 'text-slate-500'}`}>{plan.desc}</p>
                      </button>
                    ))}
                  </div>
                  <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">מחיר חודשי ללקוח (₪)</label>
                    <input
                      type="number"
                      value={monthlyFee}
                      onChange={(e) => setMonthlyFee(Number(e.target.value))}
                      min={0}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                      placeholder="לדוגמה: 2990"
                    />
                    <p className="text-[10px] text-slate-500 mt-2 font-medium">ברירת המחדל מגיעה מהחבילה שבחרת — אפשר לערוך לפני יצירת הלקוח.</p>
                  </div>
                </div>
                <button
                  ref={submitButtonRef}
                  onClick={handlePayment}
                  className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-sm mt-2"
                >
                  הוסף לקוח
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

