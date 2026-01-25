import { test, expect, chromium, request as playwrightRequest } from '@playwright/test';

async function loginAndGetStorageState(params: {
  baseURL: string;
  email: string;
  password: string;
}) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${params.baseURL}/login`, { waitUntil: 'domcontentloaded', timeout: 120_000 });

  const googleBtn = page.getByRole('button', { name: 'המשך עם Google' });
  await googleBtn.waitFor({ state: 'visible', timeout: 120_000 });

  const passwordInput = page.getByPlaceholder('הקלד סיסמה...');
  const inPasswordStep = await passwordInput.isVisible().catch(() => false);
  if (!inPasswordStep) {
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 60_000 });
    await emailInput.fill(params.email);
    await page.getByRole('button', { name: 'המשך', exact: true }).click();
    await passwordInput.waitFor({ state: 'visible', timeout: 60_000 });
  }

  await passwordInput.fill(params.password);

  const submit = page.getByRole('button', { name: /כניסה למערכת/ });
  await submit.waitFor({ state: 'visible', timeout: 60_000 });
  await submit.click();

  await page.waitForURL(
    (url) => {
      const p = url.pathname || '';
      return !p.startsWith('/login') && !p.startsWith('/sign-in');
    },
    { waitUntil: 'domcontentloaded', timeout: 90_000 }
  );

  const storageState = await context.storageState();
  await browser.close();
  return storageState;
}

async function apiJson(res: any) {
  const text = await res.text();
  try {
    return { json: JSON.parse(text), text };
  } catch {
    return { json: null, text };
  }
}

test('Tenant Isolation Battle Test (Org_Target vs Org_Attacker)', async ({ baseURL }) => {
  const e2eKey = process.env.E2E_API_KEY;
  const victimEmail = process.env.E2E_EMAIL;
  const victimPassword = process.env.E2E_PASSWORD;

  const attackerEmail = process.env.E2E_ATTACKER_EMAIL;
  const attackerPassword = process.env.E2E_ATTACKER_PASSWORD;

  expect(e2eKey, 'Missing E2E_API_KEY').toBeTruthy();
  expect(victimEmail, 'Missing E2E_EMAIL').toBeTruthy();
  expect(victimPassword, 'Missing E2E_PASSWORD').toBeTruthy();
  expect(attackerEmail, 'Missing E2E_ATTACKER_EMAIL').toBeTruthy();
  expect(attackerPassword, 'Missing E2E_ATTACKER_PASSWORD').toBeTruthy();

  const victimState = await loginAndGetStorageState({
    baseURL: String(baseURL),
    email: String(victimEmail),
    password: String(victimPassword),
  });

  const attackerState = await loginAndGetStorageState({
    baseURL: String(baseURL),
    email: String(attackerEmail),
    password: String(attackerPassword),
  });

  const victimApi = await playwrightRequest.newContext({ baseURL: String(baseURL), storageState: victimState });
  const attackerApi = await playwrightRequest.newContext({ baseURL: String(baseURL), storageState: attackerState });

  const whoVictim = await victimApi.get('/api/e2e/whoami', { headers: { 'x-e2e-key': String(e2eKey) } });
  expect(whoVictim.status()).toBe(200);
  const whoVictimBody = (await whoVictim.json()) as any;

  const whoAttacker = await attackerApi.get('/api/e2e/whoami', { headers: { 'x-e2e-key': String(e2eKey) } });
  expect(whoAttacker.status()).toBe(200);
  const whoAttackerBody = (await whoAttacker.json()) as any;

  const seed = await victimApi.post('/api/e2e/tenant-isolation-seed', {
    headers: { 'x-e2e-key': String(e2eKey) },
    data: {
      victimClerkUserId: whoVictimBody.clerkUserId,
      victimEmail: whoVictimBody.email,
      attackerClerkUserId: whoAttackerBody.clerkUserId,
      attackerEmail: whoAttackerBody.email,
    },
  });

  expect(seed.status(), 'seed failed').toBe(200);
  const seedBody = (await seed.json()) as any;

  const orgTargetId = String(seedBody?.orgTarget?.id || '');
  const orgAttackerId = String(seedBody?.orgAttacker?.id || '');
  expect(orgTargetId).toBeTruthy();
  expect(orgAttackerId).toBeTruthy();

  const meVictim = await victimApi.get('/api/users/me', { headers: { 'x-org-id': orgTargetId } });
  expect(meVictim.status()).toBe(200);
  const meVictimBody = (await meVictim.json()) as any;
  const victimDbUserId = String(meVictimBody?.user?.id || '');
  expect(victimDbUserId).toBeTruthy();

  const meAttacker = await attackerApi.get('/api/users/me', { headers: { 'x-org-id': orgAttackerId } });
  expect(meAttacker.status()).toBe(200);
  const meAttackerBody = (await meAttacker.json()) as any;
  const attackerDbUserId = String(meAttackerBody?.user?.id || '');
  expect(attackerDbUserId).toBeTruthy();

  // Create a Victim time entry via the authenticated API
  const createEntry = await victimApi.post('/api/time-entries', {
    headers: { 'x-org-id': orgTargetId },
    data: {
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 15 * 60_000).toISOString(),
      date: new Date().toISOString().slice(0, 10),
      durationMinutes: 15,
    },
  });

  expect(createEntry.status()).toBe(200);
  const entryBody = (await createEntry.json()) as any;
  const victimEntryId = String(entryBody?.entry?.id || '');
  expect(victimEntryId).toBeTruthy();

  // Create one Lead in Org_Target via existing E2E route
  const leadRes = await victimApi.post('/api/e2e/lead-won-chain', {
    headers: { 'x-e2e-key': String(e2eKey) },
    data: { orgSlug: orgTargetId, lead: { name: 'Victim Lead', phone: '0500000000', email: `victim+${Date.now()}@misrad.test`, company: 'Victim Co', value: 1234, installationAddress: 'תל אביב 1' } },
  });
  expect(leadRes.status()).toBe(200);
  const leadJson = (await leadRes.json()) as any;
  const victimLeadId = String(leadJson?.leadId || '');
  expect(victimLeadId).toBeTruthy();

  // ------------------
  // ATTACK 1 (ID guessing)
  // Note: GET by entry id is not supported by /api/time-entries. We simulate direct ID access via PATCH.
  const attack1 = await attackerApi.patch(`/api/time-entries?id=${encodeURIComponent(victimEntryId)}`, {
    headers: { 'x-org-id': orgAttackerId },
    data: { endTime: new Date().toISOString() },
  });
  const attack1Text = await attack1.text();

  // ------------------
  // ATTACK 2 (Header manipulation)
  const attack2 = await attackerApi.get('/api/users', { headers: { 'x-org-id': orgTargetId } });
  const attack2Text = await attack2.text();

  // ------------------
  // ATTACK 3 (Cross-tenant search)
  const attack3 = await attackerApi.get('/api/users', { headers: { 'x-org-id': orgAttackerId } });
  const attack3Status = attack3.status();
  const attack3Body = await apiJson(attack3);

  const leakedVictim = attack3Body.text.includes(victimDbUserId) || attack3Body.text.includes(String(victimEmail));

  // Report to console (battle log)
  console.log('--- Tenant Isolation Battle Report ---');
  console.log('Org_Target:', orgTargetId, 'Victim userId:', victimDbUserId, 'Victim entryId:', victimEntryId, 'Victim leadId:', victimLeadId);
  console.log('Org_Attacker:', orgAttackerId, 'Hacker userId:', attackerDbUserId);
  console.log('[Attack 1] ID Guessing (PATCH /api/time-entries?id=VictimEntryId) ->', attack1.status(), 'Leaked?', attack1Text.includes(victimEntryId));
  console.log('[Attack 2] Header Manipulation (GET /api/users with x-org-id=Org_Target) ->', attack2.status(), 'Body bytes:', attack2Text.length);
  console.log('[Attack 3] Cross-Tenant Search (GET /api/users with x-org-id=Org_Attacker) ->', attack3Status, 'Victim leaked?', leakedVictim);

  // Assertions
  expect([401, 403, 404]).toContain(attack1.status());
  expect(attack2.status()).toBe(403);
  expect(attack3Status).toBe(200);
  expect(leakedVictim).toBe(false);

  await victimApi.dispose();
  await attackerApi.dispose();
});
