import { test, expect, request, chromium, type Browser, type BrowserContext } from '@playwright/test';
import fs from 'node:fs';

type WhoamiResponse = {
  ok: boolean;
  clerkUserId?: string;
  email?: string | null;
  error?: string;
};

type SeedResponse = {
  ok: boolean;
  orgTarget?: { id: string; slug: string; name: string };
  orgAttacker?: { id: string; slug: string; name: string };
  victimClient?: { id: string; organization_id: string };
  attackerClient?: { id: string; organization_id: string };
  victimLead?: { id: string; organization_id: string };
  attackerLead?: { id: string; organization_id: string };
  victimSocialPost?: { id: string; client_id: string };
  attackerSocialPost?: { id: string; client_id: string };
  error?: string;
};

type RlsCheckResponse = {
  ok: boolean;
  currentOrgId?: string | null;
  expectedOrg?: { id: string; visible: boolean; error: string | null };
  otherOrg?: { id: string; visible: boolean; error: string | null };
  expectedClient?: { id: string | null; visible: boolean };
  otherClient?: { id: string | null; visible: boolean };
  expectedLead?: { id: string | null; visible: boolean };
  otherLead?: { id: string | null; visible: boolean };
  expectedPost?: { id: string | null; visible: boolean };
  otherPost?: { id: string | null; visible: boolean };
  rpcError?: string | null;
  error?: string;
};

function resolveBaseURLForStorageState(params: { baseURL: string; storageStatePath: string }): string {
  try {
    const raw = fs.readFileSync(params.storageStatePath, 'utf-8');
    const parsedUnknown = JSON.parse(raw || '{}') as unknown;
    const parsed =
      parsedUnknown && typeof parsedUnknown === 'object'
        ? (parsedUnknown as { cookies?: unknown })
        : ({ cookies: [] } as { cookies?: unknown });
    const cookies = Array.isArray(parsed.cookies) ? (parsed.cookies as Array<any>) : [];

    const authCookieDomains = new Set(
      cookies
        .filter((c) => c && typeof c === 'object')
        .filter((c) => {
          const name = String((c as any).name || '');
          return name === '__session' || name.startsWith('__clerk') || name.startsWith('__refresh');
        })
        .map((c) => String((c as any).domain || '').replace(/^\./, '').trim())
        .filter(Boolean)
    );

    if (!authCookieDomains.size) return params.baseURL;

    const url = new URL(params.baseURL);
    const host = String(url.hostname || '').trim();
    if (authCookieDomains.has(host)) return params.baseURL;

    // Most common mismatch on local dev: cookies are set for localhost but tests run on 127.0.0.1.
    return params.baseURL;
  } catch {
    return params.baseURL;
  }
}

function envBool(name: string): boolean {
  const v = String(process.env[name] || '').toLowerCase();
  return v === '1' || v === 'true';
}

async function getWhoami(params: { baseURL: string; e2eKey: string; context: BrowserContext }) {
  const res = await params.context.request.get(`${params.baseURL}/api/e2e/whoami`, {
    headers: { 'x-e2e-key': params.e2eKey },
    timeout: 60_000,
  });
  const json = (await res.json().catch(() => null)) as WhoamiResponse | null;
  if (!res.ok() || !json?.ok || !json?.clerkUserId) {
    const hint =
      res.status() === 401 || json?.error === 'NoAuthSession'
        ? ' (storageState is likely expired or missing Clerk __refresh_* cookie. Re-run tests/e2e/setup-auth.spec.ts for both victim+attacker with E2E_REQUIRE_REFRESH_COOKIE=1, and ensure your system clock is synced)'
        : '';
    throw new Error(`whoami failed: HTTP ${res.status()} ${JSON.stringify(json)}${hint}`);
  }
  return { clerkUserId: json.clerkUserId, email: json.email ?? null };
}

async function seedIsolation(params: {
  baseURL: string;
  e2eKey: string;
  victimClerkUserId: string;
  attackerClerkUserId: string;
  victimEmail: string | null;
  attackerEmail: string | null;
}) {
  const ctx = await request.newContext({ baseURL: params.baseURL });
  try {
    const res = await ctx.post('/api/e2e/tenant-isolation-seed', {
      headers: { 'x-e2e-key': params.e2eKey },
      timeout: 120_000,
      data: {
        victimClerkUserId: params.victimClerkUserId,
        attackerClerkUserId: params.attackerClerkUserId,
        victimEmail: params.victimEmail,
        attackerEmail: params.attackerEmail,
      },
    });
    const json = (await res.json().catch(() => null)) as SeedResponse | null;
    if (!res.ok() || !json?.ok) {
      throw new Error(`seed failed: HTTP ${res.status()} ${JSON.stringify(json)}`);
    }
    if (!json.orgTarget?.id || !json.orgAttacker?.id) {
      throw new Error(`seed response missing org ids: ${JSON.stringify(json)}`);
    }
    if (!json.victimClient?.id || !json.attackerClient?.id) {
      throw new Error(`seed response missing client ids: ${JSON.stringify(json)}`);
    }
    if (!json.victimLead?.id || !json.attackerLead?.id) {
      throw new Error(`seed response missing lead ids: ${JSON.stringify(json)}`);
    }
    if (!json.victimSocialPost?.id || !json.attackerSocialPost?.id) {
      throw new Error(`seed response missing social post ids: ${JSON.stringify(json)}`);
    }
    return json;
  } finally {
    await ctx.dispose();
  }
}

async function rlsCheck(params: {
  baseURL: string;
  e2eKey: string;
  context: BrowserContext;
  expectedOrgId: string;
  otherOrgId: string;
  expectedClientId: string;
  otherClientId: string;
  expectedLeadId: string;
  otherLeadId: string;
  expectedPostId: string;
  otherPostId: string;
}) {
  const res = await params.context.request.post(`${params.baseURL}/api/e2e/rls-check`, {
    headers: { 'x-e2e-key': params.e2eKey },
    timeout: 60_000,
    data: {
      expectedOrgId: params.expectedOrgId,
      otherOrgId: params.otherOrgId,
      expectedClientId: params.expectedClientId,
      otherClientId: params.otherClientId,
      expectedLeadId: params.expectedLeadId,
      otherLeadId: params.otherLeadId,
      expectedPostId: params.expectedPostId,
      otherPostId: params.otherPostId,
    },
  });
  const json = (await res.json().catch(() => null)) as RlsCheckResponse | null;
  if (!res.ok() || !json?.ok) {
    throw new Error(`rls-check failed: HTTP ${res.status()} ${JSON.stringify(json)}`);
  }
  return json;
}

async function prismaTenantGuardProbe(params: { baseURL: string; e2eKey: string; context: BrowserContext }) {
  const res = await params.context.request.get(`${params.baseURL}/api/e2e/prisma-tenant-guard`, {
    headers: { 'x-e2e-key': params.e2eKey },
    timeout: 60_000,
  });
  const json = (await res.json().catch(() => null)) as { ok?: boolean; blocked?: boolean; error?: string } | null;
  return { res, json };
}

async function orgSpoofProbe(params: {
  baseURL: string;
  e2eKey: string;
  context: BrowserContext;
  orgKey: string;
}) {
  const res = await params.context.request.get(`${params.baseURL}/api/e2e/x-org-id-spoof-system-leads`, {
    headers: { 'x-e2e-key': params.e2eKey, 'x-org-id': params.orgKey },
    timeout: 60_000,
  });
  const json = (await res.json().catch(() => null)) as { ok?: boolean; blocked?: boolean; error?: string } | null;
  return { res, json };
}

async function createAuthedContext(params: {
  baseURL: string;
  storageStatePath: string;
}) {
  const browser = await chromium.launch();

  const storageState = (() => {
    try {
      const baseHost = new URL(params.baseURL).hostname;
      const raw = fs.readFileSync(params.storageStatePath, 'utf-8');
      const parsed = JSON.parse(raw || '{}') as any;
      const cookies = Array.isArray(parsed?.cookies) ? (parsed.cookies as any[]) : [];

      const rewrittenCookies = cookies.map((c) => {
        if (!c || typeof c !== 'object') return c;
        const domainRaw = String(c.domain || '').replace(/^\./, '').trim();
        const name = String(c.name || '').trim();
        const isClerkCookie =
          name === '__session' || name.startsWith('__clerk') || name.startsWith('__client') || name.startsWith('__refresh');

        if (isClerkCookie && domainRaw === 'localhost' && baseHost === '127.0.0.1') {
          return {
            ...c,
            domain: '127.0.0.1',
            secure: false,
            sameSite: c.sameSite === 'None' ? 'Lax' : c.sameSite,
          };
        }

        return c;
      });

      return { ...parsed, cookies: rewrittenCookies };
    } catch {
      return params.storageStatePath;
    }
  })();

  const context = await browser.newContext({ storageState });

  // Give Clerk a chance to refresh/rotate session cookies inside a real browser context.
  // Avoid /workspaces here because it may redirect/loop depending on org access.
  const page = await context.newPage();
  await page
    .goto(`${params.baseURL}/login?redirect_url=%2F`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    .catch(() => undefined);
  await page.waitForTimeout(1500);

  return { browser, context };
}

test.describe('Tenant Isolation (RLS battle test)', () => {
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:4000';
  const e2eKey = String(process.env.E2E_API_KEY || '').trim();

  const victimState = String(process.env.E2E_VICTIM_STORAGE_STATE || '').trim();
  const attackerState = String(process.env.E2E_ATTACKER_STORAGE_STATE || '').trim();

  const enabled = !envBool('E2E_SKIP_TENANT_ISOLATION_TEST');

  test.setTimeout(240_000);

  test.skip(!enabled, 'E2E_SKIP_TENANT_ISOLATION_TEST is enabled');
  test.skip(!e2eKey, 'E2E_API_KEY is required');
  test.skip(!victimState || !attackerState, 'E2E_VICTIM_STORAGE_STATE and E2E_ATTACKER_STORAGE_STATE are required');

  test('victim cannot read attacker tenant data, attacker cannot read victim tenant data', async () => {
    let victimBrowser: Browser | null = null;
    let attackerBrowser: Browser | null = null;
    let victimContext: BrowserContext | null = null;
    let attackerContext: BrowserContext | null = null;

    try {
      const victimBaseURL = resolveBaseURLForStorageState({ baseURL, storageStatePath: victimState });
      const attackerBaseURL = resolveBaseURLForStorageState({ baseURL, storageStatePath: attackerState });

      ({ browser: victimBrowser, context: victimContext } = await createAuthedContext({
        baseURL: victimBaseURL,
        storageStatePath: victimState,
      }));
      ({ browser: attackerBrowser, context: attackerContext } = await createAuthedContext({
        baseURL: attackerBaseURL,
        storageStatePath: attackerState,
      }));

      const victimWhoami = await getWhoami({ baseURL: victimBaseURL, e2eKey, context: victimContext });
      const attackerWhoami = await getWhoami({ baseURL: attackerBaseURL, e2eKey, context: attackerContext });

    expect(victimWhoami.clerkUserId).toBeTruthy();
    expect(attackerWhoami.clerkUserId).toBeTruthy();
    expect(victimWhoami.clerkUserId).not.toEqual(attackerWhoami.clerkUserId);

    const seeded = await seedIsolation({
      baseURL: victimBaseURL,
      e2eKey,
      victimClerkUserId: victimWhoami.clerkUserId,
      attackerClerkUserId: attackerWhoami.clerkUserId,
      victimEmail: victimWhoami.email,
      attackerEmail: attackerWhoami.email,
    });

    const targetOrgId = String(seeded.orgTarget!.id);
    const attackerOrgId = String(seeded.orgAttacker!.id);

      const victimCheck = await rlsCheck({
        baseURL: victimBaseURL,
        e2eKey,
        context: victimContext,
        expectedOrgId: targetOrgId,
        otherOrgId: attackerOrgId,
        expectedClientId: String(seeded.victimClient!.id),
        otherClientId: String(seeded.attackerClient!.id),
        expectedLeadId: String(seeded.victimLead!.id),
        otherLeadId: String(seeded.attackerLead!.id),
        expectedPostId: String(seeded.victimSocialPost!.id),
        otherPostId: String(seeded.attackerSocialPost!.id),
      });

    if (
      !victimCheck.expectedOrg?.visible ||
      victimCheck.otherOrg?.visible ||
      !victimCheck.expectedClient?.visible ||
      victimCheck.otherClient?.visible ||
      !victimCheck.expectedLead?.visible ||
      victimCheck.otherLead?.visible ||
      !victimCheck.expectedPost?.visible ||
      victimCheck.otherPost?.visible
    ) {
      throw new Error(`victim rls-check mismatch: ${JSON.stringify(victimCheck)}`);
    }

    expect(victimCheck.currentOrgId).toEqual(targetOrgId);
    expect(victimCheck.expectedOrg?.visible).toBe(true);
    expect(victimCheck.otherOrg?.visible).toBe(false);
    expect(victimCheck.expectedClient?.visible).toBe(true);
    expect(victimCheck.otherClient?.visible).toBe(false);
    expect(victimCheck.expectedLead?.visible).toBe(true);
    expect(victimCheck.otherLead?.visible).toBe(false);
    expect(victimCheck.expectedPost?.visible).toBe(true);
    expect(victimCheck.otherPost?.visible).toBe(false);

      const attackerCheck = await rlsCheck({
        baseURL: attackerBaseURL,
        e2eKey,
        context: attackerContext,
        expectedOrgId: attackerOrgId,
        otherOrgId: targetOrgId,
        expectedClientId: String(seeded.attackerClient!.id),
        otherClientId: String(seeded.victimClient!.id),
        expectedLeadId: String(seeded.attackerLead!.id),
        otherLeadId: String(seeded.victimLead!.id),
        expectedPostId: String(seeded.attackerSocialPost!.id),
        otherPostId: String(seeded.victimSocialPost!.id),
      });

    if (
      !attackerCheck.expectedOrg?.visible ||
      attackerCheck.otherOrg?.visible ||
      !attackerCheck.expectedClient?.visible ||
      attackerCheck.otherClient?.visible ||
      !attackerCheck.expectedLead?.visible ||
      attackerCheck.otherLead?.visible ||
      !attackerCheck.expectedPost?.visible ||
      attackerCheck.otherPost?.visible
    ) {
      throw new Error(`attacker rls-check mismatch: ${JSON.stringify(attackerCheck)}`);
    }

    expect(attackerCheck.currentOrgId).toEqual(attackerOrgId);
    expect(attackerCheck.expectedOrg?.visible).toBe(true);
    expect(attackerCheck.otherOrg?.visible).toBe(false);
    expect(attackerCheck.expectedClient?.visible).toBe(true);
    expect(attackerCheck.otherClient?.visible).toBe(false);
    expect(attackerCheck.expectedLead?.visible).toBe(true);
    expect(attackerCheck.otherLead?.visible).toBe(false);
    expect(attackerCheck.expectedPost?.visible).toBe(true);
      expect(attackerCheck.otherPost?.visible).toBe(false);

      {
        const probe = await prismaTenantGuardProbe({ baseURL: victimBaseURL, e2eKey, context: victimContext });
        expect(probe.res.status()).toBe(500);
        expect(probe.json?.ok).toBe(true);
        expect(probe.json?.blocked).toBe(true);
      }

      {
        const probe = await orgSpoofProbe({
          baseURL: victimBaseURL,
          e2eKey,
          context: victimContext,
          orgKey: String(seeded.orgAttacker!.slug || seeded.orgAttacker!.id),
        });
        expect([400, 401, 403]).toContain(probe.res.status());
        expect(probe.json?.ok).toBe(false);
      }
    } finally {
      await victimContext?.close().catch(() => undefined);
      await attackerContext?.close().catch(() => undefined);
      await victimBrowser?.close().catch(() => undefined);
      await attackerBrowser?.close().catch(() => undefined);
    }
  });
});
