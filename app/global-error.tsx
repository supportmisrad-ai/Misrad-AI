'use client';

import React, { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-white text-slate-900">
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-black">משהו השתבש</div>
            <div className="mt-2 text-sm font-bold text-slate-600">נסה לרענן את העמוד או לחזור אחורה.</div>
            <div className="mt-4 flex justify-end">
              <Button type="button" onClick={() => reset()}>
                נסה שוב
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
