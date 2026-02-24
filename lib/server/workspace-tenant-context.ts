import 'server-only';

import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import type { WorkspaceInfo } from '@/lib/server/workspace';
import { withTransientRetry } from '@/lib/server/prisma-retry';

export async function withWorkspaceTenantContext<T>(
  orgSlug: string,
  fn: (params: { organizationId: string; workspaceId: string; workspace: WorkspaceInfo }) => Promise<T>,
  options?: {
    source?: string;
    reason?: string;
  }
): Promise<T> {
  const source = String(options?.source || 'server_action_workspace_tenant_context');
  const reason = options?.reason ? String(options.reason) : undefined;

  return await withTransientRetry(
    async () => {
      const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
      return await withTenantIsolationContext(
        {
          source,
          reason,
          organizationId: String(workspace.id),
        },
        async () => fn({ organizationId: String(workspace.id), workspaceId: String(workspace.id), workspace })
      );
    },
    { label: reason || source },
  );
}
