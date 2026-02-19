'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Scan, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useSignIn, useSignUp, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { translateClerkError } from '@/lib/errorTranslations';
import { OAuthStrategy } from '@clerk/types';

interface ClerkAPIError {
  errors?: Array<{ code?: string; message?: string }>;
  message?: string;
}

const LEGAL_CONSENT_STORAGE_KEY = 'pending_legal_consent_v1';

interface CustomAuthProps {
  mode?: 'sign-in' | 'sign-up';
  onSuccess?: () => void;
}

export default function CustomAuth({ mode = 'sign-in', onSuccess }: CustomAuthProps) {
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { user } = useUser();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [usePasskey, setUsePasskey] = useState(false);
  const [isPasskeySupported, setIsPasskeySupported] = useState(false);
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [legalAccepted, setLegalAccepted] = useState(false);

  // Check if Passkeys/WebAuthn is supported and we're on a mobile device
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const urlEmail = sp.get('email') || '';
      if (urlEmail && !email) {
        setEmail(String(urlEmail));
      }

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      setIsPasskeySupported(
        isMobile &&
        typeof window.PublicKeyCredential !== 'undefined' &&
        typeof navigator.credentials !== 'undefined' &&
        typeof navigator.credentials.create !== 'undefined'
      );
    }
  }, [email]);

  const storePendingLegalConsent = () => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(
        LEGAL_CONSENT_STORAGE_KEY,
        JSON.stringify({ acceptTerms: true, acceptPrivacy: true, createdAt: new Date().toISOString() })
      );
    } catch {
      // ignore
    }
  };

  const recordLegalConsent = async (): Promise<boolean> => {
    storePendingLegalConsent();
    for (let i = 0; i < 6; i++) {
      try {
        const res = await fetch('/api/legal/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ acceptTerms: true, acceptPrivacy: true }),
        });

        if (res.ok) {
          try {
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem(LEGAL_CONSENT_STORAGE_KEY);
            }
          } catch {
            // ignore
          }
          return true;
        }

        if (res.status === 409) {
          await new Promise((r) => setTimeout(r, 750));
          continue;
        }

        return false;
      } catch {
        await new Promise((r) => setTimeout(r, 750));
      }
    }
    return false;
  };

  const ensureLegalAcceptedOrError = (): boolean => {
    if (mode !== 'sign-up') return true;
    if (legalAccepted) return true;
    setError('נדרש אישור לתנאי שימוש ולמדיניות פרטיות');
    return false;
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsLoading(true);

    if (!signInLoaded) {
      setError('מערכת ההתחברות עדיין לא מוכנה');
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn.create({
        identifier: email,
        password: password,
      });

      if (result.status === 'complete') {
        if (typeof setActive === 'function') {
          await setActive({ session: result.createdSessionId });
        }
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/');
        }
      } else {
        setError('ההתחברות נכשלה. נסה שוב.');
      }
    } catch (err: unknown) {
      console.error('Sign in error:', err);
      const clerkErr = err as ClerkAPIError;
      const errorMsg = clerkErr?.errors?.[0]?.message || 'שגיאה בהתחברות. נסה שוב.';
      setError(translateClerkError(errorMsg));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsLoading(true);

    if (!ensureLegalAcceptedOrError()) {
      setIsLoading(false);
      return;
    }

    if (!signUpLoaded) {
      setError('מערכת ההרשמה עדיין לא מוכנה');
      setIsLoading(false);
      return;
    }

    try {
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const result = await signUp.create({
        emailAddress: normalizedEmail,
        password: password,
      });

      if (result.status === 'complete') {
        const sessionId = result.createdSessionId;
        if (sessionId) {
          if (typeof setActive === 'function') {
            await setActive({ session: sessionId });
          }
        }

        await recordLegalConsent();

        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/');
        }
        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStep('verify');
      setInfo('שלחנו קוד אימות לאימייל. הזן את הקוד כדי להשלים הרשמה.');
    } catch (err: unknown) {
      console.error('Sign up error:', err);
      const clerkErr = err as ClerkAPIError;
      const errorMsg = clerkErr?.errors?.[0]?.message || 'שגיאה בהרשמה. נסה שוב.';
      setError(translateClerkError(errorMsg));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsLoading(true);

    if (!ensureLegalAcceptedOrError()) {
      setIsLoading(false);
      return;
    }

    if (!signUpLoaded || !signUp) {
      setError('מערכת ההרשמה עדיין לא מוכנה');
      setIsLoading(false);
      return;
    }

    try {
      const code = String(verificationCode || '').trim();
      if (!code) {
        setError('נא להזין קוד אימות');
        return;
      }

      let result = await signUp.attemptEmailAddressVerification({ code });

      // missing_requirements: email is verified but sign-up still needs something
      // (e.g. bot-protection/Turnstile not yet complete). Wait briefly then reload.
      if (result.status === 'missing_requirements') {
        await new Promise<void>(r => setTimeout(r, 1000));
        try { result = await signUp.reload(); } catch { /* use original */ }
      }

      if (result.status === 'complete') {
        const sessionId = result.createdSessionId;
        if (sessionId && typeof setActive === 'function') {
          await setActive({ session: sessionId });
        }
        await recordLegalConsent();
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/');
        }
        return;
      }

      // Still missing_requirements after reload — give a helpful message
      if (result.status === 'missing_requirements') {
        const signUpObj = result as unknown as Record<string, unknown>;
        const missingArr = Array.isArray(signUpObj.missingFields) ? signUpObj.missingFields as string[] : [];
        if (missingArr.includes('captcha')) {
          setError('נדרש אימות נגד בוטים. נא לרענן את הדף ולנסות שוב.');
        } else {
          setError('אימות האימייל הצליח אך ההרשמה דורשת פרטים נוספים. נא לרענן ולנסות שוב.');
        }
        return;
      }

      setError('האימות לא הושלם. בדוק את הקוד ונסה שוב.');
    } catch (err: unknown) {
      const clerkErr = err as ClerkAPIError;
      const errorMsg = clerkErr?.errors?.[0]?.message || '';

      // "Already verified" — user submitted the code a second time after it already worked.
      // Reload the sign-up: if it's complete, activate the session instead of showing an error.
      if (errorMsg.includes('already been verified') || errorMsg.includes('already verified')) {
        try {
          const reloaded = await signUp.reload();
          if (reloaded.status === 'complete' && reloaded.createdSessionId) {
            if (typeof setActive === 'function') {
              await setActive({ session: reloaded.createdSessionId });
            }
            await recordLegalConsent();
            if (onSuccess) {
              onSuccess();
            } else {
              router.push('/');
            }
            return;
          }
        } catch { /* ignore */ }
        setError('הקוד כבר אומת בהצלחה. אם לא עברת לאפליקציה, נא לרענן את הדף.');
        return;
      }

      console.error('Email verification error:', err);
      setError(translateClerkError(errorMsg || 'שגיאה באימות האימייל. נסה שוב.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeySignIn = async () => {
    if (!isPasskeySupported) {
      setError('טביעת אצבע לא נתמכת בדפדפן שלך');
      return;
    }

    setError('');
    setIsLoading(true);

    if (!signInLoaded || !signIn) {
      setError('מערכת ההתחברות עדיין לא מוכנה');
      setIsLoading(false);
      return;
    }

    try {
      // Clerk Passkeys authentication
      // First, check if user has passkeys
      const result = await signIn.authenticateWithPasskey({
        // This will trigger the browser's WebAuthn prompt
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/login'); // Redirect to login to handle workspace routing
        }
      } else {
        setError('ההתחברות עם טביעת אצבע לא הושלמה');
      }
    } catch (err: unknown) {
      console.error('Passkey sign in error:', err);
      const clerkErr = err as ClerkAPIError;
      
      // Handle cancellation gracefully without showing a red error message
      const isCancellation = 
        clerkErr?.errors?.[0]?.code === 'passkey_retrieval_cancelled' || 
        clerkErr?.message?.includes('cancelled') ||
        clerkErr?.errors?.[0]?.message?.includes('cancelled');

      if (isCancellation) {
        setIsLoading(false);
        return;
      }

      // Check if user doesn't have passkeys set up
      if (clerkErr?.errors?.[0]?.code === 'passkey_not_found' || clerkErr?.errors?.[0]?.message?.includes('passkey')) {
        setError('לא נמצאה טביעת אצבע. נא ליצור טביעת אצבע בפרופיל החשבון תחילה.');
      } else {
        const errorMsg = clerkErr?.errors?.[0]?.message || 'שגיאה בהתחברות עם טביעת אצבע';
        setError(translateClerkError(errorMsg));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (strategy: OAuthStrategy) => {
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'sign-up') {
        if (!ensureLegalAcceptedOrError()) {
          setIsLoading(false);
          return;
        }
        if (!signUpLoaded || !signUp) {
          setError('מערכת ההרשמה עדיין לא מוכנה');
          setIsLoading(false);
          return;
        }

        storePendingLegalConsent();
        
        // Ensure clerk-captcha element exists before OAuth (prevents CAPTCHA errors)
        if (typeof window !== 'undefined' && !document.getElementById('clerk-captcha')) {
          console.warn('[CustomAuth] clerk-captcha element not found, creating it');
          const div = document.createElement('div');
          div.id = 'clerk-captcha';
          document.body.appendChild(div);
        }
        
        const signUpRedirect = (typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('redirect')
          : null) || '/me';
        await signUp.authenticateWithRedirect({
          strategy,
          redirectUrl: '/sso-callback',
          redirectUrlComplete: signUpRedirect,
        });
      } else {
        if (!signInLoaded || !signIn) {
          setError('מערכת ההתחברות עדיין לא מוכנה');
          setIsLoading(false);
          return;
        }
        // Ensure clerk-captcha element exists before OAuth (prevents CAPTCHA errors)
        if (typeof window !== 'undefined' && !document.getElementById('clerk-captcha')) {
          console.warn('[CustomAuth] clerk-captcha element not found, creating it');
          const div = document.createElement('div');
          div.id = 'clerk-captcha';
          document.body.appendChild(div);
        }
        
        const signInRedirect = (typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('redirect')
          : null) || '/me';
        await signIn.authenticateWithRedirect({
          strategy,
          redirectUrl: '/sso-callback',
          redirectUrlComplete: signInRedirect,
        });
      }
    } catch (err: unknown) {
      console.error('OAuth sign in error:', err);
      const clerkErr = err as ClerkAPIError;
      const errorMsg = clerkErr?.errors?.[0]?.message || 'שגיאה בהתחברות עם ' + (strategy === 'oauth_google' ? 'גוגל' : 'רשת חברתית');
      setError(translateClerkError(errorMsg));
      setIsLoading(false);
    }
  };

  const isSignIn = mode === 'sign-in';
  const isSignUp = mode === 'sign-up';

  return (
    <div className="w-full max-w-md" dir="rtl">
      {/* Required by Clerk Turnstile bot protection during authenticateWithRedirect */}
      {/* Must be outside form and always present in DOM */}
      <div id="clerk-captcha" />
      <form
        onSubmit={
          isSignIn ? handleEmailSignIn : step === 'verify' ? handleVerifyEmailCode : handleEmailSignUp
        }
        className="flex flex-col gap-6"
      >
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-bold"
          >
            {error}
          </motion.div>
        )}

        {info && !error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl text-sm font-bold"
          >
            {info}
          </motion.div>
        )}

        {step !== 'verify' && (
          <>
            {/* Google Sign In - TOP */}
            <button
              type="button"
              onClick={() => {
                if (isSignUp && !legalAccepted) {
                  setError('יש לאשר את תנאי השימוש ומדיניות הפרטיות לפני ההרשמה');
                  return;
                }
                handleOAuthSignIn('oauth_google');
              }}
              disabled={isLoading}
              className="w-full bg-white border-2 border-slate-200 text-slate-900 px-8 py-4 rounded-[24px] font-black text-lg shadow-sm hover:shadow-md hover:border-blue-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isSignIn ? 'כניסה עם Google' : 'הרשמה עם Google'}
            </button>

            {isSignIn && isPasskeySupported && (
              <button
                type="button"
                onClick={handlePasskeySignIn}
                disabled={isLoading}
                className="w-full bg-white border-2 border-slate-200 text-slate-900 px-8 py-4 rounded-[24px] font-black text-lg shadow-sm hover:shadow-md hover:border-blue-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Scan size={24} />
                כניסה עם טביעת אצבע
              </button>
            )}

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-100"></div>
              <span className="text-xs font-black text-slate-400 uppercase">או</span>
              <div className="flex-1 h-px bg-slate-100"></div>
            </div>
          </>
        )}

        <div className="flex flex-col gap-3">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">
            כתובת אימייל
          </label>
          <div className="relative">
            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={!isSignIn && step === 'verify'}
              className="w-full bg-slate-50 border border-slate-100 rounded-[24px] px-12 py-4 text-lg font-bold outline-none focus:ring-4 ring-blue-50 transition-all text-right"
            />
          </div>
        </div>

        {!usePasskey && (
          <div className="flex flex-col gap-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">
              סיסמה
            </label>
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={!isSignIn && step === 'verify'}
                className="w-full bg-slate-50 border border-slate-100 rounded-[24px] px-12 py-4 text-lg font-bold outline-none focus:ring-4 ring-blue-50 transition-all text-right"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
        )}

        {isSignUp && (
          <label className="flex items-start gap-3 text-sm font-bold text-slate-600">
            <input
              type="checkbox"
              checked={legalAccepted}
              onChange={(e) => setLegalAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300"
              disabled={isLoading}
            />
            <span>
              אני מאשר/ת שקראתי ואני מסכים/ה ל
              <a href="/terms" target="_blank" rel="noreferrer" className="text-blue-700 underline font-black">
                תנאי השימוש
              </a>
              ו
              <a href="/privacy" target="_blank" rel="noreferrer" className="text-blue-700 underline font-black">
                מדיניות הפרטיות
              </a>
            </span>
          </label>
        )}

        {!isSignIn && step === 'verify' && (
          <div className="flex flex-col gap-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">
              קוד אימות
            </label>
            <input
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
              className="w-full bg-slate-50 border border-slate-100 rounded-[24px] px-5 py-4 text-lg font-bold outline-none focus:ring-4 ring-blue-50 transition-all text-center"
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={isLoading}
                onClick={async () => {
                  try {
                    setError('');
                    setInfo('');
                    if (!signUpLoaded || !signUp) return;
                    await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
                    setInfo('שלחנו קוד חדש לאימייל.');
                  } catch (err: unknown) {
                    const clerkErr = err as ClerkAPIError;
                    const errorMsg = clerkErr?.errors?.[0]?.message || 'שגיאה בשליחת קוד. נסה שוב.';
                    setError(translateClerkError(errorMsg));
                  }
                }}
                className="text-sm font-black text-blue-700 hover:text-blue-800 underline disabled:opacity-50"
              >
                שלח קוד מחדש
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setError('');
                  setInfo('');
                  setVerificationCode('');
                  setStep('form');
                }}
                className="text-sm font-black text-slate-600 hover:text-slate-900 underline disabled:opacity-50"
              >
                חזרה
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={
            isLoading ||
            !email ||
            (!usePasskey && !password) ||
            (!isSignIn && step === 'verify' && !verificationCode) ||
            (!isSignIn && !legalAccepted)
          }
          className="w-full bg-slate-900 text-white px-8 py-5 rounded-[24px] font-black text-lg shadow-xl shadow-slate-200 hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>{isSignIn ? 'מתחבר...' : step === 'verify' ? 'מאמת...' : 'נרשם...'}</>
          ) : (
            <>
              {isSignIn ? 'כניסה למערכת' : step === 'verify' ? 'אמת קוד' : 'הרשמה למערכת'}
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </form>

      {isSignIn && (
        <div className="mt-6 text-center">
          <p className="text-sm font-bold text-slate-400">
            שכחת סיסמה?{' '}
            <button
              onClick={() => {
                // Clerk's password reset
                router.push(`/reset-password${email ? `?email=${encodeURIComponent(email)}` : ''}`);
              }}
              className="text-blue-600 hover:text-blue-700 font-black underline"
            >
              איפוס סיסמה
            </button>
          </p>
        </div>
      )}
    </div>
  );
}

