'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Fingerprint, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useSignIn, useSignUp, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { translateClerkError } from '@/lib/errorTranslations';
import { OAuthStrategy } from '@clerk/types';

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
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [usePasskey, setUsePasskey] = useState(false);
  const [isPasskeySupported, setIsPasskeySupported] = useState(false);

  // Check if Passkeys/WebAuthn is supported
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsPasskeySupported(
        typeof window.PublicKeyCredential !== 'undefined' &&
        typeof navigator.credentials !== 'undefined' &&
        typeof navigator.credentials.create !== 'undefined'
      );
    }
  }, []);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
        await setActive({ session: result.createdSessionId });
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/');
        }
      } else {
        setError('ההתחברות נכשלה. נסה שוב.');
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      const errorMsg = err.errors?.[0]?.message || 'שגיאה בהתחברות. נסה שוב.';
      setError(translateClerkError(errorMsg));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!signUpLoaded) {
      setError('מערכת ההרשמה עדיין לא מוכנה');
      setIsLoading(false);
      return;
    }

    try {
      const result = await signUp.create({
        emailAddress: email,
        password: password,
      });

      // Send verification email
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      // For now, we'll just show success - in production you'd show a code input
      setError('נא לבדוק את האימייל שלך לאימות');
    } catch (err: any) {
      console.error('Sign up error:', err);
      const errorMsg = err.errors?.[0]?.message || 'שגיאה בהרשמה. נסה שוב.';
      setError(translateClerkError(errorMsg));
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
          router.push('/');
        }
      } else {
        setError('ההתחברות עם טביעת אצבע לא הושלמה');
      }
    } catch (err: any) {
      console.error('Passkey sign in error:', err);
      // Check if user doesn't have passkeys set up
      if (err.errors?.[0]?.code === 'passkey_not_found' || err.errors?.[0]?.message?.includes('passkey')) {
        setError('לא נמצאה טביעת אצבע. נא ליצור טביעת אצבע בפרופיל החשבון תחילה.');
      } else {
        const errorMsg = err.errors?.[0]?.message || 'שגיאה בהתחברות עם טביעת אצבע';
        setError(translateClerkError(errorMsg));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (strategy: OAuthStrategy) => {
    setError('');
    setIsLoading(true);

    if (!signInLoaded || !signIn) {
      setError('מערכת ההתחברות עדיין לא מוכנה');
      setIsLoading(false);
      return;
    }

    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: '/',
        redirectUrlComplete: '/',
      });
    } catch (err: any) {
      console.error('OAuth sign in error:', err);
      const errorMsg = err.errors?.[0]?.message || 'שגיאה בהתחברות עם ' + (strategy === 'oauth_google' ? 'גוגל' : 'רשת חברתית');
      setError(translateClerkError(errorMsg));
      setIsLoading(false);
    }
  };

  const isSignIn = mode === 'sign-in';

  return (
    <div className="w-full max-w-md" dir="rtl">
      <form onSubmit={isSignIn ? handleEmailSignIn : handleEmailSignUp} className="flex flex-col gap-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-bold"
          >
            {error}
          </motion.div>
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

        {(isSignIn && (isPasskeySupported || true)) && (
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-100"></div>
            <span className="text-xs font-black text-slate-400 uppercase">או</span>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>
        )}

        {/* Google Sign In */}
        <button
          type="button"
          onClick={() => handleOAuthSignIn('oauth_google')}
          disabled={isLoading}
          className="w-full bg-white border-2 border-slate-200 text-slate-900 px-8 py-4 rounded-[24px] font-black text-lg shadow-sm hover:shadow-md hover:border-blue-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          התחבר עם Google
        </button>

        {isSignIn && isPasskeySupported && (
          <button
            type="button"
            onClick={handlePasskeySignIn}
            disabled={isLoading}
            className="w-full bg-white border-2 border-slate-200 text-slate-900 px-8 py-4 rounded-[24px] font-black text-lg shadow-sm hover:shadow-md hover:border-blue-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Fingerprint size={24} />
            התחבר עם טביעת אצבע
          </button>
        )}

        <button
          type="submit"
          disabled={isLoading || !email || (!usePasskey && !password)}
          className="w-full bg-slate-900 text-white px-8 py-5 rounded-[24px] font-black text-lg shadow-xl shadow-slate-200 hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>{isSignIn ? 'מתחבר...' : 'נרשם...'}</>
          ) : (
            <>
              {isSignIn ? 'התחבר' : 'הירשם'}
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
                router.push('/sign-in#/forgot-password');
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

