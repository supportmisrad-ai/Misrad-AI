'use client';

import React from 'react';
import { Clock, Fingerprint, LogOut } from 'lucide-react';
import { useAttendanceTile, formatAttendanceDuration } from '@/hooks/useAttendanceTile';

export default function MobileMenuAttendanceButton() {
  const { shouldShow, isActive, elapsedMs, isBusy, clockIn, clockOut } = useAttendanceTile();

  if (!shouldShow) return null;

  if (isActive) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={clockOut}
            disabled={isBusy}
            className="flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/25 hover:bg-rose-600 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            <LogOut size={18} strokeWidth={2.5} />
            <span className="text-sm font-black">יציאה</span>
          </button>
          <div className="flex items-center gap-2 px-4 py-3.5 rounded-full bg-emerald-50 border border-emerald-200">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Clock size={16} className="text-emerald-700" />
            <span className="text-sm font-black text-emerald-900 tabular-nums">{formatAttendanceDuration(elapsedMs)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={clockIn}
      disabled={isBusy}
      className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
    >
      <Fingerprint size={20} strokeWidth={2.5} />
      <span className="text-sm font-black">כניסה למשמרת</span>
    </button>
  );
}
