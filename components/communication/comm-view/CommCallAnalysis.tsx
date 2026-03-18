'use client';

import React from 'react';
import { asObject } from './types';

interface CommCallAnalysisProps {
  metadata: unknown;
}

const CommCallAnalysis: React.FC<CommCallAnalysisProps> = ({ metadata }) => {
  const ca = asObject(asObject(metadata)?.callAnalysis);
  if (!ca) return null;

  const audio = asObject(ca.audio);
  const audioSrc = String(audio?.signedUrl || audio?.url || '').trim();
  const analysis = asObject(ca.analysis);
  const score = Number.isFinite(Number(analysis?.score)) ? Number(analysis?.score) : null;
  const summary = String(analysis?.summary || '').trim();
  const topics = asObject(analysis?.topics);
  const tasks = Array.isArray(topics?.tasks) ? topics.tasks : [];
  const promises = Array.isArray(topics?.promises) ? topics.promises : [];
  const objections = Array.isArray(analysis?.objections) ? analysis.objections : [];
  const transcript = Array.isArray(analysis?.transcript) ? analysis.transcript : [];

  return (
    <div className="mt-3 space-y-3">
      {audioSrc ? (
        <audio controls className="w-full">
          <source src={audioSrc} />
        </audio>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">ציון</div>
          <div className="text-lg font-bold text-slate-900">{score == null ? '—' : score}</div>
        </div>
        <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-3 md:col-span-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">סיכום</div>
          <div className="text-sm font-medium text-slate-800 whitespace-pre-wrap leading-relaxed">{summary || '—'}</div>
        </div>
      </div>

      {promises.length || tasks.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-3 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">התחייבויות</div>
            <div className="space-y-1.5">
              {(promises.length ? promises : ['—']).slice(0, 8).map((p: unknown, idx: number) => (
                <div key={idx} className="text-sm font-medium text-slate-800 flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">•</span>
                  {String(p)}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-slate-200/60 rounded-2xl p-3 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">משימות</div>
            <div className="space-y-1.5">
              {(tasks.length ? tasks : ['—']).slice(0, 10).map((t: unknown, idx: number) => (
                <div key={idx} className="text-sm font-medium text-slate-800 flex items-start gap-2">
                  <span className="text-indigo-500 mt-1">•</span>
                  {String(t)}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {objections.length ? (
        <div className="bg-white border border-slate-200/60 rounded-2xl p-3 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">התנגדויות</div>
          <div className="space-y-2">
            {objections.slice(0, 6).map((o: unknown, idx: number) => {
              const oObj = asObject(o);
              const objection = typeof oObj?.objection === 'string' ? oObj.objection : '';
              const reply = typeof oObj?.reply === 'string' ? oObj.reply : '';
              const nextQuestion = typeof oObj?.next_question === 'string' ? oObj.next_question : '';
              return (
                <div key={idx} className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                  <div className="text-xs font-bold text-slate-900">{String(objection || '')}</div>
                  <div className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{String(reply || '')}</div>
                  {nextQuestion ? (
                    <div className="text-xs font-medium text-indigo-600 mt-2 flex items-center gap-1">
                      <span className="opacity-70">שאלה הבאה:</span> {String(nextQuestion)}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {transcript.length ? (
        <div className="bg-white border border-slate-200/60 rounded-2xl p-3 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">תמלול (דוגמית)</div>
          <div className="space-y-2 pl-1">
            {transcript.slice(0, 10).map((t: unknown, idx: number) => {
              const tObj = asObject(t);
              const speaker = typeof tObj?.speaker === 'string' ? tObj.speaker : '';
              const text = typeof tObj?.text === 'string' ? tObj.text : '';
              return (
                <div key={idx} className="text-sm text-slate-800">
                  <span className="text-slate-400 font-bold text-xs">{String(speaker || '')}:</span> {String(text || '')}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CommCallAnalysis;
