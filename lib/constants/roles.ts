export const ROLE_CEO = 'מנכ״ל' as const;
export const ROLE_ADMIN = 'אדמין' as const;

export const CEO_ROLE_ALIASES = [ROLE_CEO, 'מנכ"ל', 'מנכל'] as const;
export const ADMIN_ROLE_ALIASES = [ROLE_ADMIN] as const;

export function isCeoRole(role: string | null | undefined): boolean {
  const normalized = String(role || '').trim();
  return (CEO_ROLE_ALIASES as readonly string[]).includes(normalized);
}

export function isAdminRole(role: string | null | undefined): boolean {
  const normalized = String(role || '').trim();
  return (ADMIN_ROLE_ALIASES as readonly string[]).includes(normalized);
}

export function isTenantAdminRole(role: string | null | undefined): boolean {
  return isCeoRole(role) || isAdminRole(role);
}
