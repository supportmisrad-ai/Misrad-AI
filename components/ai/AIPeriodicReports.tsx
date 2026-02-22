'use client';

import React, { useEffect, useState } from 'react';
import { FileText, TrendingUp, AlertTriangle, CheckCircle, Info, ChevronDown, ChevronUp, Brain, Shield } from 'lucide-react';
import { encodeWorkspaceOrgSlug } from '@/lib/os/social-routing';

type Insight = {
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'positive' | 'info';
  confidence?: 'high' | 'medium' | 'low';
};

type Recommendation = {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
};

type Report = {
  id: string;
  report_type: string;
  report_month: string;
  ai_summary: string | null;
  ai_insights: Insight[] | null;
  score: number | null;
  recommendations: Recommendation[] | null;
  data_sources: string[] | null;
  created_at: string;
};

interface AIPeriodicReportsProps {
  orgSlug: string;
  limit?: number;
}

const severityConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  critical: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  positive: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
};

export function AIPeriodicReports({ orgSlug, limit = 5 }: AIPeriodicReportsProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/workspaces/${encodeWorkspaceOrgSlug(orgSlug)}/ai/reports?limit=${limit}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.reports) setReports(data.reports);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [orgSlug, limit]);

  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-8 border border-white/60 shadow-lg animate-pulse">
        <div className="h-6 bg-slate-200 rounded-xl w-48 mb-4" />
        <div className="h-4 bg-slate-100 rounded-lg w-full mb-2" />
        <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-8 border border-white/60 shadow-lg text-center">
        <Brain size={48} className="mx-auto text-slate-300 mb-4" />
        <h3 className="font-bold text-slate-700 text-lg mb-1">אין דוחות תקופתיים עדיין</h3>
        <p className="text-sm text-slate-500">הדוח הראשון ייווצר אוטומטית בסוף החודש</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => {
        const isExpanded = expandedId === report.id;
        const score = typeof report.score === 'number' ? report.score : null;
        const insights = Array.isArray(report.ai_insights) ? report.ai_insights : [];
        const recommendations = Array.isArray(report.recommendations) ? report.recommendations : [];
        const dataSources = Array.isArray(report.data_sources) ? report.data_sources : [];

        const monthLabel = report.report_month
          ? new Date(report.report_month + '-01').toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
          : 'לא ידוע';

        return (
          <div
            key={report.id}
            className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-lg overflow-hidden transition-all"
          >
            {/* Header */}
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : report.id)}
              className="w-full flex items-center justify-between p-6 text-right hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">
                    דוח {report.report_type === 'admin_monthly' ? 'מנהלים' : 'אישי'} — {monthLabel}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">
                    {report.ai_summary || 'אין סיכום'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {score !== null && (
                  <div className={`text-2xl font-black ${score >= 70 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                    {score}
                  </div>
                )}
                {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-6 pb-6 space-y-5 border-t border-slate-100">
                {/* Summary */}
                {report.ai_summary && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-2xl">
                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{report.ai_summary}</p>
                  </div>
                )}

                {/* Insights */}
                {insights.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <TrendingUp size={16} /> תובנות
                    </h4>
                    <div className="space-y-2">
                      {insights.map((insight, i) => {
                        const config = severityConfig[insight.severity] || severityConfig.info;
                        const Icon = config.icon;
                        return (
                          <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${config.bg}`}>
                            <Icon size={18} className={`mt-0.5 shrink-0 ${config.color}`} />
                            <div>
                              <div className="font-bold text-slate-800 text-sm">{insight.title}</div>
                              <div className="text-xs text-slate-600 mt-0.5">{insight.description}</div>
                              {insight.confidence && (
                                <span className="inline-block mt-1 text-[10px] font-bold text-slate-500 bg-white/70 px-2 py-0.5 rounded-full">
                                  ביטחון: {insight.confidence === 'high' ? 'גבוה' : insight.confidence === 'medium' ? 'בינוני' : 'נמוך'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {recommendations.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-800 mb-3">המלצות</h4>
                    <div className="space-y-2">
                      {recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200">
                          <span className={`shrink-0 mt-0.5 text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            rec.priority === 'high' ? 'bg-red-50 border-red-200 text-red-700' :
                            rec.priority === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                            'bg-slate-50 border-slate-200 text-slate-600'
                          }`}>
                            {rec.priority === 'high' ? 'גבוה' : rec.priority === 'medium' ? 'בינוני' : 'נמוך'}
                          </span>
                          <div>
                            <div className="font-bold text-slate-800 text-sm">{rec.title}</div>
                            <div className="text-xs text-slate-600 mt-0.5">{rec.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data Sources — truth enforcement */}
                {dataSources.length > 0 && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <Shield size={12} />
                    <span>מקורות נתונים: {dataSources.join(', ')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
