'use client';

import React from 'react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    const computeOnline = () => {
      try {
        setIsOnline(Boolean(navigator.onLine));
      } catch {
        setIsOnline(true);
      }
    };

    computeOnline();

    const onOnline = () => {
      setIsOnline(true);
      window.location.reload();
    };

    const onOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-black">אין חיבור לאינטרנט</div>
              <div className="mt-1 text-sm font-bold text-white/70">
                {isOnline ? 'מנסה להתחבר מחדש…' : 'ממתין לחיבור…'}
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm font-bold text-white/70">
            ברגע שהאינטרנט יחזור האפליקציה תיטען אוטומטית.
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 w-full h-12 rounded-2xl bg-white text-slate-950 font-black"
          >
            נסה שוב
          </button>

          <a
            href="/login"
            className="mt-3 block w-full text-center text-sm font-black text-white/70 hover:text-white"
          >
            חזרה להתחברות
          </a>
        </div>
      </div>
    </div>
  );
}
