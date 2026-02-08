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

type WorkspaceApiProbeResult = {
  ok: boolean;
  status: number;
  bodyText: string | null;
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

async function callWorkspaceApi(params: {
  baseURL: string;
  context: BrowserContext;
  orgSlug: string;
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  data?: unknown;
}): Promise<WorkspaceApiProbeResult> {
  const url = `${params.baseURL}/api/workspaces/${encodeURIComponent(params.orgSlug)}${params.path}`;
  const method = params.method || 'GET';

  const res = await params.context.request.fetch(url, {
    method,
    timeout: 60_000,
    headers: {
      ...(params.headers || {}),
    },
    data: params.data,
  });

  const bodyText = await res.text().catch(() => null);
  return {
    ok: res.ok(),
    status: res.status(),
    bodyText,
  };
}

function expectWorkspaceApiAllowed(result: WorkspaceApiProbeResult, hint: string) {
  if (!result.ok) {
    throw new Error(`expected workspace API allowed but got status=${result.status} (${hint}) body=${String(result.bodyText || '')}`);
  }
  expect(result.status).toBe(200);
}

function expectWorkspaceApiBlocked(result: WorkspaceApiProbeResult, hint: string) {
  if (result.ok) {
    throw new Error(`expected workspace API blocked but got status=${result.status} (${hint}) body=${String(result.bodyText || '')}`);
  }
  expect([400, 401, 403, 404]).toContain(result.status);
}

async function workspaceFlowTenantGuardProbe(params: {
  baseURL: string;
  e2eKey: string;
  context: BrowserContext;
  orgKey: string;
}) {
  const orgKey = String(params.orgKey || '').trim();
  if (!orgKey) {
    throw new Error('workspaceFlowTenantGuardProbe missing orgKey');
  }
  const res = await params.context.request.get(
    `${params.baseURL}/api/workspaces/${encodeURIComponent(orgKey)}/e2e/tenant-guard-probe`,
    {
      headers: { 'x-e2e-key': params.e2eKey, 'x-org-id': orgKey },
      timeout: 60_000,
    }
  );
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

test.describe('Tenant Isolation (probe smoke)', () => {
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:4000';
  const e2eKey = String(process.env.E2E_API_KEY || '').trim();
  const orgKey = String(process.env.E2E_ORG_KEY || process.env.E2E_ORG_SLUG || '').trim();

  const enabled = !envBool('E2E_SKIP_TENANT_ISOLATION_TEST');

  test.setTimeout(120_000);

  test.skip(!enabled, 'E2E_SKIP_TENANT_ISOLATION_TEST is enabled');
  test.skip(!e2eKey, 'E2E_API_KEY is required');
  test.skip(!orgKey, 'E2E_ORG_KEY (or E2E_ORG_SLUG) is required');

  test('workspace flow probe blocks unscoped prisma query (no auth required)', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/workspaces/${encodeURIComponent(orgKey)}/e2e/tenant-guard-probe`, {
      headers: { 'x-e2e-key': e2eKey, 'x-org-id': orgKey },
      timeout: 60_000,
    });

    const json = (await res.json().catch(() => null)) as { ok?: boolean; blocked?: boolean; error?: string } | null;

    expect(res.status()).toBe(500);
    expect(json?.ok).toBe(true);
    expect(json?.blocked).toBe(true);
  });
});

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
  test.skip(!fs.existsSync(victimState), `victim storageState file not found: ${victimState}`);
  test.skip(!fs.existsSync(attackerState), `attacker storageState file not found: ${attackerState}`);

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
        const probe = await workspaceFlowTenantGuardProbe({
          baseURL: victimBaseURL,
          e2eKey,
          context: victimContext,
          orgKey: String(seeded.orgTarget!.slug || seeded.orgTarget!.id),
        });
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

      // ------------------------------------------------------------
      // Main API routes: /api/workspaces/[orgSlug]/*
      // Prove cross-tenant access is blocked beyond dedicated probes.
      // ------------------------------------------------------------

      const victimOrgSlug = String(seeded.orgTarget!.slug || seeded.orgTarget!.id);
      const attackerOrgSlug = String(seeded.orgAttacker!.slug || seeded.orgAttacker!.id);

      // Sanity: victim can access its own workspace-scoped endpoints.
      {
        const res = await callWorkspaceApi({ baseURL: victimBaseURL, context: victimContext, orgSlug: victimOrgSlug, path: '/entitlements' });
        expectWorkspaceApiAllowed(res, 'victim GET entitlements own org');
      }
      {
        const res = await callWorkspaceApi({ baseURL: victimBaseURL, context: victimContext, orgSlug: victimOrgSlug, path: '/access' });
        expectWorkspaceApiAllowed(res, 'victim GET access own org');
      }
      {
        const res = await callWorkspaceApi({ baseURL: victimBaseURL, context: victimContext, orgSlug: victimOrgSlug, path: '/owner-dashboard' });
        expectWorkspaceApiAllowed(res, 'victim GET owner-dashboard own org');
      }
      {
        const res = await callWorkspaceApi({
          baseURL: victimBaseURL,
          context: victimContext,
          orgSlug: victimOrgSlug,
          path: '/me-insights?module=system',
        });
        expectWorkspaceApiAllowed(res, 'victim GET me-insights own org');
      }

      // Attack: attacker attempts to access victim org endpoints.
      {
        const res = await callWorkspaceApi({ baseURL: attackerBaseURL, context: attackerContext, orgSlug: victimOrgSlug, path: '/entitlements' });
        expectWorkspaceApiBlocked(res, 'attacker GET entitlements victim org');
      }
      {
        const res = await callWorkspaceApi({ baseURL: attackerBaseURL, context: attackerContext, orgSlug: victimOrgSlug, path: '/access' });
        expectWorkspaceApiBlocked(res, 'attacker GET access victim org');
      }
      {
        const res = await callWorkspaceApi({ baseURL: attackerBaseURL, context: attackerContext, orgSlug: victimOrgSlug, path: '/owner-dashboard' });
        expectWorkspaceApiBlocked(res, 'attacker GET owner-dashboard victim org');
      }
      {
        const res = await callWorkspaceApi({
          baseURL: attackerBaseURL,
          context: attackerContext,
          orgSlug: victimOrgSlug,
          path: '/me-insights?module=system',
        });
        expectWorkspaceApiBlocked(res, 'attacker GET me-insights victim org');
      }

      // Attack: victim attempts to access attacker org endpoints.
      {
        const res = await callWorkspaceApi({ baseURL: victimBaseURL, context: victimContext, orgSlug: attackerOrgSlug, path: '/entitlements' });
        expectWorkspaceApiBlocked(res, 'victim GET entitlements attacker org');
      }
      {
        const res = await callWorkspaceApi({ baseURL: victimBaseURL, context: victimContext, orgSlug: attackerOrgSlug, path: '/access' });
        expectWorkspaceApiBlocked(res, 'victim GET access attacker org');
      }
      {
        const res = await callWorkspaceApi({ baseURL: victimBaseURL, context: victimContext, orgSlug: attackerOrgSlug, path: '/owner-dashboard' });
        expectWorkspaceApiBlocked(res, 'victim GET owner-dashboard attacker org');
      }
      {
        const res = await callWorkspaceApi({
          baseURL: victimBaseURL,
          context: victimContext,
          orgSlug: attackerOrgSlug,
          path: '/me-insights?module=system',
        });
        expectWorkspaceApiBlocked(res, 'victim GET me-insights attacker org');
      }

      // Org context spoofing: conflicting x-org-id header vs orgSlug param must be rejected.
      {
        const res = await callWorkspaceApi({
          baseURL: attackerBaseURL,
          context: attackerContext,
          orgSlug: victimOrgSlug,
          path: '/owner-dashboard',
          headers: { 'x-org-id': attackerOrgSlug },
        });
        expectWorkspaceApiBlocked(res, 'attacker spoof header org != param orgSlug (owner-dashboard)');
        expect([400, 401, 403]).toContain(res.status);
      }
      {
        const res = await callWorkspaceApi({
          baseURL: victimBaseURL,
          context: victimContext,
          orgSlug: attackerOrgSlug,
          path: '/me-insights?module=system',
          headers: { 'x-org-id': victimOrgSlug },
        });
        expectWorkspaceApiBlocked(res, 'victim spoof header org != param orgSlug (me-insights)');
        expect([400, 401, 403]).toContain(res.status);
      }
    } finally {
      await victimContext?.close().catch(() => undefined);
      await attackerContext?.close().catch(() => undefined);
      await victimBrowser?.close().catch(() => undefined);
      await attackerBrowser?.close().catch(() => undefined);
    }
  });
});
