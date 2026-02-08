import { apiError } from '@/lib/server/api-response';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import { enterTenantIsolationContext } from '@/lib/prisma-tenant-guard';


import { asObject } from '@/lib/shared/unknown';
function getErrorStatus(error: unknown): number | null {
  const obj = asObject(error);
  const status = obj?.status;
  return typeof status === 'number' && Number.isFinite(status) ? status : null;
}

function toWorkspaceCtx(value: unknown): { params?: unknown } | undefined {
  const obj = asObject(value);
  if (!obj) return undefined;
  return { params: obj.params };
}

export function workspaceTenantGuard<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response>,
  params?: {
    source?: string;
    reason?: string;
  }
) {
  return async (...args: TArgs): Promise<Response> => {
    try {
      const request = args[0] as unknown;
      const ctx = args.length > 1 ? (args[1] as unknown) : undefined;

      if (!request || typeof request !== 'object') {
        return apiError('Invalid request', { status: 400 });
      }

      const resolved = await getWorkspaceContextOrThrow(request as Request, toWorkspaceCtx(ctx));

      const source = String(params?.source || 'api_workspace_tenant_guard');
      const reason = params?.reason ? String(params.reason) : undefined;

      const argsWithWorkspace = (() => {
        if (args.length < 2) return args;
        const ctxObj = asObject(ctx);
        if (!ctxObj) return args;
        const nextCtx = {
          ...ctxObj,
          workspace: resolved.workspace,
          workspaceId: resolved.workspaceId,
          orgKey: resolved.orgKey,
        };
        const nextArgs = [...args] as unknown[];
        nextArgs[1] = nextCtx;
        return nextArgs as TArgs;
      })();

      enterTenantIsolationContext({
        source,
        reason,
        organizationId: String(resolved.workspaceId),
      });

      return await handler(...argsWithWorkspace);
    } catch (e: unknown) {
      if (e instanceof APIError) {
        return apiError(e.message || 'Forbidden', { status: e.status });
      }
      const status = getErrorStatus(e) ?? 403;
      return apiError(e, { status });
    }
  };
}
