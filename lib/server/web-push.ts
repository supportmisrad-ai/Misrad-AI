import 'server-only';

import prisma from '@/lib/prisma';
import type { NotificationPreferences } from '../../types';

import webpush from 'web-push';

type PushBehavior = NonNullable<NotificationPreferences['pushBehavior']>;

type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
  category?: 'alerts' | 'tasks' | 'events' | 'system' | 'marketing';
  behavior?: PushBehavior;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getString(obj: Record<string, unknown> | null, key: string): string {
  const v = obj?.[key];
  return typeof v === 'string' ? v : String(v ?? '');
}

function normalizeEmail(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function normalizePreferences(prefs: unknown): NotificationPreferences {
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

  const obj = asObject(prefs);
  const behaviorRaw = obj?.pushBehavior;
  const behavior: PushBehavior | undefined =
    behaviorRaw === 'off' || behaviorRaw === 'vibrate' || behaviorRaw === 'sound' || behaviorRaw === 'vibrate_sound'
      ? (behaviorRaw as PushBehavior)
      : undefined;

  const pushCategoriesRaw = asObject(obj?.pushCategories);
  const pushCategories = {
    alerts: typeof pushCategoriesRaw?.alerts === 'boolean' ? pushCategoriesRaw.alerts : undefined,
    tasks: typeof pushCategoriesRaw?.tasks === 'boolean' ? pushCategoriesRaw.tasks : undefined,
    events: typeof pushCategoriesRaw?.events === 'boolean' ? pushCategoriesRaw.events : undefined,
    system: typeof pushCategoriesRaw?.system === 'boolean' ? pushCategoriesRaw.system : undefined,
    marketing: typeof pushCategoriesRaw?.marketing === 'boolean' ? pushCategoriesRaw.marketing : undefined,
  };

  return {
    ...base,
    ...(obj as unknown as Partial<NotificationPreferences>),
    pushBehavior: behavior ?? base.pushBehavior,
    pushCategories: {
      ...base.pushCategories,
      ...(pushCategories as NotificationPreferences['pushCategories']),
    },
  };
}

function getVapidConfig(): { publicKey: string; privateKey: string; subject: string } {
  const publicKey = String(process.env.WEB_PUSH_VAPID_PUBLIC_KEY || '').trim();
  const privateKey = String(process.env.WEB_PUSH_VAPID_PRIVATE_KEY || '').trim();
  const subject = String(process.env.WEB_PUSH_VAPID_SUBJECT || 'mailto:support@misrad-ai.com').trim();

  if (!publicKey || !privateKey) {
    throw new Error('Missing WEB_PUSH_VAPID_PUBLIC_KEY/WEB_PUSH_VAPID_PRIVATE_KEY');
  }

  return { publicKey, privateKey, subject };
}

export function getWebPushPublicKey(): string {
  const cfg = getVapidConfig();
  return cfg.publicKey;
}

type WebPushSubscriptionRow = {
  id: string;
  organizationId: string;
  clerkUserId: string;
  email: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  expirationTime: Date | null;
  userAgent: string | null;
};

type WebPushSubscriptionDelegate = {
  findMany: (args: { where: Record<string, unknown>; select?: Record<string, boolean> }) => Promise<WebPushSubscriptionRow[]>;
  upsert: (args: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }) => Promise<unknown>;
  deleteMany: (args: { where: Record<string, unknown> }) => Promise<{ count: number }>;
};

function getWebPushSubscriptionDelegate(): WebPushSubscriptionDelegate {
  const prismaObj = asObject(prisma as unknown);
  const delegate = prismaObj ? prismaObj['webPushSubscription'] : null;
  const delegateObj = asObject(delegate);

  if (!delegateObj) {
    throw new Error(
      'Prisma Client is missing webPushSubscription. Run Prisma generate (npm run prisma:generate) and restart the TS server.'
    );
  }

  const has = (name: string) => typeof (delegateObj as any)[name] === 'function';
  if (!has('findMany') || !has('upsert') || !has('deleteMany')) {
    throw new Error('Prisma delegate webPushSubscription is unavailable');
  }

  return delegate as unknown as WebPushSubscriptionDelegate;
}

async function getUserPreferencesByEmail(params: { organizationId: string; email: string }): Promise<NotificationPreferences> {
  const email = normalizeEmail(params.email);
  if (!email) return normalizePreferences({});

  try {
    const row = await prisma.profile.findFirst({
      where: {
        organizationId: params.organizationId,
        email: email,
      },
      select: {
        notificationPreferences: true,
      },
    });

    return normalizePreferences(row?.notificationPreferences);
  } catch {
    return normalizePreferences({});
  }
}

function shouldSendPush(params: { prefs: NotificationPreferences; category: PushPayload['category'] }): boolean {
  const prefs = params.prefs;
  const behavior = prefs.pushBehavior ?? 'vibrate_sound';
  if (!prefs.browserPush) return false;
  if (behavior === 'off') return false;

  const categories = prefs.pushCategories || {};
  const category = params.category;
  if (!category) return true;

  const enabled = (categories as any)[category];
  if (typeof enabled === 'boolean') return enabled;

  // default permissive for core categories
  if (category === 'marketing') return false;
  return true;
}

function toWebPushSubscription(row: WebPushSubscriptionRow) {
  return {
    endpoint: String(row.endpoint),
    expirationTime: row.expirationTime ? row.expirationTime.getTime() : null,
    keys: {
      p256dh: String(row.p256dh),
      auth: String(row.auth),
    },
  };
}

export async function upsertWebPushSubscription(params: {
  organizationId: string;
  clerkUserId: string;
  email: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  expirationTime: Date | null;
  userAgent: string | null;
}): Promise<void> {
  const organizationId = String(params.organizationId || '').trim();
  const clerkUserId = String(params.clerkUserId || '').trim();
  const email = normalizeEmail(params.email);
  const endpoint = String(params.endpoint || '').trim();
  const p256dh = String(params.p256dh || '').trim();
  const authKey = String(params.auth || '').trim();

  if (!organizationId || !clerkUserId || !email || !endpoint || !p256dh || !authKey) {
    throw new Error('Invalid push subscription payload');
  }

  const delegate = getWebPushSubscriptionDelegate();

  await delegate.upsert({
    where: {
      organizationId_email_endpoint: {
        organizationId,
        email,
        endpoint,
      },
    },
    create: {
      organizationId,
      clerkUserId,
      email,
      endpoint,
      p256dh,
      auth: authKey,
      expirationTime: params.expirationTime,
      userAgent: params.userAgent,
    },
    update: {
      clerkUserId,
      p256dh,
      auth: authKey,
      expirationTime: params.expirationTime,
      userAgent: params.userAgent,
      updatedAt: new Date(),
    },
  });
}

export async function deleteWebPushSubscriptions(params: {
  organizationId: string;
  clerkUserId: string;
  endpoint?: string | null;
}): Promise<number> {
  const organizationId = String(params.organizationId || '').trim();
  const clerkUserId = String(params.clerkUserId || '').trim();
  const endpoint = params.endpoint ? String(params.endpoint).trim() : '';

  if (!organizationId || !clerkUserId) return 0;

  const delegate = getWebPushSubscriptionDelegate();
  const where: Record<string, unknown> = {
    organizationId,
    clerkUserId,
  };
  if (endpoint) where.endpoint = endpoint;

  const res = await delegate.deleteMany({ where });
  return Number(res?.count ?? 0) || 0;
}

export async function sendWebPushNotificationToEmails(params: {
  organizationId: string;
  emails: string[];
  payload: PushPayload;
}): Promise<{ attempted: number; sent: number }>{
  const organizationId = String(params.organizationId || '').trim();
  if (!organizationId) return { attempted: 0, sent: 0 };

  const cfg = getVapidConfig();
  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);

  const delegate = getWebPushSubscriptionDelegate();

  const uniqueEmails = Array.from(
    new Set((Array.isArray(params.emails) ? params.emails : []).map(normalizeEmail).filter(Boolean))
  );

  let attempted = 0;
  let sent = 0;

  for (const email of uniqueEmails) {
    const prefs = await getUserPreferencesByEmail({ organizationId, email });
    if (!shouldSendPush({ prefs, category: params.payload.category })) {
      continue;
    }

    const subscriptions = await delegate.findMany({
      where: {
        organizationId,
        email,
      },
      select: {
        id: true,
        organizationId: true,
        clerkUserId: true,
        email: true,
        endpoint: true,
        p256dh: true,
        auth: true,
        expirationTime: true,
        userAgent: true,
      },
    });

    for (const row of subscriptions) {
      attempted += 1;
      try {
        const behavior = (prefs.pushBehavior ?? 'vibrate_sound') as PushBehavior;
        const enriched: PushPayload = { ...params.payload, behavior };
        await webpush.sendNotification(toWebPushSubscription(row), JSON.stringify(enriched));
        sent += 1;
      } catch (e: unknown) {
        const errObj = asObject(e);
        const statusCodeRaw = errObj?.statusCode ?? errObj?.status;
        const statusCode = typeof statusCodeRaw === 'number' ? statusCodeRaw : Number(statusCodeRaw);

        // 404/410 indicates subscription is gone.
        if (statusCode === 404 || statusCode === 410) {
          try {
            await delegate.deleteMany({ where: { organizationId, email, endpoint: row.endpoint } });
          } catch {
            // ignore
          }
        }
      }
    }
  }

  return { attempted, sent };
}

export function buildLeaveRequestTeamUrl(params: { orgSlug: string }): string {
  const orgSlug = String(params.orgSlug || '').trim();
  if (!orgSlug) return '/';
  return `/w/${encodeURIComponent(orgSlug)}/nexus/team?tab=leave`;
}
