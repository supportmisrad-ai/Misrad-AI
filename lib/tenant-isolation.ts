export class AssertionError extends Error {
  name = 'AssertionError';

  constructor(message: string) {
    super(message);
  }
}

export function requireOrganizationId(context: string, organizationId?: string | null): string {
  const resolved = typeof organizationId === 'string' ? organizationId.trim() : '';
  if (!resolved) {
    throw new AssertionError(`Missing Org ID: ${context}`);
  }
  return resolved;
}

export const ORG_SCOPED_TABLES = {
  social_posts: true,
  social_post_platforms: true,
  social_post_comments: true,
  social_post_variations: true,
  social_tasks: true,
  social_conversations: true,
  social_messages: true,
  social_client_requests: true,
  social_manager_requests: true,
  social_ideas: true,
  misrad_notifications: true,
  nexus_tasks: true,
  clients: true,
} as const;

export type OrgScopedTableName = keyof typeof ORG_SCOPED_TABLES;

export type DbWritePayload = Record<string, any> & {
  organization_id?: string;
  organizationId?: string;
};

function getPayloadOrgId(payload: DbWritePayload): string | null {
  const v = payload.organization_id ?? payload.organizationId;
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function setPayloadOrgId(payload: DbWritePayload, organizationId: string): DbWritePayload {
  if ('organization_id' in payload) {
    return { ...payload, organization_id: organizationId };
  }
  if ('organizationId' in payload) {
    return { ...payload, organizationId };
  }
  return { ...payload, organization_id: organizationId };
}

export function safeWritePayload<T extends DbWritePayload>(params: {
  context: string;
  table: OrgScopedTableName;
  payload: T;
  organizationId?: string | null;
  mode: 'insert' | 'update' | 'upsert' | 'delete';
}): T {
  const scopeId = requireOrganizationId(`${params.context}:${params.mode}:${params.table}`, params.organizationId);

  const existingOrg = getPayloadOrgId(params.payload);
  if (existingOrg && existingOrg !== scopeId) {
    throw new AssertionError(`Org mismatch: ${params.context}:${params.mode}:${params.table}`);
  }

  return setPayloadOrgId(params.payload, scopeId) as T;
}

export function withOrgContext<T>(params: {
  context: string;
  organizationId?: string | null;
  fn: (organizationId: string) => Promise<T>;
}): Promise<T> {
  const orgId = requireOrganizationId(params.context, params.organizationId);
  return params.fn(orgId);
}
