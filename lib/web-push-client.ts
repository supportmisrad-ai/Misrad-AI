'use client';

import type { NotificationPreferences } from '../types';

import { asObject } from '@/lib/shared/unknown';
type SubscribeRequestBody = {
  subscription: {
    endpoint: string;
    expirationTime: number | null;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  userAgent: string | null;
};


function getString(obj: Record<string, unknown> | null, key: string): string {
  const v = obj?.[key];
  return typeof v === 'string' ? v : String(v ?? '');
}

async function getVapidPublicKey(params: { orgSlug: string }): Promise<string> {
  const res = await fetch('/api/push/vapid-public', {
    headers: {
      'x-org-id': params.orgSlug,
    },
  });
  if (!res.ok) {
    throw new Error('Failed to load VAPID public key');
  }
  const data: unknown = await res.json().catch(() => ({}));
  const obj = asObject(data);
  const key = getString(obj, 'publicKey');
  if (!key) throw new Error('Missing VAPID public key');
  return key;
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  const buffer = new ArrayBuffer(outputArray.length);
  new Uint8Array(buffer).set(outputArray);
  return buffer;
}

function normalizePreferences(prefs: NotificationPreferences | null | undefined): NotificationPreferences {
  const base: NotificationPreferences = {
    emailNewTask: true,
    browserPush: true,
    morningBrief: true,
    soundEffects: false,
    marketing: false,
    pushBehavior: 'vibrate_sound',
    pushCategories: {
      alerts: true,
      tasks: true,
      events: true,
      system: true,
      marketing: false,
    },
  };
  return { ...base, ...(prefs || {}), pushCategories: { ...base.pushCategories, ...(prefs?.pushCategories || {}) } };
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('Service worker is not supported');
  }

  // Ensure SW is registered
  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) {
    await navigator.serviceWorker.register('/sw.js');
  }

  // Timeout after 10s to avoid hanging forever if SW never activates
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Service worker ready timeout')), 10_000),
  );
  return await Promise.race([navigator.serviceWorker.ready, timeout]);
}

async function postSubscription(params: { orgSlug: string; subscription: PushSubscription }): Promise<void> {
  const json = params.subscription.toJSON();
  const keysObj = asObject(json.keys) ?? {};
  const body: SubscribeRequestBody = {
    subscription: {
      endpoint: String(json.endpoint || ''),
      expirationTime: (json.expirationTime as number | null) ?? null,
      keys: {
        p256dh: String(keysObj.p256dh || ''),
        auth: String(keysObj.auth || ''),
      },
    },
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  };

  const res = await fetch('/api/push/subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-org-id': params.orgSlug,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error('Failed to save push subscription');
  }
}

async function deleteSubscription(params: { orgSlug: string; endpoint?: string }): Promise<void> {
  const res = await fetch('/api/push/subscription', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-org-id': params.orgSlug,
    },
    body: JSON.stringify({ endpoint: params.endpoint ?? null }),
  });

  if (!res.ok) {
    throw new Error('Failed to delete push subscription');
  }
}

export async function syncWebPushSubscription(params: {
  orgSlug: string;
  prefs: NotificationPreferences | null | undefined;
}): Promise<{ subscribed: boolean } | { subscribed: false; reason: string }> {
  const prefs = normalizePreferences(params.prefs);

  const enabled = Boolean(prefs.browserPush) && (prefs.pushBehavior ?? 'vibrate_sound') !== 'off';
  if (!enabled) {
    try {
      const reg = await getServiceWorkerRegistration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deleteSubscription({ orgSlug: params.orgSlug, endpoint: sub.endpoint });
        await sub.unsubscribe();
      } else {
        await deleteSubscription({ orgSlug: params.orgSlug });
      }
    } catch {
      try {
        await deleteSubscription({ orgSlug: params.orgSlug });
      } catch {
        // ignore
      }
    }
    return { subscribed: false, reason: 'disabled' };
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { subscribed: false, reason: 'notification_api_unavailable' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { subscribed: false, reason: 'permission_denied' };
  }

  const vapidPublicKey = await getVapidPublicKey({ orgSlug: params.orgSlug });
  const reg = await getServiceWorkerRegistration();
  const existing = await reg.pushManager.getSubscription();

  const sub =
    existing ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(vapidPublicKey),
    }));

  await postSubscription({ orgSlug: params.orgSlug, subscription: sub });
  return { subscribed: true };
}
