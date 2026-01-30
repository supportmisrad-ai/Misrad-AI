const fs = require('fs');
const path = require('path');

const API_ROOT = path.join(process.cwd(), 'app', 'api');

const EXCLUDED_PREFIXES = [
  'app/api/integrations/',
  'app/api/notifications/',
  'app/api/features/',
];

const PUBLIC_APPROVED = new Set([
  'app/api/strategic-content/route.ts',
  'app/api/shabbat/status/route.ts',
  'app/api/download/android/route.ts',
  'app/api/download/windows/route.ts',
  'app/api/os/module-icons/route.ts',
  'app/api/employees/invite/[token]/route.ts',
  'app/api/employees/invite/[token]/complete/route.ts',
  'app/api/invitations/token/[token]/route.ts',
  'app/api/invitations/complete/[token]/route.ts',
  'app/api/webhooks/clerk/route.ts',
  'app/api/webhooks/zapier/route.ts',
  'app/api/webhooks/make/route.ts',
]);

const CANDIDATE_APPROVED = new Set([
  // Add explicit exceptions here (route.ts paths) when a candidate is accepted by design.
]);

function rel(p) {
  return path.relative(process.cwd(), p).replace(/\\/g, '/');
}

function walkRoutes(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkRoutes(p, out);
    } else if (ent.isFile() && ent.name === 'route.ts') {
      out.push(p);
    }
  }
}

function excluded(routeRel) {
  return EXCLUDED_PREFIXES.some((p) => routeRel.startsWith(p));
}

function hasAny(content, needles) {
  return needles.some((n) => content.includes(n));
}

function scanSupabaseTenantIsolationIssues(content) {
  const issues = [];

  const forbiddenCreateClient = /createClient\s*\(\s*\{[^}]*useServiceRole\s*:\s*true/gi;
  if (forbiddenCreateClient.test(content)) {
    issues.push('forbidden: createClient({ useServiceRole: true })');
  }

  const bareServiceRole = /createServiceRoleClient\s*\(\s*\)/gi;
  if (bareServiceRole.test(content)) {
    issues.push('blocked: createServiceRoleClient() without params');
  }

  const findCalls = (name) => {
    const re = new RegExp(`${name}\\s*\\(`, 'gi');
    const out = [];
    let m;
    while ((m = re.exec(content))) {
      out.push(m.index);
    }
    return out;
  };

  const readCallSnippet = (idx) => {
    const max = 800;
    const slice = content.slice(idx, idx + max);
    const endIdx = slice.indexOf(');');
    if (endIdx >= 0) return slice.slice(0, endIdx + 2);
    const endIdx2 = slice.indexOf(')');
    if (endIdx2 >= 0) return slice.slice(0, endIdx2 + 1);
    return slice;
  };

  for (const idx of findCalls('createServiceRoleClient')) {
    const snippet = readCallSnippet(idx);
    if (!snippet.includes('allowUnscoped') || !snippet.includes('reason')) {
      if (!snippet.match(/createServiceRoleClient\s*\(\s*\)/i)) {
        issues.push('blocked: createServiceRoleClient missing allowUnscoped/reason');
      }
    }
  }

  for (const idx of findCalls('createServiceRoleClientScoped')) {
    const snippet = readCallSnippet(idx);
    if (!snippet.includes('reason') || !snippet.includes('scopeColumn') || !snippet.includes('scopeId')) {
      issues.push('blocked: createServiceRoleClientScoped missing reason/scopeColumn/scopeId');
    }
  }

  return issues;
}

function isGoneStub(content) {
  if (!content.includes('apiError')) return false;
  if (!content.includes('status: 410')) return false;
  if (!content.includes('Gone - use')) return false;
  return true;
}

function classify(content) {
  if (isGoneStub(content)) return 'deprecated:gone';
  if (content.includes('x-cron-secret') || content.includes('CRON_SECRET')) return 'protected:cron';
  if (content.includes('x-e2e-key') || content.includes('E2E_API_KEY')) return 'protected:e2e';
  if (content.includes('x-kiosk-secret') || content.includes('KIOSK_PAIRING_SECRET')) return 'protected:kiosk';

  if (content.includes('requireWorkspaceAccessByOrgSlugApi')) return 'protected:workspace';
  if (content.includes('getWorkspaceOrThrow')) return 'protected:workspace';
  if (content.includes('getWorkspaceByOrgKeyOrThrow')) return 'protected:workspace';
  if (content.includes('getWorkspaceContextOrThrow')) return 'protected:workspace';
  if (content.includes('requireWorkspaceAccessByOrgSlugUi')) return 'protected:workspace_ui';
  if (content.includes('requireSuperAdmin')) return 'protected:superadmin';
  if (content.includes('requirePermission')) return 'protected:permission';

  if (
    hasAny(content, [
      'getAuthenticatedUser',
      'auth()',
      'currentUser',
      'getCurrentUserId',
    ])
  ) {
    return 'protected:auth';
  }

  if (
    hasAny(content, [
      'svix',
      'svix-signature',
      'CLERK_WEBHOOK_SECRET',
      'ZAPIER_WEBHOOK_SECRET',
      'MAKE_WEBHOOK_SECRET',
    ])
  ) {
    return 'webhook_or_integration';
  }

  return 'unprotected';
}

function looksWorkspaceScoped(routeRel, content) {
  if (routeRel.includes('/workspaces/[orgSlug]/')) return true;
  if (/\{\s*params\s*\}:\s*\{\s*params:\s*Promise<\{[^}]*orgSlug/i.test(content)) return true;
  if (/orgSlug/i.test(content)) return true;
  if (/organization_id/i.test(content) || /organizationId/i.test(content)) return true;
  if (/\.eq\(\s*['\"]organization_id['\"]/i.test(content)) return true;
  if (/where:\s*\{[^}]*organizationId/i.test(content)) return true;
  return false;
}

function isDangerousCandidate(c) {
  if (c.currentGuard === 'supabase') return true;
  if (c.currentGuard === 'unprotected') return true;
  if (c.currentGuard === 'protected:workspace_ui') return true;
  if (c.reason === 'workspace-scoped but not using requireWorkspaceAccessByOrgSlugApi') return true;
  return false;
}

function main() {
  const routes = [];
  walkRoutes(API_ROOT, routes);

  const report = [];
  const candidates = [];

  for (const abs of routes) {
    const routeRel = rel(abs);

    if (excluded(routeRel)) {
      report.push({ route: routeRel, status: 'excluded' });
      continue;
    }

    const content = fs.readFileSync(abs, 'utf8');

    const supabaseIssues = scanSupabaseTenantIsolationIssues(content);
    if (supabaseIssues.length > 0) {
      candidates.push({
        route: routeRel,
        currentGuard: 'supabase',
        reason: `tenant-isolation: ${supabaseIssues.join('; ')}`,
      });
    }

    if (PUBLIC_APPROVED.has(routeRel)) {
      report.push({ route: routeRel, status: 'public:approved' });
      continue;
    }

    const cls = classify(content);
    report.push({ route: routeRel, status: cls });

    // Candidate = looks like it should be workspace-gated but isn't using Api gatekeeper.
    if (
      (cls === 'protected:auth' || cls === 'protected:permission') &&
      looksWorkspaceScoped(routeRel, content) &&
      !content.includes('requireWorkspaceAccessByOrgSlugApi')
    ) {
      candidates.push({
        route: routeRel,
        currentGuard: cls,
        reason: 'workspace-scoped but not using requireWorkspaceAccessByOrgSlugApi',
      });
    }

    if (cls === 'protected:workspace_ui') {
      candidates.push({
        route: routeRel,
        currentGuard: cls,
        reason: 'uses requireWorkspaceAccessByOrgSlugUi in API route; prefer requireWorkspaceAccessByOrgSlugApi',
      });
    }

    if (cls === 'unprotected' && !routeRel.includes('/invite/') && !routeRel.includes('/invitations/')) {
      candidates.push({
        route: routeRel,
        currentGuard: cls,
        reason: 'unprotected route outside known-public token flows',
      });
    }
  }

  report.sort((a, b) => a.route.localeCompare(b.route));
  candidates.sort((a, b) => a.route.localeCompare(b.route));

  const summary = report.reduce((acc, x) => {
    acc[x.status] = (acc[x.status] || 0) + 1;
    return acc;
  }, {});

  const unprotectedRoutes = report.filter((r) => r.status === 'unprotected').map((r) => r.route);

  const dangerousCandidates = candidates.filter(
    (c) => isDangerousCandidate(c) && !CANDIDATE_APPROVED.has(c.route)
  );

  console.log(
    JSON.stringify(
      {
        totalRoutes: routes.length,
        excludedPrefixes: EXCLUDED_PREFIXES,
        publicApproved: Array.from(PUBLIC_APPROVED),
        candidateApproved: Array.from(CANDIDATE_APPROVED),
        summary,
        unprotectedRoutes,
        candidateCount: candidates.length,
        candidates,
        dangerousCandidateCount: dangerousCandidates.length,
        dangerousCandidates,
      },
      null,
      2
    )
  );

  if (unprotectedRoutes.length > 0 || dangerousCandidates.length > 0) {
    process.exitCode = 1;
  }
}

main();
