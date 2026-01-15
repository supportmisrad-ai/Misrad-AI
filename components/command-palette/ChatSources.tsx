'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

export type ChatSource = {
  docKey: string;
  similarity: number;
  chunkIndex: number;
  content?: string;
  metadata?: any;
};

export function ChatSources({ sources }: { sources: ChatSource[] }) {
  const list = Array.isArray(sources) ? sources : [];
  if (!list.length) return null;

  return (
    <div className="mt-3 bg-slate-50/80 border border-slate-200/60 rounded-2xl p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        <Sparkles size={12} className="text-indigo-500" />
        Sources (pgvector)
      </div>
      <div className="mt-3 space-y-3">
        {list.slice(0, 6).map((s, idx) => (
          <div key={`${s.docKey}:${s.chunkIndex}:${idx}`} className="bg-white rounded-xl border border-slate-200/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate">{s.docKey}</div>
                <div className="text-[10px] text-slate-500 font-medium">Chunk #{s.chunkIndex}</div>
              </div>
              <div className="text-[10px] font-bold text-slate-500 tabular-nums shrink-0">
                {(typeof s.similarity === 'number' ? s.similarity : Number(s.similarity || 0)).toFixed(3)}
              </div>
            </div>
            {s.content ? (
              <div className="mt-2 text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                {String(s.content)}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
