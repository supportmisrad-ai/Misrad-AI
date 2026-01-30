'use client';

import React, { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

export function ArticleFeedbackClient() {
  const [value, setValue] = useState<'yes' | 'no' | null>(null);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="text-sm font-black text-slate-900">האם זה עזר לך?</div>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setValue('yes')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border font-black transition-colors ${
            value === 'yes'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <ThumbsUp size={16} /> כן
        </button>
        <button
          type="button"
          onClick={() => setValue('no')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border font-black transition-colors ${
            value === 'no' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <ThumbsDown size={16} /> לא
        </button>
      </div>

      {value ? (
        <div className="mt-4 text-sm font-bold text-slate-600">תודה! נשתפר בהתאם.</div>
      ) : (
        <div className="mt-4 text-xs font-bold text-slate-500">המשוב אנונימי ומשמש לשיפור המאמרים.</div>
      )}
    </div>
  );
}
