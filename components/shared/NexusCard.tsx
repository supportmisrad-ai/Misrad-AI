'use client';

import React from 'react';
import { Lock } from 'lucide-react';

type IconType = React.ComponentType<{ size?: number; className?: string }>;

export default function NexusCard({
  title,
  subtitle,
  icon: Icon,
  iconSlot,
  metric,
  metricLabel,
  onClickAction,
  className,
  locked,
}: {
  title: string;
  subtitle?: string | null;
  icon?: IconType;
  iconSlot?: React.ReactNode;
  metric?: string | number | null;
  metricLabel?: string | null;
  onClickAction?: () => void;
  className?: string;
  locked?: boolean;
}) {
  const isClickable = Boolean(onClickAction);

  const content = (
    <>
      <div className={`absolute inset-0 bg-gradient-to-br from-gray-50/60 via-white to-white opacity-0 group-hover:opacity-100 transition-opacity${locked ? ' pointer-events-none' : ''}`} />
      {locked && <div className="absolute inset-0 bg-slate-100/60 z-[1]" />}

      <div className="relative p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            {iconSlot ? (
              <div className="shrink-0">{iconSlot}</div>
            ) : Icon ? (
              <div className="shrink-0 w-11 h-11 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white flex items-center justify-center shadow-sm">
                <Icon size={18} className="text-gray-700" />
              </div>
            ) : null}

            <div className="min-w-0">
              <div className={`text-sm md:text-[15px] font-black truncate ${locked ? 'text-slate-400' : 'text-slate-900'}`}>
                {title}
                {locked && <Lock size={12} className="inline-block mr-1 align-[-1px] text-slate-400" />}
              </div>
              {subtitle ? <div className="text-xs text-slate-500 font-semibold mt-1">{subtitle}</div> : null}
            </div>
          </div>

          {metric !== null && metric !== undefined ? (
            <div className="text-left shrink-0">
              <div className="text-2xl md:text-3xl font-black text-slate-900 leading-none tabular-nums">
                {typeof metric === 'number' ? metric.toLocaleString() : String(metric)}
              </div>
              {metricLabel ? (
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{metricLabel}</div>
              ) : null}
            </div>
          ) : null}
        </div>

        {isClickable ? (
          <div className="relative z-[2] mt-4 flex items-center justify-between">
            <div className={`text-[10px] font-bold uppercase tracking-[0.2em] ${locked ? 'text-slate-300' : 'text-slate-400'}`}>
              {locked ? 'נעול' : 'פתח'}
            </div>
            <div className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
              locked
                ? 'border-slate-200 bg-slate-50 text-slate-300'
                : 'border-gray-200 bg-white text-slate-500 group-hover:text-slate-900 group-hover:border-gray-300'
            }`}>
              {locked ? <Lock size={14} /> : <span className="text-lg leading-none">›</span>}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );

  const classNames =
    `group relative w-full text-right bg-white rounded-[1.5rem] border border-gray-200/80 shadow-sm hover:shadow-xl hover:shadow-gray-200/60 hover:border-gray-300 transition-all overflow-hidden` +
    (isClickable ? ' cursor-pointer' : '') +
    (className ? ` ${className}` : '');

  return isClickable ? (
    <button type="button" onClick={onClickAction} className={classNames}>
      {content}
    </button>
  ) : (
    <div className={classNames}>{content}</div>
  );
}
