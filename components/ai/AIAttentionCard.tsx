'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Sparkles, ChevronLeft, Loader2 } from 'lucide-react';

interface AlertItem {
  severity: 'critical' | 'warning' | 'info';
  module: string;
  title: string;
  description: string;
  dataSource: string;
}

interface AIAttentionCardProps {
  orgSlug: string;
  maxAlerts?: number;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    bg: 'bg-red-50 border-red-200',
    iconColor: 'text-red-600',
    badge: 'bg-red-100 text-red-700',
    label: 'קריטי',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700',
    label: 'דורש תשומת לב',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    label: 'מידע',
  },
} as const;

const MODULE_LABELS: Record<string, string> = {
  finance: 'כספים',
  client: 'לקוחות',
  team: 'צוות',
  operations: 'תפעול',
  system: 'מכירות',
};

export function AIAttentionCard({ orgSlug, maxAlerts = 3 }: AIAttentionCardProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!orgSlug) return;

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/ai/attention`, {
      headers: { 'x-org-id': orgSlug },
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const items = Array.isArray(data?.alerts) ? data.alerts : [];
        setAlerts(items.slice(0, maxAlerts));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [orgSlug, maxAlerts]);

  if (loading) {
    return (
      <div className="ui-card p-6 flex items-center gap-3 text-slate-500">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm font-medium">AI סורק את המערכת...</span>
      </div>
    );
  }

  if (error || alerts.length === 0) return null;

  return (
    <div className="ui-card overflow-hidden" dir="rtl">
      <div className="px-5 py-4 bg-gradient-to-l from-slate-900 to-slate-800 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Sparkles size={16} className="text-amber-400" />
          </div>
          <div>
            <div className="text-sm font-bold">דברים שצריכים תשומת לב</div>
            <div className="text-[11px] text-white/60 font-medium">מבוסס על נתונים אמיתיים בלבד</div>
          </div>
        </div>
        <div className="text-[10px] text-white/40 font-mono">{alerts.length} התראות</div>
      </div>

      <div className="divide-y divide-slate-100">
        {alerts.map((alert, idx) => {
          const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
          const Icon = config.icon;
          const moduleLabel = MODULE_LABELS[alert.module] || alert.module;

          return (
            <div key={idx} className={`p-4 ${config.bg} border-r-4`}>
              <div className="flex items-start gap-3">
                <Icon size={18} className={`${config.iconColor} mt-0.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{alert.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${config.badge}`}>
                      {moduleLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{alert.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-medium">נתונים מעודכנים • {new Date().toLocaleDateString('he-IL')}</span>
        <CheckCircle2 size={12} className="text-green-500" />
      </div>
    </div>
  );
}
