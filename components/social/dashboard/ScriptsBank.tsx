'use client';

import React, { useState, useCallback } from 'react';
import { ChevronDown, Copy, Check, Sparkles, X, Loader2, FileText } from 'lucide-react';

type StrategicContentItem = {
  id: string;
  category: string;
  title: string;
  content: string;
  module_id: string;
};

const REWRITE_PRESETS = [
  { label: 'קצר יותר', instruction: 'קצר את התסריט ל-50% מהאורך המקורי. שמור את המסר המרכזי.' },
  { label: 'רשמי יותר', instruction: 'שכתב בטון רשמי ומקצועי יותר. הסר סלנג ושפה יומיומית.' },
  { label: 'חם ואישי', instruction: 'שכתב בטון חם, אישי ואמפתי יותר. הוסף חיבור רגשי.' },
  { label: 'לווצאפ', instruction: 'התאם לפורמט הודעת ווצאפ - קצר, עם שורות קצרות ואימוג\'ים מתאימים.' },
];

interface ScriptsBankProps {
  scripts: StrategicContentItem[];
}

function ScriptCard({ item }: { item: StrategicContentItem }) {
  const [copied, setCopied] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');
  const [rewrittenText, setRewrittenText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleRewrite = useCallback(async (instruction: string) => {
    if (!instruction.trim()) return;
    setIsLoading(true);
    setError('');
    setRewrittenText('');

    try {
      const res = await fetch('/api/ai/rewrite-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptContent: item.content,
          instruction: instruction.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'שגיאה בשכתוב');
      }

      const data = await res.json();
      setRewrittenText(data.rewritten || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בשכתוב התסריט');
    } finally {
      setIsLoading(false);
    }
  }, [item.content]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <FileText size={14} className="text-indigo-600" />
            </div>
            <h4 className="text-sm font-black text-slate-900">{item.title}</h4>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleCopy(item.content); }}
              className={`p-2 rounded-xl text-xs font-bold transition-all ${
                copied
                  ? 'bg-green-50 text-green-600'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
              title="העתק תסריט"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsAIOpen((v) => !v); setRewrittenText(''); setError(''); }}
              className={`p-2 rounded-xl text-xs font-bold transition-all ${
                isAIOpen
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-purple-50 text-purple-500 hover:bg-purple-100 hover:text-purple-700'
              }`}
              title="שכתוב עם AI"
            >
              <Sparkles size={14} />
            </button>
          </div>
        </div>

        <div className="text-sm font-medium text-slate-700 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto custom-scrollbar">
          {item.content}
        </div>
      </div>

      {isAIOpen && (
        <div className="border-t border-slate-100 bg-purple-50/30 p-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-purple-700 flex items-center gap-1.5">
              <Sparkles size={12} /> שכתוב עם AI
            </span>
            <button
              type="button"
              onClick={() => { setIsAIOpen(false); setRewrittenText(''); setError(''); }}
              className="p-1 rounded-lg hover:bg-purple-100 text-purple-400"
            >
              <X size={12} />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {REWRITE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={isLoading}
                onClick={() => handleRewrite(preset.instruction)}
                className="px-3 py-1.5 rounded-xl bg-white border border-purple-200 text-purple-700 text-[11px] font-bold hover:bg-purple-100 hover:border-purple-300 transition-all disabled:opacity-50"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customInstruction.trim()) {
                  handleRewrite(customInstruction);
                }
              }}
              placeholder="הוראה חופשית... (למשל: התאם לתחום הנדל&quot;ן)"
              className="flex-1 px-3 py-2 bg-white border border-purple-200 rounded-xl text-sm font-medium outline-none focus:ring-2 ring-purple-200 placeholder:text-purple-300"
              disabled={isLoading}
            />
            <button
              type="button"
              disabled={isLoading || !customInstruction.trim()}
              onClick={() => handleRewrite(customInstruction)}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-black hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              שכתב
            </button>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600">
              {error}
            </div>
          )}

          {rewrittenText && (
            <div className="mt-3 p-4 bg-white border border-purple-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-purple-500">תוצאת AI</span>
                <button
                  type="button"
                  onClick={() => handleCopy(rewrittenText)}
                  className="text-[10px] font-black text-purple-600 hover:text-purple-800 flex items-center gap-1"
                >
                  <Copy size={10} /> העתק גרסה
                </button>
              </div>
              <div className="text-sm font-medium text-slate-800 whitespace-pre-line leading-relaxed">
                {rewrittenText}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ScriptsBank({ scripts }: ScriptsBankProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full p-5 md:p-6 text-right hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <FileText size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-slate-900">בנק תסריטים</h2>
              <p className="text-xs font-bold text-slate-400">
                {scripts.length > 0 ? `${scripts.length} תסריטים מוכנים` : 'תסריטים מקצועיים למכירות ותקשורת'}
              </p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <ChevronDown size={18} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="px-5 md:px-6 pb-5 md:pb-6">
          {scripts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scripts.map((item) => (
                <ScriptCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-50 flex items-center justify-center">
                <FileText size={24} className="text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-500">אין תסריטים זמינים כרגע</p>
              <p className="text-xs font-medium text-slate-400 mt-1">תסריטים יתווספו אוטומטית כשתוגדר ספריית התוכן</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
