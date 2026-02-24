'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Download, Play, RefreshCw, Save, Plus, Trash2, Key, Tag, Settings, CircleCheck, CircleAlert, ToggleLeft, ToggleRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeletons';
import { Button } from '@/components/ui/button';
import { CustomSelect } from '@/components/CustomSelect';
import { useData } from '@/context/DataContext';

type CreditStatus = {
  quota_cents?: number;
  used_cents?: number;
  remaining_cents?: number;
};

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

type ProviderKeyRow = {
  id: string;
  provider: string;
  organization_id: string | null;
  api_key_masked: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

type ModelAliasRow = {
  id: string;
  provider: string;
  model: string;
  organization_id: string | null;
  display_name: string;
  created_at: string;
  updated_at: string;
};

type TabType = 'features' | 'providers' | 'aliases';

export const AiBrainPanelV2: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
  const [activeTab, setActiveTab] = useState<TabType>('features');
  const [orgs, setOrgs] = useState<OrganizationLite[]>([]);
  const [orgQuery, setOrgQuery] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  const [featureQuery, setFeatureQuery] = useState('');
  const [featureRows, setFeatureRows] = useState<FeatureRow[]>([]);
  const [providerKeys, setProviderKeys] = useState<ProviderKeyRow[]>([]);
  const [modelAliases, setModelAliases] = useState<ModelAliasRow[]>([]);

  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [loadingAliases, setLoadingAliases] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [runningIngest, setRunningIngest] = useState(false);
  const [creditStatus, setCreditStatus] = useState<CreditStatus | null>(null);
  const [showNewFeatureForm, setShowNewFeatureForm] = useState(false);
  const [newFeatureKey, setNewFeatureKey] = useState('');
  const { addToast } = useData();

  const [newProviderKey, setNewProviderKey] = useState({ provider: '', api_key: '', scope: 'org' });
  const [newAlias, setNewAlias] = useState({ provider: '', model: '', display_name: '', scope: 'org' });

  const providers = useMemo(
    () => [
      { value: 'google', label: 'Google (Gemini)' },
      { value: 'anthropic', label: 'Anthropic (Claude)' },
      { value: 'deepgram', label: 'Deepgram (Transcription)' },
      { value: 'openai', label: 'OpenAI (GPT/Embeddings)' },
      { value: 'groq', label: 'Groq (Fast Inference)' },
    ],
    []
  );

  const modelsByProvider = useMemo(
    () => ({
      google: ['gemini-2.0-flash-exp', 'gemini-2.0-pro', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'],
      anthropic: ['claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
      deepgram: ['nova-2', 'nova', 'whisper'],
      openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'text-embedding-3-small', 'text-embedding-3-large'],
      groq: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    }),
    []
  );

  const getModelsForProvider = (provider: string) => {
    return modelsByProvider[provider as keyof typeof modelsByProvider] || [];
  };

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

  const loadFeatureSettings = useCallback(async () => {
    if (!selectedOrgId) return;
    setLoadingFeatures(true);
    try {
      const url = new URL('/api/admin/ai/feature-settings', window.location.origin);
      if (featureQuery.trim()) url.searchParams.set('q', featureQuery.trim());
      url.searchParams.set('limit', '500');

      const res = await fetch(url.toString(), {
        headers: selectedOrgKey ? { 'x-org-id': selectedOrgKey } : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'שגיאה בטעינת הגדרות AI');
      setFeatureRows(Array.isArray(data.rows) ? data.rows : []);
    } finally {
      setLoadingFeatures(false);
    }
  }, [featureQuery, selectedOrgKey, selectedOrgId]);

  const loadProviderKeys = useCallback(async (scope: 'org' | 'global' = 'org') => {
    if (!selectedOrgId) return;
    setLoadingProviders(true);
    try {
      const url = new URL('/api/admin/ai/provider-keys', window.location.origin);
      url.searchParams.set('scope', scope);

      const res = await fetch(url.toString(), {
        headers: selectedOrgKey ? { 'x-org-id': selectedOrgKey } : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'שגיאה בטעינת API Keys');
      setProviderKeys(Array.isArray(data.rows) ? data.rows : []);
    } finally {
      setLoadingProviders(false);
    }
  }, [selectedOrgKey, selectedOrgId]);

  const loadModelAliases = useCallback(async (scope: 'org' | 'global' = 'org') => {
    if (!selectedOrgId) return;
    setLoadingAliases(true);
    try {
      const url = new URL('/api/admin/ai/model-aliases', window.location.origin);
      url.searchParams.set('scope', scope);

      const res = await fetch(url.toString(), {
        headers: selectedOrgKey ? { 'x-org-id': selectedOrgKey } : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'שגיאה בטעינת שמות מודלים');
      setModelAliases(Array.isArray(data.rows) ? data.rows : []);
    } finally {
      setLoadingAliases(false);
    }
  }, [selectedOrgKey, selectedOrgId]);

  const loadCreditStatus = useCallback(async () => {
    if (!selectedOrgId) return;
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
  }, [selectedOrgKey, selectedOrgId]);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    if (!selectedOrgId) return;
    if (activeTab === 'features') void loadFeatureSettings();
    if (activeTab === 'providers') void loadProviderKeys();
    if (activeTab === 'aliases') void loadModelAliases();
    void loadCreditStatus();
  }, [selectedOrgId, activeTab, loadFeatureSettings, loadProviderKeys, loadModelAliases, loadCreditStatus]);

  const updateFeatureLocal = (featureKey: string, patch: Partial<FeatureRow>) => {
    setFeatureRows((prev) => prev.map((r) => (r.feature_key === featureKey ? ({ ...r, ...patch } as FeatureRow) : r)));
  };

  const saveFeature = async (row: FeatureRow) => {
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
        updateFeatureLocal(String(data.row.feature_key), data.row);
      }
      addToast('הגדרות נשמרו בהצלחה! (Cache נוקה אוטומטית)', 'success');
    } catch (e: unknown) {
      addToast(String(e instanceof Error ? e.message : e), 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const createNewFeature = async () => {
    const key = newFeatureKey.trim();
    if (!key) {
      addToast('יש להזין מזהה פיצ\'ר (feature_key)', 'error');
      return;
    }
    const newRow: FeatureRow = {
      id: '',
      organization_id: selectedOrgId,
      feature_key: key,
      enabled: true,
      primary_provider: 'google',
      primary_model: 'gemini-2.5-flash',
      fallback_provider: null,
      fallback_model: null,
      base_prompt: null,
      reserve_cost_cents: 25,
      timeout_ms: 30000,
    };
    await saveFeature(newRow);
    setNewFeatureKey('');
    setShowNewFeatureForm(false);
    await loadFeatureSettings();
  };

  const addProviderKey = async () => {
    if (!newProviderKey.provider || !newProviderKey.api_key) {
      addToast('יש למלא Provider ו-API Key', 'error');
      return;
    }
    try {
      const res = await fetch('/api/admin/ai/provider-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(selectedOrgKey ? { 'x-org-id': selectedOrgKey } : {}) },
        body: JSON.stringify(newProviderKey),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'שגיאה בהוספת API Key');
      setNewProviderKey({ provider: '', api_key: '', scope: 'org' });
      await loadProviderKeys(newProviderKey.scope as 'org' | 'global');
      addToast('API Key נוסף בהצלחה! (Cache נוקה אוטומטית)', 'success');
    } catch (e: unknown) {
      addToast(String(e instanceof Error ? e.message : e), 'error');
    }
  };

  const deleteProviderKey = async (id: string) => {
    if (!confirm('למחוק API Key זה?')) return;
    try {
      const res = await fetch(`/api/admin/ai/provider-keys?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('שגיאה במחיקה');
      await loadProviderKeys();
      addToast('נמחק בהצלחה!', 'success');
    } catch (e: unknown) {
      addToast(String(e instanceof Error ? e.message : e), 'error');
    }
  };

  const toggleProviderKey = async (key: ProviderKeyRow) => {
    try {
      const res = await fetch('/api/admin/ai/provider-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(selectedOrgKey ? { 'x-org-id': selectedOrgKey } : {}) },
        body: JSON.stringify({ provider: key.provider, api_key: '__KEEP__', enabled: !key.enabled, scope: key.organization_id ? 'org' : 'global' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'שגיאה בעדכון');
      setProviderKeys((prev) => prev.map((k) => k.id === key.id ? { ...k, enabled: !k.enabled } : k));
      addToast(`${key.provider} ${!key.enabled ? 'הופעל' : 'הושבת'}`, 'success');
    } catch (e: unknown) {
      addToast(String(e instanceof Error ? e.message : e), 'error');
    }
  };

  const addModelAlias = async () => {
    if (!newAlias.provider || !newAlias.model || !newAlias.display_name) {
      addToast('יש למלא Provider, Model ו-Display Name', 'error');
      return;
    }
    try {
      const res = await fetch('/api/admin/ai/model-aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(selectedOrgKey ? { 'x-org-id': selectedOrgKey } : {}) },
        body: JSON.stringify(newAlias),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'שגיאה בהוספת Alias');
      setNewAlias({ provider: '', model: '', display_name: '', scope: 'org' });
      await loadModelAliases(newAlias.scope as 'org' | 'global');
      addToast('Alias נוסף בהצלחה!', 'success');
    } catch (e: unknown) {
      addToast(String(e instanceof Error ? e.message : e), 'error');
    }
  };

  const deleteModelAlias = async (id: string) => {
    if (!confirm('למחוק Alias זה?')) return;
    try {
      const res = await fetch(`/api/admin/ai/model-aliases?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('שגיאה במחיקה');
      await loadModelAliases();
      addToast('נמחק בהצלחה!', 'success');
    } catch (e: unknown) {
      addToast(String(e instanceof Error ? e.message : e), 'error');
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
      addToast(`אינדוקס הסתיים — Leads: ${data.systemLeads?.succeeded || 0}/${data.systemLeads?.attempted || 0}, Clients: ${data.nexusClients?.succeeded || 0}/${data.nexusClients?.attempted || 0}`, 'success');
      await loadCreditStatus();
    } catch (e: unknown) {
      addToast(String(e instanceof Error ? e.message : e), 'error');
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
    await loadCreditStatus();
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

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {!hideHeader ? (
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 bg-gradient-to-r from-slate-900 via-emerald-700 to-teal-700 bg-clip-text text-transparent">
            מוח ה-AI - שליטה מלאה
          </h1>
          <p className="text-slate-600 text-lg">ניהול Providers, מודלים, פיצ'רים וקרדיטים במקום אחד.</p>
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
          <CustomSelect
            value={selectedOrgId}
            onChange={(val) => setSelectedOrgId(val)}
            placeholder="בחר ארגון..."
            options={orgs.map((o) => ({ value: o.id, label: `${o.name}${o.slug ? ` (${o.slug})` : ''}` }))}
          />
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
                addToast('נוספו 10₪ קרדיטים', 'success');
              } catch (e: unknown) {
                addToast(String(e instanceof Error ? e.message : e), 'error');
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
                addToast('גיבוי הורד בהצלחה', 'success');
              } catch (e: unknown) {
                addToast(String(e instanceof Error ? e.message : e), 'error');
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
              onClick={() => (selectedOrgId ? loadCreditStatus() : null)}
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
        <div className="mt-6">
          <div className="flex gap-2 mb-4">
            <Button
              onClick={() => setActiveTab('features')}
              variant={activeTab === 'features' ? 'default' : 'outline'}
              className="flex items-center gap-2"
            >
              <Settings size={16} /> הגדרות פיצ'רים
            </Button>
            <Button
              onClick={() => setActiveTab('providers')}
              variant={activeTab === 'providers' ? 'default' : 'outline'}
              className="flex items-center gap-2"
            >
              <Key size={16} /> API Keys
            </Button>
            <Button
              onClick={() => setActiveTab('aliases')}
              variant={activeTab === 'aliases' ? 'default' : 'outline'}
              className="flex items-center gap-2"
            >
              <Tag size={16} /> שמות מודלים
            </Button>
          </div>

          {activeTab === 'features' && (
            <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="text-slate-900 font-bold">הגדרות AI Features</div>
                <div className="flex items-center gap-2">
                  <input
                    value={featureQuery}
                    onChange={(e) => setFeatureQuery(e.target.value)}
                    placeholder="סינון לפי feature_key..."
                    className="bg-white/80 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200/60"
                  />
                  <Button variant="secondary" size="sm" onClick={() => loadFeatureSettings()} disabled={loadingFeatures}>
                    רענן
                  </Button>
                  <Button size="sm" onClick={() => setShowNewFeatureForm(!showNewFeatureForm)} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus size={14} className="mr-1" /> פיצ'ר חדש
                  </Button>
                </div>
              </div>

              {showNewFeatureForm && (
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 mb-4">
                  <div className="text-sm font-bold text-emerald-900 mb-3">יצירת Feature Setting חדש</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      value={newFeatureKey}
                      onChange={(e) => setNewFeatureKey(e.target.value)}
                      placeholder="למשל: client_os.meetings.live_transcribe"
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm col-span-2"
                    />
                    <Button onClick={createNewFeature} className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus size={14} className="mr-1" /> צור
                    </Button>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2">ברירת מחדל: Google Gemini 2.5 Flash, timeout 30s, 25 סנט לשימוש</div>
                </div>
              )}

              {loadingFeatures ? (
                <div className="text-slate-600 text-sm inline-flex items-center gap-2"><Skeleton className="w-3.5 h-3.5 rounded-full" /> טוען...</div>
              ) : featureRows.length === 0 ? (
                <div className="text-slate-600 text-sm">אין רשומות.</div>
              ) : (
                <div className="space-y-4">
                  {featureRows.map((r) => (
                    <div key={r.feature_key} className="bg-white/80 border border-slate-200 rounded-2xl p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <div className="text-slate-900 font-bold text-sm">{r.feature_key}</div>
                          <div className="text-[11px] text-slate-500">org: {selectedOrg?.name || selectedOrgId}</div>
                        </div>

                        <Button
                          onClick={() => saveFeature(r)}
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
                            onChange={(e) => updateFeatureLocal(r.feature_key, { enabled: e.target.checked })}
                          />
                          פעיל
                        </label>

                        <CustomSelect
                          value={r.primary_provider || ''}
                          onChange={(val) => {
                            if (!val) return;
                            updateFeatureLocal(r.feature_key, { primary_provider: val });
                          }}
                          placeholder="בחר Provider ראשי"
                          options={providers}
                        />
                        <div className="grid grid-cols-1 gap-2">
                          <CustomSelect
                            value={getModelsForProvider(r.primary_provider).includes(r.primary_model) ? r.primary_model : ''}
                            onChange={(val) => {
                              if (!val) return;
                              updateFeatureLocal(r.feature_key, { primary_model: val });
                            }}
                            placeholder={`בחר מודל ${r.primary_provider ? `(${r.primary_provider})` : ''}`}
                            options={getModelsForProvider(r.primary_provider).map((m) => ({ value: m, label: m }))}
                          />
                          <input
                            value={r.primary_model || ''}
                            onChange={(e) => updateFeatureLocal(r.feature_key, { primary_model: e.target.value })}
                            placeholder="או הקלד שם מודל חופשי"
                            className="bg-white/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-500 block mb-1">עלות לשימוש (סנט)</label>
                          <input
                            value={String(r.reserve_cost_cents ?? '')}
                            onChange={(e) => updateFeatureLocal(r.feature_key, { reserve_cost_cents: Math.max(0, Math.floor(Number(e.target.value || 0))) })}
                            placeholder="25"
                            className="bg-white/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none w-full"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block mb-1">Timeout (מילישניות)</label>
                          <input
                            value={String(r.timeout_ms ?? '')}
                            onChange={(e) => updateFeatureLocal(r.feature_key, { timeout_ms: Math.max(1000, Math.floor(Number(e.target.value || 0))) })}
                            placeholder="30000"
                            className="bg-white/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none w-full"
                          />
                        </div>
                        <CustomSelect
                          value={r.fallback_provider || ''}
                          onChange={(val) => updateFeatureLocal(r.feature_key, { fallback_provider: val || null })}
                          placeholder="Fallback Provider (אופציונלי)"
                          options={[{ value: '', label: 'ללא' }, ...providers]}
                        />

                        <div className="grid grid-cols-1 gap-2">
                          <CustomSelect
                            value={r.fallback_provider && getModelsForProvider(r.fallback_provider).includes(r.fallback_model || '') ? r.fallback_model || '' : ''}
                            onChange={(val) => updateFeatureLocal(r.feature_key, { fallback_model: val || null })}
                            placeholder={`Fallback Model ${r.fallback_provider ? `(${r.fallback_provider})` : ''}`}
                            options={r.fallback_provider ? getModelsForProvider(r.fallback_provider).map((m) => ({ value: m, label: m })) : []}
                          />
                          <input
                            value={r.fallback_model || ''}
                            onChange={(e) => updateFeatureLocal(r.feature_key, { fallback_model: e.target.value || null })}
                            placeholder="או הקלד שם מודל fallback חופשי"
                            className="bg-white/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none"
                          />
                        </div>
                      </div>

                      <textarea
                        value={r.base_prompt ?? ''}
                        onChange={(e) => updateFeatureLocal(r.feature_key, { base_prompt: e.target.value })}
                        placeholder="base_prompt (אופציונלי)"
                        className="mt-3 w-full bg-white/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none min-h-[120px]"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'providers' && (
            <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl">
              <div className="text-slate-900 font-bold mb-4">ניהול API Keys</div>

              <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 mb-4">
                <div className="text-sm font-bold text-emerald-900 mb-3">הוסף API Key חדש</div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <CustomSelect
                    value={newProviderKey.provider}
                    onChange={(val) => setNewProviderKey({ ...newProviderKey, provider: val })}
                    placeholder="בחר Provider"
                    options={providers}
                  />
                  <input
                    value={newProviderKey.api_key}
                    onChange={(e) => setNewProviderKey({ ...newProviderKey, api_key: e.target.value })}
                    placeholder="API Key"
                    type="password"
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  />
                  <CustomSelect
                    value={newProviderKey.scope}
                    onChange={(val) => setNewProviderKey({ ...newProviderKey, scope: val })}
                    placeholder="Scope"
                    options={[
                      { value: 'org', label: 'ארגון נוכחי' },
                      { value: 'global', label: 'גלובלי (כל הארגונים)' },
                    ]}
                  />
                  <Button onClick={addProviderKey} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus size={14} className="mr-1" /> הוסף
                  </Button>
                </div>
              </div>

              {loadingProviders ? (
                <div className="text-slate-600 text-sm">טוען...</div>
              ) : providerKeys.length === 0 ? (
                <div className="text-slate-600 text-sm">אין API Keys.</div>
              ) : (
                <div className="space-y-3">
                  {providerKeys.map((k) => (
                    <div key={k.id} className={`bg-white border rounded-xl p-3 flex items-center justify-between ${k.enabled ? 'border-emerald-200' : 'border-red-200 bg-red-50/30'}`}>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => toggleProviderKey(k)} className="text-slate-500 hover:text-slate-700">
                          {k.enabled ? <ToggleRight size={24} className="text-emerald-600" /> : <ToggleLeft size={24} className="text-slate-400" />}
                        </button>
                        <div>
                          <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            {k.provider}
                            {k.enabled ? <CircleCheck size={14} className="text-emerald-600" /> : <CircleAlert size={14} className="text-red-400" />}
                          </div>
                          <div className="text-xs text-slate-500">Key: {k.api_key_masked} | {k.organization_id ? 'ארגוני' : 'גלובלי'} | {k.enabled ? 'פעיל' : 'מושבת'}</div>
                        </div>
                      </div>
                      <Button onClick={() => deleteProviderKey(k.id)} variant="destructive" size="sm">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'aliases' && (
            <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl">
              <div className="text-slate-900 font-bold mb-4">ניהול שמות מודלים (Aliases)</div>

              <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4 mb-4">
                <div className="text-sm font-bold text-indigo-900 mb-3">הוסף Alias חדש</div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <CustomSelect
                    value={newAlias.provider}
                    onChange={(val) => setNewAlias({ ...newAlias, provider: val })}
                    placeholder="בחר Provider"
                    options={providers}
                  />
                  <input
                    value={newAlias.model}
                    onChange={(e) => setNewAlias({ ...newAlias, model: e.target.value })}
                    placeholder="Model ID"
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  />
                  <input
                    value={newAlias.display_name}
                    onChange={(e) => setNewAlias({ ...newAlias, display_name: e.target.value })}
                    placeholder="שם תצוגה"
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  />
                  <CustomSelect
                    value={newAlias.scope}
                    onChange={(val) => setNewAlias({ ...newAlias, scope: val })}
                    placeholder="Scope"
                    options={[
                      { value: 'org', label: 'ארגון נוכחי' },
                      { value: 'global', label: 'גלובלי' },
                    ]}
                  />
                  <Button onClick={addModelAlias} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus size={14} className="mr-1" /> הוסף
                  </Button>
                </div>
              </div>

              {loadingAliases ? (
                <div className="text-slate-600 text-sm">טוען...</div>
              ) : modelAliases.length === 0 ? (
                <div className="text-slate-600 text-sm">אין Aliases.</div>
              ) : (
                <div className="space-y-3">
                  {modelAliases.map((a) => (
                    <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{a.display_name}</div>
                        <div className="text-xs text-slate-500">{a.provider} / {a.model} | {a.organization_id ? 'ארגוני' : 'גלובלי'}</div>
                      </div>
                      <Button onClick={() => deleteModelAlias(a.id)} variant="destructive" size="sm">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
