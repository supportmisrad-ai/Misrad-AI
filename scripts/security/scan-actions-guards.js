const fs = require('fs');
const path = require('path');

const ACTIONS_ROOT = path.join(process.cwd(), 'app', 'actions');

const EXCLUDED_PREFIXES = [];

const CANDIDATE_APPROVED = new Set([
  // Add explicit exceptions here (action file paths) when a candidate is accepted by design.
  'app/actions/social-users.ts',
]);

function rel(p) {
  return path.relative(process.cwd(), p).replace(/\\/g, '/');
}

function walkActions(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkActions(p, out);
    } else if (ent.isFile() && (ent.name.endsWith('.ts') || ent.name.endsWith('.tsx'))) {
      out.push(p);
    }
  }
}

function excluded(actionRel) {
  return EXCLUDED_PREFIXES.some((p) => actionRel.startsWith(p));
}

function hasAny(content, needles) {
  return needles.some((n) => content.includes(n));
}

function looksDbBacked(content) {
  if (content.includes("from '@/lib/prisma")) return true;
  if (content.includes('from \"@/lib/prisma\"')) return true;
  if (content.includes('prisma.')) return true;
  return false;
}

function looksWorkspaceScoped(content) {
  if (/orgSlug/i.test(content)) return true;
  if (/\borgId\b/i.test(content)) return true;
  if (/\borganizationId\b/i.test(content)) return true;
  return false;
}

function classify(content) {
  if (content.includes('withWorkspaceTenantContext')) return 'protected:workspace_tenant_context';

  if (hasAny(content, ['withClientPortalTenantContext', 'resolveClientPortalOrganizationContext'])) {
    return 'protected:workspace_tenant_context';
  }

  if (hasAny(content, ['resolveWorkspaceCurrentUserForApi', 'resolveWorkspaceCurrentUserForUi'])) {
    return 'protected:workspace_access';
  }

  if (
    hasAny(content, [
      'requireWorkspaceAccessByOrgSlugApi',
      'requireWorkspaceIdByOrgSlugApi',
      'requireWorkspaceAccessByOrgSlugUi',
      'requireWorkspaceAccessByOrgSlug(',
    ])
  ) {
    return 'protected:workspace_access';
  }

  if (content.includes('requireSuperAdmin')) return 'protected:superadmin';

  if (
    hasAny(content, [
      'requireAuth',
      'getAuthenticatedUser',
      'auth()',
      'getCurrentUserId',
      'currentUser',
      'requirePermission',
    ])
  ) {
    return 'protected:auth';
  }

  return 'unprotected';
}

function isDangerousCandidate(c) {
  if (!c.dbBacked) return false;
  if (!c.workspaceScoped) return false;
  return c.currentGuard === 'unprotected';
}

function main() {
  const files = [];
  walkActions(ACTIONS_ROOT, files);

  const report = [];
  const candidates = [];

  for (const abs of files) {
    const actionRel = rel(abs);

    if (excluded(actionRel)) {
      report.push({ action: actionRel, status: 'excluded' });
      continue;
    }

    const content = fs.readFileSync(abs, 'utf8');

    if (!content.includes("'use server'") && !content.includes('"use server"')) {
      report.push({ action: actionRel, status: 'excluded:not_server_action' });
      continue;
    }
    const dbBacked = looksDbBacked(content);
    const workspaceScoped = looksWorkspaceScoped(content);

    const cls = classify(content);
    report.push({ action: actionRel, status: cls });

    if (dbBacked && workspaceScoped && cls !== 'protected:workspace_tenant_context' && cls !== 'protected:workspace_access' && cls !== 'protected:superadmin') {
      candidates.push({
        action: actionRel,
        currentGuard: cls,
        dbBacked,
        workspaceScoped,
        reason: 'workspace-scoped action touches DB but missing workspace gatekeeper',
      });
    }
  }

  report.sort((a, b) => a.action.localeCompare(b.action));
  candidates.sort((a, b) => a.action.localeCompare(b.action));

  const summary = report.reduce((acc, x) => {
    acc[x.status] = (acc[x.status] || 0) + 1;
    return acc;
  }, {});

  const dangerousCandidates = candidates.filter((c) => isDangerousCandidate(c) && !CANDIDATE_APPROVED.has(c.action));

  console.log(
    JSON.stringify(
      {
        totalActions: files.length,
        excludedPrefixes: EXCLUDED_PREFIXES,
        candidateApproved: Array.from(CANDIDATE_APPROVED),
        summary,
        candidateCount: candidates.length,
        candidates,
        dangerousCandidateCount: dangerousCandidates.length,
        dangerousCandidates,
      },
      null,
      2
    )
  );

  if (dangerousCandidates.length > 0) {
    process.exitCode = 1;
  }
}

main();
