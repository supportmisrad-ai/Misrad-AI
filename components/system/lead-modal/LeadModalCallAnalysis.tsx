'use client';

import React from 'react';
import { SquareActivity } from '../types';
import { asObject } from './utils';

interface LeadModalCallAnalysisProps {
  SquareActivity: SquareActivity;
  createdAiTaskKeys: string[];
  creatingAiTaskKey: string | null;
  onCreateTask: (key: string, taskText: string) => void;
}

const LeadModalCallAnalysis: React.FC<LeadModalCallAnalysisProps> = ({
  SquareActivity,
  createdAiTaskKeys,
  creatingAiTaskKey,
  onCreateTask,
}) => {
  const ca = asObject(asObject(SquareActivity.metadata)?.callAnalysis);
  if (!ca) return null;

  const audio = asObject(ca.audio) ?? {};
  const audioSrc = String(audio.signedUrl || audio.url || '').trim();
  const analysis = asObject(ca.analysis) ?? {};
  const score = Number.isFinite(Number(analysis.score)) ? Number(analysis.score) : null;
  const summary = String(analysis.summary || '').trim();

  const topics = asObject(analysis.topics) ?? {};
  const tasks = Array.isArray(topics.tasks) ? topics.tasks : [];
  const promises = Array.isArray(topics.promises) ? topics.promises : [];
  const objections = Array.isArray(analysis.objections) ? analysis.objections : [];
  const transcript = Array.isArray(analysis.transcript) ? analysis.transcript : [];

  return (
    <div className="mt-3 space-y-3">
      {audioSrc ? (
        <audio controls className="w-full">
          <source src={audioSrc} />
        </audio>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
          <div className="text-[11px] font-black text-slate-500">ציון</div>
          <div className="text-lg font-black text-slate-900">{score == null ? '—' : score}</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 md:col-span-2">
          <div className="text-[11px] font-black text-slate-500">סיכום</div>
          <div className="text-sm font-bold text-slate-800 whitespace-pre-wrap">{summary || '—'}</div>
        </div>
      </div>

      {(promises.length || tasks.length) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="bg-white border border-slate-200 rounded-2xl p-3">
            <div className="text-[11px] font-black text-slate-500">התחייבויות</div>
            <div className="mt-2 space-y-1">
              {(promises.length ? promises : ['—']).slice(0, 8).map((p: unknown, idx: number) => (
                <div key={idx} className="text-sm font-bold text-slate-800">{String(p)}</div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-3">
            <div className="text-[11px] font-black text-slate-500">משימות</div>
            <div className="mt-2 space-y-1">
              {(tasks.length ? tasks : ['—']).slice(0, 10).map((t: unknown, idx: number) => {
                const taskText = String(t);
                const key = `${String(SquareActivity.id)}:${idx}:${taskText}`;
                const disabled = createdAiTaskKeys.includes(key) || creatingAiTaskKey === key;

                return (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <div className="text-sm font-bold text-slate-800 min-w-0 truncate">{taskText}</div>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onCreateTask(key, taskText)}
                      className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-black disabled:opacity-50"
                    >
                      קבע
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {objections.length ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-3">
          <div className="text-[11px] font-black text-slate-500">התנגדויות</div>
          <div className="mt-2 space-y-2">
            {objections.slice(0, 6).map((o: unknown, idx: number) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <div className="text-xs font-black text-slate-900">{String((asObject(o)?.objection as unknown) || '')}</div>
                <div className="text-sm font-bold text-slate-700 mt-1 whitespace-pre-wrap">{String((asObject(o)?.reply as unknown) || '')}</div>
                {asObject(o)?.next_question ? (
                  <div className="text-xs font-bold text-slate-500 mt-2">שאלה הבאה: {String(asObject(o)?.next_question)}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {transcript.length ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-3">
          <div className="text-[11px] font-black text-slate-500">תמלול (דוגמית)</div>
          <div className="mt-2 space-y-2">
            {transcript.slice(0, 10).map((t: unknown, idx: number) => (
              <div key={idx} className="text-sm font-bold text-slate-800">
                <span className="text-slate-500">{String((asObject(t)?.speaker as unknown) || '')}:</span> {String((asObject(t)?.text as unknown) || '')}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default LeadModalCallAnalysis;
