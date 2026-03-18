'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Eye, X, Shield, Loader2, Mail, KeyRound, AlertTriangle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { initiateImpersonation, verifyImpersonationOtp, cancelImpersonation } from '@/app/actions/impersonation';
import { useData } from '@/context/DataContext';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

type Step = 'idle' | 'confirm' | 'sending' | 'otp_input' | 'verifying' | 'success';

export default function OrgImpersonateButton(props: {
  orgSlug: string | null;
  fallbackOrgId: string;
  clientId: string | null;
  orgName?: string;
}) {
  const { addToast } = useData();
  const router = useRouter();
  const [step, setStep] = useState<Step>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState<string>('');
  const [otpInput, setOtpInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Focus OTP input when step changes to otp_input
  useEffect(() => {
    if (step === 'otp_input' && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  // Handle click - show confirmation modal
  const handleClick = () => {
    if (!props.clientId) {
      addToast('לא נמצא מזהה לקוח לארגון', 'error');
      return;
    }
    setError(null);
    setStep('confirm');
  };

  // Cancel and close modal
  const handleCancel = async () => {
    if (sessionId) {
      try {
        await cancelImpersonation(sessionId);
      } catch {
        // Ignore errors on cancel
      }
    }
    setStep('idle');
    setSessionId(null);
    setOtpInput('');
    setError(null);
  };

  // Confirm - send OTP email
  const handleConfirm = async () => {
    if (!props.clientId) return;

    setStep('sending');
    setError(null);

    try {
      const res = await initiateImpersonation(props.clientId);
      if (!res.success) {
        setError(res.error || 'שגיאה בשליחת הקוד');
        setStep('confirm');
        return;
      }

      setSessionId(res.sessionId || null);
      setClientEmail(res.clientEmail || '');
      setStep('otp_input');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה לא ידועה');
      setStep('confirm');
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (!sessionId || otpInput.length !== 6) {
      setError('יש להזין קוד בן 6 ספרות');
      return;
    }

    setStep('verifying');
    setError(null);

    try {
      const res = await verifyImpersonationOtp(sessionId, otpInput);
      if (!res.success) {
        setError(res.error || 'קוד שגוי');
        setStep('otp_input');
        return;
      }

      setStep('success');
      addToast('נכנסת למצב תמיכה - מעביר למרחב העבודה...', 'success');

      // Redirect after short delay
      setTimeout(() => {
        const orgSlug = props.orgSlug || props.fallbackOrgId;
        router.push(`/w/${encodeURIComponent(String(orgSlug))}/nexus`);
      }, 500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה באימות הקוד');
      setStep('otp_input');
    }
  };

  // Handle OTP input change (numbers only)
  const handleOtpChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setOtpInput(cleaned);
    setError(null);
  };

  // Handle Enter key in OTP input
  const handleOtpKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && otpInput.length === 6) {
      handleVerifyOtp();
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        type="button"
        onClick={handleClick}
        disabled={step !== 'idle' && step !== 'success'}
        variant="outline"
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border font-black transition-colors ${
          !props.clientId
            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
        }`}
        title="כניסה למצב תמיכה"
      >
        <Eye size={16} />
        תמיכה
      </Button>

      {/* Modal */}
      <AnimatePresence>
        {step !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={step === 'success' ? undefined : handleCancel}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                    <Shield size={18} className="text-slate-700" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">גישת תמיכה</h3>
                    <p className="text-xs text-slate-500 font-medium">אימות נדרש לפני כניסה</p>
                  </div>
                </div>
                {step !== 'success' && (
                  <button
                    onClick={handleCancel}
                    className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Step: Confirm */}
                {step === 'confirm' && (
                  <div className="space-y-5">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={18} className="text-slate-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-slate-600">
                          <p className="font-bold text-slate-900 mb-1">אישור נדרש</p>
                          <p>
                            כניסה לחשבון הלקוח דורשת אישור. קוד אימות יישלח למייל של הלקוח.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-sm font-medium text-slate-600 bg-white border border-slate-100 p-3 rounded-lg flex justify-between items-center">
                      <span>ארגון:</span>
                      <span className="font-bold text-slate-900">{props.orgName || props.orgSlug || props.fallbackOrgId}</span>
                    </div>

                    {error && (
                      <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-sm text-rose-600 font-medium">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={handleCancel}
                        variant="ghost"
                        className="flex-1 font-bold"
                      >
                        ביטול
                      </Button>
                      <Button
                        onClick={handleConfirm}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold"
                      >
                        <Mail size={16} className="ml-2" />
                        שלח קוד אימות
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step: Sending */}
                {step === 'sending' && (
                  <div className="py-8 text-center">
                    <Loader2 size={32} className="animate-spin text-amber-500 mx-auto mb-4" />
                    <p className="text-slate-600">שולח קוד אימות ללקוח...</p>
                  </div>
                )}

                {/* Step: OTP Input */}
                {step === 'otp_input' && (
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                        <Mail size={24} className="text-green-600" />
                      </div>
                      <p className="text-slate-700 font-bold">קוד אימות נשלח</p>
                      <p className="text-sm text-slate-500 mt-1">
                        לכתובת: <span className="font-mono">{clientEmail}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        בקש מהלקוח את הקוד שהתקבל במייל
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">הזן קוד בן 6 ספרות</label>
                      <input
                        ref={otpInputRef}
                        type="text"
                        inputMode="numeric"
                        pattern="\d{6}"
                        value={otpInput}
                        onChange={(e) => handleOtpChange(e.target.value)}
                        onKeyDown={handleOtpKeyDown}
                        placeholder="000000"
                        className="w-full h-14 text-center text-2xl font-mono font-bold tracking-widest border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none transition-all"
                      />
                    </div>

                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={handleCancel}
                        variant="outline"
                        className="flex-1"
                      >
                        ביטול
                      </Button>
                      <Button
                        onClick={handleVerifyOtp}
                        disabled={otpInput.length !== 6}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
                      >
                        <KeyRound size={16} className="ml-2" />
                        אמת קוד
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step: Verifying */}
                {step === 'verifying' && (
                  <div className="py-8 text-center">
                    <Loader2 size={32} className="animate-spin text-green-500 mx-auto mb-4" />
                    <p className="text-slate-600">מאמת את הקוד...</p>
                  </div>
                )}

                {/* Step: Success */}
                {step === 'success' && (
                  <div className="py-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} className="text-green-600" />
                    </div>
                    <p className="text-lg font-bold text-slate-900">אומת בהצלחה!</p>
                    <p className="text-sm text-slate-500 mt-1">מעביר למרחב העבודה...</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
