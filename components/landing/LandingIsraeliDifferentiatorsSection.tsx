'use client';

import { Moon, Sun, Calendar, Clock, Star, CheckCircle2, Globe2, Shield } from 'lucide-react';

const HEBREW_MONTHS = ['תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר', 'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול'];

const SHABBAT_EVENTS = [
  { time: '17:44', label: 'כניסת שבת', icon: Moon, color: 'text-indigo-600', bg: 'bg-indigo-50', locked: false },
  { time: '17:45', label: 'המערכת נעולה', icon: Shield, color: 'text-violet-600', bg: 'bg-violet-50', locked: true },
  { time: '19:05', label: 'יציאת שבת', icon: Sun, color: 'text-amber-600', bg: 'bg-amber-50', locked: false },
  { time: '19:06', label: 'המערכת חוזרת לפעולה', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', locked: false },
];

const HOLIDAYS = [
  { date: 'א׳ תשרי', name: 'ראש השנה', emoji: '🍯' },
  { date: 'י׳ תשרי', name: 'יום כיפור', emoji: '✡️' },
  { date: 'ט״ו ניסן', name: 'פסח', emoji: '🌾' },
  { date: 'ו׳ סיון', name: 'שבועות', emoji: '📜' },
];

function ShabbatMockup() {
  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden select-none" dir="rtl">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 flex items-center justify-between">
        <span className="text-white text-sm font-black">Misrad AI</span>
        <span className="text-indigo-200 text-xs font-bold">שמירת שבת פעילה</span>
      </div>

      <div className="p-4 space-y-2">
        {SHABBAT_EVENTS.map((event, i) => {
          const Icon = event.icon;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${event.locked ? 'bg-violet-50 border border-violet-200' : 'bg-slate-50 border border-slate-100'}`}
            >
              <div className={`w-8 h-8 rounded-lg ${event.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={15} className={event.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-black ${event.locked ? 'text-violet-700' : 'text-slate-700'}`}>{event.label}</div>
              </div>
              <div className={`text-xs font-mono font-bold tabular-nums ${event.locked ? 'text-violet-500' : 'text-slate-400'}`}>{event.time}</div>
            </div>
          );
        })}
      </div>

      <div className="mx-4 mb-4 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-indigo-500 flex-shrink-0" />
          <p className="text-[11px] text-indigo-700 font-bold leading-snug">
            זמנים מחושבים אוטומטית לפי מיקום העסק. לא צריך להגדיר שום דבר.
          </p>
        </div>
      </div>
    </div>
  );
}

function HebrewCalendarMockup() {
  const todayHebrew = 'כ״ג אדר תשפ״ה';
  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden select-none" dir="rtl">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 flex items-center justify-between">
        <span className="text-white text-sm font-black">לוח עברי מובנה</span>
        <span className="flex items-center gap-1.5 text-amber-100 text-xs font-bold">
          <Star size={12} className="fill-amber-100" />
          {todayHebrew}
        </span>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-3">
          {['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'].map((d, i) => (
            <div key={d} className={`text-center text-[10px] font-black py-1 ${i === 6 ? 'text-indigo-600' : 'text-slate-400'}`}>{d}</div>
          ))}
          {[...Array(4)].map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map((d) => {
            const isToday = d === 16;
            const isShabbat = [7, 14, 21].includes(d);
            const isHoliday = d === 15;
            return (
              <div
                key={d}
                className={`text-center rounded-lg py-1.5 text-[11px] font-bold transition-all
                  ${isToday ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm' : ''}
                  ${isShabbat && !isToday ? 'text-indigo-500 bg-indigo-50' : ''}
                  ${isHoliday && !isToday ? 'text-amber-600 bg-amber-50' : ''}
                  ${!isToday && !isShabbat && !isHoliday ? 'text-slate-600 hover:bg-slate-50' : ''}
                `}
              >
                {d}
              </div>
            );
          })}
        </div>

        <div className="space-y-1.5">
          {HOLIDAYS.slice(0, 2).map((h, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
              <span className="text-base">{h.emoji}</span>
              <div>
                <div className="text-[11px] font-black text-amber-800">{h.name}</div>
                <div className="text-[10px] text-amber-600 font-bold">{h.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingIsraeliDifferentiatorsSection() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden bg-gradient-to-b from-slate-50 to-white" dir="rtl">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-indigo-100/60 via-violet-100/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-amber-100/60 via-orange-100/30 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-50 to-amber-50 border border-indigo-200 mb-5">
            <Globe2 size={15} className="text-indigo-600" />
            <span className="text-xs font-black text-indigo-700 tracking-wide">בנוי לעסק הישראלי</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
            פיצ'רים שרק <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Misrad AI</span> מציע
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            המתחרים לא מכירים את השוק הישראלי. אנחנו בנינו את המערכת מהיסוד בשביל עסקים שעובדים לפי הלוח העברי ושומרים שבת.
          </p>
        </div>

        {/* Two feature cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">

          {/* Card 1: Shabbat Mode */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500" />
            <div className="relative bg-white/80 backdrop-blur-sm border border-indigo-100 rounded-3xl p-7 sm:p-8 shadow-xl h-full flex flex-col">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-black w-fit mb-5">
                <Moon size={12} />
                מערכת שומרת שבת
              </div>

              <h3 className="text-2xl font-black text-slate-900 mb-2">
                שבת נכנסת — המערכת נועלת.
                <span className="block text-indigo-600">שבת יוצאת — המערכת חוזרת.</span>
              </h3>

              <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
                Misrad AI יודעת אוטומטית מתי נכנסת ויוצאת שבת לפי מיקום העסק שלכם — ללא הגדרות, ללא טעויות. מתאימה לכל עסק כשר, מלבד חריגים רפואיים ופיקוח נפש.
              </p>

              <div className="flex flex-wrap gap-2 mb-7">
                {[
                  'זמנים לפי מיקום גיאוגרפי',
                  'נעילה אוטומטית',
                  'חריגים בהגדרות',
                  'ללא הגדרה ידנית',
                ].map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700">
                    <CheckCircle2 size={11} />
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-auto">
                <ShabbatMockup />
              </div>
            </div>
          </div>

          {/* Card 2: Hebrew Calendar */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500" />
            <div className="relative bg-white/80 backdrop-blur-sm border border-amber-100 rounded-3xl p-7 sm:p-8 shadow-xl h-full flex flex-col">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500 text-white text-xs font-black w-fit mb-5">
                <Calendar size={12} />
                לוח עברי מובנה
              </div>

              <h3 className="text-2xl font-black text-slate-900 mb-2">
                תאריכים עבריים.
                <span className="block text-amber-600">חגים. מועדים. אוטומטית.</span>
              </h3>

              <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
                המערכת שלנו מציגה את הלוח העברי לצד הלוח הגרגוריאני בכל מקום — חגים, ראשי חודשים, ייחוס תאריכים — בלי תוספים חיצוניים.
              </p>

              <div className="flex flex-wrap gap-2 mb-7">
                {[
                  'כל החגים מוכרים',
                  'ראשי חודשים',
                  'שנה מעוברת',
                  'תאריך כפול אוטומטי',
                ].map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700">
                    <CheckCircle2 size={11} />
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-auto">
                <HebrewCalendarMockup />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom quote */}
        <div className="mt-14 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-amber-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <Moon size={16} className="text-indigo-600" />
              <span className="text-sm font-black text-slate-800">המתחרים מציעים תרגום לעברית.</span>
            </div>
            <span className="hidden sm:block text-slate-300">·</span>
            <div className="flex items-center gap-2">
              <Star size={16} className="text-amber-500 fill-amber-500" />
              <span className="text-sm font-black text-slate-800">אנחנו בנינו מערכת ישראלית מהיסוד.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
