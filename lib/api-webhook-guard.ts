import { enterTenantIsolationContext } from '@/lib/prisma-tenant-guard';

type WebhookTenantContextParams = {
  source: string;
  organizationId: string;
};

type WebhookGlobalAdminContextParams = {
  source: string;
};

export async function withWebhookTenantContext<T>(params: WebhookTenantContextParams, fn: () => Promise<T>): Promise<T> {
  const organizationId = String(params.organizationId || '').trim();
  if (!organizationId) {
    throw new Error('[WebhookGuard] Missing organizationId');
  }

  enterTenantIsolationContext({ source: params.source, organizationId });
  return fn();
}

export async function withWebhookGlobalAdminContext<T>(
  params: WebhookGlobalAdminContextParams,
  fn: () => Promise<T>
): Promise<T> {
  enterTenantIsolationContext({
    source: params.source,
    mode: 'global_admin',
    isSuperAdmin: true,
  });

  return fn();
}
