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
      viewBox="0 0 800 400"
      className="w-full h-auto"
      role="img"
      aria-label="שולחן שבת עם חלות, נרות, גביע ויין"
    >
      <defs>
        <linearGradient id="s2-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F6E6B4" />
          <stop offset="0.5" stopColor="#D4AF37" />
          <stop offset="1" stopColor="#FFF4CC" />
        </linearGradient>
        <linearGradient id="s2-goldV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF4CC" />
          <stop offset="1" stopColor="#C5982E" />
        </linearGradient>
        <linearGradient id="s2-cloth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F8F4EE" />
          <stop offset="1" stopColor="#E8DFD0" />
        </linearGradient>
        <linearGradient id="s2-candle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFDF5" />
          <stop offset="0.3" stopColor="#FBF5E8" />
          <stop offset="1" stopColor="#EDE4D0" />
        </linearGradient>
        <linearGradient id="s2-wine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4A0E1B" />
          <stop offset="0.5" stopColor="#6B1525" />
          <stop offset="1" stopColor="#3D0A15" />
        </linearGradient>
        <linearGradient id="s2-wineBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1A1A2E" />
          <stop offset="0.5" stopColor="#16213E" />
          <stop offset="1" stopColor="#0F0F23" />
        </linearGradient>
        <linearGradient id="s2-challah" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E8A942" />
          <stop offset="0.4" stopColor="#C98B3E" />
          <stop offset="1" stopColor="#A06A28" />
        </linearGradient>
        <linearGradient id="s2-cup" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#F6E6B4" />
          <stop offset="0.3" stopColor="#D4AF37" />
          <stop offset="0.7" stopColor="#C5982E" />
          <stop offset="1" stopColor="#E8D48A" />
        </linearGradient>
        <radialGradient id="s2-glow1" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FFD78A" stopOpacity="0.9" />
          <stop offset="0.4" stopColor="#FFD78A" stopOpacity="0.3" />
          <stop offset="1" stopColor="#FFD78A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="s2-glow2" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FFBA42" stopOpacity="0.6" />
          <stop offset="1" stopColor="#FFBA42" stopOpacity="0" />
        </radialGradient>
        <filter id="s2-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" />
        </filter>
        <filter id="s2-fglow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.5" result="g" />
          <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* === TABLECLOTH === */}
      <ellipse cx="400" cy="320" rx="340" ry="55" fill="#0D1225" opacity="0.6" />
      <ellipse cx="400" cy="310" rx="330" ry="50" fill="#111835" />
      <path d="M70 300 Q 400 230 730 300 L 720 340 Q 400 390 80 340 Z" fill="url(#s2-cloth)" opacity="0.12" />
      <ellipse cx="400" cy="300" rx="310" ry="38" fill="none" stroke="url(#s2-gold)" strokeWidth="2" opacity="0.5" />
      <ellipse cx="400" cy="300" rx="290" ry="32" fill="none" stroke="url(#s2-gold)" strokeWidth="1" opacity="0.2" />

      {/* === WINE BOTTLE (left) === */}
      <g filter="url(#s2-shadow)" transform="translate(145,0)">
        <rect x="42" y="115" width="16" height="50" rx="4" fill="url(#s2-wineBody)" />
        <rect x="44" y="108" width="12" height="12" rx="3" fill="url(#s2-gold)" />
        <path d="M34 165 C 34 158 42 155 42 155 L 42 165 Q 30 180 28 220 Q 26 260 50 290 Q 74 260 72 220 Q 70 180 58 165 L 58 155 C 58 155 66 158 66 165" fill="url(#s2-wineBody)" />
        <path d="M36 200 Q 34 240 50 278 Q 66 240 64 200 Q 56 190 50 190 Q 44 190 36 200" fill="url(#s2-wine)" opacity="0.7" />
        <rect x="36" y="225" width="28" height="32" rx="3" fill="#F6E6B4" opacity="0.25" />
        <rect x="40" y="232" width="20" height="3" rx="1" fill="#D4AF37" opacity="0.4" />
        <rect x="42" y="238" width="16" height="2" rx="1" fill="#D4AF37" opacity="0.3" />
        <rect x="44" y="243" width="12" height="2" rx="1" fill="#D4AF37" opacity="0.2" />
        <path d="M42 170 Q 40 200 42 260" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.15" strokeLinecap="round" />
      </g>

      {/* === LEFT CANDLE with holder === */}
      <g transform="translate(280,0)">
        <ellipse cx="50" cy="290" rx="24" ry="6" fill="url(#s2-goldV)" opacity="0.8" />
        <rect x="34" y="278" width="32" height="14" rx="4" fill="url(#s2-cup)" />
        <rect x="40" y="268" width="20" height="14" rx="3" fill="url(#s2-cup)" />
        <ellipse cx="50" cy="270" rx="12" ry="4" fill="url(#s2-gold)" opacity="0.6" />
        <rect x="42" y="155" width="16" height="118" rx="8" fill="url(#s2-candle)" />
        <path d="M44 160 L 44 268" stroke="#FFFFFF" strokeWidth="1" opacity="0.2" />
        <circle cx="50" cy="120" r="80" fill="url(#s2-glow2)" opacity="0.5">
          <animate attributeName="r" values="78;84;78" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="50" cy="130" r="40" fill="url(#s2-glow1)">
          <animate attributeName="r" values="38;42;38" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.85;1;0.85" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <g filter="url(#s2-fglow)">
          <path d="M50 152 C 44 142 44 130 50 118 C 56 130 56 142 50 152 Z" fill="#FFD966" opacity="0.95">
            <animate attributeName="d" values="M50 152 C 44 142 44 130 50 118 C 56 130 56 142 50 152 Z;M50 152 C 43 140 43 126 50 114 C 57 126 57 140 50 152 Z;M50 152 C 44 142 44 130 50 118 C 56 130 56 142 50 152 Z" dur="1.5s" repeatCount="indefinite" />
          </path>
          <path d="M50 150 C 47 144 47 136 50 128 C 53 136 53 144 50 150 Z" fill="#FFF3C4" opacity="0.9">
            <animate attributeName="d" values="M50 150 C 47 144 47 136 50 128 C 53 136 53 144 50 150 Z;M50 150 C 46 142 46 133 50 124 C 54 133 54 142 50 150 Z;M50 150 C 47 144 47 136 50 128 C 53 136 53 144 50 150 Z" dur="1.8s" repeatCount="indefinite" />
          </path>
        </g>
      </g>

      {/* === RIGHT CANDLE with holder === */}
      <g transform="translate(420,0)">
        <ellipse cx="50" cy="290" rx="24" ry="6" fill="url(#s2-goldV)" opacity="0.8" />
        <rect x="34" y="278" width="32" height="14" rx="4" fill="url(#s2-cup)" />
        <rect x="40" y="268" width="20" height="14" rx="3" fill="url(#s2-cup)" />
        <ellipse cx="50" cy="270" rx="12" ry="4" fill="url(#s2-gold)" opacity="0.6" />
        <rect x="42" y="155" width="16" height="118" rx="8" fill="url(#s2-candle)" />
        <path d="M44 160 L 44 268" stroke="#FFFFFF" strokeWidth="1" opacity="0.2" />
        <circle cx="50" cy="120" r="80" fill="url(#s2-glow2)" opacity="0.5">
          <animate attributeName="r" values="82;76;82" dur="3.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="50" cy="130" r="40" fill="url(#s2-glow1)">
          <animate attributeName="r" values="42;36;42" dur="2.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0.8;1" dur="2.8s" repeatCount="indefinite" />
        </circle>
        <g filter="url(#s2-fglow)">
          <path d="M50 152 C 44 142 44 130 50 118 C 56 130 56 142 50 152 Z" fill="#FFD966" opacity="0.95">
            <animate attributeName="d" values="M50 152 C 44 142 44 130 50 118 C 56 130 56 142 50 152 Z;M50 152 C 42 138 43 124 50 112 C 57 124 58 138 50 152 Z;M50 152 C 44 142 44 130 50 118 C 56 130 56 142 50 152 Z" dur="2s" repeatCount="indefinite" />
          </path>
          <path d="M50 150 C 47 144 47 136 50 128 C 53 136 53 144 50 150 Z" fill="#FFF3C4" opacity="0.9">
            <animate attributeName="d" values="M50 150 C 47 144 47 136 50 128 C 53 136 53 144 50 150 Z;M50 150 C 45 141 45 131 50 122 C 55 131 55 141 50 150 Z;M50 150 C 47 144 47 136 50 128 C 53 136 53 144 50 150 Z" dur="2.3s" repeatCount="indefinite" />
          </path>
        </g>
      </g>

      {/* === CHALLAH (center) === */}
      <g filter="url(#s2-shadow)" transform="translate(340, 248)">
        <ellipse cx="60" cy="42" rx="65" ry="14" fill="#000" opacity="0.15" />
        <path d="M-10 38 Q 60 22 130 38 Q 125 48 60 50 Q -5 48 -10 38" fill="#F8F5EF" opacity="0.4" />
        <ellipse cx="60" cy="28" rx="58" ry="22" fill="url(#s2-challah)" />
        <path d="M10 24 Q 25 14 40 24 Q 55 34 70 24 Q 85 14 100 24" fill="none" stroke="#E8A942" strokeWidth="5" opacity="0.6" strokeLinecap="round" />
        <path d="M10 30 Q 25 20 40 30 Q 55 40 70 30 Q 85 20 100 30" fill="none" stroke="#B8862D" strokeWidth="4" opacity="0.5" strokeLinecap="round" />
        <path d="M15 18 Q 30 10 45 18 Q 60 26 75 18 Q 90 10 105 18" fill="none" stroke="#F2D18C" strokeWidth="3" opacity="0.4" strokeLinecap="round" />
        <circle cx="30" cy="18" r="1.5" fill="#F6E6B4" opacity="0.6" />
        <circle cx="50" cy="15" r="1.2" fill="#F6E6B4" opacity="0.5" />
        <circle cx="70" cy="17" r="1.5" fill="#F6E6B4" opacity="0.55" />
        <circle cx="88" cy="20" r="1.3" fill="#F6E6B4" opacity="0.5" />
        <circle cx="42" cy="22" r="1" fill="#F6E6B4" opacity="0.4" />
        <circle cx="78" cy="22" r="1.2" fill="#F6E6B4" opacity="0.45" />
        <ellipse cx="55" cy="18" rx="30" ry="8" fill="#FFFFFF" opacity="0.08" />
      </g>

      {/* === KIDDUSH CUP (right) === */}
      <g filter="url(#s2-shadow)" transform="translate(565,0)">
        <ellipse cx="50" cy="296" rx="28" ry="7" fill="url(#s2-goldV)" />
        <rect x="30" y="288" width="40" height="10" rx="5" fill="url(#s2-cup)" />
        <rect x="44" y="248" width="12" height="42" rx="4" fill="url(#s2-cup)" />
        <ellipse cx="50" cy="250" rx="8" ry="3" fill="url(#s2-gold)" opacity="0.5" />
        <path d="M24 195 C 24 170 76 170 76 195 L 72 248 C 68 256 32 256 28 248 Z" fill="url(#s2-cup)" />
        <path d="M30 200 C 30 188 70 188 70 200 L 68 235 C 65 240 35 240 32 235 Z" fill="#5C1020" opacity="0.7" />
        <ellipse cx="50" cy="200" rx="20" ry="8" fill="#7D1A2E" opacity="0.5" />
        <path d="M28 210 L 72 210" stroke="#F6E6B4" strokeWidth="1.5" opacity="0.35" />
        <path d="M30 220 L 70 220" stroke="#F6E6B4" strokeWidth="1" opacity="0.25" />
        <path d="M34 180 Q 32 210 34 240" stroke="#FFFFFF" strokeWidth="2" opacity="0.15" strokeLinecap="round" />
        <g transform="translate(42, 215) scale(0.8)" opacity="0.3">
          <polygon points="8,0 16,14 0,14" fill="none" stroke="#F6E6B4" strokeWidth="1.2" />
          <polygon points="8,16 0,2 16,2" fill="none" stroke="#F6E6B4" strokeWidth="1.2" />
        </g>
      </g>

      {/* === Decorative sparkles === */}
      <circle cx="220" cy="180" r="2" fill="#D4AF37" opacity="0.5">
        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="580" cy="160" r="1.5" fill="#D4AF37" opacity="0.4">
        <animate attributeName="opacity" values="0.2;0.6;0.2" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="680" cy="200" r="2" fill="#D4AF37" opacity="0.45">
        <animate attributeName="opacity" values="0.25;0.65;0.25" dur="3.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="130" cy="220" r="1.5" fill="#D4AF37" opacity="0.35">
        <animate attributeName="opacity" values="0.2;0.55;0.2" dur="5s" repeatCount="indefinite" />
      </circle>
      <circle cx="400" cy="80" r="2.5" fill="#F6E6B4" opacity="0.3">
        <animate attributeName="opacity" values="0.15;0.5;0.15" dur="4.5s" repeatCount="indefinite" />
      </circle>
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
                  <AnimatePresence mode="sync">
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
