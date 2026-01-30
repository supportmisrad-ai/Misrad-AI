import { requireWorkspaceAccessByOrgSlugApi, type WorkspaceInfo } from '@/lib/server/workspace';

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
  return orgKey;
}

function getOrgKeyFromHeader(request: Request): string | null {
  const orgKey = request.headers.get('x-org-id') || request.headers.get('x-orgid');
  return orgKey ? String(orgKey) : null;
}

export async function getWorkspaceByOrgKeyOrThrow(orgKey: string): Promise<{
  workspace: WorkspaceInfo;
  workspaceId: string;
  orgKey: string;
}> {
  if (!orgKey || !String(orgKey).trim()) {
    throw new APIError(400, 'Missing workspace context');
  }

  try {
    const workspace = await requireWorkspaceAccessByOrgSlugApi(String(orgKey));
    return { workspace, workspaceId: workspace.id, orgKey: String(orgKey) };
  } catch (e: any) {
    const status = typeof e?.status === 'number' ? e.status : 403;
    throw new APIError(status, e?.message || 'Forbidden');
  }
}

async function getOrgKeyFromParams(ctx?: {
  params?: any;
}): Promise<string | null> {
  if (!ctx?.params) return null;
  const params = await Promise.resolve(ctx.params);
  const orgKey =
    (params as any)?.orgSlug ??
    (params as any)?.orgId ??
    (params as any)?.organizationId ??
    (params as any)?.workspaceId ??
    null;
  return orgKey ? String(orgKey) : null;
}

export async function getWorkspaceContextOrThrow(
  request: Request,
  ctx?: {
    params?: any;
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

  const primaryKey = headerOrgKey || paramsOrgKey;
  if (!primaryKey) {
    throw new APIError(400, 'Missing workspace context');
  }

  try {
    const { workspace: workspacePrimary } = await getWorkspaceByOrgKeyOrThrow(primaryKey);

    if (headerOrgKey && paramsOrgKey && headerOrgKey !== paramsOrgKey) {
      const { workspace: workspaceSecondary } = await getWorkspaceByOrgKeyOrThrow(paramsOrgKey);
      if (String(workspaceSecondary.id) !== String(workspacePrimary.id)) {
        throw new APIError(400, 'Conflicting workspace context');
      }
    }

    return { workspace: workspacePrimary, workspaceId: workspacePrimary.id, orgKey: primaryKey };
  } catch (e: any) {
    if (e instanceof APIError) throw e;
    const status = typeof e?.status === 'number' ? e.status : 403;
    throw new APIError(status, e?.message || 'Forbidden');
  }
}

export async function getWorkspaceOrThrow(request: Request): Promise<{
  workspace: WorkspaceInfo;
  workspaceId: string;
  orgKey: string;
}> {
  return await getWorkspaceContextOrThrow(request);
}
