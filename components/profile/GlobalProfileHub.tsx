'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import nextDynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Bell, ChevronRight, Cog, ExternalLink, Shield, Sparkles, User, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { joinPath, parseWorkspaceRoute } from '@/lib/os/social-routing';
import { getMyProfile, upsertMyProfile } from '@/app/actions/profiles';
import PremiumFrame from './PremiumFrame';

type Entitlements = {
  nexus?: boolean;
  system?: boolean;
  social?: boolean;
  finance?: boolean;
  client?: boolean;
};

function normalizeJson(value: any) {
  if (!value || typeof value !== 'object') return {};
  if (Array.isArray(value)) return {};
  return value;
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-xl bg-white/90 border border-slate-200 text-slate-800 text-sm font-bold hover:bg-white"
    >
      <span className="inline-flex items-center gap-2">
        <ChevronRight size={16} />
        {label}
      </span>
    </button>
  );
}

function HubTile({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description?: string | null;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-right bg-slate-50 p-5 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm md:text-base font-black text-slate-900 truncate">{title}</div>
          {description ? <div className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">{description}</div> : null}
        </div>
        <div className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-700 shadow-sm group-hover:shadow-md transition-shadow">
          {icon}
        </div>
      </div>
    </button>
  );
}

function getModuleLabel(moduleKey: string | null | undefined) {
  switch (moduleKey) {
    case 'social':
      return 'סושיאל';
    case 'system':
      return 'מערכת';
    case 'finance':
      return 'פיננסים';
    case 'client':
      return 'לקוחות';
    case 'nexus':
      return 'נקסוס';
    default:
      return null;
  }
}

function getSectionDescription(id: string) {
  switch (id) {
    case 'profile':
      return 'שם, טלפון, מיקום וביו.';
    case 'security':
      return 'אימות דו-שלבי והגדרות אבטחה.';
    case 'notifications':
      return 'מיילים, דפדפן, צלילים ודוחות.';
    case 'ai':
      return 'חזון, טון דיבור וקהל יעד.';
    case 'social':
      return 'כללי עבודה, חיבורים ופרסום.';
    case 'system':
      return 'הגדרות מערכת, זרימות ואבטחה.';
    case 'finance':
      return 'חשבוניות, מסמכים ותשלומים.';
    case 'client':
      return 'פורטל לקוחות והעדפות.';
    default:
      return null;
  }
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="text-sm font-black text-slate-800">{title}</div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">{children}</div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <div className="text-xs font-bold text-slate-600 mb-1">{label}</div>
      <input
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <div className="text-xs font-bold text-slate-600 mb-1">{label}</div>
      <textarea
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function PrimaryButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-black disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function ProfileBasics({ orgSlug }: { orgSlug: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startTransition] = useTransition();

  const [profileId, setProfileId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await getMyProfile({ orgSlug });
      if (!res.success || !res.data?.profile) return;
      const p: any = res.data.profile;
      setProfileId(p.id);
      setEmail(String(p.email || ''));
      setFullName(String(p.full_name || ''));
      setPhone(String(p.phone || ''));
      setLocation(String(p.location || ''));
      setBio(String(p.bio || ''));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orgSlug]);

  const save = () => {
    startTransition(async () => {
      await upsertMyProfile({
        orgSlug,
        updates: {
          fullName: fullName || null,
          phone: phone || null,
          location: location || null,
          bio: bio || null,
        },
      });
      await load();
    });
  };

  if (isLoading) {
    return <div className="text-slate-600">טוען…</div>;
  }

  return (
    <div className="space-y-6">
      <SectionCard title="פרטים">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="שם מלא" value={fullName} onChange={setFullName} placeholder="לדוגמה: ישראל ישראלי" />
          <TextField label='דוא"ל' value={email} onChange={setEmail} placeholder='example@mail.com' disabled={true} />
          <TextField label="טלפון" value={phone} onChange={setPhone} placeholder="050-0000000" />
          <TextField label="מיקום" value={location} onChange={setLocation} placeholder="תל אביב" />
        </div>
        <div className="mt-4">
          <TextArea label="ביו" value={bio} onChange={setBio} placeholder="שורה-שתיים עליך" rows={4} />
        </div>
        <div className="mt-4 flex gap-2">
          <PrimaryButton label={isSaving ? 'שומר…' : 'שמור'} onClick={save} disabled={isSaving || !profileId} />
        </div>
      </SectionCard>

      <div className="text-xs text-slate-500">השם/האימייל מגיעים מ-Clerk. כרגע אנחנו שומרים גם עותק ב-`profiles` לצורך אחידות בין מודולים.</div>
    </div>
  );
}

function NotificationsSection({ orgSlug }: { orgSlug: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startTransition] = useTransition();
  const [prefs, setPrefs] = useState<any>({});

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await getMyProfile({ orgSlug });
      if (!res.success || !res.data?.profile) return;
      const p: any = res.data.profile;
      setPrefs(normalizeJson(p.notification_preferences));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orgSlug]);

  const toggle = (key: string) => {
    setPrefs((prev: any) => ({ ...prev, [key]: !prev?.[key] }));
  };

  const save = () => {
    startTransition(async () => {
      await upsertMyProfile({
        orgSlug,
        updates: {
          notificationPreferences: prefs,
        },
      });
      await load();
    });
  };

  if (isLoading) return <div className="text-slate-600">טוען…</div>;

  const items = [
    { key: 'email', label: 'מיילים' },
    { key: 'browser', label: 'התראות בדפדפן' },
    { key: 'morningBrief', label: 'דוח בוקר' },
    { key: 'sound', label: 'צלילים' },
  ];

  return (
    <SectionCard title="העדפות התראות">
      <div className="space-y-3">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={() => toggle(it.key)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
          >
            <div className="text-sm font-bold text-slate-800">{it.label}</div>
            <div className={`w-12 h-7 rounded-full p-1 transition-colors ${prefs?.[it.key] ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${prefs?.[it.key] ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <PrimaryButton label={isSaving ? 'שומר…' : 'שמור'} onClick={save} disabled={isSaving} />
      </div>
    </SectionCard>
  );
}

function SecuritySection({ orgSlug }: { orgSlug: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startTransition] = useTransition();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await getMyProfile({ orgSlug });
      if (!res.success || !res.data?.profile) return;
      const p: any = res.data.profile;
      setTwoFactorEnabled(Boolean(p.two_factor_enabled));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orgSlug]);

  const save = () => {
    startTransition(async () => {
      await upsertMyProfile({
        orgSlug,
        updates: {
          twoFactorEnabled,
        },
      });
      await load();
    });
  };

  if (isLoading) return <div className="text-slate-600">טוען…</div>;

  return (
    <SectionCard title="אבטחה">
      <button
        type="button"
        onClick={() => setTwoFactorEnabled((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
      >
        <div>
          <div className="text-sm font-bold text-slate-900">אימות דו-שלבי</div>
          <div className="text-xs text-slate-500 mt-0.5">הגדרה אפליקטיבית (בנוסף ל-Clerk)</div>
        </div>
        <div className={`w-12 h-7 rounded-full p-1 transition-colors ${twoFactorEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
      </button>
      <div className="mt-4 flex gap-2">
        <PrimaryButton label={isSaving ? 'שומר…' : 'שמור'} onClick={save} disabled={isSaving} />
      </div>
    </SectionCard>
  );
}

function AiDnaSection({ orgSlug }: { orgSlug: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dna, setDna] = useState<any>({});

  const endpoint = useMemo(() => `/api/workspaces/${encodeURIComponent(orgSlug)}/ai-dna`, [orgSlug]);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(endpoint, { cache: 'no-store' });
      if (!res.ok) {
        setDna({});
        return;
      }
      const data = await res.json().catch(() => ({}));
      setDna(normalizeJson(data?.aiDna));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [endpoint]);

  const save = async () => {
    setIsSaving(true);
    try {
      await fetch(endpoint, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ aiDna: dna }),
      });
      await load();
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="text-slate-600">טוען…</div>;

  return (
    <SectionCard title="DNA עסקי ל-AI">
      <div className="grid grid-cols-1 gap-4">
        <TextArea label="חזון" value={String(dna.vision || '')} onChange={(v) => setDna((p: any) => ({ ...p, vision: v }))} rows={3} />
        <TextArea label="טון דיבור" value={String(dna.tone || '')} onChange={(v) => setDna((p: any) => ({ ...p, tone: v }))} rows={2} />
        <TextArea label="יתרונות" value={String(dna.advantages || '')} onChange={(v) => setDna((p: any) => ({ ...p, advantages: v }))} rows={3} />
        <TextArea label="קהל יעד" value={String(dna.targetAudience || '')} onChange={(v) => setDna((p: any) => ({ ...p, targetAudience: v }))} rows={2} />
        <TextArea label="מילים/סגנון" value={String(dna.vocabulary || '')} onChange={(v) => setDna((p: any) => ({ ...p, vocabulary: v }))} rows={2} />
      </div>
      <div className="mt-4 flex gap-2">
        <PrimaryButton label={isSaving ? 'שומר…' : 'שמור'} onClick={save} disabled={isSaving} />
      </div>
    </SectionCard>
  );
}

const EmbeddedSocialSettings = nextDynamic(() => import('@/components/social/Settings'), {
  ssr: false,
  loading: () => <div className="text-slate-600">טוען…</div>,
});

const EmbeddedSystemSettings = nextDynamic(() => import('@/components/system/system.os/components/SettingsView'), {
  ssr: false,
  loading: () => <div className="text-slate-600">טוען…</div>,
});

export default function GlobalProfileHub({
  defaultOrigin,
  defaultDrawer,
  mode = 'hub',
  renderFrame = true,
}: {
  defaultOrigin?: string | null;
  defaultDrawer?: string | null;
  mode?: 'hub' | 'me';
  renderFrame?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const info = parseWorkspaceRoute(pathname);
  const orgSlug = info.orgSlug;
  const currentModule = info.module;

  const origin = searchParams.get('origin') || defaultOrigin || 'nexus';
  const from = searchParams.get('from');
  const drawer = searchParams.get('drawer');
  const shouldAutoOpenDefault = searchParams.get('autostart') === '1';
  const activeDrawerId = drawer || (shouldAutoOpenDefault ? defaultDrawer : null);

  const moduleBasePath = useMemo(() => {
    if (!orgSlug) return '/';
    const module = currentModule || 'nexus';
    return `/w/${encodeURIComponent(orgSlug)}/${module}`;
  }, [currentModule, orgSlug]);

  const dashboardFallback = useMemo(() => {
    if (currentModule === 'nexus') return joinPath(moduleBasePath, '/me');
    return joinPath(moduleBasePath, '/');
  }, [currentModule, moduleBasePath]);

  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [meInsights, setMeInsights] = useState<any>(null);
  const [meInsightsLoading, setMeInsightsLoading] = useState(false);
  const [headerUser, setHeaderUser] = useState<{
    name: string;
    email?: string | null;
    role?: string | null;
    avatarUrl?: string | null;
  }>({
    name: 'החשבון שלי',
    email: null,
    role: null,
    avatarUrl: null,
  });

  useEffect(() => {
    const loadEntitlements = async () => {
      if (!orgSlug) return;
      try {
        const res = await fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/entitlements`, { cache: 'no-store' });
        if (!res.ok) {
          setEntitlements({});
          return;
        }
        const data = await res.json().catch(() => ({}));
        setEntitlements((data?.entitlements || {}) as Entitlements);
      } catch {
        setEntitlements({});
      }
    };
    loadEntitlements();
  }, [orgSlug]);

  useEffect(() => {
    const loadMeInsights = async () => {
      if (mode !== 'me') return;
      if (!orgSlug) return;
      if (!currentModule) return;
      const moduleKey = String(currentModule).toLowerCase();
      if (moduleKey !== 'system' && moduleKey !== 'client' && moduleKey !== 'finance') return;

      setMeInsightsLoading(true);
      try {
        const url = new URL(`/api/workspaces/${encodeURIComponent(orgSlug)}/me-insights`, window.location.origin);
        url.searchParams.set('module', moduleKey);
        const res = await fetch(url.toString(), { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMeInsights(null);
          return;
        }
        setMeInsights(data);
      } catch {
        setMeInsights(null);
      } finally {
        setMeInsightsLoading(false);
      }
    };
    loadMeInsights();
  }, [currentModule, mode, orgSlug]);

  const financeMoneyFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const loadHeader = async () => {
      if (!orgSlug) return;
      try {
        const res = await getMyProfile({ orgSlug });
        if (!res.success || !res.data?.profile) return;
        const p: any = res.data.profile;
        setHeaderUser({
          name: String(p.full_name || 'החשבון שלי'),
          email: p.email ? String(p.email) : null,
          role: null,
          avatarUrl: p.avatar_url ? String(p.avatar_url) : null,
        });
      } catch {
        // Best-effort
      }
    };
    loadHeader();
  }, [orgSlug]);

  if (!orgSlug) {
    return <div className="p-6 text-slate-700">לא נמצא ארגון פעיל.</div>;
  }

  const sections: Array<{
    id: string;
    label: string;
    groupLabel?: string | null;
    icon?: any;
    content: React.ReactNode;
  }> = [
    {
      id: 'profile',
      label: 'פרופיל אישי',
      groupLabel: 'הגדרות אישיות',
      icon: User,
      content: <ProfileBasics orgSlug={orgSlug} />,
    },
    {
      id: 'security',
      label: 'אבטחה',
      groupLabel: 'הגדרות אישיות',
      icon: Shield,
      content: <SecuritySection orgSlug={orgSlug} />,
    },
    {
      id: 'notifications',
      label: 'התראות',
      groupLabel: 'הגדרות אישיות',
      icon: Bell,
      content: <NotificationsSection orgSlug={orgSlug} />,
    },
    {
      id: 'ai',
      label: 'DNA ל-AI',
      groupLabel: 'ניהול הארגון',
      icon: Sparkles,
      content: <AiDnaSection orgSlug={orgSlug} />,
    },
  ];

  // IMPORTANT: Embedded module screens depend on module-specific providers.
  // To prevent runtime crashes, we only mount them inside their native module layout.
  if (entitlements?.social && currentModule === 'social') {
    sections.push({
      id: 'social',
      label: 'הגדרות סושיאל',
      groupLabel: 'ניהול הארגון',
      icon: Cog,
      content: <EmbeddedSocialSettings />,
    });
  } else if (entitlements?.social) {
    sections.push({
      id: 'social',
      label: 'הגדרות סושיאל',
      groupLabel: 'ניהול הארגון',
      icon: Cog,
      content: <div className="text-slate-600">כדי לערוך הגדרות סושיאל יש להיכנס דרך מודול סושיאל.</div>,
    });
  }

  const canRenderSystemSettings = currentModule === 'system' || currentModule === 'social' || currentModule === 'finance';
  if (entitlements?.system && canRenderSystemSettings) {
    sections.push({
      id: 'system',
      label: 'הגדרות מערכת',
      groupLabel: 'ניהול הארגון',
      icon: Cog,
      content: <EmbeddedSystemSettings />,
    });
  } else if (entitlements?.system) {
    sections.push({
      id: 'system',
      label: 'הגדרות מערכת',
      groupLabel: 'ניהול הארגון',
      icon: Cog,
      content: <div className="text-slate-600">כדי לערוך הגדרות מערכת יש להיכנס דרך מודול System או Finance.</div>,
    });
  }

  if (entitlements?.finance) {
    sections.push({
      id: 'finance',
      label: 'פיננסים',
      groupLabel: 'ניהול הארגון',
      icon: Cog,
      content:
        currentModule === 'finance' ? (
          <div className="text-slate-600">הגדרות פיננסים יתווספו בהמשך.</div>
        ) : (
          <div className="text-slate-600">כדי לערוך הגדרות פיננסים יש להיכנס דרך מודול Finance.</div>
        ),
    });
  }

  if (entitlements?.client) {
    sections.push({
      id: 'client',
      label: 'לקוחות',
      groupLabel: 'ניהול הארגון',
      icon: Cog,
      content:
        currentModule === 'client' ? (
          <div className="text-slate-600">הגדרות לקוחות יתווספו בהמשך.</div>
        ) : (
          <div className="text-slate-600">כדי לערוך הגדרות לקוחות יש להיכנס דרך מודול Client.</div>
        ),
    });
  }

  const headerActions = (
    <BackButton
      label="חזור לדשבורד"
      onClick={() => {
        if (from) {
          router.push(from);
          return;
        }
        router.push(dashboardFallback);
      }}
    />
  );

  const grouped = useMemo(() => {
    const groups: Record<string, typeof sections> = {};
    sections.forEach((s) => {
      const key = s.groupLabel || 'כללי';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return groups;
  }, [sections]);

  const activeSection = useMemo(() => {
    if (!activeDrawerId) return null;
    return sections.find((s) => s.id === activeDrawerId) || null;
  }, [activeDrawerId, sections]);

  const openDrawer = (id: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('drawer', id);
    router.replace(`${pathname}?${next.toString()}`);
  };

  const closeDrawer = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('drawer');
    router.replace(`${pathname}?${next.toString()}`);
  };

  const moduleLabel = getModuleLabel(currentModule || origin);
  const frameTitle = mode === 'me' ? 'הפרופיל שלי' : 'הגדרות';
  const frameSubtitle = headerUser.email || null;

  const mePrimaryAction = useMemo(() => {
    if (mode !== 'me') return null;
    if (!orgSlug || !currentModule) return null;
    const moduleKey = String(currentModule).toLowerCase();

    if (moduleKey === 'system') {
      const leadId = meInsights?.hottestLead?.id ? String(meInsights.hottestLead.id) : null;
      if (!leadId) return null;
      return {
        href: `/w/${encodeURIComponent(orgSlug)}/system/sales_leads?leadId=${encodeURIComponent(leadId)}`,
        ariaLabel: 'פתח ליד',
      };
    }

    if (moduleKey === 'client') {
      const meetingId = meInsights?.lastCommitment?.meetingId ? String(meInsights.lastCommitment.meetingId) : null;
      if (!meetingId) return null;
      return {
        href: `/w/${encodeURIComponent(orgSlug)}/client?tab=meetings&meetingId=${encodeURIComponent(meetingId)}`,
        ariaLabel: 'פתח סיכום פגישה',
      };
    }

    if (moduleKey === 'finance') {
      return {
        href: `/w/${encodeURIComponent(orgSlug)}/finance?tab=reports`,
        ariaLabel: 'פתח דוחות פיננסיים',
      };
    }

    return null;
  }, [currentModule, meInsights, mode, orgSlug]);

  const body = (
    <>
      {mode === 'me' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-100 mb-8">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all">
            <div className="text-3xl font-black text-slate-900">{Object.values(entitlements || {}).filter(Boolean).length}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">מודולים פעילים</div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!mePrimaryAction?.href) return;
              router.push(mePrimaryAction.href);
            }}
            disabled={!mePrimaryAction?.href}
            aria-label={mePrimaryAction?.ariaLabel || undefined}
            title={mePrimaryAction?.href ? 'לחיצה תפתח פירוט מלא' : undefined}
            className={`bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center transition-all ${
              mePrimaryAction?.href
                ? 'hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 cursor-pointer'
                : 'opacity-90 cursor-default'
            }`}
          >
            {mePrimaryAction?.href ? (
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-[10px] font-black px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-600 inline-flex items-center gap-1">
                  <ExternalLink size={12} />
                  לפרטים
                </span>
                <span className="text-slate-400">
                  <ExternalLink size={14} />
                </span>
              </div>
            ) : null}
            {currentModule === 'system' ? (
              <>
                <div className="text-sm font-black text-slate-900" suppressHydrationWarning>
                  {meInsightsLoading ? 'טוען…' : meInsights?.hottestLead?.name ? `הליד החם ביותר: ${String(meInsights.hottestLead.name)}` : 'אין לידים חמים'}
                </div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-2" suppressHydrationWarning>
                  {meInsightsLoading ? '…' : meInsights?.hottestLead?.status ? `סטטוס: ${String(meInsights.hottestLead.status)}` : ''}
                </div>
              </>
            ) : currentModule === 'client' ? (
              <>
                <div className="text-sm font-black text-slate-900" suppressHydrationWarning>
                  {meInsightsLoading
                    ? 'טוען…'
                    : meInsights?.lastCommitment
                      ? `${String(meInsights.lastCommitment.who || 'מישהו')} צריך ${String(meInsights.lastCommitment.what || '...')}`
                      : 'אין התחייבויות'}
                </div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-2" suppressHydrationWarning>
                  {meInsightsLoading
                    ? '…'
                    : meInsights?.lastCommitment?.due
                      ? `עד: ${String(meInsights.lastCommitment.due)}`
                      : meInsights?.lastCommitment?.createdAt
                        ? `נוצר: ${String(meInsights.lastCommitment.createdAt).slice(0, 10)}`
                        : ''}
                </div>
              </>
            ) : currentModule === 'finance' ? (
              <>
                <div className="text-sm font-black text-slate-900" suppressHydrationWarning>
                  {meInsightsLoading
                    ? 'טוען…'
                    : typeof meInsights?.expectedMonthlyRevenue === 'number'
                      ? `הכנסה חודשית צפויה: ${financeMoneyFormatter ? financeMoneyFormatter.format(meInsights.expectedMonthlyRevenue) : String(meInsights.expectedMonthlyRevenue)}`
                      : 'הכנסה חודשית צפויה: —'}
                </div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-2" suppressHydrationWarning>
                  {meInsightsLoading
                    ? '…'
                    : meInsights?.breakdown
                      ? `Pipeline: ${financeMoneyFormatter ? financeMoneyFormatter.format(meInsights.breakdown.weightedPipeline || 0) : String(meInsights.breakdown.weightedPipeline || 0)}`
                      : ''}
                </div>
              </>
            ) : (
              <>
                <div className="text-3xl font-black text-slate-900">—</div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-1">עדכונים</div>
              </>
            )}
          </button>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all">
            <div className="text-3xl font-black text-slate-900" suppressHydrationWarning>
              {meInsightsLoading
                ? '…'
                : currentModule === 'client'
                  ? String(meInsights?.relationship?.avgWarmth ?? '—')
                  : currentModule === 'system'
                    ? String(meInsights?.hotLeads?.indexedLeadsCount ?? '—')
                    : '—'}
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">
              {currentModule === 'client' ? 'חום קשר (ממוצע)' : currentModule === 'system' ? 'פריטים בזיכרון' : 'פעולות אחרונות'}
            </div>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all">
            <div className="text-3xl font-black text-green-600">מחובר</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">סטטוס מערכת</div>
          </div>
        </div>
      ) : (
        <div className="h-px bg-gray-100 my-6" />
      )}

      <div className="space-y-8">
        {Object.entries(grouped).map(([groupName, items]) => (
          <div key={groupName}>
            <div className="text-sm font-black text-slate-800 mb-4">{groupName}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((s) => {
                const Icon = s.icon;
                return (
                  <HubTile
                    key={s.id}
                    title={s.label}
                    description={getSectionDescription(s.id)}
                    icon={Icon ? <Icon size={18} /> : null}
                    onClick={() => openDrawer(s.id)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {activeSection ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9990] bg-slate-900/50 backdrop-blur-sm"
              onClick={closeDrawer}
            />
            <motion.aside
              initial={{ x: 520 }}
              animate={{ x: 0 }}
              exit={{ x: 520 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed top-0 right-0 z-[9991] h-[100dvh] w-full sm:w-[520px] bg-white shadow-2xl border-l border-slate-200 flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label={activeSection.label}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-lg font-black text-slate-900 truncate">{activeSection.label}</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">{getSectionDescription(activeSection.id) || ''}</div>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="p-2 rounded-full hover:bg-white border border-slate-200 text-slate-700"
                  aria-label="סגור"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 md:p-8 overflow-y-auto flex-1">{activeSection.content}</div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );

  if (!renderFrame) {
    return body;
  }

  return (
    <PremiumFrame
      moduleLabel={moduleLabel}
      title={headerUser.name || frameTitle}
      subtitle={frameSubtitle}
      avatarUrl={headerUser.avatarUrl || null}
      actions={headerActions}
    >
      {body}
    </PremiumFrame>
  );
}

export function GlobalProfileHubBody(props: {
  defaultOrigin?: string | null;
  defaultDrawer?: string | null;
  mode?: 'hub' | 'me';
}) {
  return <GlobalProfileHub {...props} renderFrame={false} />;
}
