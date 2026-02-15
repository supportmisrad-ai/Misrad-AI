'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Lock, ShieldCheck, Zap, Globe, Cpu, Eye, EyeOff, Smartphone, Fingerprint } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSignIn } from '@clerk/nextjs';
import type { OSModule } from '@/types/os-modules';
import { OSModuleSquircleIcon } from '@/components/shared/OSModuleIcon';
import { translateClerkError } from '@/lib/errorTranslations';
import { getSystemIconUrl } from '@/lib/metadata';

function asObj(v: unknown): Record<string, unknown> | undefined {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return undefined;
}

export const LoginView: React.FC<{ organizationName?: string }> = ({ organizationName }) => {
  const orgName = organizationName || 'MISRAD AI';
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [targetModule, setTargetModule] = useState<OSModule | 'misrad'>('misrad');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [showKioskOptions, setShowKioskOptions] = useState(false);
  const [isPasskeySupported, setIsPasskeySupported] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when entering password view
  useEffect(() => {
      if (showPassword) {
          setTimeout(() => {
              passwordInputRef.current?.focus();
          }, 100);
      } else {
          emailInputRef.current?.focus();
      }
  }, [showPassword]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const searchParams = new URLSearchParams(window.location.search);
    const redirectPath = searchParams.get('redirect') || '';
    const p = String(redirectPath);

    const resolved: OSModule | 'misrad' =
      p.startsWith('/social') ? 'social' :
      p.startsWith('/finance') ? 'finance' :
      p.startsWith('/client') ? 'client' :
      p.startsWith('/system') || p.startsWith('/pipeline') ? 'system' :
      p.startsWith('/app') || p.startsWith('/nexus') ? 'nexus' :
      'misrad';

    setTargetModule(resolved);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsPasskeySupported(
      typeof window.PublicKeyCredential !== 'undefined' &&
        typeof navigator.credentials !== 'undefined' &&
        typeof navigator.credentials.get !== 'undefined'
    );
  }, []);

  const getLoginReturnUrl = () => {
    if (typeof window === 'undefined') return '/login';
    const search = window.location.search || '';
    return `/login${search}`;
  };

  const theme = (() => {
    if (targetModule === 'social') {
      return {
        topBar: 'from-indigo-600 via-purple-600 to-pink-600',
        blobA: 'bg-[#7C3AED]',
        blobB: 'bg-[#DB2777]',
        accentTextGradient: 'from-indigo-300 via-purple-300 to-pink-300',
        focusRing: 'focus:border-purple-500 focus:ring-purple-500/10',
        moduleKey: 'social' as const,
      };
    }
    if (targetModule === 'system') {
      return {
        topBar: 'from-rose-600 to-indigo-600',
        blobA: 'bg-rose-600',
        blobB: 'bg-indigo-600',
        accentTextGradient: 'from-rose-300 to-indigo-300',
        focusRing: 'focus:border-rose-500 focus:ring-rose-500/10',
        moduleKey: 'system' as const,
      };
    }
    if (targetModule === 'nexus') {
      return {
        topBar: 'from-indigo-600 to-purple-600',
        blobA: 'bg-indigo-600',
        blobB: 'bg-purple-600',
        accentTextGradient: 'from-indigo-300 to-purple-300',
        focusRing: 'focus:border-indigo-500 focus:ring-indigo-500/10',
        moduleKey: 'nexus' as const,
      };
    }
    return {
      topBar: 'from-blue-600 to-purple-600',
      blobA: 'bg-blue-600',
      blobB: 'bg-purple-600',
      accentTextGradient: 'from-blue-400 to-purple-400',
      focusRing: 'focus:border-blue-500 focus:ring-blue-500/10',
      moduleKey: null,
    };
  })();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoaded) {
      setError('המערכת עדיין נטענת, אנא נסה שוב');
      return;
    }

    if (!signIn) {
      setError('שגיאה בטעינת מערכת ההתחברות. נא לרענן את הדף.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('נא להזין כתובת אימייל תקינה');
      emailInputRef.current?.focus();
      return;
    }

    if (!password || password.length === 0) {
      setError('נדרשת סיסמה לכניסה');
      passwordInputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      try {
        const direct = await signIn.create({
          identifier: normalizedEmail,
          password,
        });

        if (direct.status === 'complete') {
          await setActive({ session: direct.createdSessionId });
          const returnUrl = getLoginReturnUrl();
          if (typeof window !== 'undefined') {
            window.location.assign(returnUrl);
            return;
          }
          router.replace(returnUrl);
          router.refresh();
          return;
        }

        const status = asObj(direct)?.status;
        const msg =
          status === 'needs_second_factor'
            ? 'נדרש אימות דו-שלבי כדי להשלים התחברות (2FA). נסה להתחבר עם שיטה אחרת או השלם את האימות הנוסף.'
            : status === 'needs_new_password'
              ? 'נדרש להגדיר סיסמה חדשה כדי להמשיך. נסה להתחבר ולבחור איפוס סיסמה.'
              : status === 'needs_first_factor'
                ? 'נדרש גורם התחברות נוסף כדי להשלים התחברות. נסה שוב או השתמש בשיטה אחרת.'
                : `ההתחברות לא הושלמה (סטטוס: ${String(status || 'unknown')}). נסה שוב או השתמש בשיטה אחרת.`;
        setError(msg);
        return;
      } catch {
        const init = await signIn.create({
          identifier: normalizedEmail,
        });

        if (init.status === 'complete') {
          await setActive({ session: init.createdSessionId });
          const returnUrl = getLoginReturnUrl();
          if (typeof window !== 'undefined') {
            window.location.assign(returnUrl);
            return;
          }
          router.replace(returnUrl);
          router.refresh();
          return;
        }

        if (init.status === 'needs_first_factor') {
          const supported = asObj(init)?.supportedFirstFactors;
          const supportsPassword = Array.isArray(supported)
            ? supported.some((f: unknown) => String(asObj(f)?.strategy || '').toLowerCase() === 'password')
            : true;

          if (!supportsPassword) {
            setError('למשתמש הזה אין סיסמה מוגדרת. נסה להתחבר עם Google או בצע "שכחתי סיסמה" כדי להגדיר סיסמה.');
            return;
          }

          const result = await signIn.attemptFirstFactor({
            strategy: 'password',
            password,
          });

          if (result.status === 'complete') {
            await setActive({ session: result.createdSessionId });
            const returnUrl = getLoginReturnUrl();
            if (typeof window !== 'undefined') {
              window.location.assign(returnUrl);
              return;
            }
            router.replace(returnUrl);
            router.refresh();
            return;
          }

          const status2 = asObj(result)?.status;
          const msg =
            status2 === 'needs_second_factor'
              ? 'נדרש אימות דו-שלבי כדי להשלים התחברות (2FA). נסה להתחבר עם שיטה אחרת או השלם את האימות הנוסף.'
              : status2 === 'needs_new_password'
                ? 'נדרש להגדיר סיסמה חדשה כדי להמשיך. נסה להתחבר ולבחור איפוס סיסמה.'
                : `ההתחברות לא הושלמה (סטטוס: ${String(status2 || 'unknown')}). נסה שוב או השתמש בשיטה אחרת.`;
          setError(msg);
          return;
        }

        const status = asObj(init)?.status;
        const msg =
          status === 'needs_second_factor'
            ? 'נדרש אימות דו-שלבי כדי להשלים התחברות (2FA). נסה להתחבר עם שיטה אחרת או השלם את האימות הנוסף.'
            : status === 'needs_identifier'
              ? 'נדרש אימייל/מזהה כדי להמשיך. נסה להזין את האימייל מחדש.'
              : status === 'needs_new_password'
                ? 'נדרש להגדיר סיסמה חדשה כדי להמשיך. נסה להתחבר ולבחור איפוס סיסמה.'
                : `ההתחברות לא הושלמה (סטטוס: ${String(status || 'unknown')}). נסה שוב או השתמש בשיטה אחרת.`;
        setError(msg);
      }
    } catch (err: unknown) {
      const errObj = asObj(err);
      const errorsArr = Array.isArray(errObj?.errors) ? errObj.errors : [];
      const clerkError = asObj(errorsArr[0]);
      const errType = typeof err;
      const errString = errType === 'string' ? (err as string) : err instanceof Error ? err.message : String(err || '');
      const errKeys = errObj ? Object.keys(errObj) : [];

      const details = {
        errType: errType || null,
        errString: errString || null,
        errKeys,
        hasErrorsArray: errorsArr.length > 0,
        clerkErrorCode: clerkError?.code ?? null,
        clerkErrorMessage: clerkError?.message ?? null,
        clerkErrorLongMessage: clerkError?.longMessage ?? null,
        clerkErrorMeta: clerkError?.meta ?? null,
      };

      const detailsJson = (() => {
        try {
          return JSON.stringify(details, (_key, value) => (value === undefined ? null : value));
        } catch {
          return String(details);
        }
      })();

      if (process.env.NODE_ENV === 'development') {
        console.warn('Login error raw:', err);
        console.warn('Login error details:', details);
        console.warn('Login error details (json):', detailsJson);
      }

      const errorKey = String(clerkError?.code || clerkError?.message || (err instanceof Error ? err.message : '') || errString || '');
      const fallbackMessage =
        String(clerkError?.message || '') ||
        (err instanceof Error ? err.message : '') ||
        errString ||
        'שגיאה בהתחברות. נא לבדוק את הפרטים ולהנסות שוב.';
      setError(translateClerkError(errorKey || fallbackMessage));
      passwordInputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (!isPasskeySupported) {
      setError('התחברות עם Face ID / Touch ID לא נתמכת במכשיר/דפדפן הזה');
      return;
    }

    if (!isLoaded) {
      setError('המערכת עדיין נטענת, אנא נסה שוב');
      return;
    }

    if (!signIn) {
      setError('שגיאה בטעינת מערכת ההתחברות. נא לרענן את הדף.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn.authenticateWithPasskey({});

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        const returnUrl = getLoginReturnUrl();
        if (typeof window !== 'undefined') {
          window.location.assign(returnUrl);
          return;
        }
        router.replace(returnUrl);
        router.refresh();
        return;
      }

      const status = asObj(result)?.status;
      setError(`ההתחברות עם זיהוי ביומטרי לא הושלמה (סטטוס: ${String(status || 'unknown')}). נסה שוב.`);
    } catch (err: unknown) {
      const errObj2 = asObj(err);
      const errorsArr2 = Array.isArray(errObj2?.errors) ? errObj2.errors : [];
      const clerkError = asObj(errorsArr2[0]);
      const errorKey = String(clerkError?.code || clerkError?.message || (err instanceof Error ? err.message : '') || String(err || ''));
      setError(translateClerkError(errorKey || 'שגיאה בהתחברות עם זיהוי ביומטרי'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isLoaded) {
      setError('המערכת עדיין נטענת, אנא נסה שוב');
      return;
    }

    if (!signIn) {
      setError('שגיאה בטעינת מערכת ההתחברות. נא לרענן את הדף.');
      return;
    }

    setIsLoading(true);
    setError('');

    const origin = window.location.origin;
    const loginReturnUrl = `${origin}${getLoginReturnUrl()}`;

    try {
      // ניסוי ראשון: Redirect (העדפה כי זה ה-flow המלא)
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: loginReturnUrl,
        redirectUrlComplete: loginReturnUrl,
      });
      // אם ה-redirect מצליח, לא נגיע לכאן כי הדפדפן ינותב.
    } catch (errRedirect: unknown) {
      console.warn('Redirect Google failed, trying popup', errRedirect);
      try {
        // ניסוי שני: Popup
        const resultRaw = await signIn.authenticateWithPopup({
          strategy: 'oauth_google',
          redirectUrl: loginReturnUrl,
          redirectUrlComplete: loginReturnUrl,
          popup: window,
        });
        const result = asObj(resultRaw);
        if (result?.createdSessionId) {
          await setActive({ session: result.createdSessionId as string });
          const returnUrl = getLoginReturnUrl();
          if (typeof window !== 'undefined') {
            window.location.assign(returnUrl);
            return;
          }
          router.replace(returnUrl);
          router.refresh();
        } else {
          setError('ההתחברות עם Google נכשלה. נא לנסות שוב.');
        }
      } catch (errPopup: unknown) {
        console.error('Google popup error:', errPopup);
        const popupErrs = Array.isArray(asObj(errPopup)?.errors) ? (asObj(errPopup)?.errors as unknown[]) : [];
        const redirErrs = Array.isArray(asObj(errRedirect)?.errors) ? (asObj(errRedirect)?.errors as unknown[]) : [];
        setError(
          String(asObj(popupErrs[0])?.message || '') ||
            String(asObj(redirErrs[0])?.message || '') ||
            'שגיאה בהתחברות עם Google. נא לנסות שוב.'
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-row overflow-hidden" dir="rtl">
      <main className="w-full flex flex-row">
      {/* Right Side - Brand / Visuals */}
      <div className="hidden lg:flex lg:w-1/2 bg-black relative flex-col justify-between p-12 text-white overflow-hidden">
          {/* Abstract Background Animation */}
          <div className="absolute inset-0 opacity-30">
               <div className={`absolute top-0 right-0 w-[500px] h-[500px] ${theme.blobA} rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 animate-pulse`}></div>
               <div className={`absolute bottom-0 left-0 w-[400px] h-[400px] ${theme.blobB} rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2`}></div>
          </div>

          <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden">
                      {theme.moduleKey ? (
                        <OSModuleSquircleIcon moduleKey={theme.moduleKey} boxSize={48} iconSize={22} className="shadow-none" />
                      ) : (
                        <img src={getSystemIconUrl('misrad')} alt="Logo" className="w-full h-full object-contain p-1.5" />
                      )}
                  </div>
                  <span className="font-bold text-3xl tracking-tight" suppressHydrationWarning>{orgName}</span>
              </div>
              <h2 className="text-5xl font-bold leading-tight max-w-md">
                  ניהול העסק שלך,<br/> 
                  <span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme.accentTextGradient}`}>ברמה הבאה.</span>
              </h2>
          </div>

          <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-md border border-white/10">
                      <ShieldCheck size={16} className="text-green-400" /> אבטחה מקצה לקצה
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-md border border-white/10">
                      <Zap size={16} className="text-yellow-400" /> ביצועים מהירים
                  </div>
              </div>
              <p className="text-gray-500 text-xs flex items-center gap-2">
                  <span>Powered by MISRAD AI</span>
                  <span>&copy; 2026 MISRAD AI.</span>
              </p>
          </div>
      </div>

      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-50 relative">
        {/* Mobile Background Decoration */}
        <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${theme.topBar} lg:hidden`}></div>

        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
        >
            <div className="mb-10 text-center lg:text-right">
                <div className="lg:hidden flex justify-center mb-4">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex items-center justify-center">
                        {theme.moduleKey ? (
                          <OSModuleSquircleIcon moduleKey={theme.moduleKey} boxSize={64} iconSize={26} className="shadow-none" />
                        ) : (
                          <img src={getSystemIconUrl('misrad')} alt="Logo" className="w-full h-full object-contain p-2" />
                        )}
                    </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">ברוכים השבים</h3>
                <p className="text-gray-500">נא להזדהות כדי לגשת למרחב העבודה של <span className="font-bold text-black" suppressHydrationWarning>{orgName}</span>.</p>
            </div>

            <div className="bg-white p-2 rounded-3xl shadow-xl shadow-gray-200/50 border border-white">
                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {!showPassword ? (
                            <motion.div 
                                key="email-input"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                {error && (
                                  <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-xs text-red-500 font-bold"
                                  >
                                    {error}
                                  </motion.p>
                                )}
                                {/* Google Login - Moved to top */}
                                <button
                                  type="button"
                                  onClick={handleGoogleLogin}
                                  disabled={!isLoaded || isLoading}
                                  className="w-full bg-white text-gray-700 font-medium py-3.5 rounded-xl border border-gray-300 hover:border-gray-400 hover:shadow-md transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                  {/* Google Logo SVG */}
                                  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                                    <g fill="none" fillRule="evenodd">
                                      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                                      <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.951H.957C.348 6.174 0 7.55 0 9s.348 2.826.957 4.049l2.84-2.204.167-.138z" fill="#FBBC05"/>
                                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.951L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                                    </g>
                                  </svg>
                                  <span className="text-gray-700 font-medium">המשך עם Google</span>
                                </button>

                                {isPasskeySupported && (
                                  <button
                                    type="button"
                                    onClick={handlePasskeyLogin}
                                    disabled={!isLoaded || isLoading}
                                    className="w-full bg-white text-gray-700 font-medium py-3.5 rounded-xl border border-gray-300 hover:border-gray-400 hover:shadow-md transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                                  >
                                    <Fingerprint size={18} className="text-gray-700" />
                                    <span className="text-gray-700 font-medium">התחבר עם Face ID / Touch ID</span>
                                  </button>
                                )}

                                {/* Divider */}
                                <div className="flex items-center gap-3 my-2">
                                  <div className="flex-1 h-px bg-gray-200" />
                                  <span className="text-[11px] text-gray-600 font-bold">או</span>
                                  <div className="flex-1 h-px bg-gray-200" />
                                </div>

                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-4 block">הזן כתובת אימייל</label>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (email && email.includes('@')) {
                                            setShowPassword(true);
                                            setError('');
                                        } else {
                                            setError('נא להזין כתובת אימייל תקינה');
                                        }
                                    }}
                                    className="space-y-4"
                                >
                                    <div className="relative group">
                                        <input 
                                            ref={emailInputRef}
                                            type="email"
                                            value={email}
                                            onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                            className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pr-4 pl-4 outline-none focus:ring-4 transition-all font-bold text-gray-900 placeholder:text-gray-400 ${theme.focusRing}`}
                                            placeholder="your@email.com"
                                            dir="ltr"
                                            style={{ textAlign: 'left' }}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all active:scale-[0.98] shadow-lg shadow-gray-200 flex items-center justify-center gap-2"
                                    >
                                        המשך <ArrowLeft size={18} />
                                    </button>
                                </form>

                                <div className="mt-3">
                                  <button
                                    type="button"
                                    onClick={() => setShowKioskOptions((v) => !v)}
                                    className="w-full text-center text-sm font-bold text-gray-600 hover:text-gray-900 underline"
                                  >
                                    כניסה למסופון
                                  </button>

                                  {showKioskOptions && (
                                    <div className="mt-3 grid grid-cols-1 gap-2">
                                      <button
                                        type="button"
                                        onClick={() => router.push('/kiosk-scan')}
                                        className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all active:scale-[0.98] shadow-lg shadow-gray-200 flex items-center justify-center gap-2"
                                      >
                                        כניסה במסופון (סריקת QR) <Smartphone size={18} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => router.push('/kiosk-login')}
                                        className="w-full bg-white text-gray-900 border border-gray-200 py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-[0.98] transition-all"
                                      >
                                        <Smartphone size={18} /> הצג קוד ידני
                                      </button>
                                    </div>
                                  )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="password-input"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between mb-8">
                                     <div className="flex items-center gap-3">
                                         <div className="w-12 h-12 rounded-full border-2 border-white shadow-md bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                             {email.charAt(0).toUpperCase()}
                                         </div>
                                         <div>
                                             <div className="font-bold text-gray-900 text-lg">{email}</div>
                                             <div className="text-xs text-gray-500">נדרש אימות</div>
                                         </div>
                                     </div>
                                     <button 
                                        type="button"
                                        onClick={() => { setShowPassword(false); setPassword(''); setError(''); }}
                                        className="text-xs font-bold text-gray-400 hover:text-gray-600 underline"
                                     >
                                         החלף אימייל
                                     </button>
                                </div>

                                <form onSubmit={handleLogin}>
                                    <div className="mb-6">
                                        <div className="relative group">
                                            <Lock size={18} className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                            <input 
                                                ref={passwordInputRef}
                                                autoFocus
                                                type={showPasswordText ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                                className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pr-12 pl-12 outline-none focus:ring-4 transition-all font-bold text-gray-900 placeholder:text-gray-400 ${theme.focusRing}`}
                                                placeholder="הקלד סיסמה..."
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswordText(!showPasswordText)}
                                                className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400 hover:text-gray-600 transition-colors"
                                                tabIndex={-1}
                                            >
                                                {showPasswordText ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        {error && (
                                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-500 mt-2 font-bold flex items-center gap-1">
                                                <span className="w-1 h-1 bg-red-50 rounded-full"></span> {error}
                                            </motion.p>
                                        )}
                                        <div className="mt-3 text-left">
                                            <button
                                                type="button"
                                                onClick={() => router.push(`/reset-password${email ? `?email=${encodeURIComponent(email)}` : ''}`)}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-700 underline transition-colors"
                                            >
                                                שכחתי סיסמה?
                                            </button>
                                        </div>
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={isLoading || !isLoaded}
                                        className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all active:scale-[0.98] shadow-lg shadow-gray-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <>טוען...</>
                                        ) : (
                                            <>
                                                כניסה למערכת <ArrowLeft size={18} />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            
            {/* Status Bar */}
            <div className="mt-8 flex items-center justify-center gap-6 text-xs font-medium text-gray-600">
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> מערכות תקינות</span>
                <span className="flex items-center gap-1.5"><Globe size={12} /> אזור IL-TLV</span>
                <span className="flex items-center gap-1.5"><Cpu size={12} /> MISRAD AI v2.5.0</span>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-gray-500">
                <span className="font-semibold text-gray-500">הורדת אפליקציה:</span>
                <a
                    href="/api/download/windows"
                    className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-1 font-bold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                    הורד ל-Windows
                </a>
                <a
                    href="/api/download/android"
                    className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-1 font-bold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                    הורד ל-Android
                </a>
            </div>

        </motion.div>
      </div>
      </main>
    </div>
  );
};
