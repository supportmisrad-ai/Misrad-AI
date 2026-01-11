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
  'app/api/webhooks/clerk/route.ts',
  'app/api/webhooks/zapier/route.ts',
  'app/api/webhooks/make/route.ts',
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

function classify(content) {
  if (content.includes('requireWorkspaceAccessByOrgSlugApi')) return 'protected:workspace';
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

    if (PUBLIC_APPROVED.has(routeRel)) {
      report.push({ route: routeRel, status: 'public:approved' });
      continue;
    }

    const cls = classify(content);
    report.push({ route: routeRel, status: cls });

    // Candidate = looks like it should be workspace-gated but isn't using Api gatekeeper.
    if (
      (cls === 'protected:auth' || cls === 'protected:permission' || cls === 'protected:superadmin') &&
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

  console.log(
    JSON.stringify(
      {
        totalRoutes: routes.length,
        excludedPrefixes: EXCLUDED_PREFIXES,
        publicApproved: Array.from(PUBLIC_APPROVED),
        summary,
        candidateCount: candidates.length,
        candidates,
      },
      null,
      2
    )
  );
}

main();
