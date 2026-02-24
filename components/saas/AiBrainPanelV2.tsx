'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Download, Play, RefreshCw, Save, Plus, Trash2, Key, Tag, Settings, CircleCheck, CircleAlert, ToggleLeft, ToggleRight, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeletons';
import { Button } from '@/components/ui/button';
import { CustomSelect } from '@/components/CustomSelect';
import { useData } from '@/context/DataContext';

// ─── מפת פיצ'רי AI ידועים (עברית) ────────────────────────────
const KNOWN_FEATURES: Record<string, { label: string; description: string; module: string }> = {
  'system.leads.score': { label: 'ניקוד לידים', description: 'ניתוח AI וניקוד לפי סבירות סגירה', module: 'מכירות' },
  'system.calls.transcription': { label: 'תמלול שיחות', description: 'המרת הקלטות שיחות מכירה לטקסט', module: 'מכירות' },
  'system.calls.objection_suggestions': { label: 'מענה להתנגדויות', description: 'הצעות AI להתמודדות עם התנגדויות', module: 'מכירות' },
  'system.calls.live_insight': { label: 'תובנות חיות בשיחה', description: 'ניתוח AI בזמן אמת במהלך שיחה', module: 'מכירות' },
  'client_os.meetings.transcription': { label: 'תמלול פגישות', description: 'המרת הקלטות פגישות לטקסט', module: 'לקוחות' },
  'client_os.meetings.live_transcribe': { label: 'תמלול חי', description: 'תמלול בזמן אמת במהלך פגישה', module: 'לקוחות' },
  'client_os.meetings.analyze': { label: 'ניתוח פגישות', description: 'ניתוח AI מעמיק של תוכן פגישה', module: 'לקוחות' },
  'client_os.meetings.analyze_transcript': { label: 'ניתוח תמליל', description: 'ניתוח תמליל פגישה קיים', module: 'לקוחות' },
  'client_os.meetings.live_insight': { label: 'תובנות חיות בפגישה', description: 'תובנות AI בזמן אמת בפגישה', module: 'לקוחות' },
  'client_os.meetings.memory_ingest': { label: 'זיכרון פגישות', description: 'שמירת תוכן פגישות בזיכרון AI', module: 'לקוחות' },
  'client_os.email.smart_reply': { label: 'תגובה חכמה למייל', description: 'יצירת תגובות אוטומטיות למיילים', module: 'לקוחות' },
  'client_os.ai.success_recommendation': { label: 'המלצת הצלחה', description: 'המלצות AI לשיפור הצלחת לקוח', module: 'לקוחות' },
  'operations.summary': { label: 'סיכום הזמנות עבודה', description: 'סיכום AI של הזמנות עבודה', module: 'תפעול' },
  'operations.routing': { label: 'ניתוב טכנאי חכם', description: 'התאמת טכנאי מתאים להזמנת עבודה', module: 'תפעול' },
  'social.sales_advisor': { label: 'יועץ מכירות', description: 'יועץ AI לצוות מכירות ושיווק', module: 'שיווק' },
  'ai.chat': { label: 'צ\'אט AI', description: 'שיחה חופשית עם העוזר הדיגיטלי', module: 'כללי' },
  'ai.analyze': { label: 'ניתוח AI כללי', description: 'ניתוח תוכן כללי באמצעות AI', module: 'כללי' },
  'ai.memory.dna_ingest': { label: 'DNA ארגוני', description: 'הטמעת מידע ארגוני בזיכרון AI', module: 'כללי' },
  'ai.vision.identify': { label: 'זיהוי חזותי', description: 'זיהוי אובייקטים ותוכן מתמונות', module: 'כללי' },
  'pricing.helper': { label: 'עוזר תמחור', description: 'עזרה בבחירת חבילה מתאימה', module: 'כללי' },
  'script_rewrite': { label: 'שכתוב תסריטים', description: 'שכתוב ושיפור תסריטי מכירה', module: 'כללי' },
  'task-time-estimate': { label: 'הערכת זמן משימה', description: 'הערכת זמן ביצוע משימות', module: 'כללי' },
  'workspaces.transcription': { label: 'תמלול כללי', description: 'שירות תמלול כללי', module: 'כללי' },
};

const MODULE_ORDER = ['מכירות', 'לקוחות', 'תפעול', 'שיווק', 'כללי'];

const MODULE_BADGE_COLORS: Record<string, string> = {
  'מכירות': 'bg-blue-100 text-blue-700',
  'לקוחות': 'bg-emerald-100 text-emerald-700',
  'תפעול': 'bg-amber-100 text-amber-700',
  'שיווק': 'bg-purple-100 text-purple-700',
  'כללי': 'bg-slate-100 text-slate-700',
};

function getFeatureMeta(key: string): { label: string; description: string; module: string } {
  return KNOWN_FEATURES[key] || { label: key, description: '', module: 'אחר' };
}

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

type TabType = 'features' | 'prompts' | 'providers' | 'aliases';

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
  const [envStatus, setEnvStatus] = useState<Record<string, { configured: boolean; envVar: string }> | null>(null);

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
    void (async () => {
      try {
        const res = await fetch('/api/admin/ai/env-status');
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.providers) setEnvStatus(data.providers);
      } catch { /* ignore */ }
    })();
  }, [loadOrganizations]);

  useEffect(() => {
    if (orgs.length > 0 && !selectedOrgId) {
      setSelectedOrgId(orgs[0].id);
    }
  }, [orgs, selectedOrgId]);

  useEffect(() => {
    if (!selectedOrgId) return;
    if (activeTab === 'features' || activeTab === 'prompts') void loadFeatureSettings();
    if (activeTab === 'providers') void loadProviderKeys();
    if (activeTab === 'aliases') void loadModelAliases();
    void loadCreditStatus();
  }, [selectedOrgId, activeTab, loadFeatureSettings, loadProviderKeys, loadModelAliases, loadCreditStatus]);

  const featuresByModule = useMemo(() => {
    const groups: Record<string, FeatureRow[]> = {};
    for (const row of featureRows) {
      const meta = getFeatureMeta(row.feature_key);
      if (!groups[meta.module]) groups[meta.module] = [];
      groups[meta.module].push(row);
    }
    return groups;
  }, [featureRows]);

  const sortedModules = useMemo(() => {
    const mods = Object.keys(featuresByModule);
    return MODULE_ORDER.filter((m) => mods.includes(m)).concat(mods.filter((m) => !MODULE_ORDER.includes(m)));
  }, [featuresByModule]);

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
      {!hideHeader && (
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-1 bg-gradient-to-r from-slate-900 via-emerald-700 to-teal-700 bg-clip-text text-transparent">
            ניהול AI — שליטה מלאה
          </h1>
          <p className="text-slate-500">ספקים, מודלים, פרומפטים וקרדיטים — הכל במקום אחד.</p>
        </div>
      )}

      {/* ── בר עליון: ארגון + קרדיטים + פעולות ── */}
      <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-4 rounded-2xl shadow-xl mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Zap size={16} className="text-emerald-600" />
            <span className="text-sm font-bold text-slate-700">ארגון:</span>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 w-full">
            <div className="sm:col-span-2">
              <CustomSelect
                value={selectedOrgId}
                onChange={(val) => setSelectedOrgId(val)}
                placeholder={loadingOrgs ? 'טוען ארגונים...' : 'בחר ארגון...'}
                options={orgs.map((o) => ({ value: o.id, label: `${o.name}${o.slug ? ` (${o.slug})` : ''}` }))}
              />
            </div>
            <div className="text-xs text-slate-600 bg-white/80 border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <span>יתרה:</span>
              <span className="text-slate-900 font-bold">
                {creditStatus && creditStatus.remaining_cents !== undefined ? `${creditStatus.remaining_cents} / ${creditStatus.quota_cents ?? '—'}` : '—'}
              </span>
              <Button type="button" variant="outline" size="sm" onClick={() => { if (selectedOrgId) void loadCreditStatus(); }} disabled={!selectedOrgId} className="h-7 w-7 p-0 mr-auto">
                <RefreshCw size={12} />
              </Button>
            </div>
            <Button onClick={async () => { try { await adjustCredits(1000); addToast('נוספו 10₪ קרדיטים', 'success'); } catch (e: unknown) { addToast(String(e instanceof Error ? e.message : e), 'error'); } }} disabled={!selectedOrgId} size="sm" className="bg-amber-600 hover:bg-amber-700 text-xs h-10">
              + 10₪ קרדיטים
            </Button>
            <div className="flex gap-2">
              <Button onClick={runIngest} disabled={!selectedOrgId || runningIngest} size="sm" className="flex-1 text-xs h-10">
                <Play size={12} className="ml-1" /> {runningIngest ? 'מריץ...' : 'אינדוקס'}
              </Button>
              <Button variant="secondary" size="sm" onClick={async () => { try { await downloadAiBackup(); addToast('גיבוי הורד', 'success'); } catch (e: unknown) { addToast(String(e instanceof Error ? e.message : e), 'error'); } }} disabled={!selectedOrgId} className="text-xs h-10">
                <Download size={12} />
              </Button>
            </div>
          </div>
        </div>
        {envStatus && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">ספקים בסביבה:</span>
            {Object.entries(envStatus).map(([provider, info]) => (
              <div key={provider} className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg ${info.configured ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-500'}`}>
                {info.configured ? <CircleCheck size={12} /> : <CircleAlert size={12} />}
                {provider}
                <span className="font-normal text-[10px] opacity-70">({info.envVar})</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── טאבים — תמיד נראים ── */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <Button onClick={() => setActiveTab('features')} variant={activeTab === 'features' ? 'default' : 'outline'} className="flex items-center gap-2">
          <Settings size={16} /> הגדרות פיצ'רים
        </Button>
        <Button onClick={() => setActiveTab('prompts')} variant={activeTab === 'prompts' ? 'default' : 'outline'} className="flex items-center gap-2">
          <FileText size={16} /> פרומפטים
        </Button>
        <Button onClick={() => setActiveTab('providers')} variant={activeTab === 'providers' ? 'default' : 'outline'} className="flex items-center gap-2">
          <Key size={16} /> מפתחות API
        </Button>
        <Button onClick={() => setActiveTab('aliases')} variant={activeTab === 'aliases' ? 'default' : 'outline'} className="flex items-center gap-2">
          <Tag size={16} /> כינויי מודלים
        </Button>
      </div>

      {!selectedOrgId ? (
        <div className="bg-white/70 backdrop-blur-2xl border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <Zap size={48} className="mx-auto text-slate-300 mb-4" />
          <div className="text-lg font-bold text-slate-500">טוען ארגון...</div>
          <div className="text-sm text-slate-400 mt-2">כל הגדרות ה-AI — ספקים, מודלים, פרומפטים וקרדיטים — מנוהלות ברמת ארגון</div>
        </div>
      ) : (
        <>
          {/* ══════ טאב: הגדרות פיצ'רים ══════ */}
          {activeTab === 'features' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-lg font-black text-slate-900">הגדרות פיצ'רי AI — ספק, מודל, עלות ו-Timeout</div>
                <div className="flex items-center gap-2">
                  <input value={featureQuery} onChange={(e) => setFeatureQuery(e.target.value)} placeholder="חיפוש..." className="bg-white/80 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none w-40" />
                  <Button variant="secondary" size="sm" onClick={() => loadFeatureSettings()} disabled={loadingFeatures}><RefreshCw size={14} /></Button>
                  <Button size="sm" onClick={() => setShowNewFeatureForm(!showNewFeatureForm)} className="bg-emerald-600 hover:bg-emerald-700"><Plus size={14} className="ml-1" /> חדש</Button>
                </div>
              </div>

              {showNewFeatureForm && (
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4">
                  <div className="text-sm font-bold text-emerald-900 mb-3">יצירת Feature Setting חדש</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input value={newFeatureKey} onChange={(e) => setNewFeatureKey(e.target.value)} placeholder="למשל: client_os.meetings.live_transcribe" className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm col-span-2" />
                    <Button onClick={createNewFeature} className="bg-emerald-600 hover:bg-emerald-700"><Plus size={14} className="ml-1" /> צור</Button>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2">ברירת מחדל: Google Gemini 2.5 Flash, timeout 30s, 25 סנט</div>
                </div>
              )}

              {loadingFeatures ? (
                <div className="text-slate-600 text-sm inline-flex items-center gap-2"><Skeleton className="w-4 h-4 rounded-full" /> טוען הגדרות...</div>
              ) : featureRows.length === 0 ? (
                <div className="bg-white/70 border border-slate-200/70 rounded-2xl p-8 text-center">
                  <Settings size={32} className="mx-auto text-slate-300 mb-3" />
                  <div className="text-sm font-bold text-slate-500">אין הגדרות AI לארגון זה עדיין</div>
                  <div className="text-xs text-slate-400 mt-1">לחץ על &quot;חדש&quot; כדי להוסיף פיצ'ר AI ראשון</div>
                </div>
              ) : (
                <div className="space-y-6">
                  {sortedModules.map((mod) => (
                    <div key={mod}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${MODULE_BADGE_COLORS[mod] || 'bg-slate-100 text-slate-700'}`}>{mod}</span>
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-[11px] text-slate-400">{featuresByModule[mod]?.length || 0} פיצ'רים</span>
                      </div>
                      <div className="space-y-3">
                        {featuresByModule[mod]?.map((r) => {
                          const meta = getFeatureMeta(r.feature_key);
                          return (
                            <div key={r.feature_key} className={`bg-white border rounded-2xl p-4 transition-all ${r.enabled ? 'border-slate-200 shadow-sm' : 'border-red-200/60 bg-red-50/20'}`}>
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                                <div className="flex items-center gap-3">
                                  <input type="checkbox" checked={Boolean(r.enabled)} onChange={(e) => updateFeatureLocal(r.feature_key, { enabled: e.target.checked })} className="w-4 h-4 accent-emerald-600 shrink-0" />
                                  <div>
                                    <div className="text-sm font-black text-slate-900">{meta.label}</div>
                                    <div className="text-[11px] text-slate-400">{r.feature_key}{meta.description ? ` — ${meta.description}` : ''}</div>
                                  </div>
                                </div>
                                <Button onClick={() => saveFeature(r)} disabled={savingKey === r.feature_key} className="bg-emerald-600/80 hover:bg-emerald-600 text-white" size="sm">
                                  {savingKey === r.feature_key ? <span className="inline-flex items-center gap-1"><Skeleton className="w-3 h-3 rounded-full bg-white/30" /> שומר...</span> : <span className="inline-flex items-center gap-1"><Save size={14} /> שמור</span>}
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                  <label className="text-[11px] text-slate-500 block mb-1 font-bold">ספק ראשי</label>
                                  <CustomSelect value={r.primary_provider || ''} onChange={(val) => { if (val) updateFeatureLocal(r.feature_key, { primary_provider: val }); }} placeholder="בחר ספק" options={providers} />
                                </div>
                                <div>
                                  <label className="text-[11px] text-slate-500 block mb-1 font-bold">מודל ראשי</label>
                                  <CustomSelect value={getModelsForProvider(r.primary_provider).includes(r.primary_model) ? r.primary_model : ''} onChange={(val) => { if (val) updateFeatureLocal(r.feature_key, { primary_model: val }); }} placeholder="בחר מודל" options={getModelsForProvider(r.primary_provider).map((m) => ({ value: m, label: m }))} />
                                  <input value={r.primary_model || ''} onChange={(e) => updateFeatureLocal(r.feature_key, { primary_model: e.target.value })} placeholder="או הקלד ידנית" className="mt-1 w-full bg-white/80 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 outline-none" />
                                </div>
                                <div>
                                  <label className="text-[11px] text-slate-500 block mb-1 font-bold">ספק גיבוי</label>
                                  <CustomSelect value={r.fallback_provider || ''} onChange={(val) => updateFeatureLocal(r.feature_key, { fallback_provider: val || null })} placeholder="ללא" options={[{ value: '', label: 'ללא' }, ...providers]} />
                                </div>
                                <div>
                                  <label className="text-[11px] text-slate-500 block mb-1 font-bold">מודל גיבוי</label>
                                  <CustomSelect value={r.fallback_provider && getModelsForProvider(r.fallback_provider).includes(r.fallback_model || '') ? r.fallback_model || '' : ''} onChange={(val) => updateFeatureLocal(r.feature_key, { fallback_model: val || null })} placeholder="ללא" options={r.fallback_provider ? getModelsForProvider(r.fallback_provider).map((m) => ({ value: m, label: m })) : []} />
                                  {r.fallback_provider && (
                                    <input value={r.fallback_model || ''} onChange={(e) => updateFeatureLocal(r.feature_key, { fallback_model: e.target.value || null })} placeholder="או הקלד ידנית" className="mt-1 w-full bg-white/80 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 outline-none" />
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                                <div>
                                  <label className="text-[11px] text-slate-500 block mb-1 font-bold">עלות לשימוש (סנט)</label>
                                  <input value={String(r.reserve_cost_cents ?? '')} onChange={(e) => updateFeatureLocal(r.feature_key, { reserve_cost_cents: Math.max(0, Math.floor(Number(e.target.value || 0))) })} placeholder="25" className="w-full bg-white/80 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none" />
                                </div>
                                <div>
                                  <label className="text-[11px] text-slate-500 block mb-1 font-bold">Timeout (מ&quot;ש)</label>
                                  <input value={String(r.timeout_ms ?? '')} onChange={(e) => updateFeatureLocal(r.feature_key, { timeout_ms: Math.max(1000, Math.floor(Number(e.target.value || 0))) })} placeholder="30000" className="w-full bg-white/80 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════ טאב: פרומפטים ══════ */}
          {activeTab === 'prompts' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-black text-slate-900">פרומפטים כלליים</div>
                  <div className="text-xs text-slate-500 mt-1">עריכת הוראות AI (Base Prompt) לכל פיצ'ר — כאן שולטים על ההתנהגות של ה-AI בכל מקום במערכת.</div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => loadFeatureSettings()} disabled={loadingFeatures}><RefreshCw size={14} /></Button>
              </div>

              {loadingFeatures ? (
                <div className="text-slate-600 text-sm inline-flex items-center gap-2"><Skeleton className="w-4 h-4 rounded-full" /> טוען...</div>
              ) : featureRows.length === 0 ? (
                <div className="bg-white/70 border border-slate-200/70 rounded-2xl p-8 text-center">
                  <FileText size={32} className="mx-auto text-slate-300 mb-3" />
                  <div className="text-sm font-bold text-slate-500">אין הגדרות AI לערוך.</div>
                  <div className="text-xs text-slate-400 mt-1">עבור לטאב &quot;הגדרות פיצ'רים&quot; ליצור הגדרות חדשות.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {featureRows.map((r) => {
                    const meta = getFeatureMeta(r.feature_key);
                    return (
                      <div key={r.feature_key} className="bg-white border border-slate-200 rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div>
                            <div className="text-sm font-black text-slate-900">{meta.label}</div>
                            <div className="text-[11px] text-slate-400">{r.feature_key} — {r.primary_provider}/{r.primary_model}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${MODULE_BADGE_COLORS[meta.module] || 'bg-slate-100 text-slate-700'}`}>{meta.module}</span>
                            <Button onClick={() => saveFeature(r)} disabled={savingKey === r.feature_key} size="sm" className="bg-emerald-600/80 hover:bg-emerald-600 text-white">
                              {savingKey === r.feature_key ? 'שומר...' : 'שמור'}
                            </Button>
                          </div>
                        </div>
                        <textarea
                          value={r.base_prompt ?? ''}
                          onChange={(e) => updateFeatureLocal(r.feature_key, { base_prompt: e.target.value })}
                          placeholder={`הוראות AI עבור ${meta.label}...\nכתוב כאן את הפרומפט הבסיסי שישלח ל-AI בכל קריאה לפיצ'ר זה.\nלדוגמה: "אתה עוזר מקצועי של ארגון ישראלי. ענה בעברית ובצורה תמציתית."`}
                          dir="rtl"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200/60 min-h-[140px] resize-y leading-relaxed"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════ טאב: מפתחות API ══════ */}
          {activeTab === 'providers' && (
            <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl">
              <div className="text-lg font-black text-slate-900 mb-4">ניהול מפתחות API</div>

              <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 mb-4">
                <div className="text-sm font-bold text-emerald-900 mb-3">הוסף מפתח API חדש</div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <CustomSelect value={newProviderKey.provider} onChange={(val) => setNewProviderKey({ ...newProviderKey, provider: val })} placeholder="בחר ספק" options={providers} />
                  <input value={newProviderKey.api_key} onChange={(e) => setNewProviderKey({ ...newProviderKey, api_key: e.target.value })} placeholder="מפתח API" type="password" className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                  <CustomSelect value={newProviderKey.scope} onChange={(val) => setNewProviderKey({ ...newProviderKey, scope: val })} placeholder="היקף" options={[{ value: 'org', label: 'ארגון נוכחי' }, { value: 'global', label: 'גלובלי (כל הארגונים)' }]} />
                  <Button onClick={addProviderKey} className="bg-emerald-600 hover:bg-emerald-700"><Plus size={14} className="ml-1" /> הוסף</Button>
                </div>
              </div>

              {loadingProviders ? (
                <div className="text-slate-600 text-sm inline-flex items-center gap-2"><Skeleton className="w-4 h-4 rounded-full" /> טוען...</div>
              ) : providerKeys.length === 0 ? (
                <div className="bg-white/70 border border-slate-200/70 rounded-2xl p-8 text-center">
                  <Key size={32} className="mx-auto text-slate-300 mb-3" />
                  <div className="text-sm font-bold text-slate-500">אין מפתחות API מוגדרים</div>
                  <div className="text-xs text-slate-400 mt-1">הוסף מפתח API כדי להפעיל ספקי AI (Google, Anthropic, OpenAI...)</div>
                </div>
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
                      <Button onClick={() => deleteProviderKey(k.id)} variant="destructive" size="sm"><Trash2 size={14} /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════ טאב: כינויי מודלים ══════ */}
          {activeTab === 'aliases' && (
            <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl">
              <div className="text-lg font-black text-slate-900 mb-4">כינויי מודלים (Aliases)</div>

              <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4 mb-4">
                <div className="text-sm font-bold text-indigo-900 mb-3">הוסף כינוי חדש</div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <CustomSelect value={newAlias.provider} onChange={(val) => setNewAlias({ ...newAlias, provider: val })} placeholder="בחר ספק" options={providers} />
                  <input value={newAlias.model} onChange={(e) => setNewAlias({ ...newAlias, model: e.target.value })} placeholder="מזהה מודל" className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                  <input value={newAlias.display_name} onChange={(e) => setNewAlias({ ...newAlias, display_name: e.target.value })} placeholder="שם תצוגה" className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                  <CustomSelect value={newAlias.scope} onChange={(val) => setNewAlias({ ...newAlias, scope: val })} placeholder="היקף" options={[{ value: 'org', label: 'ארגון נוכחי' }, { value: 'global', label: 'גלובלי' }]} />
                  <Button onClick={addModelAlias} className="bg-indigo-600 hover:bg-indigo-700"><Plus size={14} className="ml-1" /> הוסף</Button>
                </div>
              </div>

              {loadingAliases ? (
                <div className="text-slate-600 text-sm inline-flex items-center gap-2"><Skeleton className="w-4 h-4 rounded-full" /> טוען...</div>
              ) : modelAliases.length === 0 ? (
                <div className="bg-white/70 border border-slate-200/70 rounded-2xl p-8 text-center">
                  <Tag size={32} className="mx-auto text-slate-300 mb-3" />
                  <div className="text-sm font-bold text-slate-500">אין כינויים מוגדרים</div>
                  <div className="text-xs text-slate-400 mt-1">הוסף כינוי לתצוגה של מודלים (למשל: &quot;Gemini מהיר&quot; במקום gemini-2.5-flash)</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {modelAliases.map((a) => (
                    <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{a.display_name}</div>
                        <div className="text-xs text-slate-500">{a.provider} / {a.model} | {a.organization_id ? 'ארגוני' : 'גלובלי'}</div>
                      </div>
                      <Button onClick={() => deleteModelAlias(a.id)} variant="destructive" size="sm"><Trash2 size={14} /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};
