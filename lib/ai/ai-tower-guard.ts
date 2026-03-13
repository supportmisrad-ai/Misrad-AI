import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

// ═══════════════════════════════════════════════════════════════════
// AI Tower - Hierarchical Security Guard
// מערכת אבטחה היררכית ברמה גבוהה
// ═══════════════════════════════════════════════════════════════════

// רמות גישה
export type AITowerAccessLevel = 
  | 'SUPER_ADMIN'      // איציק בלבד - פיתוח ובדיקות
  | 'ORG_ADMIN'        // מנהלי ארגון - רואים הכל
  | 'ORG_MANAGER'      // מנהלים - רואים חלק
  | 'ORG_WORKER'       // עובדים - רואים רק אישי
  | 'NO_ACCESS';       // אין גישה

// הרשאות ספציפיות
export type AITowerPermission =
  | 'view_all_insights'           // רואה את כל התובנות
  | 'view_team_insights'          // רואה תובנות של הצוות
  | 'view_personal_insights'      // רואה רק את שלו
  | 'execute_actions'             // יכול לבצע פעולות
  | 'approve_auto_actions'        // מאשר פעולות אוטומטיות
  | 'configure_rules'             // מגדיר חוקים
  | 'view_financial_insights'     // רואה תובנות כספיות
  | 'view_sensitive_data';          // רואה נתונים רגישים

// מבנה תוצאת בדיקת גישה
export interface AITowerAccessCheck {
  granted: boolean;
  level: AITowerAccessLevel;
  permissions: AITowerPermission[];
  organizationId: string | null;
  userId: string;
  email: string;
  role: string;
  planModules: string[];
  reason?: string;  // למה נדחה
  auditLogId?: string;
}

// ═══════════════════════════════════════════════════════════════════
// הגדרות הרשאות לפי תפקיד
// ═══════════════════════════════════════════════════════════════════

const ROLE_PERMISSIONS: Record<string, AITowerPermission[]> = {
  'מנכ״ל': [
    'view_all_insights',
    'execute_actions',
    'approve_auto_actions',
    'configure_rules',
    'view_financial_insights',
    'view_sensitive_data',
  ],
  'אדמין': [
    'view_all_insights',
    'execute_actions',
    'approve_auto_actions',
    'view_financial_insights',
    'view_sensitive_data',
  ],
  'סמנכ״ל': [
    'view_all_insights',
    'execute_actions',
    'view_financial_insights',
  ],
  'מנהל': [
    'view_team_insights',
    'execute_actions',
    'view_financial_insights',
  ],
  'איש מכירות': [
    'view_personal_insights',
    'execute_actions',
  ],
  'עובד': [
    'view_personal_insights',
  ],
  'פרילנסר': [
    'view_personal_insights',
  ],
};

// מיפוי תפקידים לרמת גישה
const ROLE_TO_ACCESS_LEVEL: Record<string, AITowerAccessLevel> = {
  'מנכ״ל': 'ORG_ADMIN',
  'אדמין': 'ORG_ADMIN',
  'סמנכ״ל': 'ORG_MANAGER',
  'מנהל': 'ORG_MANAGER',
  'איש מכירות': 'ORG_WORKER',
  'עובד': 'ORG_WORKER',
  'פרילנסר': 'ORG_WORKER',
};

// חבילות שמאפשרות AI Tower (3+ מודולים)
const AI_TOWER_ELIGIBLE_PLANS = [
  'the_authority',
  'the_operator', 
  'the_empire',
  'the_mentor',
];

const MIN_MODULES_REQUIRED = 3;

// ═══════════════════════════════════════════════════════════════════
// Audit Logger
// ═══════════════════════════════════════════════════════════════════

async function logAccessAttempt(
  userId: string,
  email: string,
  organizationId: string | null,
  action: 'GRANTED' | 'DENIED',
  reason: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  try {
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || 'unknown';
    const ip = headersList.get('x-forwarded-for') || 'unknown';

    const log = await prisma.ai_tower_audit_logs.create({
      data: {
        user_id: userId,
        email,
        organization_id: organizationId,
        action,
        reason,
        user_agent: userAgent,
        ip,
        metadata: metadata ? (metadata as any) : undefined,
        timestamp: new Date(),
      },
    });

    return log.id;
  } catch (error) {
    // לא נכשלים בגלל לוג - ממשיכים
    console.error('[AITowerGuard] Audit log failed:', error);
    return 'unknown';
  }
}

// ═══════════════════════════════════════════════════════════════════
// Main Security Check Function
// ═══════════════════════════════════════════════════════════════════

export async function checkAITowerAccess(): Promise<AITowerAccessCheck> {
  try {
    // 1. בדיקת אימות בסיסית
    const user = await currentUser();
    if (!user) {
      return {
        granted: false,
        level: 'NO_ACCESS',
        permissions: [],
        organizationId: null,
        userId: 'anonymous',
        email: 'unknown',
        role: 'none',
        planModules: [],
        reason: 'לא מחובר למערכת',
      };
    }

    const userId = user.id;
    const email = user.emailAddresses[0]?.emailAddress || 'unknown';
    const role = (user.publicMetadata?.role as string) || 'עובד';

    // 2. בדיקת Super Admin (איציק בלבד לפי אימייל)
    if (email === 'itsikdahan1@gmail.com') {
      const auditId = await logAccessAttempt(
        userId,
        email,
        null,
        'GRANTED',
        'Super Admin access granted',
        { level: 'SUPER_ADMIN' }
      );

      return {
        granted: true,
        level: 'SUPER_ADMIN',
        permissions: Object.values(ROLE_PERMISSIONS).flat(),
        organizationId: null,
        userId,
        email,
        role: 'SUPER_ADMIN',
        planModules: ['all'],
        auditLogId: auditId,
      };
    }

    // 3. שליפת Organization ID מה-session
    const { sessionClaims } = await auth();
    const organizationId = sessionClaims?.org_id as string | undefined;

    if (!organizationId) {
      const auditId = await logAccessAttempt(
        userId,
        email,
        null,
        'DENIED',
        'No organization context',
        { role }
      );

      return {
        granted: false,
        level: 'NO_ACCESS',
        permissions: [],
        organizationId: null,
        userId,
        email,
        role,
        planModules: [],
        reason: 'לא נמצא בהקשר ארגון',
        auditLogId: auditId,
      };
    }

    // 4. בדיקת חבילה - האם מותרת גישה ל-AI Tower
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        subscription_plan: true,
        has_nexus: true,
        has_social: true,
        has_system: true,
        has_finance: true,
        has_client: true,
        has_operations: true,
        subscription_status: true,
      },
    });

    if (!organization) {
      const auditId = await logAccessAttempt(
        userId,
        email,
        organizationId,
        'DENIED',
        'Organization not found',
        { role }
      );

      return {
        granted: false,
        level: 'NO_ACCESS',
        permissions: [],
        organizationId,
        userId,
        email,
        role,
        planModules: [],
        reason: 'ארגון לא נמצא',
        auditLogId: auditId,
      };
    }

    // 5. בדיקה האם הארגון פעיל
    if (organization.subscription_status !== 'active') {
      const auditId = await logAccessAttempt(
        userId,
        email,
        organizationId,
        'DENIED',
        'Organization not active',
        { status: organization.subscription_status, role }
      );

      // Compute modules from has_* fields
      const modules = [
        organization.has_nexus && 'nexus',
        organization.has_social && 'social',
        organization.has_system && 'system',
        organization.has_finance && 'finance',
        organization.has_client && 'client',
        organization.has_operations && 'operations',
      ].filter(Boolean) as string[];

      return {
        granted: false,
        level: 'NO_ACCESS',
        permissions: [],
        organizationId,
        userId,
        email,
        role,
        planModules: modules,
        reason: `הארגון לא פעיל (סטטוס: ${organization.subscription_status})`,
        auditLogId: auditId,
      };
    }

    // 6. בדיקת חבילה - 3+ מודולים
    const modules = [
      organization.has_nexus && 'nexus',
      organization.has_social && 'social',
      organization.has_system && 'system',
      organization.has_finance && 'finance',
      organization.has_client && 'client',
      organization.has_operations && 'operations',
    ].filter(Boolean) as string[];
    const moduleCount = modules.length;
    const planName = organization.subscription_plan || '';

    const hasEligiblePlan = AI_TOWER_ELIGIBLE_PLANS.includes(planName);
    const hasEnoughModules = moduleCount >= MIN_MODULES_REQUIRED;

    if (!hasEligiblePlan && !hasEnoughModules) {
      const auditId = await logAccessAttempt(
        userId,
        email,
        organizationId,
        'DENIED',
        'Plan does not include AI Tower',
        { 
          plan: planName,
          modules: moduleCount,
          required: MIN_MODULES_REQUIRED,
          role 
        }
      );

      return {
        granted: false,
        level: 'NO_ACCESS',
        permissions: [],
        organizationId,
        userId,
        email,
        role,
        planModules: modules,
        reason: `החבילה לא כוללת AI Tower (נדרשים ${MIN_MODULES_REQUIRED}+ מודולים, יש ${moduleCount})`,
        auditLogId: auditId,
      };
    }

    // 7. בדיקת הרשאות לפי תפקיד
    const accessLevel = ROLE_TO_ACCESS_LEVEL[role] || 'ORG_WORKER';
    const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['עובד'];

    // 8. לוג של גישה מאושרת
    const auditId = await logAccessAttempt(
      userId,
      email,
      organizationId,
      'GRANTED',
      'Access granted',
      { 
        level: accessLevel,
        role,
        plan: planName,
        modules: moduleCount,
        permissions 
      }
    );

    return {
      granted: true,
      level: accessLevel,
      permissions,
      organizationId,
      userId,
      email,
      role,
      planModules: modules,
      auditLogId: auditId,
    };

  } catch (error) {
    console.error('[AITowerGuard] Security check failed:', error);
    
    return {
      granted: false,
      level: 'NO_ACCESS',
      permissions: [],
      organizationId: null,
      userId: 'error',
      email: 'unknown',
      role: 'unknown',
      planModules: [],
      reason: 'שגיאה בבדיקת אבטחה',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// Enforcement Functions
// ═══════════════════════════════════════════════════════════════════

/**
 * מחייב גישה ל-AI Tower או זורק שגיאה
 */
export async function requireAITowerAccess(): Promise<AITowerAccessCheck> {
  const access = await checkAITowerAccess();
  
  if (!access.granted) {
    throw new Error(`AI Tower Access Denied: ${access.reason || 'אין הרשאה'}`);
  }
  
  return access;
}

/**
 * מחייב גישה או מפנה לדף אחר
 */
export async function enforceAITowerAccess(redirectTo: string = '/dashboard') {
  const access = await checkAITowerAccess();
  
  if (!access.granted) {
    redirect(redirectTo);
  }
  
  return access;
}

/**
 * בודק הרשאה ספציפית
 */
export function hasPermission(
  access: AITowerAccessCheck,
  permission: AITowerPermission
): boolean {
  if (!access.granted) return false;
  
  // Super Admin יש הכל
  if (access.level === 'SUPER_ADMIN') return true;
  
  return access.permissions.includes(permission);
}

/**
 * מחייב הרשאה ספציפית
 */
export function requirePermission(
  access: AITowerAccessCheck,
  permission: AITowerPermission
): void {
  if (!hasPermission(access, permission)) {
    throw new Error(`Permission Denied: חסרה הרשאה ${permission}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// Insight Filtering by Access Level
// ═══════════════════════════════════════════════════════════════════

export interface InsightVisibility {
  canView: boolean;
  canExecute: boolean;
  reason?: string;
}

/**
 * בודק האם משתמש יכול לראות תובנה ספציפית
 */
export function canViewInsight(
  access: AITowerAccessCheck,
  insight: {
    entityType?: 'client' | 'user' | 'task' | 'project' | 'invoice' | 'booking';
    entityId?: string;
    severity: string;
    metadata?: Record<string, unknown>;
  }
): InsightVisibility {
  // Super Admin רואה הכל
  if (access.level === 'SUPER_ADMIN') {
    return { canView: true, canExecute: true };
  }

  // בדיקת הרשאות בסיסיות
  if (!access.granted) {
    return { canView: false, canExecute: false, reason: 'אין גישה למערכת' };
  }

  // ORG_ADMIN רואה הכל בארגון שלו
  if (access.level === 'ORG_ADMIN') {
    return { canView: true, canExecute: hasPermission(access, 'execute_actions') };
  }

  // ORG_MANAGER רואה תובנות של הצוות
  if (access.level === 'ORG_MANAGER') {
    // אם זו תובנה אישית של מישהו אחר - בדיקה נוספת needed
    if (insight.entityType === 'user' && insight.entityId !== access.userId) {
      // מנהל רואה תובנות של העובדים שלו - צריך לבדוק hierarchy
      return { 
        canView: hasPermission(access, 'view_team_insights'),
        canExecute: hasPermission(access, 'execute_actions'),
      };
    }
    return { 
      canView: true,
      canExecute: hasPermission(access, 'execute_actions'),
    };
  }

  // ORG_WORKER רואה רק אישי
  if (access.level === 'ORG_WORKER') {
    // רק תובנות אישיות
    if (insight.entityType === 'user' && insight.entityId === access.userId) {
      return { 
        canView: hasPermission(access, 'view_personal_insights'),
        canExecute: hasPermission(access, 'execute_actions'),
      };
    }
    
    // אם זו תובנה כללית - תלוי בסוג
    if (!insight.entityType || insight.entityType === 'client') {
      // עובדים רואים תובנות על לקוחות שהם אחראים עליהם
      // צריך בדיקה נוספת במערכת ה-CRM
      return { 
        canView: hasPermission(access, 'view_personal_insights'),
        canExecute: false,
        reason: 'נדרש אישור מנהל',
      };
    }

    return { canView: false, canExecute: false, reason: 'תובנה לא רלוונטית' };
  }

  return { canView: false, canExecute: false, reason: 'רמת גישה לא מוכרת' };
}

// ═══════════════════════════════════════════════════════════════════
// Server Action Guard
// ═══════════════════════════════════════════════════════════════════

/**
 * Wrapper ל-Server Actions עם אבטחה מובנית
 */
export function withAITowerSecurity<T extends (...args: unknown[]) => Promise<unknown>>(
  handler: (access: AITowerAccessCheck, ...args: Parameters<T>) => ReturnType<T>,
  requiredPermission?: AITowerPermission
) {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const access = await requireAITowerAccess();
    
    if (requiredPermission) {
      requirePermission(access, requiredPermission);
    }
    
    return handler(access, ...args);
  };
}
