"use client";

import { useEffect, useMemo, useState } from 'react';

import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';

function getCapacitorIsNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  const cap = (w && typeof w === 'object' ? (w as Record<string, unknown>).Capacitor : null) as Record<string, unknown> | null;
  const fn = cap?.isNativePlatform;
  return typeof fn === 'function' ? Boolean(fn()) : false;
}

function normalizeUrl(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function resolvePlatformDownloadUrl(manifest: unknown, platform: 'android' | 'windows'): string | null {
  const m = manifest && typeof manifest === 'object' && !Array.isArray(manifest) ? (manifest as Record<string, unknown>) : null;
  if (!m) return null;

  const downloads = m.downloads && typeof m.downloads === 'object' && !Array.isArray(m.downloads) ? (m.downloads as Record<string, unknown>) : null;
  if (downloads) {
    const pRaw = downloads[platform];
    const p = pRaw && typeof pRaw === 'object' && !Array.isArray(pRaw) ? (pRaw as Record<string, unknown>) : null;
    const u = normalizeUrl(p?.url) || normalizeUrl(p?.downloadUrl);
    if (u) return u;
  }

  const direct = m[platform] && typeof m[platform] === 'object' && !Array.isArray(m[platform]) ? (m[platform] as Record<string, unknown>) : null;
  const u2 = normalizeUrl(direct?.url);
  if (u2) return u2;

  const legacyKey = platform === 'windows' ? 'windowsDownloadUrl' : 'androidDownloadUrl';
  return normalizeUrl(m[legacyKey]);
}

function resolvePlatformVersion(manifest: unknown, platform: 'android' | 'windows'): string | null {
  const m = manifest && typeof manifest === 'object' && !Array.isArray(manifest) ? (manifest as Record<string, unknown>) : null;
  if (!m) return null;

  const downloads = m.downloads && typeof m.downloads === 'object' && !Array.isArray(m.downloads) ? (m.downloads as Record<string, unknown>) : null;
  if (downloads) {
    const pRaw = downloads[platform];
    const p = pRaw && typeof pRaw === 'object' && !Array.isArray(pRaw) ? (pRaw as Record<string, unknown>) : null;
    const v = normalizeUrl(p?.version);
    if (v) return v;
  }

  const direct = m[platform] && typeof m[platform] === 'object' && !Array.isArray(m[platform]) ? (m[platform] as Record<string, unknown>) : null;
  const v2 = normalizeUrl(direct?.version);
  if (v2) return v2;

  const legacyKey = platform === 'windows' ? 'windowsVersion' : 'androidVersion';
  return normalizeUrl(m[legacyKey]);
}

function compareLooseVersions(a: string, b: string): -1 | 0 | 1 {
  const parse = (v: string) =>
    String(v || '')
      .trim()
      .replace(/^v/i, '')
      .split('.')
      .map((p) => Number.parseInt(p, 10))
      .map((n) => (Number.isFinite(n) ? n : 0));

  const aa = parse(a);
  const bb = parse(b);
  const len = Math.max(aa.length, bb.length);

  for (let i = 0; i < len; i++) {
    const x = aa[i] ?? 0;
    const y = bb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }

  return 0;
}

async function getNativeAppVersionMaybe(): Promise<string | null> {
  try {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as Record<string, unknown>;
    const cap = (w && typeof w === 'object' ? (w as Record<string, unknown>).Capacitor : null) as Record<string, unknown> | null;
    const plugins = cap?.Plugins as Record<string, unknown> | undefined;
    const appPlugin = plugins?.App as Record<string, unknown> | undefined;
    const getInfo = appPlugin?.getInfo;
    if (typeof getInfo !== 'function') return null;
    const info = await getInfo();
    const v = typeof info?.version === 'string' ? info.version.trim() : '';
    return v || null;
  } catch {
    return null;
  }
}

async function openExternalMaybe(url: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  let target = url;
  try {
    target = new URL(url, window.location.origin).toString();
  } catch {
    target = url;
  }
  const w = window as unknown as Record<string, unknown>;
  const cap = (w && typeof w === 'object' ? (w as Record<string, unknown>).Capacitor : null) as Record<string, unknown> | null;
  const plugins = cap?.Plugins as Record<string, unknown> | undefined;
  const browserPlugin = plugins?.Browser as Record<string, unknown> | undefined;
  const open = browserPlugin?.open;
  if (typeof open !== 'function') return false;

  try {
    await open({ url: target });
    return true;
  } catch {
    return false;
  }
}

export function NativeAppUpdatePrompt() {
  const isNative = useMemo(() => getCapacitorIsNativePlatform(), []);

  const [open, setOpen] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isNative) return;
    let canceled = false;

    const run = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        const json: unknown = await res.json().catch(() => null);
        const obj = json && typeof json === 'object' && !Array.isArray(json) ? (json as Record<string, unknown>) : null;
        const ok = Boolean(obj?.success);
        if (!ok) return;

        const manifest = obj?.manifest;
        const v = resolvePlatformVersion(manifest, 'android');
        const u = resolvePlatformDownloadUrl(manifest, 'android') || '/api/download/android';

        if (!v) return;

        const current = await getNativeAppVersionMaybe();
        if (!current) return;
        if (compareLooseVersions(v, current) <= 0) return;

        const key = 'native_android_update_dismissed_version_v1';
        let dismissed: string | null = null;
        try {
          dismissed = window.localStorage.getItem(key);
        } catch {
          dismissed = null;
        }

        if (dismissed && dismissed === v) return;

        if (canceled) return;
        setLatestVersion(v);
        setDownloadUrl(u);
        setOpen(true);
      } catch {
        return;
      }
    };

    run();

    return () => {
      canceled = true;
    };
  }, [isNative]);

  if (!isNative) return null;

  const close = () => {
    setOpen(false);
  };

  const confirm = () => {
    const key = 'native_android_update_dismissed_version_v1';
    try {
      if (latestVersion) window.localStorage.setItem(key, latestVersion);
    } catch {
    }

    const target = downloadUrl || '/api/download/android';
    void (async () => {
      const opened = await openExternalMaybe(target);
      if (opened) return;
      try {
        const absolute = new URL(target, window.location.origin).toString();
        window.location.href = absolute;
      } catch {
        close();
      }
    })();
  };

  const dismiss = () => {
    const key = 'native_android_update_dismissed_version_v1';
    try {
      if (latestVersion) window.localStorage.setItem(key, latestVersion);
    } catch {
    }
    close();
  };

  return (
    <DeleteConfirmationModal
      isOpen={open}
      onClose={dismiss}
      onConfirm={confirm}
      type="info"
      title="קיים עדכון לאפליקציה"
      description={latestVersion ? `זמינה גרסה חדשה: ${latestVersion}. להוריד ולהתקין עכשיו?` : 'זמינה גרסה חדשה. להוריד ולהתקין עכשיו?'}
      confirmText="הורדה"
      cancelText="אחר כך"
    />
  );
}
