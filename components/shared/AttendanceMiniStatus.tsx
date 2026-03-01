'use client';

import React from 'react';
import { Clock, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAttendanceTile, formatAttendanceDuration } from '@/hooks/useAttendanceTile';

export default function AttendanceMiniStatus() {
  const router = useRouter();
  const { shouldShow, isActive, elapsedMs, isBusy, errorMessage, clockIn, clockOut, meHref } = useAttendanceTile();

  if (!shouldShow) return null;

  if (isActive) {
    return (
      <div className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-full bg-white/60 border border-white/40 shadow-sm">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        <Clock size={14} className="text-emerald-700" />
        <span className="hidden md:inline text-xs font-black text-emerald-800">פעיל</span>
        <button
          type="button"
          onClick={() => router.push(meHref)}
          className="text-xs font-bold text-slate-700 tabular-nums hover:text-emerald-700 transition-colors cursor-pointer bg-transparent border-none p-0 touch-manipulation"
          aria-label="מעבר לשעון נוכחות"
          title="מעבר לשעון נוכחות"
        >
          {formatAttendanceDuration(elapsedMs)}
        </button>
        {errorMessage && (
          <span className="hidden md:inline text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
            {errorMessage}
          </span>
        )}
        <button
          type="button"
          onClick={clockOut}
          disabled={isBusy}
          className="ml-1 p-1 rounded-full text-slate-600 hover:text-slate-900 hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
          aria-label="יציאה מהירה"
          title="יציאה מהירה"
        >
          <LogOut size={14} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={clockIn}
      disabled={isBusy}
      className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-full bg-white/60 border border-white/40 shadow-sm text-xs font-bold text-slate-700 hover:text-emerald-700 hover:border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
      aria-label="כניסה למשמרת"
      title="כניסה למשמרת"
    >
      <Clock size={14} className="text-slate-500" />
      <span className="hidden md:inline">כניסה</span>
    </button>
  );
}
