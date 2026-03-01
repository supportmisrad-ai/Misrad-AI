'use client';

import React from 'react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-8">
          <div className="text-2xl font-black">אין חיבור לאינטרנט</div>
          <div className="mt-3 text-sm font-bold text-white/70">
            נראה שהרשת לא זמינה כרגע. בדוק חיבור ונסה שוב.
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
