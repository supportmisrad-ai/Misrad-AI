'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mail, ShieldCheck, Zap, Globe, Cpu, Lock, CheckCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSignIn } from '@clerk/nextjs';

type Step = 'email' | 'code' | 'password';

export const ResetPasswordView: React.FC = () => {
  const { organization } = useData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, signIn, setActive } = useSignIn();
  
  // Get email from URL if available
  const emailFromUrl = searchParams.get('email') || '';
  
  // If email comes from URL, skip email step and go straight to code
  const [step, setStep] = useState<Step>(emailFromUrl && emailFromUrl.includes('@') ? 'code' : 'email');

  const [email, setEmail] = useState(emailFromUrl);
  
  // Set email from URL immediately if available
  useEffect(() => {
    if (emailFromUrl && emailFromUrl.includes('@') && !email) {
      setEmail(emailFromUrl);
    }
  }, [emailFromUrl, email]);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const emailInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);
  const autoCodeSentRef = useRef(false); // Prevent repeated auto-sends

  // Auto-focus based on step
  useEffect(() => {
    setTimeout(() => {
      if (step === 'email') {
        emailInputRef.current?.focus();
      } else if (step === 'code') {
        codeInputRef.current?.focus();
      } else if (step === 'password') {
        passwordInputRef.current?.focus();
      }
    }, 100);
  }, [step]);

  // Send reset code
  const handleSendCode = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!isLoaded || !signIn) {
      setError('המערכת עדיין נטענת, אנא נסה שוב');
      return;
    }

    const emailToUse = email || emailFromUrl;
    if (!emailToUse || !emailToUse.includes('@')) {
      setError('נא להזין כתובת אימייל תקינה');
      emailInputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('[ResetPassword] Sending reset code to:', emailToUse);
      const result = await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: emailToUse,
      });
      
      console.log('[ResetPassword] Reset code sent successfully:', result);
      
      // Update email state if it was from URL
      if (emailFromUrl && !email) {
        setEmail(emailFromUrl);
      }
      
      // Ensure email is set for display
      if (!email && emailToUse) {
        setEmail(emailToUse);
      }
      
      setSuccess('קוד אימות נשלח לכתובת האימייל שלך. אנא בדוק את תיבת הדואר הנכנס.');
      setStep('code');
      setCode(''); // Clear any previous code
      setError(''); // Clear any previous errors
    } catch (err: any) {
      console.error('[ResetPassword] Send code error:', err);
      const errorMessage = err.errors?.[0]?.message || err.message || 'שגיאה בשליחת קוד אימות. נא לנסות שוב.';
      setError(errorMessage);
      setSuccess(''); // Clear success message on error
      // Reset auto-send flag on error so user can retry
      if (emailFromUrl) {
        autoCodeSentRef.current = false;
      }
      // Don't change step on error - stay on email step
    } finally {
      setIsLoading(false);
    }
  }, [email, emailFromUrl, isLoaded, signIn]);

  // Auto-send code once if email is provided from URL (skip email step entirely)
  useEffect(() => {
    // Only auto-send if we have email from URL, we're on code step, and everything is ready
    const shouldAutoSend = 
      emailFromUrl &&
      emailFromUrl.includes('@') &&
      step === 'code' &&
      isLoaded &&
      signIn &&
      !isLoading &&
      !autoCodeSentRef.current;
    
    if (shouldAutoSend) {
      console.log('[ResetPassword] ✅ Conditions met for auto-send:', {
        emailFromUrl,
        step,
        isLoaded,
        hasSignIn: !!signIn,
        isLoading,
        autoCodeSent: autoCodeSentRef.current
      });
      
      autoCodeSentRef.current = true; // mark sent to avoid loops
      
      // Small delay to let the UI render first, then auto-send
      const timer = setTimeout(async () => {
        try {
          console.log('[ResetPassword] 🚀 Executing auto-send...');
          await handleSendCode();
          console.log('[ResetPassword] ✅ Auto-send completed successfully');
        } catch (error) {
          console.error('[ResetPassword] ❌ Auto-send failed:', error);
          // Reset the flag so user can manually retry
          autoCodeSentRef.current = false;
        }
      }, 1000); // Increased delay to ensure everything is ready
      
      return () => clearTimeout(timer);
    } else if (emailFromUrl && emailFromUrl.includes('@') && step === 'code') {
      // Log why auto-send didn't trigger (for debugging)
      console.log('[ResetPassword] ⚠️ Auto-send conditions not met:', {
        emailFromUrl,
        step,
        isLoaded,
        hasSignIn: !!signIn,
        isLoading,
        autoCodeSent: autoCodeSentRef.current,
        reason: !emailFromUrl ? 'no email' : 
                !emailFromUrl.includes('@') ? 'invalid email' :
                step !== 'code' ? `wrong step: ${step}` :
                !isLoaded ? 'not loaded' :
                !signIn ? 'no signIn' :
                isLoading ? 'is loading' :
                autoCodeSentRef.current ? 'already sent' : 'unknown'
      });
    }
  }, [emailFromUrl, isLoaded, signIn, step, handleSendCode, isLoading]);

  // Verify code and move to password step
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoaded) {
      setError('המערכת עדיין נטענת, אנא נסה שוב');
      return;
    }

    if (!code || code.length < 6) {
      setError('נא להזין קוד אימות תקין (6 ספרות)');
      codeInputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
      });

      if (result.status === 'needs_new_password') {
        setSuccess('קוד אימות אומת בהצלחה');
        setStep('password');
      } else {
        setError('שגיאה באימות הקוד. נא לנסות שוב.');
      }
    } catch (err: any) {
      console.error('Verify code error:', err);
      setError(err.errors?.[0]?.message || 'קוד אימות שגוי. נא לנסות שוב.');
      codeInputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoaded) {
      setError('המערכת עדיין נטענת, אנא נסה שוב');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים');
      passwordInputRef.current?.focus();
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      confirmPasswordInputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // After attemptFirstFactor with code, signIn already knows the strategy
      // Just pass the new password - no strategy parameter needed
      const result = await signIn.resetPassword({
        password: newPassword,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        setSuccess('הסיסמה שונתה בהצלחה! מפנה אותך...');
        setTimeout(() => {
          router.push('/app');
          router.refresh();
        }, 1500);
      } else {
        setError('שגיאה באיפוס הסיסמה. נא לנסות שוב.');
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.errors?.[0]?.message || 'שגיאה באיפוס הסיסמה. נא לנסות שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-row overflow-hidden" dir="rtl">
      <main className="w-full flex flex-row">
        {/* Right Side - Brand / Visuals */}
        <div className="hidden lg:flex lg:w-1/2 bg-black relative flex-col justify-between p-12 text-white overflow-hidden">
          {/* Abstract Background Animation */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden">
                <img src="/icons/misrad-icon.svg" alt="Misrad" className="w-full h-full object-contain p-1.5" />
              </div>
              <span className="font-bold text-3xl tracking-tight" suppressHydrationWarning>
                {organization.name}
              </span>
            </div>
            <h2 className="text-5xl font-bold leading-tight max-w-md">
              איפוס סיסמה,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">בצורה מאובטחת.</span>
            </h2>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-md border border-white/10">
                <ShieldCheck size={16} className="text-green-400" /> אבטחה מקצה לקצה
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-md border border-white/10">
                <Zap size={16} className="text-yellow-400" /> איפוס מהיר
              </div>
            </div>
            <p className="text-gray-500 text-xs flex items-center gap-2">
              <span>Powered by Misrad</span>
              <span>&copy; 2026 Misrad.</span>
            </p>
          </div>
        </div>

        {/* Left Side - Reset Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-50 relative">
          {/* Mobile Background Decoration */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-purple-600 lg:hidden"></div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <div className="mb-10 text-center lg:text-right">
                <div className="lg:hidden flex justify-center mb-4">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex items-center justify-center">
                        <img src="/icons/misrad-icon.svg" alt="Misrad" className="w-full h-full object-contain p-2" />
                    </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">איפוס סיסמה</h3>
                <p className="text-gray-500">
                  {step === 'email' && 'הזן את כתובת האימייל שלך ונשלח לך קוד אימות'}
                  {step === 'code' && `הזן את הקוד שנשלח ל-${email}`}
                  {step === 'password' && 'הזן סיסמה חדשה'}
                </p>
            </div>

            <div className="bg-white p-2 rounded-3xl shadow-xl shadow-gray-200/50 border border-white">
                <div className="p-6">
                    {/* Progress Steps */}
                    <div className="flex items-center justify-center gap-2 mb-8">
                        <div className={`flex items-center gap-2 ${step === 'email' ? 'text-blue-600' : step === 'code' || step === 'password' ? 'text-green-600' : 'text-gray-300'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${step === 'email' ? 'border-blue-600 bg-blue-50' : step === 'code' || step === 'password' ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
                                {step === 'code' || step === 'password' ? <CheckCircle size={16} /> : '1'}
                            </div>
                            <span className="text-xs font-bold hidden sm:inline">אימייל</span>
                        </div>
                        <div className={`h-px flex-1 ${step === 'code' || step === 'password' ? 'bg-green-600' : 'bg-gray-200'}`} />
                        <div className={`flex items-center gap-2 ${step === 'code' ? 'text-blue-600' : step === 'password' ? 'text-green-600' : 'text-gray-300'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${step === 'code' ? 'border-blue-600 bg-blue-50' : step === 'password' ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
                                {step === 'password' ? <CheckCircle size={16} /> : '2'}
                            </div>
                            <span className="text-xs font-bold hidden sm:inline">קוד</span>
                        </div>
                        <div className={`h-px flex-1 ${step === 'password' ? 'bg-green-600' : 'bg-gray-200'}`} />
                        <div className={`flex items-center gap-2 ${step === 'password' ? 'text-blue-600' : 'text-gray-300'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${step === 'password' ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}>
                                3
                            </div>
                            <span className="text-xs font-bold hidden sm:inline">סיסמה</span>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 'email' && (
                            <motion.form
                                key="email-step"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handleSendCode}
                                className="space-y-4"
                            >
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 block">כתובת אימייל</label>
                                <div className="relative group">
                                    <Mail size={18} className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                    <input 
                                        ref={emailInputRef}
                                        type="email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pr-12 pl-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-gray-900 placeholder:text-gray-400"
                                        placeholder="your@email.com"
                                        dir="ltr"
                                        style={{ textAlign: 'left' }}
                                    />
                                </div>
                                {error && (
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-500 font-bold flex items-center gap-1">
                                        <span className="w-1 h-1 bg-red-50 rounded-full"></span> {error}
                                    </motion.p>
                                )}
                                {success && (
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-green-600 font-bold flex items-center gap-1">
                                        <CheckCircle size={14} /> {success}
                                    </motion.p>
                                )}
                                <button
                                    type="submit"
                                    disabled={isLoading || !isLoaded || !email || !email.includes('@')}
                                    className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all active:scale-[0.98] shadow-lg shadow-gray-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>טוען...</>
                                    ) : (
                                        <>
                                            שלח קוד אימות <ArrowLeft size={18} />
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.push('/login')}
                                    className="w-full text-gray-500 font-bold py-2 text-sm hover:text-gray-700 transition-colors"
                                >
                                    חזרה למסך ההתחברות
                                </button>
                            </motion.form>
                        )}

                        {step === 'code' && (
                            <motion.form
                                key="code-step"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handleVerifyCode}
                                className="space-y-4"
                            >
                                <div className="mb-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-full border-2 border-white shadow-md bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                            {email.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 text-lg">{email}</div>
                                            <div className="text-xs text-gray-500">קוד אימות נשלח</div>
                                        </div>
                                    </div>
                                </div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 block">קוד אימות (6 ספרות)</label>
                                <div className="relative group">
                                    <input 
                                        ref={codeInputRef}
                                        type="text"
                                        value={code}
                                        onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pr-4 pl-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-gray-900 placeholder:text-gray-400 text-center text-2xl tracking-widest"
                                        placeholder="000000"
                                        maxLength={6}
                                        dir="ltr"
                                    />
                                </div>
                                {error && (
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-500 font-bold flex items-center gap-1">
                                        <span className="w-1 h-1 bg-red-50 rounded-full"></span> {error}
                                    </motion.p>
                                )}
                                {success && (
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-green-600 font-bold flex items-center gap-1">
                                        <CheckCircle size={14} /> {success}
                                    </motion.p>
                                )}
                                <button
                                    type="submit"
                                    disabled={isLoading || !isLoaded || code.length < 6}
                                    className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all active:scale-[0.98] shadow-lg shadow-gray-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>טוען...</>
                                    ) : (
                                        <>
                                            אמת קוד <ArrowLeft size={18} />
                                        </>
                                    )}
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setStep('email'); setCode(''); setError(''); }}
                                        className="flex-1 text-gray-500 font-bold py-2 text-sm hover:text-gray-700 transition-colors"
                                    >
                                        חזרה
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSendCode}
                                        disabled={isLoading}
                                        className="flex-1 text-blue-600 font-bold py-2 text-sm hover:text-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        שלח קוד חדש
                                    </button>
                                </div>
                            </motion.form>
                        )}

                        {step === 'password' && (
                            <motion.form
                                key="password-step"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handleResetPassword}
                                className="space-y-4"
                            >
                                <div className="mb-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-full border-2 border-white shadow-md bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white">
                                            <CheckCircle size={24} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 text-lg">קוד אומת בהצלחה</div>
                                            <div className="text-xs text-gray-500">הזן סיסמה חדשה</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">סיסמה חדשה</label>
                                        <div className="relative group">
                                            <Lock size={18} className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                            <input 
                                                ref={passwordInputRef}
                                                type={showNewPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pr-12 pl-12 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-gray-900 placeholder:text-gray-400"
                                                placeholder="לפחות 8 תווים"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400 hover:text-gray-600 transition-colors"
                                                tabIndex={-1}
                                            >
                                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">אימות סיסמה</label>
                                        <div className="relative group">
                                            <Lock size={18} className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                            <input 
                                                ref={confirmPasswordInputRef}
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pr-12 pl-12 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-gray-900 placeholder:text-gray-400"
                                                placeholder="הזן שוב את הסיסמה"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400 hover:text-gray-600 transition-colors"
                                                tabIndex={-1}
                                            >
                                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {error && (
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-500 font-bold flex items-center gap-1">
                                        <span className="w-1 h-1 bg-red-50 rounded-full"></span> {error}
                                    </motion.p>
                                )}
                                {success && (
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-green-600 font-bold flex items-center gap-1">
                                        <CheckCircle size={14} /> {success}
                                    </motion.p>
                                )}
                                <button
                                    type="submit"
                                    disabled={isLoading || !isLoaded || newPassword.length < 8 || newPassword !== confirmPassword}
                                    className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all active:scale-[0.98] shadow-lg shadow-gray-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>טוען...</>
                                    ) : success ? (
                                        <>
                                            מפנה אותך... <ArrowRight size={18} />
                                        </>
                                    ) : (
                                        <>
                                            שנה סיסמה <ArrowLeft size={18} />
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setStep('code'); setNewPassword(''); setConfirmPassword(''); setError(''); }}
                                    className="w-full text-gray-500 font-bold py-2 text-sm hover:text-gray-700 transition-colors"
                                >
                                    חזרה
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            
            {/* Status Bar */}
            <div className="mt-8 flex items-center justify-center gap-6 text-xs font-medium text-gray-400">
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> מערכות תקינות</span>
                <span className="flex items-center gap-1.5"><Globe size={12} /> אזור IL-TLV</span>
                <span className="flex items-center gap-1.5"><Cpu size={12} /> Misrad v2.5.0</span>
            </div>

          </motion.div>
        </div>
      </main>
    </div>
  );
};

