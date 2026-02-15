'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Download, Play, RefreshCw, Save } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeletons';
import { Button } from '@/components/ui/button';

type OrganizationLite = {
  id: string;
  name: string;
  slug?: string | null;
};

type FeatureRow = {
  id: string;
  organization_id: string | null;
  feature_key: string;
  enabled: boolean;
  primary_provider: string;
  primary_model: string;
  fallback_provider: string | null;
  fallback_model: string | null;
  base_prompt?: string | null;
  reserve_cost_cents: number;
  timeout_ms: number;
};

export const AiBrainPanel: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
  const [orgs, setOrgs] = useState<OrganizationLite[]>([]);
  const [orgQuery, setOrgQuery] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  const [featureQuery, setFeatureQuery] = useState('');
  const [rows, setRows] = useState<FeatureRow[]>([]);

  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [runningIngest, setRunningIngest] = useState(false);
  const [creditStatus, setCreditStatus] = useState<any>(null);

  const knownModels = useMemo(
    () => [
      'gemini-2.0-pro',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'nova-2',
      'llama-3.1-70b-versatile',
      'text-embedding-3-small',
    ],
    []
  );

  const selectedOrg = useMemo(() => orgs.find((o) => o.id === selectedOrgId) || null, [orgs, selectedOrgId]);

  const selectedOrgKey = useMemo(() => {
    if (!selectedOrg) return '';
    const slug = String(selectedOrg.slug || '').trim();
    return slug || String(selectedOrg.id || '').trim();
  }, [selectedOrg]);

  const loadOrganizations = useCallback(async () => {
    setLoadingOrgs(true);
    try {
      const url = new URL('/api/admin/organizations', window.location.origin);
      if (orgQuery.trim()) url.searchParams.set('q', orgQuery.trim());
      const res = await fetch(url.toString());
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'שגיאה בטעינת ארגונים');
      setOrgs(Array.isArray(data.organizations) ? data.organizations : []);
    } finally {
      setLoadingOrgs(false);
    }
  }, [orgQuery]);

  const loadFeatureSettings = useCallback(async (orgId: string) => {
    setLoadingRows(true);
    try {
      const url = new URL('/api/admin/ai/feature-settings', window.location.origin);
      if (featureQuery.trim()) url.searchParams.set('q', featureQuery.trim());
      url.searchParams.set('limit', '500');

      const res = await fetch(url.toString(), {
        headers: selectedOrgKey ? { 'x-org-id': selectedOrgKey } : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'שגיאה בטעינת הגדרות AI');
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } finally {
      setLoadingRows(false);
    }
  }, [featureQuery, selectedOrgKey]);

  const loadCreditStatus = useCallback(async (orgId: string) => {
    try {
      const url = new URL('/api/admin/ai/credits', window.location.origin);
      const res = await fetch(url.toString(), {
        headers: selectedOrgKey ? { 'x-org-id': selectedOrgKey } : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'שגיאה בטעינת יתרת קרדיטים');
      setCreditStatus(data.status ?? null);
    } catch {
      setCreditStatus(null);
    }
  }, [selectedOrgKey]);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    if (!selectedOrgId) return;
    void loadFeatureSettings(selectedOrgId);
    void loadCreditStatus(selectedOrgId);
  }, [selectedOrgId, loadFeatureSettings, loadCreditStatus]);

  const updateRowLocal = (featureKey: string, patch: Partial<FeatureRow>) => {
    setRows((prev) => prev.map((r) => (r.feature_key === featureKey ? ({ ...r, ...patch } as FeatureRow) : r)));
  };

  const downloadAiBackup = async () => {
    if (!selectedOrgId) return;
    const url = new URL('/api/admin/ai/brain-export', window.location.origin);

    const res = await fetch(url.toString(), {
      headers: selectedOrgKey ? { 'x-org-id': selectedOrgKey } : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'שגיאה ביצוא הגדרות AI');
    }

    const blob = await res.blob();
    const cd = res.headers.get('content-disposition') || '';
    const match = cd.match(/filename="?([^";]+)"?/i);
    const filename = match?.[1] || 'ai-brain-export.json';

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const saveRow = async (row: FeatureRow) => {
    setSavingKey(row.feature_key);
    try {
      const res = await fetch('/api/admin/ai/feature-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(selectedOrgKey ? { 'x-org-id': selectedOrgKey } : {}) },
        body: JSON.stringify({
          feature_key: row.feature_key,
          enabled: row.enabled,
          primary_provider: row.primary_provider,
          primary_model: row.primary_model,
          fallback_provider: row.fallback_provider,
          fallback_model: row.fallback_model,
          base_prompt: row.base_prompt ?? null,
          reserve_cost_cents: row.reserve_cost_cents,
          timeout_ms: row.timeout_ms,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'שגיאה בשמירה');
      if (data.row?.feature_key) {
        updateRowLocal(String(data.row.feature_key), data.row);
      }
    } finally {
      setSavingKey(null);
    }
  };

  const runIngest = async () => {
    if (!selectedOrgId) return;
    setRunningIngest(true);
    try {
      const res = await fetch('/api/admin/ai/ingest-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(selectedOrgKey ? { 'x-org-id': selectedOrgKey } : {}) },
        body: JSON.stringify({ limitPerType: 100 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'שגיאה בהרצת אינדוקס');
      alert(`אינדוקס הסתיים\n\nSystem Leads: ${data.systemLeads?.succeeded || 0}/${data.systemLeads?.attempted || 0}\nNexus Clients: ${data.nexusClients?.succeeded || 0}/${data.nexusClients?.attempted || 0}`);
      await loadCreditStatus(selectedOrgId);
    } catch (e: unknown) {
      alert(String(e instanceof Error ? e.message : e));
    } finally {
      setRunningIngest(false);
    }
  };

  const adjustCredits = async (deltaCents: number) => {
    if (!selectedOrgId) return;
    const res = await fetch('/api/admin/ai/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(selectedOrgKey ? { 'x-org-id': selectedOrgKey } : {}) },
      body: JSON.stringify({ deltaCents }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'שגיאה בעדכון קרדיטים');
    await loadCreditStatus(selectedOrgId);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {!hideHeader ? (
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 bg-gradient-to-r from-slate-900 via-emerald-700 to-teal-700 bg-clip-text text-transparent">
            מוח ה-AI
          </h1>
          <p className="text-slate-600 text-lg">שליטה על מודלים, פרומפטים, קרדיטים ואינדוקס היסטוריה.</p>
        </div>
      ) : null}

      <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <Zap size={18} className="text-emerald-600" />
          <h2 className="text-slate-900 font-bold">בחירת ארגון</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={orgQuery}
            onChange={(e) => setOrgQuery(e.target.value)}
            placeholder="חיפוש ארגון..."
            className="bg-white/80 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200/60"
          />
          <Button
            onClick={() => loadOrganizations()}
            disabled={loadingOrgs}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {loadingOrgs ? (
              <span className="inline-flex items-center gap-2">
                <Skeleton className="w-3.5 h-3.5 rounded-full bg-white/30" /> טוען...
              </span>
            ) : (
              'טען ארגונים'
            )}
          </Button>
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="bg-white/80 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200/60"
          >
            <option value="">בחר ארגון...</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}{o.slug ? ` (${o.slug})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            onClick={runIngest}
            disabled={!selectedOrgId || runningIngest}
          >
            {runningIngest ? (
              <span className="inline-flex items-center gap-2">
                <Skeleton className="w-3.5 h-3.5 rounded-full bg-white/30" /> מריץ...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Play size={14} /> הרץ אינדוקס היסטוריה
              </span>
            )}
          </Button>

          <Button
            onClick={async () => {
              try {
                await adjustCredits(1000);
                alert('נוספו 10₪ קרדיטים (1000 סנט)');
              } catch (e: unknown) {
                alert(String(e instanceof Error ? e.message : e));
              }
            }}
            disabled={!selectedOrgId}
            className="bg-amber-600 hover:bg-amber-700"
          >
            הוסף 10₪ קרדיטים
          </Button>

          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await downloadAiBackup();
              } catch (e: unknown) {
                alert(String(e instanceof Error ? e.message : e));
              }
            }}
            disabled={!selectedOrgId}
          >
            <span className="inline-flex items-center gap-2"><Download size={14} /> גיבוי הגדרות AI</span>
          </Button>

          <div className="text-xs text-slate-600 bg-white/80 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              יתרה:{' '}
              <span className="text-slate-900">
                {creditStatus && (creditStatus.quota_cents !== undefined || creditStatus.used_cents !== undefined)
                  ? `${creditStatus.remaining_cents ?? '—'} / ${creditStatus.quota_cents ?? '—'} (בשימוש: ${creditStatus.used_cents ?? '—'})`
                  : 'לא זמין'}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => (selectedOrgId ? loadCreditStatus(selectedOrgId) : null)}
              disabled={!selectedOrgId}
              aria-label="רענן יתרה"
              className="h-9 w-9 p-0"
            >
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>
      </div>

      {selectedOrgId && (
        <div className="mt-6 bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="text-slate-900 font-bold">הגדרות AI (ai_feature_settings)</div>
            <div className="flex items-center gap-2">
              <input
                value={featureQuery}
                onChange={(e) => setFeatureQuery(e.target.value)}
                placeholder="סינון לפי feature_key..."
                className="bg-white/80 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200/60"
              />
              <Button variant="secondary" size="sm" onClick={() => loadFeatureSettings(selectedOrgId)} disabled={loadingRows}>
                רענן
              </Button>
            </div>
          </div>

          {loadingRows ? (
            <div className="text-slate-600 text-sm inline-flex items-center gap-2"><Skeleton className="w-3.5 h-3.5 rounded-full" /> טוען...</div>
          ) : rows.length === 0 ? (
            <div className="text-slate-600 text-sm">אין רשומות.</div>
          ) : (
            <div className="space-y-4">
              {rows.map((r) => (
                <div key={r.feature_key} className="bg-white/80 border border-slate-200 rounded-2xl p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="text-slate-900 font-bold text-sm">{r.feature_key}</div>
                      <div className="text-[11px] text-slate-500">org: {selectedOrg?.name || selectedOrgId}</div>
                    </div>

                    <Button
                      onClick={() => saveRow(r)}
                      disabled={savingKey === r.feature_key}
                      className="bg-emerald-600/70 hover:bg-emerald-600 text-white"
                      size="sm"
                    >
                      {savingKey === r.feature_key ? <span className="inline-flex items-center gap-2"><Skeleton className="w-3.5 h-3.5 rounded-full bg-white/30" /> שומר...</span> : <span className="inline-flex items-center gap-2"><Save size={14} /> שמור</span>}
                    </Button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="text-xs text-slate-700 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(r.enabled)}
                        onChange={(e) => updateRowLocal(r.feature_key, { enabled: e.target.checked })}
                      />
                      פעיל
                    </label>

                    <input
                      value={r.primary_provider || ''}
                      onChange={(e) => updateRowLocal(r.feature_key, { primary_provider: e.target.value })}
                      placeholder="primary_provider"
                      className="bg-white/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none"
                    />
                    <div className="grid grid-cols-1 gap-2">
                      <select
                        value={knownModels.includes(r.primary_model) ? r.primary_model : ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!v) return;
                          updateRowLocal(r.feature_key, { primary_model: v });
                        }}
                        className="bg-white/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                      >
                        <option value="">בחר מודל מהרשימה (אופציונלי)</option>
                        {knownModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <input
                        value={r.primary_model || ''}
                        onChange={(e) => updateRowLocal(r.feature_key, { primary_model: e.target.value })}
                        placeholder="primary_model (אפשר להקליד חופשי)"
                        className="bg-white/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none"
                      />
                    </div>

                    <input
                      value={String(r.reserve_cost_cents ?? '')}
                      onChange={(e) => updateRowLocal(r.feature_key, { reserve_cost_cents: Math.max(0, Math.floor(Number(e.target.value || 0))) })}
                      placeholder="reserve_cost_cents"
                      className="bg-white/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none"
                    />
                    <input
                      value={String(r.timeout_ms ?? '')}
                      onChange={(e) => updateRowLocal(r.feature_key, { timeout_ms: Math.max(1000, Math.floor(Number(e.target.value || 0))) })}
                      placeholder="timeout_ms"
                      className="bg-white/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none"
                    />
                    <input
                      value={r.fallback_provider || ''}
                      onChange={(e) => updateRowLocal(r.feature_key, { fallback_provider: e.target.value || null })}
                      placeholder="fallback_provider"
                      className="bg-white/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none"
                    />

                    <input
                      value={r.fallback_model || ''}
                      onChange={(e) => updateRowLocal(r.feature_key, { fallback_model: e.target.value || null })}
                      placeholder="fallback_model"
                      className="bg-white/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none"
                    />
                  </div>

                  <textarea
                    value={r.base_prompt ?? ''}
                    onChange={(e) => updateRowLocal(r.feature_key, { base_prompt: e.target.value })}
                    placeholder="base_prompt (אופציונלי)"
                    className="mt-3 w-full bg-white/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none min-h-[120px]"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
