'use client';

import { useState, useRef } from 'react';
import { ArrowRight, CircleHelp, X, Sparkles, MessageSquare, Send } from 'lucide-react';
import { BILLING_PACKAGES, type PackageType } from '@/lib/billing/pricing';
import { getModuleLabelHe } from '@/lib/os/modules/registry';

type Step = 'closed' | 'q1' | 'q2' | 'q3' | 'result' | 'ai';

type Answer = {
  teamSize: 'solo' | 'small' | 'medium' | null;
  mainNeed: 'sales' | 'marketing' | 'fieldwork' | 'everything' | null;
  priority: 'price' | 'features' | 'ai' | null;
};

const TEAM_OPTIONS = [
  { value: 'solo' as const, label: 'רק אני', desc: 'עצמאי / פרילנסר' },
  { value: 'small' as const, label: '2–10 עובדים', desc: 'צוות קטן' },
  { value: 'medium' as const, label: '10+', desc: 'צוות בצמיחה' },
];

const NEED_OPTIONS = [
  { value: 'sales' as const, label: 'מכירות ולידים', desc: 'CRM, ניהול עסקאות, שיחות' },
  { value: 'marketing' as const, label: 'שיווק ולקוחות', desc: 'תוכן, פוסטים, ניהול לקוחות' },
  { value: 'fieldwork' as const, label: 'תפעול ושטח', desc: 'קריאות, טכנאים, מלאי' },
  { value: 'everything' as const, label: 'הכל ביחד', desc: 'כל המחלקות תחת מערכת אחת' },
];

const PRIORITY_OPTIONS = [
  { value: 'price' as const, label: 'מחיר נמוך', desc: 'רוצה להתחיל בזול ולגדול' },
  { value: 'features' as const, label: 'מקסימום פיצ׳רים', desc: 'הכי הרבה ערך מהיום הראשון' },
  { value: 'ai' as const, label: 'AI אמיתי', desc: 'שיבוץ, סיכומים, תובנות אוטומטיות' },
];

function recommend(answers: Answer): { packageType: PackageType; reason: string } {
  const { teamSize, mainNeed, priority } = answers;

  if (mainNeed === 'everything' || teamSize === 'medium') {
    return { packageType: 'the_empire', reason: 'עסק עם כמה מחלקות צריך שהכל ידבר עם הכל — הכל כלול זה הבחירה הנכונה.' };
  }

  if (mainNeed === 'fieldwork') {
    if (priority === 'price' && teamSize === 'solo') {
      return { packageType: 'solo', reason: 'עצמאי בשטח? נקסוס נותן ניהול משימות וצוות — בסיס מצוין לשלב הראשון.' };
    }
    return { packageType: 'the_operator', reason: 'תפעול + ניהול צוות שטח — שיבוץ AI, סיכום קריאות, מלאי ורכבים.' };
  }

  if (mainNeed === 'sales') {
    if (priority === 'price' && teamSize === 'solo') {
      return { packageType: 'solo', reason: 'נקסוס נותן ניהול משימות ולקוחות — בסיס מצוין להתחלת עבודה.' };
    }
    return { packageType: 'the_closer', reason: 'חבילת מכירות כוללת CRM, ניתוח שיחות ב-AI, ולידים — הכל מוכן לסגור עסקאות.' };
  }

  if (mainNeed === 'marketing') {
    if (priority === 'price' && teamSize === 'solo') {
      return { packageType: 'solo', reason: 'נקסוס מספק ניהול משימות ולקוחות — בסיס טוב לפרילנסר.' };
    }
    return { packageType: 'the_authority', reason: 'שיווק + ניהול לקוחות + צוות — הפלטפורמה השלמה לבניית סמכות מקצועית.' };
  }

  if (priority === 'ai') {
    return { packageType: 'the_empire', reason: 'כל יכולות ה-AI של MISRAD (שיבוץ, סיכומים, ניתוח שיחות, תוכן) נמצאות בחבילה המלאה.' };
  }

  if (priority === 'price') {
    return { packageType: 'solo', reason: 'התחל עם נקסוס ב-149 ₪ — ניהול משימות וצוות. תמיד אפשר לשדרג אחר כך.' };
  }

  return { packageType: 'the_empire', reason: 'הכל כלול — הבחירה הטובה ביותר לערך מקסימלי.' };
}

export default function PricingHelper({ onSelectPersona }: { onSelectPersona?: (persona: string) => void }) {
  const [step, setStep] = useState<Step>('closed');
  const [answers, setAnswers] = useState<Answer>({ teamSize: null, mainNeed: null, priority: null });
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ packageType: PackageType; reason: string } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  function reset() {
    setStep('closed');
    setAnswers({ teamSize: null, mainNeed: null, priority: null });
    setAiText('');
    setAiResult(null);
    setAiError(null);
  }

  async function handleAiSubmit() {
    const text = aiText.trim();
    if (!text || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);

    try {
      const prompt = [
        'אני צריך עזרה בבחירת חבילה ב-MISRAD AI. הנה תיאור העסק שלי:',
        text,
        '',
        'החבילות הזמינות: solo (נקסוס בלבד 149₪), the_closer (מכירות 249₪ System+Nexus), the_authority (שיווק 349₪ Social+Client+Nexus), the_operator (תפעול 349₪ Operations+Nexus), the_empire (הכל 499₪).',
        'המלץ לי על חבילה אחת. ענה אך ורק ב-JSON: {"package":"<שם>","reason":"<נימוק קצר בעברית>"}',
      ].join('\n');

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          featureKey: 'pricing.helper',
          pathname: '/pricing',
        }),
      });
      const data = await res.json();
      const responseText = String(data?.data?.text || data?.text || '');

      const jsonMatch = responseText.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const pkg = String(parsed.package || '').trim();
        const reason = String(parsed.reason || '');
        const validPackages: PackageType[] = ['solo', 'the_closer', 'the_authority', 'the_operator', 'the_empire'];
        if (validPackages.includes(pkg as PackageType)) {
          setAiResult({ packageType: pkg as PackageType, reason });
          setStep('result');
          return;
        }
      }
      setAiError('לא הצלחתי לנתח — נסה לתאר שוב בקצרה.');
    } catch {
      setAiError('שגיאה בתקשורת. נסה שוב.');
    } finally {
      setAiLoading(false);
    }
  }

  function handlePersonaMap(pkg: PackageType) {
    if (!onSelectPersona) return;
    const map: Partial<Record<PackageType, string>> = {
      solo: 'freelancer',
      the_closer: 'smb',
      the_authority: 'freelancer',
      the_operator: 'contractor',
      the_empire: 'agency',
      the_mentor: 'agency',
    };
    onSelectPersona(map[pkg] || 'freelancer');
  }

  const result = step === 'result' ? (aiResult || recommend(answers)) : null;
  const pkg = result ? BILLING_PACKAGES[result.packageType] : null;

  if (step === 'closed') {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={() => setStep('q1')}
          className="group inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 text-violet-700 text-sm font-black hover:from-violet-100 hover:to-indigo-100 hover:border-violet-300 hover:shadow-lg transition-all"
        >
          <CircleHelp size={16} className="group-hover:rotate-12 transition-transform" />
          לא בטוח מה מתאים לי?
        </button>
        <button
          type="button"
          onClick={() => setStep('ai')}
          className="group inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 text-indigo-700 text-sm font-black hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-300 hover:shadow-lg transition-all"
        >
          <Sparkles size={16} className="group-hover:scale-110 transition-transform" />
          תן ל-AI לבחור בשבילי
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-xl mx-auto rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-white via-violet-50/30 to-indigo-50/30 shadow-2xl shadow-violet-100/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="text-sm font-black text-violet-900">עוזר בחירת חבילה</div>
            <div className="text-[10px] text-violet-600">3 שאלות קצרות → המלצה מדויקת</div>
          </div>
        </div>
        <button onClick={reset} className="w-7 h-7 rounded-lg hover:bg-violet-100 flex items-center justify-center text-violet-400 hover:text-violet-700 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-violet-100">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
          style={{ width: step === 'q1' ? '33%' : step === 'q2' ? '66%' : '100%' }}
        />
      </div>

      <div className="p-5">
        {/* AI free-text mode */}
        {step === 'ai' ? (
          <div>
            <div className="text-base font-black text-slate-900 mb-1">ספר לנו על העסק שלך</div>
            <div className="text-xs text-slate-500 mb-3">תאר בכמה מילים מה אתה עושה — ה-AI ימליץ על החבילה הכי מתאימה.</div>
            <textarea
              ref={textRef}
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="למשל: אני קבלן שיפוצים עם 4 עובדים, צריך לנהל קריאות שירות ומלאי..."
              rows={3}
              dir="rtl"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSubmit(); }
              }}
            />
            {aiError ? <div className="mt-2 text-xs text-rose-600 font-bold">{aiError}</div> : null}
            <button
              type="button"
              onClick={handleAiSubmit}
              disabled={!aiText.trim() || aiLoading}
              className="w-full mt-3 py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-200/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {aiLoading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />מנתח...</>
              ) : (
                <><Send size={14} />קבל המלצה</>
              )}
            </button>
            <button onClick={() => setStep('q1')} className="mt-2 w-full text-xs text-violet-600 font-bold hover:underline text-center py-1">או עבור לשאלון מהיר</button>
          </div>
        ) : null}

        {/* Q1: Team size */}
        {step === 'q1' ? (
          <div>
            <div className="text-base font-black text-slate-900 mb-1">כמה אנשים בצוות?</div>
            <div className="text-xs text-slate-500 mb-4">זה עוזר לנו להמליץ על החבילה הנכונה.</div>
            <div className="space-y-2">
              {TEAM_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setAnswers((a) => ({ ...a, teamSize: opt.value })); setStep('q2'); }}
                  className="w-full flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-right hover:border-violet-300 hover:bg-violet-50/50 hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 group-hover:bg-violet-100 group-hover:border-violet-200 flex items-center justify-center text-slate-500 group-hover:text-violet-600 transition-colors shrink-0 text-sm font-black">
                    {opt.value === 'solo' ? '1' : opt.value === 'small' ? '2+' : '10+'}
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900">{opt.label}</div>
                    <div className="text-[11px] text-slate-500">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Q2: Main need */}
        {step === 'q2' ? (
          <div>
            <div className="text-base font-black text-slate-900 mb-1">מה הצורך המרכזי?</div>
            <div className="text-xs text-slate-500 mb-4">בחר את התחום שהכי חשוב לך עכשיו.</div>
            <div className="grid grid-cols-2 gap-2">
              {NEED_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setAnswers((a) => ({ ...a, mainNeed: opt.value })); setStep('q3'); }}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-4 text-center hover:border-violet-300 hover:bg-violet-50/50 hover:shadow-md transition-all group"
                >
                  <div className="text-sm font-black text-slate-900 group-hover:text-violet-700">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 leading-tight">{opt.desc}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep('q1')} className="mt-3 text-xs text-violet-600 font-bold hover:underline">← חזרה</button>
          </div>
        ) : null}

        {/* Q3: Priority */}
        {step === 'q3' ? (
          <div>
            <div className="text-base font-black text-slate-900 mb-1">מה יותר חשוב לך?</div>
            <div className="text-xs text-slate-500 mb-4">שאלה אחרונה — אחריה נמליץ!</div>
            <div className="space-y-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setAnswers((a) => ({ ...a, priority: opt.value })); setStep('result'); }}
                  className="w-full flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-right hover:border-violet-300 hover:bg-violet-50/50 hover:shadow-md transition-all group"
                >
                  <div>
                    <div className="text-sm font-black text-slate-900 group-hover:text-violet-700">{opt.label}</div>
                    <div className="text-[11px] text-slate-500">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep('q2')} className="mt-3 text-xs text-violet-600 font-bold hover:underline">← חזרה</button>
          </div>
        ) : null}

        {/* Result */}
        {step === 'result' && result && pkg ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                <Sparkles size={16} />
              </div>
              <div className="text-base font-black text-slate-900">ההמלצה שלנו</div>
            </div>

            <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-violet-50/50 p-5 mb-4">
              <div className="text-xl font-black text-indigo-900">{pkg.labelHe}</div>
              <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mt-1">
                ₪{pkg.monthlyPrice}<span className="text-sm text-slate-500 font-bold">/חודש</span>
              </div>
              {pkg.modules.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {pkg.modules.map((m) => (
                    <span key={m} className="inline-block px-2.5 py-1 rounded-lg bg-white border border-indigo-100 text-[11px] font-bold text-indigo-700">
                      {getModuleLabelHe(m)}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-xs text-indigo-600 font-bold">נקסוס — ניהול משימות וצוות</div>
              )}
              <div className="mt-3 text-sm text-slate-700 leading-relaxed">{result.reason}</div>
            </div>

            <button
              type="button"
              onClick={() => {
                handlePersonaMap(result.packageType);
                reset();
                const pricingEl = document.getElementById('pricing');
                if (pricingEl) pricingEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="w-full py-3.5 rounded-2xl font-black text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-200/50 hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
            >
              הצג חבילה <ArrowRight size={16} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
            </button>

            <button onClick={reset} className="w-full mt-2 text-xs text-violet-600 font-bold hover:underline text-center py-1.5">
              נסה שוב
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
