'use client';

import { Moon, Sun, Calendar, Lock, Unlock, Star, CheckCircle2, Globe2, Shield, Sparkles } from 'lucide-react';

// ── Hebrew numeral conversion ────────────────────────────────────────────────
const GEMATRIA_UNITS = ['', 'א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ז׳', 'ח׳', 'ט׳'];
const GEMATRIA_TENS  = ['', 'י׳', 'כ׳', 'ל׳'];
function toHebrewNumeral(n: number): string {
  if (n === 15) return 'ט״ו';
  if (n === 16) return 'ט״ז';
  if (n <= 0 || n > 30) return String(n);
  const tens = Math.floor(n / 10);
  const units = n % 10;
  const t = GEMATRIA_TENS[tens] ?? '';
  const u = GEMATRIA_UNITS[units] ?? '';
  if (t && u) return `${t.replace('׳', '')}${u.replace('׳', '')}`;
  return t || u;
}

// ── Shabbat timeline data ────────────────────────────────────────────────────
const SHABBAT_TIMELINE = [
  { time: '16:32', label: 'הדלקת נרות', sub: 'ירושלים', icon: Sparkles, accent: 'from-amber-400 to-orange-400', ring: 'ring-amber-200' },
  { time: '16:52', label: 'כניסת שבת', sub: 'המערכת ננעלת', icon: Lock, accent: 'from-indigo-500 to-violet-600', ring: 'ring-indigo-300' },
  { time: '17:55', label: 'צאת שבת', sub: 'רבנו תם', icon: Sun, accent: 'from-amber-500 to-yellow-400', ring: 'ring-amber-200' },
  { time: '17:56', label: 'המערכת חוזרת', sub: 'אוטומטית', icon: Unlock, accent: 'from-emerald-500 to-teal-500', ring: 'ring-emerald-200' },
];

// ── Holiday data ─────────────────────────────────────────────────────────────
const HOLIDAYS = [
  { heb: 'א׳ תשרי', name: 'ראש השנה', accent: 'bg-amber-500' },
  { heb: 'י׳ תשרי', name: 'יום כיפור', accent: 'bg-indigo-500' },
  { heb: 'ט״ו תשרי', name: 'סוכות', accent: 'bg-emerald-500' },
  { heb: 'כ״ה כסלו', name: 'חנוכה', accent: 'bg-sky-500' },
];

// ── Calendar day data for Adar ───────────────────────────────────────────────
const ADAR_DAYS = Array.from({ length: 29 }, (_, i) => i + 1);
const ADAR_OFFSET = 6; // Adar 5785 starts on Shabbat (col 7, index 6)
const TODAY_ADAR = 8; // ח׳ אדר
const SHABBAT_DAYS = new Set([1, 8, 15, 22, 29]);
const PURIM_DAY = 14;

// ── Shabbat Mockup ───────────────────────────────────────────────────────────
function ShabbatMockup() {
  return (
    <div className="relative rounded-2xl overflow-hidden select-none" dir="rtl">
      {/* Glass card */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6">
        {/* Top row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Shield size={14} className="text-white" />
            </div>
            <span className="text-white/90 text-xs font-black tracking-wide">SHABBAT GUARD</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-300 text-[10px] font-black">פעיל</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-2.5">
          {SHABBAT_TIMELINE.map((event, i) => {
            const Icon = event.icon;
            const isLocked = i === 1;
            return (
              <div
                key={i}
                className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all
                  ${isLocked
                    ? 'bg-white/[0.08] border-indigo-400/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                    : 'bg-white/[0.04] border-white/[0.06]'
                  }`}
              >
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${event.accent} flex items-center justify-center shadow-lg ring-2 ${event.ring} ring-opacity-30 flex-shrink-0`}>
                  <Icon size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white/90 text-xs font-black leading-none">{event.label}</div>
                  <div className="text-white/40 text-[10px] font-bold mt-0.5">{event.sub}</div>
                </div>
                <div className="text-white/60 text-sm font-mono font-black tabular-nums">{event.time}</div>
                {/* Connector line */}
                {i < SHABBAT_TIMELINE.length - 1 && (
                  <div className="absolute left-1/2 -bottom-2.5 w-px h-2.5 bg-gradient-to-b from-white/10 to-transparent" />
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <Globe2 size={12} className="text-indigo-300 flex-shrink-0" />
          <span className="text-white/40 text-[10px] font-bold leading-snug">זמנים מחושבים אוטומטית לפי המיקום שלך</span>
        </div>
      </div>
    </div>
  );
}

// ── Hebrew Calendar Mockup ───────────────────────────────────────────────────
function HebrewCalendarMockup() {
  return (
    <div className="relative rounded-2xl overflow-hidden select-none" dir="rtl">
      <div className="bg-gradient-to-br from-slate-900 via-amber-950/80 to-slate-900 p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Calendar size={14} className="text-white" />
            </div>
            <div>
              <div className="text-white/90 text-xs font-black">אדר ב׳ תשפ״ה</div>
              <div className="text-white/40 text-[10px] font-bold">מרץ 2025</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/30">
            <Star size={10} className="text-amber-300 fill-amber-300" />
            <span className="text-amber-300 text-[10px] font-black">לוח עברי</span>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'].map((d, i) => (
            <div key={d} className={`text-center text-[10px] font-black py-1.5 ${i === 6 ? 'text-indigo-300' : 'text-white/30'}`}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {/* Empty offset cells */}
          {Array.from({ length: ADAR_OFFSET }).map((_, i) => (
            <div key={`e-${i}`} />
          ))}
          {/* Day cells */}
          {ADAR_DAYS.map((d) => {
            const isToday = d === TODAY_ADAR;
            const isShabbat = SHABBAT_DAYS.has(d);
            const isPurim = d === PURIM_DAY;
            const colIndex = (d + ADAR_OFFSET - 1) % 7;
            const isShabCol = colIndex === 6;
            return (
              <div
                key={d}
                className={`relative text-center rounded-lg py-1.5 text-[11px] font-bold transition-all
                  ${isToday ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30 ring-2 ring-amber-300/40' : ''}
                  ${isPurim && !isToday ? 'bg-violet-500/20 text-violet-300 border border-violet-400/30' : ''}
                  ${(isShabbat || isShabCol) && !isToday && !isPurim ? 'text-indigo-300/80 bg-indigo-500/10' : ''}
                  ${!isToday && !isShabbat && !isShabCol && !isPurim ? 'text-white/50 hover:bg-white/[0.06]' : ''}
                `}
              >
                {toHebrewNumeral(d)}
                {isPurim && !isToday && <div className="absolute -top-0.5 -left-0.5 w-2 h-2 rounded-full bg-violet-400" />}
              </div>
            );
          })}
        </div>

        {/* Upcoming holidays */}
        <div className="space-y-1.5">
          {HOLIDAYS.slice(0, 2).map((h, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-xl">
              <div className={`w-2 h-2 rounded-full ${h.accent} flex-shrink-0`} />
              <div className="flex-1">
                <span className="text-white/80 text-[11px] font-black">{h.name}</span>
              </div>
              <span className="text-white/30 text-[10px] font-bold">{h.heb}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Section ─────────────────────────────────────────────────────────────
export function LandingIsraeliDifferentiatorsSection() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden" dir="rtl">
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/80 to-white" />

      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] bg-gradient-to-bl from-indigo-200/40 via-violet-200/20 to-transparent rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
        <div className="absolute -bottom-40 -left-40 w-[700px] h-[700px] bg-gradient-to-tr from-amber-200/40 via-orange-200/20 to-transparent rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-indigo-100/20 to-amber-100/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-600/10 to-amber-500/10 border border-indigo-200/60 mb-6 backdrop-blur-sm">
            <Globe2 size={16} className="text-indigo-600" />
            <span className="text-sm font-black text-indigo-700 tracking-wide">DNA ישראלי</span>
            <span className="w-1 h-1 rounded-full bg-amber-500" />
            <span className="text-sm font-black text-amber-700">לא תרגום</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight">
            בנוי לעסק הישראלי.
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-amber-600">
              לא מתורגם. לא מותאם. בנוי.
            </span>
          </h2>
          <p className="mt-5 text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium">
            המתחרים מתרגמים את המערכת שלהם לעברית. אנחנו בנינו מערכת שמבינה שבת, לוח עברי, חגים ומנהגים — כי זה ה-DNA שלנו.
          </p>
        </div>

        {/* Two premium cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">

          {/* Card 1: Shabbat Mode */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-indigo-500/20 rounded-[2rem] blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative bg-white/70 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 sm:p-10 shadow-[0_8px_60px_rgba(0,0,0,0.06)] h-full flex flex-col">
              {/* Icon + Badge */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <Moon size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-none">שומרת שבת</h3>
                  <p className="text-xs font-bold text-indigo-600 mt-0.5">נעילה ופתיחה אוטומטית</p>
                </div>
              </div>

              <p className="text-slate-500 text-sm sm:text-base leading-relaxed mb-6">
                ב-<strong className="text-slate-700">16:52</strong> המערכת ננעלת. ב-<strong className="text-slate-700">17:55</strong> היא חוזרת. בלי שתיגעו בכלום. הזמנים מחושבים לפי המיקום שלכם — ירושלים, תל אביב, חיפה — אוטומטית.
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {['זמני הלכה', 'לפי מיקום', 'חגים + שבתות', 'חריגי פיקוח נפש'].map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-50/80 border border-indigo-100 text-[11px] font-black text-indigo-700">
                    <CheckCircle2 size={10} />
                    {tag}
                  </span>
                ))}
              </div>

              {/* Mockup */}
              <div className="mt-auto rounded-2xl overflow-hidden shadow-2xl shadow-indigo-900/10 ring-1 ring-white/20">
                <ShabbatMockup />
              </div>
            </div>
          </div>

          {/* Card 2: Hebrew Calendar */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-amber-500/20 rounded-[2rem] blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative bg-white/70 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 sm:p-10 shadow-[0_8px_60px_rgba(0,0,0,0.06)] h-full flex flex-col">
              {/* Icon + Badge */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <Calendar size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-none">לוח עברי מובנה</h3>
                  <p className="text-xs font-bold text-amber-600 mt-0.5">חגים, מועדים, ראשי חודשים</p>
                </div>
              </div>

              <p className="text-slate-500 text-sm sm:text-base leading-relaxed mb-6">
                בכל מקום במערכת — <strong className="text-slate-700">ח׳ אדר ב׳ תשפ״ה</strong> מופיע לצד 8 מרץ 2025. חגים, צומות, ראשי חודשים — הכל בנוי פנימה, בלי תוספים, בלי הגדרות.
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {['תאריך כפול', 'כל החגים', 'שנה מעוברת', 'ראשי חודשים'].map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-50/80 border border-amber-100 text-[11px] font-black text-amber-700">
                    <CheckCircle2 size={10} />
                    {tag}
                  </span>
                ))}
              </div>

              {/* Mockup */}
              <div className="mt-auto rounded-2xl overflow-hidden shadow-2xl shadow-amber-900/10 ring-1 ring-white/20">
                <HebrewCalendarMockup />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="mt-16 sm:mt-20 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 px-8 py-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 shadow-2xl shadow-indigo-950/20">
            <div className="flex items-center gap-2.5">
              <Moon size={18} className="text-indigo-300" />
              <span className="text-sm font-black text-white/80">המתחרים מציעים תרגום לעברית.</span>
            </div>
            <div className="hidden sm:block w-px h-5 bg-white/10" />
            <div className="flex items-center gap-2.5">
              <Star size={18} className="text-amber-400 fill-amber-400" />
              <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-300">אנחנו בנינו מערכת ישראלית מהיסוד.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
