'use client';

import { Moon, Calendar, Lock, Unlock } from 'lucide-react';

// ── Shabbat Mockup ───────────────────────────────────────────────────────────
function ShabbatMockup() {
  return (
    <div className="relative rounded-2xl overflow-hidden select-none" dir="rtl">
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="text-white/90 text-sm font-bold mb-1">שומרת שבת</div>
          <div className="text-white/50 text-xs">אוטומטית לפי מיקום</div>
        </div>

        {/* Timeline - רק 2 אירועים מרכזיים */}
        <div className="space-y-4">
          {/* כניסת שבת */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.06] border border-white/[0.08]">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center flex-shrink-0">
              <Lock size={18} className="text-indigo-300" />
            </div>
            <div className="flex-1">
              <div className="text-white text-sm font-bold">נעילה</div>
              <div className="text-white/40 text-xs mt-0.5">כניסת שבת</div>
            </div>
            <div className="text-white/70 text-lg font-mono tabular-nums">16:52</div>
          </div>

          {/* צאת שבת */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.06] border border-white/[0.08]">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
              <Unlock size={18} className="text-emerald-300" />
            </div>
            <div className="flex-1">
              <div className="text-white text-sm font-bold">פתיחה</div>
              <div className="text-white/40 text-xs mt-0.5">צאת שבת</div>
            </div>
            <div className="text-white/70 text-lg font-mono tabular-nums">17:55</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Hebrew Calendar Mockup ───────────────────────────────────────────────────
function HebrewCalendarMockup() {
  return (
    <div className="relative rounded-2xl overflow-hidden select-none" dir="rtl">
      <div className="bg-gradient-to-br from-slate-900 to-amber-950/80 p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="text-white/90 text-sm font-bold mb-1">לוח עברי</div>
          <div className="text-white/50 text-xs">אדר ב׳ תשפ״ה • מרץ 2025</div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'].map((d, i) => (
            <div key={d} className={`text-center text-xs font-bold ${i === 6 ? 'text-indigo-400' : 'text-white/30'}`}>{d}</div>
          ))}
        </div>

        {/* Calendar grid - פשוט וממוקד */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty offset */}
          {Array.from({ length: 6 }).map((_, i) => <div key={`e-${i}`} />)}

          {/* Days 1-21 */}
          {Array.from({ length: 21 }, (_, i) => i + 1).map((d) => {
            const isShabbat = d === 1 || d === 8 || d === 15;
            const isPurim = d === 14;
            const isToday = d === 8;
            const hebrewNumerals = ['', 'א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ז׳', 'ח׳', 'ט׳', 'י׳', 'י״א', 'י״ב', 'י״ג', 'י״ד', 'ט״ו', 'ט״ז', 'י״ז', 'י״ח', 'י״ט', 'כ׳', 'כ״א'];
            return (
              <div
                key={d}
                className={`text-center rounded-lg py-2 text-xs font-bold transition-all
                  ${isToday ? 'bg-amber-500 text-white' : ''}
                  ${isPurim && !isToday ? 'bg-violet-500/30 text-violet-200' : ''}
                  ${isShabbat && !isToday ? 'text-indigo-300' : ''}
                  ${!isToday && !isShabbat && !isPurim ? 'text-white/40' : ''}
                `}
              >
                {hebrewNumerals[d]}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Section ─────────────────────────────────────────────────────────────
export function LandingIsraeliDifferentiatorsSection() {
  return (
    <section className="relative py-24 sm:py-32 bg-slate-50" dir="rtl">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 leading-tight">
            בנוי לעסק הישראלי
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            לא מתורגם. בנוי מהיסוד עם שבת, לוח עברי וחגים.
          </p>
        </div>

        {/* Two cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: Shabbat Mode */}
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Moon size={24} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">שומרת שבת</h3>
                <p className="text-sm text-slate-500">נעילה ופתיחה אוטומטית</p>
              </div>
            </div>

            <p className="text-slate-600 text-base leading-relaxed mb-8">
              המערכת ננעלת בכניסת שבת וחוזרת בצאת שבת. הזמנים מחושבים אוטומטית לפי המיקום שלכם.
            </p>

            {/* Mockup */}
            <div className="rounded-xl overflow-hidden shadow-lg">
              <ShabbatMockup />
            </div>
          </div>

          {/* Card 2: Hebrew Calendar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Calendar size={24} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">לוח עברי מובנה</h3>
                <p className="text-sm text-slate-500">חגים וזמנים</p>
              </div>
            </div>

            <p className="text-slate-600 text-base leading-relaxed mb-8">
              תאריך עברי לצד תאריך לועזי בכל מקום במערכת. חגים, צומות וראשי חודשים מסומנים אוטומטית.
            </p>

            {/* Mockup */}
            <div className="rounded-xl overflow-hidden shadow-lg">
              <HebrewCalendarMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
