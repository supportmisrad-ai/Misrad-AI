/**
 * Centralised helper to read the current organisation ID
 * from the global `__CLIENT_OS_USER__` object that is injected
 * by the Client OS App component.
 *
 * Usage:  `const orgId = getClientOsOrgId();`
 */

type ClientOsUserPayload = {
  organizationId?: string | null;
  clerkUserId?: string | null;
  identity?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
    role?: string | null;
  } | null;
};

export function getClientOsUserPayload(): ClientOsUserPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    return (
      ((window as unknown) as Record<string, unknown>).__CLIENT_OS_USER__ as
        | ClientOsUserPayload
        | undefined
    ) ?? null;
  } catch {
    return null;
  }
}

export function getClientOsOrgId(): string | null {
  const payload = getClientOsUserPayload();
  return payload?.organizationId ? String(payload.organizationId) : null;
}
