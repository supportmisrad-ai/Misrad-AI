import { requireWorkspaceAccessByOrgSlugApi, type WorkspaceInfo } from '@/lib/server/workspace';

import { asObject, getErrorMessage } from '@/lib/shared/unknown';

function normalizeOrgKey(orgKey: string): string {
  const raw = String(orgKey).trim();
  if (!raw) return raw;
  if (!raw.includes('%')) return raw;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function getErrorStatus(error: unknown): number | null {
  const obj = asObject(error);
  const status = obj?.status;
  return typeof status === 'number' && Number.isFinite(status) ? status : null;
}


export class APIError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getOrgKeyOrThrow(request: Request): string {
  const orgKey = request.headers.get('x-org-id') || request.headers.get('x-orgid');
  if (!orgKey) {
    throw new APIError(400, 'Missing x-org-id header');
  }
  return normalizeOrgKey(orgKey);
}

function getOrgKeyFromHeader(request: Request): string | null {
  const orgKey = request.headers.get('x-org-id') || request.headers.get('x-orgid');
  return orgKey ? normalizeOrgKey(String(orgKey)) : null;
}

export async function getWorkspaceByOrgKeyOrThrow(orgKey: string): Promise<{
  workspace: WorkspaceInfo;
  workspaceId: string;
  orgKey: string;
}> {
  const normalizedOrgKey = normalizeOrgKey(orgKey);
  if (!normalizedOrgKey || !String(normalizedOrgKey).trim()) {
    throw new APIError(400, 'Missing workspace context');
  }

  try {
    const workspace = await requireWorkspaceAccessByOrgSlugApi(String(normalizedOrgKey));
    return { workspace, workspaceId: workspace.id, orgKey: String(normalizedOrgKey) };
  } catch (e: unknown) {
    const status = getErrorStatus(e) ?? 403;
    throw new APIError(status, getErrorMessage(e) || 'Forbidden');
  }
}

async function getOrgKeyFromParams(ctx?: {
  params?: unknown;
}): Promise<string | null> {
  if (!ctx?.params) return null;
  const params = await Promise.resolve(ctx.params);
  const obj = asObject(params);
  if (!obj) return null;
  const orgKey = obj.orgSlug ?? null;
  return orgKey ? String(orgKey) : null;
}

export async function getWorkspaceContextOrThrow(
  request: Request,
  ctx?: {
    params?: unknown;
  }
): Promise<{
  workspace: WorkspaceInfo;
  workspaceId: string;
  orgKey: string;
}> {
  const headerOrgKey = getOrgKeyFromHeader(request);
  const paramsOrgKey = await getOrgKeyFromParams(ctx);

  if (!headerOrgKey && !paramsOrgKey) {
    throw new APIError(400, 'Missing workspace context');
  }

  const primaryKey = paramsOrgKey || headerOrgKey;
  if (!primaryKey) {
    throw new APIError(400, 'Missing workspace context');
  }

  try {
    const { workspace: workspacePrimary } = await getWorkspaceByOrgKeyOrThrow(primaryKey);

    if (headerOrgKey && paramsOrgKey && headerOrgKey !== paramsOrgKey) {
      try {
        const { workspace: workspaceHeader } = await getWorkspaceByOrgKeyOrThrow(headerOrgKey);
        if (String(workspaceHeader.id) !== String(workspacePrimary.id)) {
          throw new APIError(400, 'Conflicting workspace context');
        }
      } catch {
      }
    }

    return { workspace: workspacePrimary, workspaceId: workspacePrimary.id, orgKey: primaryKey };
  } catch (e: unknown) {
    if (e instanceof APIError) throw e;
    const status = getErrorStatus(e) ?? 403;
    throw new APIError(status, getErrorMessage(e) || 'Forbidden');
  }
}

export async function getWorkspaceOrThrow(request: Request): Promise<{
  workspace: WorkspaceInfo;
  workspaceId: string;
  orgKey: string;
}> {
  return await getWorkspaceContextOrThrow(request);
}
