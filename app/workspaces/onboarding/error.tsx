'use client';

import { useEffect } from 'react';

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Onboarding] Server error:', error?.message, error?.digest);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-md mx-auto px-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            אירעה שגיאה זמנית
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            לא הצלחנו להשלים את הגדרת החשבון. נסו שוב — בדרך כלל זה נפתר תוך שניות.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => reset()}
              className="w-full h-11 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors"
            >
              נסו שוב
            </button>
            <a
              href="/login"
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              חזרה לדף הכניסה
            </a>
          </div>
          {error?.digest && (
            <p className="mt-4 text-[10px] text-slate-300 font-mono select-all">
              {error.digest}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
