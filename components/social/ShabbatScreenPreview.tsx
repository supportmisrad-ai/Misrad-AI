'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Crown, Sparkles } from 'lucide-react';
import { formatShabbatTime, formatCountdown, calculateShabbatTimes } from '@/lib/shabbat';

const SHABBAT_MESSAGES = [
  "אנו מאמינים שמקור הברכה בפרנסה הוא דווקא יום המנוחה בשבת - רוגע ומרפא לנפש כדי שנוכל להתחיל שבוע מלא באנרגיות",
  "השבת מזכירה לנו שהערך שלנו לא נמדד רק במה שאנחנו עושים, אלא גם במה שאנחנו",
  "השבת היא מתנה - זמן לעצור, לנשום, ולהטען מחדש לשבוע הבא",
  "אנו מאמינים שהצלחה אמיתית מגיעה משילוב של עבודה קשה ומנוחה משמעותית",
];

function ShabbatTableIllustration() {
  return (
    <svg
      viewBox="0 0 920 420"
      className="w-full h-auto"
      role="img"
      aria-label="שולחן שבת עם חלות, נרות, גביע ויין"
    >
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F6E6B4" />
          <stop offset="0.45" stopColor="#D4AF37" />
          <stop offset="1" stopColor="#FFF4CC" />
        </linearGradient>
        <linearGradient id="velvet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0B1022" />
          <stop offset="0.6" stopColor="#151B34" />
          <stop offset="1" stopColor="#090D1B" />
        </linearGradient>
        <radialGradient id="candleGlow" cx="50%" cy="35%" r="70%">
          <stop offset="0" stopColor="#FFD78A" stopOpacity="1" />
          <stop offset="0.35" stopColor="#FFD78A" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFD78A" stopOpacity="0" />
        </radialGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.45 0"
          />
        </filter>
      </defs>

      <path
        d="M80 290 C 180 250, 320 240, 460 250 C 600 260, 720 250, 840 290 L 840 360 C 700 405, 220 405, 80 360 Z"
        fill="url(#velvet)"
      />
      <path
        d="M120 298 C 210 270, 320 262, 460 270 C 600 278, 705 270, 800 298"
        stroke="url(#gold)"
        strokeWidth="3"
        opacity="0.8"
        fill="none"
      />

      <circle cx="330" cy="150" r="70" fill="url(#candleGlow)" />
      <circle cx="390" cy="150" r="70" fill="url(#candleGlow)" />

      <g filter="url(#softShadow)">
        <rect x="320" y="170" width="18" height="92" rx="9" fill="#F7F0E4" />
        <rect x="380" y="170" width="18" height="92" rx="9" fill="#F7F0E4" />
        <path d="M329 166 C 326 156, 332 149, 337 142 C 344 151, 346 160, 339 168 Z" fill="#FFCF6A" />
        <path d="M389 166 C 386 156, 392 149, 397 142 C 404 151, 406 160, 399 168 Z" fill="#FFCF6A" />
        <path d="M329 170 C 329 162, 334 156, 337 152" stroke="#FFDFA0" strokeWidth="2" opacity="0.7" />
        <path d="M389 170 C 389 162, 394 156, 397 152" stroke="#FFDFA0" strokeWidth="2" opacity="0.7" />
      </g>

      <g filter="url(#softShadow)">
        <ellipse cx="520" cy="250" rx="120" ry="40" fill="#2B1D12" opacity="0.35" />
        <path
          d="M420 240 C 450 200, 520 192, 560 210 C 600 228, 620 260, 595 285 C 565 314, 458 310, 430 278 C 412 256, 404 256, 420 240 Z"
          fill="#C98B3E"
        />
        <path
          d="M450 246 C 468 222, 510 216, 536 228 C 560 240, 574 262, 558 278 C 542 294, 476 292, 458 274"
          fill="none"
          stroke="#F2D18C"
          strokeWidth="6"
          opacity="0.55"
          strokeLinecap="round"
        />
      </g>

      <g filter="url(#softShadow)">
        <path d="M650 190 C 650 165, 700 165, 700 190 L 690 250 C 686 270, 664 270, 660 250 Z" fill="url(#gold)" />
        <path d="M662 252 C 660 290, 690 290, 688 252" fill="url(#gold)" opacity="0.9" />
        <rect x="655" y="290" width="40" height="10" rx="5" fill="url(#gold)" opacity="0.9" />
      </g>

      <g filter="url(#softShadow)">
        <path d="M240 150 C 240 132, 270 132, 270 150 L 270 175 C 270 182, 265 188, 260 190 C 255 188, 240 182, 240 175 Z" fill="#1E293B" />
        <path d="M248 190 C 230 212, 232 265, 260 300 C 288 265, 290 212, 272 190 Z" fill="#0B1022" />
        <path d="M248 210 C 244 240, 248 262, 260 284 C 272 262, 276 240, 272 210" fill="#6B0F1A" opacity="0.9" />
        <rect x="244" y="156" width="22" height="10" rx="5" fill="url(#gold)" />
      </g>

      <path
        d="M160 90 C 220 40, 310 45, 360 88 C 395 118, 430 120, 460 104 C 490 120, 525 118, 560 88 C 610 45, 700 40, 760 90"
        stroke="url(#gold)"
        strokeWidth="4"
        opacity="0.55"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ShabbatScreenPreview() {
  // Force Shabbat mode for preview
  const shabbatTimes = calculateShabbatTimes();
  // Override to show as if it's Shabbat
  const previewTimes = {
    ...shabbatTimes,
    isShabbat: true,
    timeUntilEnd: shabbatTimes.shabbatEnd.getTime() - new Date().getTime(),
  };
  
  const [currentMessage, setCurrentMessage] = useState(0);
  const [countdown, setCountdown] = useState('');

   const timeUntilEnd = useMemo(() => {
     if (!previewTimes.isShabbat) return null;
     if (previewTimes.timeUntilEnd <= 0) return null;
     return formatCountdown(previewTimes.timeUntilEnd);
   }, [previewTimes.isShabbat, previewTimes.timeUntilEnd]);

  useEffect(() => {
    // Rotate messages every 10 seconds
    const messageInterval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % SHABBAT_MESSAGES.length);
    }, 10000);

    // Update countdown every second
    const countdownInterval = setInterval(() => {
      const newTimes = calculateShabbatTimes();
      const timeUntilEnd = newTimes.shabbatEnd.getTime() - new Date().getTime();
      if (timeUntilEnd > 0) {
        setCountdown(formatCountdown(timeUntilEnd));
      }
    }, 1000);

    // Initial countdown
    const timeUntilEnd = previewTimes.shabbatEnd.getTime() - new Date().getTime();
    if (timeUntilEnd > 0) {
      setCountdown(formatCountdown(timeUntilEnd));
    }

    return () => {
      clearInterval(messageInterval);
      clearInterval(countdownInterval);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#05060B] via-[#0B1022] to-[#05060B] text-[#F8F1D6]" dir="rtl">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[780px] -translate-x-1/2 rounded-full bg-[#D4AF37]/15 blur-[90px]" />
        <div className="absolute -bottom-56 right-[-120px] h-[520px] w-[520px] rounded-full bg-[#7C3AED]/10 blur-[90px]" />
        <div className="absolute -bottom-56 left-[-120px] h-[520px] w-[520px] rounded-full bg-[#0EA5E9]/10 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="w-full rounded-[36px] border border-[#D4AF37]/25 bg-white/5 p-8 shadow-[0_40px_120px_-60px_rgba(212,175,55,0.55)] backdrop-blur-xl md:p-10"
        >
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#0B1022]/60 px-4 py-2 text-xs font-black tracking-[0.22em] text-[#F6E6B4]">
              <Crown className="h-4 w-4 text-[#D4AF37]" />
              שבת המלכה
              <Sparkles className="h-4 w-4 text-[#F6E6B4]/80" />
            </div>

            <div className="space-y-3">
              <h1 className="text-5xl font-black tracking-tight text-[#FFF4CC] md:text-6xl">שבת שלום</h1>
              <p className="text-base font-bold text-[#F8F1D6]/75 md:text-lg">
                המערכת במנוחה. נחזור לפעול בעזרת השם אחרי צאת הכוכבים.
              </p>
            </div>

            <div className="w-full overflow-hidden rounded-3xl border border-[#D4AF37]/20 bg-gradient-to-b from-white/5 to-white/0 p-6">
              <ShabbatTableIllustration />
            </div>

            <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-center">
                <div className="text-sm font-black text-[#F8F1D6]/70">צאת הכוכבים</div>
                <div className="mt-2 text-4xl font-black text-[#D4AF37]">
                  {formatShabbatTime(previewTimes.shabbatEnd)}
                </div>
                {countdown && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <Sparkles className="text-[#F6E6B4]" size={18} />
                    <span className="text-sm font-black text-[#F8F1D6]/75">{countdown}</span>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-center">
                <div className="text-sm font-black text-[#F8F1D6]/70">זמן עד צאת הכוכבים</div>
                <div className="mt-2 text-4xl font-black text-[#FFF4CC]">
                  {timeUntilEnd || '—'}
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="w-full rounded-3xl border border-[#D4AF37]/20 bg-[#0B1022]/45 px-7 py-6 text-center"
            >
              <p className="text-lg font-bold leading-relaxed text-[#F8F1D6]/90">
                {SHABBAT_MESSAGES[currentMessage]}
              </p>
            </motion.div>

            <div className="text-[#F8F1D6]/60 text-sm font-bold">
              המערכת תחזור לפעול אוטומטית אחרי צאת הכוכבים
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

