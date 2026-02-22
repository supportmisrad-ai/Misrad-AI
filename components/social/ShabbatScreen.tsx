'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, Star, Shield } from 'lucide-react';
import { useShabbat } from '@/hooks/useShabbat';
import { formatShabbatTime, formatCountdown } from '@/lib/shabbat';
import { Skeleton } from '@/components/ui/skeletons';
import { useSecondTicker } from '@/hooks/useSecondTicker';

const SHABBAT_MESSAGES = [
  "השבת היא זמן של שקט, כבוד ואור. נצלו את הרגע להיות יחד — ונחזור עם צאת השבת.",
  "אנו מאמינים שמקור הברכה בפרנסה הוא דווקא יום המנוחה בשבת — רוגע ומרפא לנפש כדי שנוכל להתחיל שבוע מלא באנרגיות",
  "השבת מזכירה לנו שהערך שלנו לא נמדד רק במה שאנחנו עושים, אלא גם במה שאנחנו",
  "השבת היא מתנה — זמן לעצור, לנשום, ולהטען מחדש לשבוע הבא",
  "אנו מאמינים שהצלחה אמיתית מגיעה משילוב של עבודה קשה ומנוחה משמעותית",
  "״שֵׁשֶׁת יָמִים תַּעֲבֹד וּבַיּוֹם הַשְּׁבִיעִי תִּשְׁבֹּת״ — כבוד השבת הוא יסוד ההצלחה",
];

function FloatingStars() {
  const stars = useMemo(() => Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 2.5,
    delay: Math.random() * 8,
    duration: 3 + Math.random() * 4,
  })), []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map(s => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-[#F6E6B4]"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
          animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function ShabbatTableIllustration() {
  return (
    <svg
      viewBox="0 0 920 420"
      className="w-full h-auto"
      role="img"
      aria-label="שולחן שבת עם חלות, נרות, גביע ויין"
    >
      <defs>
        <linearGradient id="s2-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F6E6B4" />
          <stop offset="0.45" stopColor="#D4AF37" />
          <stop offset="1" stopColor="#FFF4CC" />
        </linearGradient>
        <linearGradient id="s2-velvet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0B1022" />
          <stop offset="0.6" stopColor="#151B34" />
          <stop offset="1" stopColor="#090D1B" />
        </linearGradient>
        <radialGradient id="s2-candleGlow" cx="50%" cy="35%" r="70%">
          <stop offset="0" stopColor="#FFD78A" stopOpacity="1" />
          <stop offset="0.35" stopColor="#FFD78A" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFD78A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="s2-candleGlow2" cx="50%" cy="20%" r="80%">
          <stop offset="0" stopColor="#FFBA42" stopOpacity="0.4" />
          <stop offset="1" stopColor="#FFBA42" stopOpacity="0" />
        </radialGradient>
        <filter id="s2-softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.45 0" />
        </filter>
        <filter id="s2-flameGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="glow" />
          <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <path d="M80 290 C 180 250, 320 240, 460 250 C 600 260, 720 250, 840 290 L 840 360 C 700 405, 220 405, 80 360 Z" fill="url(#s2-velvet)" />
      <path d="M120 298 C 210 270, 320 262, 460 270 C 600 278, 705 270, 800 298" stroke="url(#s2-gold)" strokeWidth="3" opacity="0.8" fill="none" />

      <circle cx="330" cy="130" r="90" fill="url(#s2-candleGlow2)" />
      <circle cx="390" cy="130" r="90" fill="url(#s2-candleGlow2)" />
      <circle cx="330" cy="150" r="70" fill="url(#s2-candleGlow)">
        <animate attributeName="r" values="68;72;68" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;1;0.9" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="390" cy="150" r="70" fill="url(#s2-candleGlow)">
        <animate attributeName="r" values="70;66;70" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.85;1" dur="3s" repeatCount="indefinite" />
      </circle>

      <g filter="url(#s2-softShadow)">
        <rect x="320" y="170" width="18" height="92" rx="9" fill="#F7F0E4" />
        <rect x="380" y="170" width="18" height="92" rx="9" fill="#F7F0E4" />
        <g filter="url(#s2-flameGlow)">
          <path d="M329 166 C 326 156, 332 149, 337 142 C 344 151, 346 160, 339 168 Z" fill="#FFCF6A">
            <animate attributeName="d" values="M329 166 C 326 156, 332 149, 337 142 C 344 151, 346 160, 339 168 Z;M329 166 C 325 154, 331 146, 337 138 C 345 149, 348 161, 339 168 Z;M329 166 C 326 156, 332 149, 337 142 C 344 151, 346 160, 339 168 Z" dur="1.8s" repeatCount="indefinite" />
          </path>
          <path d="M389 166 C 386 156, 392 149, 397 142 C 404 151, 406 160, 399 168 Z" fill="#FFCF6A">
            <animate attributeName="d" values="M389 166 C 386 156, 392 149, 397 142 C 404 151, 406 160, 399 168 Z;M389 166 C 385 153, 391 145, 397 137 C 405 148, 408 162, 399 168 Z;M389 166 C 386 156, 392 149, 397 142 C 404 151, 406 160, 399 168 Z" dur="2.2s" repeatCount="indefinite" />
          </path>
        </g>
        <path d="M329 170 C 329 162, 334 156, 337 152" stroke="#FFDFA0" strokeWidth="2" opacity="0.7" />
        <path d="M389 170 C 389 162, 394 156, 397 152" stroke="#FFDFA0" strokeWidth="2" opacity="0.7" />
      </g>

      <g filter="url(#s2-softShadow)">
        <ellipse cx="520" cy="250" rx="120" ry="40" fill="#2B1D12" opacity="0.35" />
        <path d="M420 240 C 450 200, 520 192, 560 210 C 600 228, 620 260, 595 285 C 565 314, 458 310, 430 278 C 412 256, 404 256, 420 240 Z" fill="#C98B3E" />
        <path d="M450 246 C 468 222, 510 216, 536 228 C 560 240, 574 262, 558 278 C 542 294, 476 292, 458 274" fill="none" stroke="#F2D18C" strokeWidth="6" opacity="0.55" strokeLinecap="round" />
        <path d="M470 252 C 484 236, 510 232, 528 240 C 546 248, 554 262, 545 272" fill="none" stroke="#8B5A25" strokeWidth="4" opacity="0.5" strokeLinecap="round" />
      </g>

      <g filter="url(#s2-softShadow)">
        <path d="M650 190 C 650 165, 700 165, 700 190 L 690 250 C 686 270, 664 270, 660 250 Z" fill="url(#s2-gold)" />
        <path d="M662 252 C 660 290, 690 290, 688 252" fill="url(#s2-gold)" opacity="0.9" />
        <rect x="655" y="290" width="40" height="10" rx="5" fill="url(#s2-gold)" opacity="0.9" />
        <path d="M660 205 C 665 195, 685 195, 690 205" stroke="#FFF5D8" strokeWidth="3" opacity="0.8" />
      </g>

      <g filter="url(#s2-softShadow)">
        <path d="M240 150 C 240 132, 270 132, 270 150 L 270 175 C 270 182, 265 188, 260 190 C 255 188, 240 182, 240 175 Z" fill="#1E293B" />
        <path d="M248 190 C 230 212, 232 265, 260 300 C 288 265, 290 212, 272 190 Z" fill="#0B1022" />
        <path d="M248 210 C 244 240, 248 262, 260 284 C 272 262, 276 240, 272 210" fill="#6B0F1A" opacity="0.9" />
        <path d="M250 234 C 246 252, 250 266, 260 280" stroke="#B91C1C" strokeWidth="3" opacity="0.35" />
        <rect x="244" y="156" width="22" height="10" rx="5" fill="url(#s2-gold)" />
      </g>

      <path d="M160 90 C 220 40, 310 45, 360 88 C 395 118, 430 120, 460 104 C 490 120, 525 118, 560 88 C 610 45, 700 40, 760 90" stroke="url(#s2-gold)" strokeWidth="4" opacity="0.55" fill="none" strokeLinecap="round" />
      <path d="M460 80 C 444 86, 436 98, 440 112 C 452 108, 460 98, 460 80 Z" fill="url(#s2-gold)" opacity="0.65" />
    </svg>
  );
}

function CountdownDisplay({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative group"
    >
      <div className="absolute inset-0 rounded-[28px] bg-gradient-to-b from-[#D4AF37]/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="relative rounded-[28px] border border-white/8 bg-white/[0.03] px-6 py-6 text-center backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Star className="h-3.5 w-3.5 text-[#D4AF37]/60" fill="currentColor" />
          <span className="text-xs font-black tracking-[0.2em] uppercase text-[#F8F1D6]/50">{label}</span>
          <Star className="h-3.5 w-3.5 text-[#D4AF37]/60" fill="currentColor" />
        </div>
        <div className={`text-4xl md:text-5xl font-black tracking-tight ${accent ? 'text-[#D4AF37]' : 'text-[#FFF4CC]'}`}
          style={{ textShadow: accent ? '0 0 40px rgba(212, 175, 55, 0.4)' : '0 0 40px rgba(255, 244, 204, 0.15)' }}
        >
          {value}
        </div>
      </div>
    </motion.div>
  );
}

export default function ShabbatScreen() {
  const { shabbatTimes, isLoading } = useShabbat();
  const now = useSecondTicker(Boolean(shabbatTimes));

  const timeUntilEnd = useMemo(() => {
    if (!shabbatTimes?.isShabbat) return null;
    const msLeft = shabbatTimes.shabbatEnd.getTime() - now;
    if (msLeft <= 0) return null;
    return formatCountdown(msLeft);
  }, [now, shabbatTimes]);

  const currentMessage = useMemo(() => {
    const idx = Math.floor(now / 12_000) % SHABBAT_MESSAGES.length;
    return idx;
  }, [now]);

  if (isLoading || !shabbatTimes) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#070A13] via-[#0B1022] to-[#070A13] text-[#F8F1D6]" dir="rtl">
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mx-auto w-14 h-14"
          >
            <Skeleton className="w-14 h-14 rounded-full bg-[#D4AF37]/20" />
          </motion.div>
          <p className="mt-4 text-lg font-bold text-[#F8F1D6]/80">טוען…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#040610] text-[#F8F1D6]" dir="rtl">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#05060B] via-[#0B1022] to-[#070A13]" />
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[#D4AF37]/12 blur-[120px]" />
        <div className="absolute top-1/3 right-[-200px] h-[400px] w-[400px] rounded-full bg-[#7C3AED]/6 blur-[100px]" />
        <div className="absolute top-1/3 left-[-200px] h-[400px] w-[400px] rounded-full bg-[#0EA5E9]/6 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 h-[300px] w-[700px] -translate-x-1/2 rounded-full bg-[#D4AF37]/8 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #F6E6B4 1px, transparent 0)', backgroundSize: '48px 48px' }} />
      </div>

      <FloatingStars />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full"
        >
          <div className="relative rounded-[40px] border border-[#D4AF37]/20 bg-white/[0.04] shadow-[0_40px_120px_-40px_rgba(212,175,55,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-xl overflow-hidden">
            <div className="absolute inset-[1px] rounded-[39px] border border-[#D4AF37]/8 pointer-events-none" />
            
            <div className="relative px-6 sm:px-10 md:px-14 py-10 md:py-14">
              <div className="flex flex-col items-center gap-8 text-center">
                
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
                  <div className="inline-flex items-center gap-2.5 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/8 px-5 py-2.5 backdrop-blur-sm">
                    <Crown className="h-4 w-4 text-[#D4AF37]" />
                    <span className="text-xs font-black tracking-[0.25em] uppercase text-[#F6E6B4]">שבת המלכה</span>
                    <Sparkles className="h-4 w-4 text-[#F6E6B4]/70" />
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="space-y-4">
                  <h1 
                    className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight text-[#FFF4CC]"
                    style={{ textShadow: '0 0 80px rgba(212, 175, 55, 0.3), 0 4px 20px rgba(0, 0, 0, 0.5)' }}
                  >
                    שבת שלום
                  </h1>
                  <p className="text-base sm:text-lg font-bold text-[#F8F1D6]/65 max-w-lg mx-auto leading-relaxed">
                    המערכת במנוחה. נחזור לפעול בעזרת השם אחרי צאת הכוכבים.
                  </p>
                </motion.div>

                <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: 0.4, duration: 0.8 }} className="flex items-center gap-3 w-full max-w-xs">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
                  <Star className="h-3 w-3 text-[#D4AF37]/50" fill="currentColor" />
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.7 }}
                  className="w-full overflow-hidden rounded-[28px] border border-[#D4AF37]/12 bg-gradient-to-b from-white/[0.04] to-transparent p-4 sm:p-6 md:p-8"
                >
                  <ShabbatTableIllustration />
                </motion.div>

                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                  <CountdownDisplay label="צאת הכוכבים" value={formatShabbatTime(shabbatTimes.shabbatEnd)} accent />
                  <CountdownDisplay label="זמן עד צאת הכוכבים" value={timeUntilEnd || '—'} />
                </div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.5 }}
                  className="w-full rounded-[24px] border border-[#D4AF37]/15 bg-gradient-to-b from-[#D4AF37]/[0.04] to-transparent px-6 sm:px-8 py-6 sm:py-7 text-center backdrop-blur-sm"
                >
                  <AnimatePresence mode="wait">
                    <motion.p key={currentMessage} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.5 }}
                      className="text-base sm:text-lg font-bold leading-relaxed text-[#F8F1D6]/80"
                    >
                      {SHABBAT_MESSAGES[currentMessage]}
                    </motion.p>
                  </AnimatePresence>
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.5 }} className="flex items-center gap-2 pt-2">
                  <Shield className="h-3.5 w-3.5 text-[#D4AF37]/40" />
                  <span className="text-xs font-bold text-[#F8F1D6]/40 tracking-wide">המערכת תחזור לפעול אוטומטית אחרי צאת הכוכבים</span>
                  <Shield className="h-3.5 w-3.5 text-[#D4AF37]/40" />
                </motion.div>

              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
