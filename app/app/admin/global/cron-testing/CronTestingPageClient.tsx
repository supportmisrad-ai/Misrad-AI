'use client';

import React, { useState } from 'react';
import {
  Clock,
  FileText,
  Loader2,
  Mail,
  Play,
  RefreshCw,
  Shield,
  Timer,
  TriangleAlert,
  Users,
  Zap,
} from 'lucide-react';

type CronJob = {
  id: string;
  label: string;
  description: string;
  path: string;
  schedule: string;
  icon: React.ElementType;
  color: string;
};

const CRON_JOBS: CronJob[] = [
  {
    id: 'attendance-monthly-reports',
    label: 'דוחות נוכחות חודשיים',
    description: 'יצירת דוחות חודשיים לכל העובדים + שליחת מייל ופוש',
    path: '/api/cron/attendance-monthly-reports',
    schedule: '0 6 1 * *',
    icon: FileText,
    color: 'bg-indigo-500',
  },
  {
    id: 'employee-invite-emails',
    label: 'מיילי הזמנת עובדים',
    description: 'שליחת מיילי הזמנה לעובדים חדשים',
    path: '/api/cron/employee-invite-emails',
    schedule: '*/5 * * * *',
    icon: Mail,
    color: 'bg-emerald-500',
  },
  {
    id: 'check-trial-expiry',
    label: 'בדיקת תפוגת Trial',
    description: 'בדיקה ועדכון ארגונים שתקופת הניסיון שלהם הסתיימה',
    path: '/api/cron/check-trial-expiry',
    schedule: '0 2 * * *',
    icon: Timer,
    color: 'bg-amber-500',
  },
  {
    id: 'send-trial-warnings',
    label: 'אזהרות Trial',
    description: 'שליחת התראות לארגונים שתקופת הניסיון עומדת להסתיים',
    path: '/api/cron/send-trial-warnings',
    schedule: '0 9,17 * * *',
    icon: TriangleAlert,
    color: 'bg-rose-500',
  },
];

type RunResult = {
  jobId: string;
  status: 'success' | 'error';
  data: Record<string, unknown> | null;
  error: string | null;
  durationMs: number;
};

export default function CronTestingPageClient() {
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<RunResult[]>([]);
  const [cronSecret, setCronSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  const triggerCron = async (job: CronJob) => {
    if (!cronSecret.trim()) {
      setResults((prev) => [
        {
          jobId: job.id,
          status: 'error',
          data: null,
          error: 'יש להזין CRON_SECRET כדי להריץ',
          durationMs: 0,
        },
        ...prev,
      ]);
      return;
    }

    setRunningJobs((prev) => new Set(prev).add(job.id));
    const start = Date.now();

    try {
      const res = await fetch(job.path, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cronSecret.trim()}`,
          'Content-Type': 'application/json',
        },
      });

      const durationMs = Date.now() - start;
      let data: Record<string, unknown> | null = null;

      try {
        data = await res.json();
      } catch {
        // not JSON
      }

      setResults((prev) => [
        {
          jobId: job.id,
          status: res.ok ? 'success' : 'error',
          data,
          error: res.ok ? null : `HTTP ${res.status}: ${data ? JSON.stringify(data) : res.statusText}`,
          durationMs,
        },
        ...prev,
      ]);
    } catch (e: unknown) {
      setResults((prev) => [
        {
          jobId: job.id,
          status: 'error',
          data: null,
          error: e instanceof Error ? e.message : String(e),
          durationMs: Date.now() - start,
        },
        ...prev,
      ]);
    } finally {
      setRunningJobs((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
    }
  };

  const triggerAll = async () => {
    for (const job of CRON_JOBS) {
      await triggerCron(job);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Zap size={24} className="text-indigo-600" />
            טסט CRON Jobs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            הרצה ידנית של כל ה-CRON jobs במערכת לצורכי בדיקה
          </p>
        </div>
        <button
          onClick={triggerAll}
          disabled={runningJobs.size > 0}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {runningJobs.size > 0 ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          הרץ הכל
        </button>
      </div>

      {/* CRON Secret Input */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={16} className="text-amber-600" />
          <span className="text-sm font-black text-amber-800">CRON_SECRET</span>
        </div>
        <div className="flex gap-2">
          <input
            type={showSecret ? 'text' : 'password'}
            value={cronSecret}
            onChange={(e) => setCronSecret(e.target.value)}
            placeholder="הזן את ה-CRON_SECRET מ-.env.local"
            className="flex-1 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-300"
          />
          <button
            onClick={() => setShowSecret((v) => !v)}
            className="px-4 py-2.5 rounded-xl border border-amber-300 bg-white text-sm font-bold text-amber-700 hover:bg-amber-50 transition"
          >
            {showSecret ? 'הסתר' : 'הצג'}
          </button>
        </div>
        <p className="text-xs text-amber-600 mt-2 font-semibold">
          נדרש לאימות — זהה ל-CRON_SECRET שמוגדר ב-Vercel/env
        </p>
      </div>

      {/* CRON Jobs Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {CRON_JOBS.map((job) => {
          const isRunning = runningJobs.has(job.id);
          const lastResult = results.find((r) => r.jobId === job.id);
          const Icon = job.icon;

          return (
            <div
              key={job.id}
              className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm hover:border-slate-300 transition"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${job.color} flex items-center justify-center`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="font-black text-slate-900 text-sm">{job.label}</div>
                    <div className="text-xs text-slate-500">{job.description}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock size={12} />
                  <code className="font-mono">{job.schedule}</code>
                </div>
                <code className="text-[10px] text-slate-400 font-mono">{job.path}</code>
              </div>

              <button
                onClick={() => triggerCron(job)}
                disabled={isRunning}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isRunning ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    מריץ...
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    הרץ עכשיו
                  </>
                )}
              </button>

              {lastResult ? (
                <div
                  className={`mt-3 rounded-xl border p-3 text-xs ${
                    lastResult.status === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-rose-200 bg-rose-50 text-rose-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black">
                      {lastResult.status === 'success' ? '✅ הצלחה' : '❌ שגיאה'}
                    </span>
                    <span className="font-mono text-[10px] opacity-70">{lastResult.durationMs}ms</span>
                  </div>
                  {lastResult.data ? (
                    <pre className="mt-1 text-[10px] font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                      {JSON.stringify(lastResult.data, null, 2)}
                    </pre>
                  ) : lastResult.error ? (
                    <div className="mt-1 font-semibold">{lastResult.error}</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Results History */}
      {results.length > 0 ? (
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Users size={18} className="text-slate-500" />
              היסטוריית הרצות ({results.length})
            </h2>
            <button
              onClick={() => setResults([])}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 transition flex items-center gap-1"
            >
              <RefreshCw size={12} />
              נקה
            </button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((r, idx) => {
              const job = CRON_JOBS.find((j) => j.id === r.jobId);
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs ${
                    r.status === 'success' ? 'bg-emerald-50' : 'bg-rose-50'
                  }`}
                >
                  <span className={`font-black ${r.status === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {r.status === 'success' ? '✅' : '❌'}
                  </span>
                  <span className="font-bold text-slate-700">{job?.label || r.jobId}</span>
                  <span className="font-mono text-slate-400 mr-auto">{r.durationMs}ms</span>
                  {r.data && typeof r.data === 'object' && 'generated' in r.data ? (
                    <span className="text-indigo-600 font-bold">{String(r.data.generated)} דוחות</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
