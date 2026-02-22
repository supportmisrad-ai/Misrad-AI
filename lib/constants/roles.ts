export const ROLE_CEO = 'מנכ״ל' as const;
export const ROLE_ADMIN = 'אדמין' as const;

export const CEO_ROLE_ALIASES = [ROLE_CEO, 'מנכ"ל', 'מנכל'] as const;
export const ADMIN_ROLE_ALIASES = [ROLE_ADMIN] as const;

/**
 * Israeli organizational hierarchy levels (highest to lowest).
 * Used for sorting, filtering, and determining management scope.
 *
 * Level 1: מנכ״ל / CEO
 * Level 2: סמנכ״ל / VP
 * Level 3: מנהל בכיר / ראש מחלקה / Director
 * Level 4: מנהל / Manager
 * Level 5: ראש צוות / רכז / Team Lead
 * Level 6: עובד בכיר / Senior Employee
 * Level 7: עובד / Employee
 * Level 8: מתמחה / סטאז׳ר / Intern
 * Level 9: פרילנסר / Freelancer (external)
 */
export const ROLE_HIERARCHY: { keywords: string[]; level: number; label: string }[] = [
  { keywords: ['מנכ״ל', 'מנכ"ל', 'מנכל', 'ceo'], level: 1, label: 'מנכ״ל' },
  { keywords: ['סמנכ״ל', 'סמנכ"ל', 'סמנכל', 'vp', 'משנה למנכ'], level: 2, label: 'סמנכ״ל' },
  { keywords: ['מנהל בכיר', 'ראש מחלקה', 'ראש אגף', 'director', 'head of'], level: 3, label: 'ראש מחלקה' },
  { keywords: ['מנהל', 'מנהלת', 'manager'], level: 4, label: 'מנהל' },
  { keywords: ['ראש צוות', 'רכז', 'רכזת', 'team lead', 'coordinator', 'אחראי', 'אחראית'], level: 5, label: 'ראש צוות' },
  { keywords: ['בכיר', 'senior'], level: 6, label: 'עובד בכיר' },
  { keywords: ['עובד', 'עובדת', 'איש מכירות', 'אשת מכירות', 'נציג', 'נציגה', 'employee'], level: 7, label: 'עובד' },
  { keywords: ['מתמחה', 'סטאז׳ר', 'סטאז\'ר', 'סטאזר', 'intern', 'junior'], level: 8, label: 'מתמחה' },
  { keywords: ['פרילנסר', 'freelancer', 'חיצוני', 'קבלן', 'יועץ', 'consultant'], level: 9, label: 'פרילנסר' },
];

/**
 * Get the hierarchy level for a given role string (1 = highest, 9 = lowest).
 * Returns 7 (עובד) as default if no match is found.
 */
export function getRoleLevel(role: string | null | undefined): number {
  const normalized = String(role || '').trim().toLowerCase();
  if (!normalized) return 7;

  for (const entry of ROLE_HIERARCHY) {
    for (const keyword of entry.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        return entry.level;
      }
    }
  }
  return 7; // default to עובד
}

/**
 * Returns true if the role is a management-level role (level 1-5):
 * מנכ״ל, סמנכ״ל, ראש מחלקה, מנהל, ראש צוות/רכז.
 */
export function isManagementRole(role: string | null | undefined): boolean {
  return getRoleLevel(role) <= 5;
}

/**
 * Returns true if the role is senior management (level 1-3):
 * מנכ״ל, סמנכ״ל, ראש מחלקה/מנהל בכיר.
 */
export function isSeniorManagement(role: string | null | undefined): boolean {
  return getRoleLevel(role) <= 3;
}

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

/**
 * Get a human-readable hierarchy label for a role.
 * E.g., "סמנכ״ל מכירות" → "סמנכ״ל", "עובד שיווק" → "עובד"
 */
export function getRoleHierarchyLabel(role: string | null | undefined): string {
  const level = getRoleLevel(role);
  const entry = ROLE_HIERARCHY.find(e => e.level === level);
  return entry?.label ?? 'עובד';
}
