'use client';

import React, { useState } from 'react';
import { useUser, useSignIn } from '@clerk/nextjs';
import { Mail, Lock, KeyRound, CircleCheck, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { translateClerkError } from '@/lib/errorTranslations';

type SetPasswordStep = 'send_code' | 'verify_code' | 'set_password' | 'success';

interface SetPasswordInlineProps {
  /** Called after password is successfully set. The component will have created a fresh session. */
  onSuccess?: () => void;
  /** Called when user cancels the flow */
  onCancel?: () => void;
  /** Optional custom title */
  title?: string;
  /** Optional custom description */
  description?: string;
}

export const SetPasswordInline: React.FC<SetPasswordInlineProps> = ({
  onSuccess,
  onCancel,
  title = 'הגדרת סיסמה',
  description = 'נרשמת באמצעות Google ועדיין לא הגדרת סיסמה. הגדר סיסמה כדי לשפר את אבטחת חשבונך.',
}) => {
  const { user } = useUser();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();

  const [step, setStep] = useState<SetPasswordStep>('send_code');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const userEmail = user?.primaryEmailAddress?.emailAddress ?? '';

  const handleSendCode = async () => {
    if (!signInLoaded || !signIn || !userEmail) return;

    setIsLoading(true);
    setError('');

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: userEmail,
      });
      setStep('verify_code');
    } catch (err: unknown) {
      const clerkErr = err as { errors?: Array<{ message?: string; code?: string }> };
      const errCode = clerkErr?.errors?.[0]?.code ?? '';
      const errMsg = clerkErr?.errors?.[0]?.message ?? '';

      if (errCode === 'form_identifier_not_found') {
        setError('לא נמצא חשבון עם כתובת אימייל זו.');
      } else if (errCode === 'strategy_for_user_invalid' || errCode === 'strategy_not_enabled') {
        setError('שיטת הסיסמה אינה פעילה במערכת. פנה למנהל המערכת.');
      } else {
        setError(errMsg ? translateClerkError(errMsg) : 'שגיאה בשליחת קוד אימות. נסה שוב.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInLoaded || !signIn || code.length < 6) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
      });

      if (result.status === 'needs_new_password') {
        setStep('set_password');
      } else {
        setError('שגיאה באימות הקוד. נסה שוב.');
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: Array<{ message?: string; code?: string }> };
      const errCode = clerkErr?.errors?.[0]?.code ?? '';
      const errMsg = clerkErr?.errors?.[0]?.message ?? '';

      if (errCode === 'form_code_incorrect' || errMsg.includes('incorrect')) {
        setError('קוד אימות שגוי. בדוק את הקוד ונסה שוב.');
      } else if (errCode === 'verification_expired') {
        setError('קוד האימות פג תוקף. שלח קוד חדש.');
      } else {
        setError(errMsg ? translateClerkError(errMsg) : 'קוד אימות שגוי. נסה שוב.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInLoaded || !signIn) return;

    if (newPassword.length < 8) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('הסיסמאות אינן תואמות.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn.resetPassword({ password: newPassword });

      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        // Wait for session propagation
        await new Promise(r => setTimeout(r, 800));
        try { await user?.reload(); } catch { /* ignore */ }
        setStep('success');
        setTimeout(() => onSuccess?.(), 1500);
      } else {
        setError('שגיאה בהגדרת הסיסמה. נסה שוב.');
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: Array<{ message?: string; code?: string }> };
      const errCode = clerkErr?.errors?.[0]?.code ?? '';
      const errMsg = clerkErr?.errors?.[0]?.message ?? '';

      if (errCode === 'form_password_pwned' || errMsg.includes('pwned') || errMsg.includes('compromised')) {
        setError('סיסמה זו נמצאה ברשימת סיסמאות שנפרצו. בחר סיסמה אחרת.');
      } else if (errCode === 'form_password_length_too_short') {
        setError('הסיסמה קצרה מדי. יש להזין לפחות 8 תווים.');
      } else {
        setError(errMsg ? translateClerkError(errMsg) : 'שגיאה בהגדרת הסיסמה. נסה שוב.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound size={16} className="text-amber-600" />
        <p className="text-sm font-bold text-amber-800">{title}</p>
      </div>

      <AnimatePresence mode="wait">
        {step === 'send_code' && (
          <motion.div
            key="send-code"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <p className="text-xs text-amber-700">{description}</p>
            <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg p-2.5">
              <Mail size={14} className="text-amber-500 flex-shrink-0" />
              <span className="text-xs text-gray-700 font-bold truncate" dir="ltr">{userEmail}</span>
            </div>
            {error && <p className="text-xs text-red-600 font-bold">{error}</p>}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendCode}
                disabled={isLoading || !userEmail}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isLoading ? 'שולח...' : <>שלח קוד אימות <ArrowRight size={14} /></>}
              </button>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2.5 text-gray-600 font-bold rounded-lg hover:bg-gray-100 transition-all text-sm"
                >
                  ביטול
                </button>
              )}
            </div>
          </motion.div>
        )}

        {step === 'verify_code' && (
          <motion.form
            key="verify-code"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onSubmit={handleVerifyCode}
            className="space-y-3"
          >
            <p className="text-xs text-amber-700">
              קוד אימות נשלח ל-<span className="font-bold" dir="ltr">{userEmail}</span>. הזן את הקוד:
            </p>
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              placeholder="000000"
              maxLength={6}
              autoFocus
              className="w-full bg-white border border-amber-200 rounded-lg py-2.5 px-3 text-center text-lg tracking-widest font-mono outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              dir="ltr"
            />
            {error && <p className="text-xs text-red-600 font-bold">{error}</p>}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isLoading || code.length < 6}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isLoading ? 'מאמת...' : 'אמת קוד'}
              </button>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={isLoading}
                className="px-3 py-2.5 text-amber-600 font-bold rounded-lg hover:bg-amber-50 transition-all text-xs disabled:opacity-50"
              >
                שלח שוב
              </button>
            </div>
          </motion.form>
        )}

        {step === 'set_password' && (
          <motion.form
            key="set-password"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSetPassword}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 text-xs text-green-600 font-bold">
              <CircleCheck size={14} /> קוד אומת בהצלחה. הגדר סיסמה חדשה:
            </div>
            <div className="relative">
              <Lock size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                placeholder="סיסמה חדשה (לפחות 8 תווים)"
                autoFocus
                className="w-full bg-white border border-amber-200 rounded-lg py-2.5 pr-9 pl-9 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 font-bold"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className="relative">
              <Lock size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                placeholder="אימות סיסמה"
                className="w-full bg-white border border-amber-200 rounded-lg py-2.5 pr-9 pl-9 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 font-bold"
              />
            </div>
            {error && <p className="text-xs text-red-600 font-bold">{error}</p>}
            <button
              type="submit"
              disabled={isLoading || newPassword.length < 8 || newPassword !== confirmPassword}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? 'מגדיר...' : 'הגדר סיסמה'}
            </button>
          </motion.form>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg"
          >
            <CircleCheck size={18} className="text-green-600 flex-shrink-0" />
            <p className="text-sm font-bold text-green-700">סיסמה הוגדרה בהצלחה!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
