'use client';

import { Moon, Sun, Shield, Lock, Star, CheckCircle2, Globe2, Calendar, Sparkles } from 'lucide-react';

// Hebrew gematria conversion — standard Jewish convention (15=ט״ו, 16=ט״ז to avoid divine name)
function toHeb(n: number): string {
  if (n === 15) return 'ט״ו';
  if (n === 16) return 'ט״ז';
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל'];
  if (n <= 9) return ones[n] + '׳';
  if (n % 10 === 0) return tens[n / 10] + '׳';
  return tens[Math.floor(n / 10)] + '״' + ones[n % 10];
}

// Month: אדר תשפ״ה — starts Thursday (4 empty cells: Sun Mon Tue Wed before day 1)
const MONTH_START_OFFSET = 4;
const MONTH_DAYS = 29;
const SHABBAT_DAYS = new Set([3, 10, 17, 24]);
const HOLIDAY_DAYS: Record<number, { name: string; color: string }> = {
  13: { name: 'תענית אסתר', color: 'text-violet-400' },
  14: { name: 'פורים', color: 'text-amber-400' },
  15: { name: 'שושן פורים', color: 'text-amber-400' },
};
const TODAY_DAY = 12; // כ״ג demo = 12 so we can see holidays coming up

type CalCell = { day: number | null; isShabbat: boolean; isToday: boolean; holiday?: { name: string; color: string } };

function buildCalCells(): CalCell[] {
  const cells: CalCell[] = [];
  for (let i = 0; i < MONTH_START_OFFSET; i++) cells.push({ day: null, isShabbat: false, isToday: false });
  for (let d = 1; d <= MONTH_DAYS; d++) {
    cells.push({ day: d, isShabbat: SHABBAT_DAYS.has(d), isToday: d === TODAY_DAY, holiday: HOLIDAY_DAYS[d] });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, isShabbat: false, isToday: false });
  return cells;
}

function HebrewCalendarCard() {
  const cells = buildCalCells();
  const weeks: CalCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="rounded-2xl bg-slate-800/60 border border-white/[0.08] overflow-hidden" dir="rtl">
      {/* Month header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <span className="text-amber-400 text-sm font-black tracking-wide">אדר תשפ״ה</span>
        <span className="text-slate-400 text-xs font-bold">March 2025</span>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-3 mb-1">
        {['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'].map((d, i) => (
          <div key={d} className={`text-center text-[10px] font-black py-1 ${i === 6 ? 'text-violet-400' : 'text-slate-500'}`}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="px-3 pb-3 space-y-0.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((cell, ci) => {
              if (!cell.day) return <div key={ci} />;
              const isHolidayDay = !!cell.holiday;
              return (
                <div
                  key={ci}
                  className={`
                    relative flex flex-col items-center justify-center rounded-lg py-1.5 mx-0.5
                    ${cell.isToday ? 'bg-amber-500 shadow-lg shadow-amber-500/30' : ''}
                    ${cell.isShabbat && !cell.isToday ? 'bg-violet-500/15' : ''}
                    ${isHolidayDay && !cell.isToday ? 'bg-amber-500/10' : ''}
                    ${!cell.isToday && !cell.isShabbat && !isHolidayDay ? 'hover:bg-white/5' : ''}
                  `}
                >
                  <span className={`text-[11px] font-black tabular-nums leading-none
                    ${cell.isToday ? 'text-white' : ''}
                    ${cell.isShabbat && !cell.isToday ? 'text-violet-300' : ''}
                    ${isHolidayDay && !cell.isToday ? cell.holiday!.color : ''}
                    ${!cell.isToday && !cell.isShabbat && !isHolidayDay ? 'text-slate-300' : ''}
                  `}>
                    {toHeb(cell.day)}
                  </span>
                  {isHolidayDay && !cell.isToday && (
                    <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Upcoming holidays */}
      <div className="border-t border-white/[0.06] px-4 py-3 space-y-1.5">
        {[
          { day: 14, label: 'פורים', sub: 'י״ד אדר', emoji: '🎭' },
          { day: 15, label: 'שושן פורים', sub: 'ט״ו אדר', emoji: '🌹' },
        ].map(h => (
          <div key={h.day} className="flex items-center gap-2.5">
            <span className="text-base leading-none">{h.emoji}</span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-black text-white/80">{h.label}</span>
              <span className="text-[10px] text-slate-500 font-bold">{h.sub}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShabbatTimelineCard() {
  return (
    <div className="rounded-2xl bg-slate-800/60 border border-white/[0.08] overflow-hidden" dir="rtl">
      {/* Status bar */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-black text-white/80">שמירת שבת פעילה</span>
        </div>
        <span className="text-xs text-slate-500 font-bold">תל אביב – יפו</span>
      </div>

      <div className="p-4 space-y-2">
        {/* Before Shabbat */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Sun size={16} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-black text-white/90">המערכת פעילה</div>
            <div className="text-[10px] text-slate-400 font-medium">שישי לפני כניסת שבת</div>
          </div>
          <span className="text-sm font-mono font-black text-emerald-400 tabular-nums">17:44</span>
        </div>

        {/* Shabbat enters — locked */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-500/15 border border-violet-500/30 relative overflow-hidden">
          <div className="absolute inset-0 backdrop-blur-[1px]" />
          <div className="relative w-9 h-9 rounded-xl bg-violet-500/25 flex items-center justify-center flex-shrink-0">
            <Lock size={16} className="text-violet-300" />
          </div>
          <div className="relative flex-1">
            <div className="text-xs font-black text-violet-200">המערכת נעולה — שבת</div>
            <div className="text-[10px] text-violet-400/80 font-medium">נעילה אוטומטית</div>
          </div>
          <span className="relative text-sm font-mono font-black text-violet-300 tabular-nums">17:45</span>
        </div>

        {/* Shabbat out */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/50 border border-white/[0.06]">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <Moon size={16} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-black text-white/70">יציאת שבת</div>
            <div className="text-[10px] text-slate-500 font-medium">מוצאי שבת</div>
          </div>
          <span className="text-sm font-mono font-black text-slate-400 tabular-nums">19:05</span>
        </div>

        {/* Back online */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-black text-white/90">המערכת חוזרת לפעולה</div>
            <div className="text-[10px] text-slate-400 font-medium">כל הנתונים שמורים</div>
          </div>
          <span className="text-sm font-mono font-black text-emerald-400 tabular-nums">19:06</span>
        </div>
      </div>

      <div className="border-t border-white/[0.06] px-4 py-2.5 flex items-center gap-2">
        <Shield size={12} className="text-slate-500 flex-shrink-0" />
        <p className="text-[10px] text-slate-500 font-medium">זמנים מחושבים לפי מיקום — ללא הגדרה ידנית</p>
      </div>
    </div>
  );
}

export function LandingIsraeliDifferentiatorsSection() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden bg-slate-950" dir="rtl">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-[600px] h-[600px] bg-amber-500/8 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(99,102,241,0.06),transparent)]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative">

        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6">
            <Globe2 size={13} className="text-indigo-400" />
            <span className="text-[11px] font-black text-white/60 tracking-widest uppercase">בנוי לעסק הישראלי</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-[1.08] tracking-tight">
            פיצ'רים שאף<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-amber-400">מתחרה לא מציע.</span>
          </h2>
          <p className="mt-5 text-lg text-white/40 max-w-xl mx-auto leading-relaxed">
            זה לא תרגום. זה לא פלאגין. זה מערכת שנולדה ישראלית — עם שבת ולוח עברי בליבה.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

          {/* Shabbat card */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-indigo-600/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative rounded-3xl bg-slate-900 border border-white/[0.07] p-8 h-full flex flex-col overflow-hidden">
              {/* Corner glow */}
              <div className="absolute top-0 right-0 w-[300px] h-[200px] bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/15 border border-violet-500/25 mb-6">
                  <Moon size={13} className="text-violet-400" />
                  <span className="text-xs font-black text-violet-300">מערכת שומרת שבת</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3">
                  שבת נכנסת —<br />
                  <span className="text-violet-400">המערכת נועלת.</span>
                </h3>
                <p className="text-white/50 text-sm leading-relaxed mb-6 max-w-sm">
                  ללא הגדרות. ללא תזכורות. Misrad AI מחשבת כניסת ושבת לפי מיקום העסק ונועלת אוטומטית — ומתעוררת כשהשבת יוצאת.
                </p>

                <div className="flex flex-wrap gap-2 mb-7">
                  {['זמנים לפי GPS', 'נעילה אוטומטית', 'חריגים בהגדרות', 'ללא הגדרה ידנית'].map((t) => (
                    <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-bold text-white/60">
                      <CheckCircle2 size={10} className="text-emerald-400" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-auto">
                <ShabbatTimelineCard />
              </div>
            </div>
          </div>

          {/* Hebrew Calendar card */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-600/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative rounded-3xl bg-slate-900 border border-white/[0.07] p-8 h-full flex flex-col overflow-hidden">
              {/* Corner glow */}
              <div className="absolute top-0 left-0 w-[300px] h-[200px] bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/25 mb-6">
                  <Calendar size={13} className="text-amber-400" />
                  <span className="text-xs font-black text-amber-300">לוח עברי מובנה</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3">
                  תאריכים עבריים.<br />
                  <span className="text-amber-400">חגים. מועדים. תמיד.</span>
                </h3>
                <p className="text-white/50 text-sm leading-relaxed mb-6 max-w-sm">
                  הלוח העברי אינטגרלי — לא חיצוני. כל תאריך, כל חג, כל ראש חודש — מוצגים בכל מקום במערכת. בגימטריה אמיתית.
                </p>

                <div className="flex flex-wrap gap-2 mb-7">
                  {['גימטריה אמיתית', 'כל החגים', 'ראשי חודשים', 'שנה מעוברת'].map((t) => (
                    <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-bold text-white/60">
                      <CheckCircle2 size={10} className="text-emerald-400" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-auto">
                <HebrewCalendarCard />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom differentiator strip */}
        <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <span className="text-sm">✕</span>
            </div>
            <span className="text-sm text-white/40 font-bold">המתחרים מציעים תרגום לעברית</span>
          </div>
          <div className="hidden sm:block w-px h-8 bg-white/[0.07]" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Sparkles size={14} className="text-emerald-400" />
            </div>
            <span className="text-sm text-white/80 font-black">אנחנו בנינו מערכת ישראלית מהיסוד</span>
          </div>
        </div>
      </div>
    </section>
  );
}
