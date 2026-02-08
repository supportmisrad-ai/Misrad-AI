type CliParams = {
  baseUrl: string;
  orgSlug: string;
  e2eKey: string;
  cookie?: string;
  verbose: boolean;
};

function sanitizeCookie(raw: string | undefined): string | undefined {
  const value = String(raw || '').trim();
  if (!value) return undefined;
  const lowered = value.toLowerCase();
  if (lowered.startsWith('cookie:')) {
    return value.slice('cookie:'.length).trim() || undefined;
  }
  return value;
}

function readArgValue(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  const value = args[idx + 1];
  return value == null ? undefined : String(value);
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function requireNonEmpty(name: string, v: string | undefined): string {
  const value = String(v || '').trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function resolveParams(): CliParams {
  const args = process.argv.slice(2);

  const baseUrl =
    readArgValue(args, '--baseUrl') ||
    readArgValue(args, '--base-url') ||
    String(process.env.BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:4000').trim();

  const orgSlug =
    readArgValue(args, '--orgSlug') ||
    readArgValue(args, '--org-slug') ||
    String(process.env.ORG_SLUG || process.env.E2E_ORG_SLUG || '').trim();

  const e2eKey =
    readArgValue(args, '--e2eKey') ||
    readArgValue(args, '--e2e-key') ||
    String(process.env.E2E_API_KEY || '').trim();

  const cookie = sanitizeCookie(
    readArgValue(args, '--cookie') ||
      readArgValue(args, '--Cookie') ||
      String(process.env.COOKIE || process.env.VERIFY_COOKIE || '').trim() ||
      undefined
  );

  const verbose = hasFlag(args, '--verbose');

  return {
    baseUrl: requireNonEmpty('baseUrl', baseUrl),
    orgSlug: requireNonEmpty('orgSlug', orgSlug),
    e2eKey: requireNonEmpty('e2eKey (E2E_API_KEY)', e2eKey),
    cookie,
    verbose,
  };
}

async function main() {
  const params = resolveParams();

  const url = `${params.baseUrl.replace(/\/$/, '')}/api/workspaces/${encodeURIComponent(params.orgSlug)}/e2e/tenant-guard-probe`;

  const headers: Record<string, string> = {
    'x-e2e-key': params.e2eKey,
    'x-org-id': params.orgSlug,
    accept: 'application/json',
  };

  if (params.cookie) {
    headers.cookie = params.cookie;
  }

  if (params.verbose) {
    console.log('[verify-guard] url:', url);
    console.log('[verify-guard] headers:', Object.keys(headers));
  }

  const res = await fetch(url, {
    method: 'GET',
    headers,
    redirect: 'manual',
  });

  const contentType = String(res.headers.get('content-type') || '');
  const status = res.status;

  const rawText = await res.text().catch(() => null);
  const parsedJson = (() => {
    if (!rawText) return null;
    try {
      return JSON.parse(rawText) as unknown;
    } catch {
      return null;
    }
  })();

  const rawBody = parsedJson ?? rawText;

  const body = (() => {
    if (rawBody == null) return null;
    if (typeof rawBody !== 'string') return rawBody;
    const s = rawBody;
    if (s.length <= 2000) return s;
    return `${s.slice(0, 2000)}\n... (truncated ${s.length - 2000} chars)`;
  })();

  console.log(`[verify-guard] status: ${status}`);
  console.log(`[verify-guard] content-type: ${contentType || '(none)'}`);

  const jsonObj = (() => {
    if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson)) return null;
    return parsedJson as Record<string, unknown>;
  })();

  const ok = jsonObj?.ok === true;
  const blocked = jsonObj?.blocked === true;

  if (status === 500 && ok && blocked) {
    console.log('PASS: got 500 + {ok:true, blocked:true} - Prisma tenant guard blocked unscoped query as expected.');
    if (body != null) {
      console.log('Response:', body);
    }
    process.exitCode = 0;
    return;
  }

  console.error(`FAIL: expected 500 + {ok:true, blocked:true}, got status=${status} ok=${String(ok)} blocked=${String(blocked)}.`);
  if (status === 401 || status === 403) {
    console.error('Hint: you may be missing a valid auth Cookie or IS_E2E_TESTING=true / correct x-e2e-key.');
  }
  if (status >= 300 && status < 400) {
    console.error('Hint: redirect response usually indicates auth middleware (login) kicked in; pass Cookie.');
  }

  console.error('Response:', body);
  process.exitCode = 2;
}

main().catch((e: unknown) => {
  console.error('ERROR:', e);
  process.exitCode = 1;
});
