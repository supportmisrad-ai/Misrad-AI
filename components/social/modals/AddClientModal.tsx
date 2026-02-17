'use client';

import React, { useState, useRef } from 'react';
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

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState('');
  const [invoiceName, setInvoiceName] = useState('');
  const [email, setEmail] = useState(''); // Optional email
  const [phone, setPhone] = useState(''); // Optional phone
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan>('pro');
  const [monthlyFee, setMonthlyFee] = useState<number>(PLANS.find(p => p.id === 'pro')?.price ?? 2990);
  const [isProcessing, setIsProcessing] = useState(false);
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

    setIsProcessing(true);
    setErrors({});
    try {
      // Ensure companyName is valid (at least 2 characters)
      const finalCompanyName = (invoiceName && invoiceName.trim().length >= 2) 
        ? invoiceName.trim() 
        : (name && name.trim().length >= 2) 
          ? name.trim() 
          : name.trim() || 'לקוח חדש';
      
      const result = await createClientForWorkspace(orgSlug, {
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
        credentials: [], // We don't store passwords - see VaultTab for explanation
        activePlatforms: [], // Will be set later when connecting platforms
        quotas: [],
        postingRhythm: selectedPlan === 'starter' ? 'פעמיים בשבוע' : selectedPlan === 'pro' ? '3 פעמים בשבוע' : 'יומי',
        status: 'Active',
        onboardingStatus: 'completed',
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
      } as unknown as Partial<Client>, user.id);

      if (result.success && result.data) {
        setClients(prev => [...prev, result.data!]);
        resetAndClose();
        addToast(`הלקוח ${name} נוסף בהצלחה למערכת`);
        // Optional: Redirect to client workspace
        // router.push(`/social-os/workspace?clientId=${result.data.id}`);
      } else {
        const errorMsg = result.error ? translateError(result.error) : 'שגיאה ביצירת לקוח';
        
        // Log full error for debugging
        console.error('Error creating client:', {
          error: result.error,
          name,
          companyName: invoiceName || name,
          email,
          phone,
          businessId,
        });
        
        addToast(errorMsg, 'error');
        
        // Try to identify which field caused the error
        if (result.error) {
          const errorLower = result.error.toLowerCase();
          
          // Check for validation errors
          if (errorLower.includes('שם חייב להכיל') || errorLower.includes('שם חברה חייב להכיל')) {
            setStep(1);
            setErrors({ name: 'שם העסק חייב להכיל לפחות 2 תווים' });
          } else if (errorLower.includes('name') || errorLower.includes('שם')) {
            setStep(1);
            setErrors({ name: 'שם העסק שגוי או כבר קיים' });
          } else if (errorLower.includes('email') || errorLower.includes('אימייל') || errorLower.includes('כתובת אימייל')) {
            setStep(2);
            setErrors({ email: 'אימייל שגוי או כבר קיים' });
          } else if (errorLower.includes('phone') || errorLower.includes('טלפון') || errorLower.includes('מספר טלפון')) {
            setStep(2);
            setErrors({ phone: 'טלפון שגוי' });
          } else if (errorLower.includes('business') || errorLower.includes('ח.פ')) {
            setStep(2);
            setErrors({ businessId: 'ח.פ/ע.מ שגוי או כבר קיים' });
          } else if (errorLower.includes('משתמש') || errorLower.includes('user') || errorLower.includes('organization') || errorLower.includes('ארגון')) {
            // User/organization error - show general error
            addToast('שגיאה: בעיה בהרשאות או בארגון. נא לנסות שוב או ליצור קשר עם התמיכה.', 'error');
          }
        }
      }
    } catch (error: unknown) {
      const errObj = error instanceof Error ? error : null;
      console.error('Error creating client:', {
        error,
        message: errObj?.message,
        stack: errObj?.stack,
        name: errObj?.name,
        clientData: {
          name: name.trim(),
          companyName: invoiceName || name,
          email,
          phone,
          businessId,
        }
      });
      
      const errorMsg = errObj?.message ? translateError(errObj.message) : 'שגיאה ביצירת לקוח';
      
          // Check for specific error types
          if (errorMsg.includes('משתמש') || errorMsg.includes('user') || errorMsg.includes('ארגון') || errorMsg.includes('organization')) {
            if (errorMsg.includes('SERVICE_ROLE_KEY') || errorMsg.includes('RLS') || errorMsg.includes('הרשאות')) {
              addToast('שגיאה: בעיה בהגדרות Supabase. נא לוודא שיש SERVICE_ROLE_KEY מוגדר ב-.env.local', 'error');
            } else {
              addToast('שגיאה: בעיה בהרשאות או בארגון. נא לוודא שאתה מחובר ולנסות שוב.', 'error');
            }
          } else {
            addToast('שגיאה ביצירת לקוח: ' + errorMsg, 'error');
          }
    } finally {
      setIsProcessing(false);
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

  return (
    <div className="fixed inset-0 z-[200] flex items-start md:items-center justify-center p-0 sm:p-2 md:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" onClick={resetAndClose}>
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
          <div className="md:hidden flex items-center gap-3 min-w-max">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-900 font-black text-lg shadow-lg shrink-0">S</div>
            <div className="flex gap-2">
              {[
                { s: 1, l: 'פרטי העסק' },
                { s: 2, l: 'חשבונאות' },
                { s: 3, l: 'גישה לרשתות' },
                { s: 4, l: 'בחירת חבילה' },
              ].map(item => (
                <div key={item.s} className={`flex items-center gap-2 ${step === item.s ? 'opacity-100' : 'opacity-40'}`} title={item.l}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                    step === item.s ? 'bg-white text-slate-900' : 
                    step > item.s ? 'bg-green-500' : 
                    'bg-slate-700'
                  }`}>
                    {step > item.s ? <CircleCheckBig size={14} /> : item.s}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Desktop: Full vertical view */}
          <div className="hidden md:flex flex-col gap-6 md:gap-8">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-900 font-black text-2xl shadow-xl">S</div>
            <h2 className="text-2xl font-black">הקמה ידנית</h2>
            <div className="flex flex-col gap-6">
              {[
                { s: 1, l: 'פרטי העסק' },
                { s: 2, l: 'חשבונאות' },
                { s: 3, l: 'גישה לרשתות' },
                { s: 4, l: 'בחירת חבילה' },
              ].map(item => (
                <div key={item.s} className={`flex gap-4 items-center ${step === item.s ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                    step === item.s ? 'bg-white text-slate-900' : 
                    step > item.s ? 'bg-green-500' : 
                    'bg-slate-700'
                  }`}>
                    {step > item.s ? <CircleCheckBig size={20} /> : item.s}
                  </div>
                  <span className="font-black">{item.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 md:p-10 overflow-y-auto max-h-[calc(100vh-120px)] sm:max-h-[calc(95vh-200px)] md:max-h-none relative">
          {/* Desktop: Close button */}
          <button
            onClick={resetAndClose}
            className="hidden md:block absolute top-4 left-4 z-10 p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            aria-label="סגור"
          >
            <X size={20} className="text-slate-600" />
          </button>
          
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4 md:gap-8">
                <div>
                  <h3 className="text-xl md:text-2xl font-black mb-4 md:mb-6">פרטי העסק</h3>
                  <div className="flex flex-col gap-4 md:gap-6">
                    <div>
                      <label className="block text-sm font-black text-slate-400 mb-2">שם העסק</label>
                      <input
                        ref={nameRef}
                        type="text"
                        value={name}
                        onChange={e => {
                          setName(e.target.value);
                          if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                        }}
                        onKeyDown={(e) => handleKeyDown(e, nextStepButtonRef, () => name && setStep(2))}
                        className={`w-full px-4 md:px-6 py-4 md:py-4 bg-slate-50 border rounded-xl md:rounded-2xl font-black text-base md:text-lg outline-none min-h-[48px] transition-all ${
                          errors.name 
                            ? 'border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
                            : 'border-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        placeholder="שם העסק"
                      />
                      {errors.name && (
                        <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-black text-slate-400 mb-2">לוגו</label>
                      <div className="flex items-center gap-4">
                        {logo && <img src={logo} className="w-20 h-20 rounded-2xl object-cover" alt="Logo" />}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 md:px-6 py-3 md:py-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl font-black flex items-center gap-2 text-sm md:text-base hover:bg-slate-100 transition-colors"
                        >
                          <Camera size={18} className="md:w-5 md:h-5" />
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
                  disabled={!name || isProcessing}
                  className="w-full py-4 md:py-4 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-all min-h-[48px]"
                >
                  המשך <ArrowRight size={18} className="inline mr-2 md:w-5 md:h-5" />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4 md:gap-8">
                <div>
                  <h3 className="text-xl md:text-2xl font-black mb-4 md:mb-6">חשבונאות</h3>
                  <div className="flex flex-col gap-4 md:gap-6">
                    <div>
                      <label className="block text-sm font-black text-slate-400 mb-2">
                        ח.פ / ע.מ <span className="text-slate-300 font-normal">(אופציונלי)</span>
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
                        className={`w-full px-4 md:px-6 py-4 md:py-4 bg-slate-50 border rounded-xl md:rounded-2xl font-black text-base md:text-lg outline-none min-h-[48px] transition-all ${
                          errors.businessId 
                            ? 'border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
                            : 'border-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        placeholder="מספר עסק"
                      />
                      {errors.businessId && (
                        <p className="text-xs text-red-500 mt-1">{errors.businessId}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-black text-slate-400 mb-2">
                        שם לחשבונית <span className="text-slate-300 font-normal">(אופציונלי)</span>
                      </label>
                      <input
                        ref={invoiceNameRef}
                        type="text"
                        value={invoiceName}
                        onChange={e => setInvoiceName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, emailRef)}
                        className="w-full px-4 md:px-6 py-4 md:py-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl font-black text-base md:text-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[48px] transition-all"
                        placeholder="שם לחשבונית"
                      />
                      <p className="text-xs text-slate-400 mt-2">אם לא יוזן, יישתמש בשם העסק</p>
                    </div>
                    <div>
                      <label className="block text-sm font-black text-slate-400 mb-2">אימייל (אופציונלי)</label>
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
                        className={`w-full px-4 md:px-6 py-4 md:py-4 bg-slate-50 border rounded-xl md:rounded-2xl font-black text-base md:text-lg outline-none min-h-[48px] transition-all ${
                          errors.email 
                            ? 'border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
                            : 'border-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        placeholder="דוא&quot;ל"
                      />
                      {errors.email && (
                        <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                      )}
                      {!errors.email && (
                      <p className="text-xs text-slate-400 mt-2">לא חובה - ניתן להוסיף מאוחר יותר</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-black text-slate-400 mb-2">טלפון (אופציונלי)</label>
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
                        className={`w-full px-4 md:px-6 py-4 md:py-4 bg-slate-50 border rounded-xl md:rounded-2xl font-black text-base md:text-lg outline-none min-h-[48px] transition-all ${
                          errors.phone 
                            ? 'border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
                            : 'border-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        placeholder="050-1234567"
                      />
                      {errors.phone && (
                        <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                      )}
                      {!errors.phone && (
                      <p className="text-xs text-slate-400 mt-2">לא חובה - ניתן להוסיף מאוחר יותר</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 md:gap-4">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 md:py-4 bg-slate-100 text-slate-600 rounded-xl md:rounded-2xl font-black text-sm md:text-base">
                    חזרה
                  </button>
                  <button onClick={() => setStep(3)} className="flex-1 py-3 md:py-4 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black text-sm md:text-base">
                    המשך <ArrowRight size={18} className="inline mr-2 md:w-5 md:h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4 md:gap-8">
                <div>
                  <h3 className="text-xl md:text-2xl font-black mb-4 md:mb-6">גישה לרשתות</h3>
                  <p className="text-slate-500 text-sm md:text-base mb-4 md:mb-6">
                    ניתן להוסיף גישה לרשתות החברתיות מאוחר יותר בהגדרות הלקוח.
                  </p>
                  <div className="bg-slate-50 rounded-xl md:rounded-2xl p-4 md:p-6">
                    <p className="text-slate-600 text-sm md:text-base font-medium">
                      💡 טיפ: תוכל להוסיף את הגישות לרשתות החברתיות בהגדרות הלקוח לאחר היצירה.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 md:gap-4">
                  <button onClick={() => setStep(2)} className="flex-1 py-3 md:py-4 bg-slate-100 text-slate-600 rounded-xl md:rounded-2xl font-black text-sm md:text-base">
                    חזרה
                  </button>
                  <button onClick={() => setStep(4)} className="flex-1 py-3 md:py-4 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black text-sm md:text-base">
                    המשך <ArrowRight size={18} className="inline mr-2 md:w-5 md:h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4 md:gap-8">
                <div>
                  <h3 className="text-xl md:text-2xl font-black mb-2">בחירת חבילה</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
                    {PLANS.map(plan => (
                      <button
                        key={plan.id}
                        onClick={() => {
                          setSelectedPlan(plan.id);
                          setMonthlyFee(plan.price);
                        }}
                        disabled={isProcessing}
                        className={`p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 transition-all ${
                          selectedPlan === plan.id 
                            ? 'border-green-600 bg-green-600 text-white shadow-lg shadow-green-100' 
                            : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-md'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <p className="font-black text-base md:text-lg mb-1 md:mb-2">{plan.name}</p>
                        <p className="text-xs md:text-sm font-bold opacity-70">{plan.desc}</p>
                      </button>
                    ))}
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl md:rounded-3xl p-4 md:p-6">
                    <label className="block text-sm font-black text-slate-500 mb-2">מחיר חודשי ללקוח (₪)</label>
                    <input
                      type="number"
                      value={monthlyFee}
                      onChange={(e) => setMonthlyFee(Number(e.target.value))}
                      min={0}
                      className="w-full px-4 md:px-6 py-4 md:py-4 bg-white border border-slate-200 rounded-xl md:rounded-2xl font-black text-base md:text-lg outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 min-h-[48px] transition-all"
                      placeholder="לדוגמה: 2990"
                    />
                    <p className="text-xs text-slate-500 mt-2">ברירת המחדל מגיעה מהחבילה שבחרת — אפשר לערוך לפני יצירת הלקוח.</p>
                  </div>
                </div>
                <button
                  ref={submitButtonRef}
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full py-4 md:py-5 bg-green-600 text-white rounded-xl md:rounded-2xl font-black text-lg md:text-xl flex items-center justify-center gap-2 md:gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-all shadow-lg hover:shadow-xl"
                >
                  {isProcessing ? <>מעבד...</> : <>הוסף לקוח</>}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

