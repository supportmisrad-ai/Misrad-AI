import 'server-only';

import { getOwnedTenant, isTenantAdmin } from '@/lib/auth';
import { resolveWorkspaceCurrentUserForApi } from '@/lib/server/workspaceUser';

import type { User } from '@/types';

import { findProfileRowByOrgAndClerkUserId } from '@/lib/services/nexus-profiles-service';

import { asObject, isUserOnlineFromRow } from './utils';

type ClerkUserContext = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isSuperAdmin: boolean;
};

export async function getNexusMe(params: { orgId: string }): Promise<{
  user: User | null;
  clerkUser: ClerkUserContext | null;
  tenant: { id: string; name: string; ownerEmail: string } | null;
  isTenantAdmin: boolean;
  matched: boolean;
}> {
  const orgId = String(params.orgId || '').trim();
  if (!orgId) {
    return { user: null, clerkUser: null, tenant: null, isTenantAdmin: false, matched: false };
  }

  const resolved = await resolveWorkspaceCurrentUserForApi(orgId);

  type Targets = NonNullable<User['targets']>;
  type NotificationPreferences = NonNullable<User['notificationPreferences']>;
  type UIPreferences = NonNullable<User['uiPreferences']>;
  type BillingInfo = NonNullable<User['billingInfo']>;

  const normalizeTargets = (value: unknown): Targets | undefined => {
    const obj = asObject(value);
    if (!obj) return undefined;
    const tasksMonthRaw = obj.tasksMonth ?? obj.tasks_month;
    const tasksMonthNum = typeof tasksMonthRaw === 'number' ? tasksMonthRaw : Number(tasksMonthRaw);
    const tasksMonth = Number.isFinite(tasksMonthNum) ? tasksMonthNum : 0;

    const leadsMonthRaw = obj.leadsMonth ?? obj.leads_month;
    const leadsMonthNum = typeof leadsMonthRaw === 'number' ? leadsMonthRaw : Number(leadsMonthRaw);
    const leadsMonth = Number.isFinite(leadsMonthNum) ? leadsMonthNum : undefined;

    return {
      tasksMonth,
      ...(leadsMonth !== undefined ? { leadsMonth } : {}),
    };
  };

  const normalizeNotificationPreferences = (value: unknown): NotificationPreferences | undefined => {
    const obj = asObject(value);
    if (!obj) return undefined;

    const base: NotificationPreferences = {
      emailNewTask: true,
      browserPush: true,
      morningBrief: true,
      soundEffects: false,
      marketing: false,
      pushBehavior: 'vibrate_sound',
      pushCategories: {
        alerts: true,
        tasks: true,
        events: true,
        system: true,
        marketing: false,
      },
    };

    const pushBehaviorRaw = obj.pushBehavior;
    const pushBehavior =
      pushBehaviorRaw === 'off' ||
      pushBehaviorRaw === 'vibrate' ||
      pushBehaviorRaw === 'sound' ||
      pushBehaviorRaw === 'vibrate_sound'
        ? pushBehaviorRaw
        : base.pushBehavior;

    const categoriesObj = asObject(obj.pushCategories);

    return {
      ...base,
      ...(typeof obj.emailNewTask === 'boolean' ? { emailNewTask: obj.emailNewTask } : {}),
      ...(typeof obj.browserPush === 'boolean' ? { browserPush: obj.browserPush } : {}),
      ...(typeof obj.morningBrief === 'boolean' ? { morningBrief: obj.morningBrief } : {}),
      ...(typeof obj.soundEffects === 'boolean' ? { soundEffects: obj.soundEffects } : {}),
      ...(typeof obj.marketing === 'boolean' ? { marketing: obj.marketing } : {}),
      ...(pushBehavior ? { pushBehavior } : {}),
      pushCategories: {
        ...base.pushCategories,
        ...(categoriesObj && typeof categoriesObj.alerts === 'boolean' ? { alerts: categoriesObj.alerts } : {}),
        ...(categoriesObj && typeof categoriesObj.tasks === 'boolean' ? { tasks: categoriesObj.tasks } : {}),
        ...(categoriesObj && typeof categoriesObj.events === 'boolean' ? { events: categoriesObj.events } : {}),
        ...(categoriesObj && typeof categoriesObj.system === 'boolean' ? { system: categoriesObj.system } : {}),
        ...(categoriesObj && typeof categoriesObj.marketing === 'boolean' ? { marketing: categoriesObj.marketing } : {}),
      },
    };
  };

  const normalizeUiPreferences = (value: unknown): UIPreferences | undefined => {
    const obj = asObject(value);
    if (!obj) return undefined;
    return {
      ...(typeof obj.showHebrewCalendar === 'boolean' ? { showHebrewCalendar: obj.showHebrewCalendar } : {}),
      ...(typeof obj.showHebrewDates === 'boolean' ? { showHebrewDates: obj.showHebrewDates } : {}),
    };
  };

  const normalizeBillingInfo = (value: unknown): BillingInfo | undefined => {
    const obj = asObject(value);
    if (!obj) return undefined;
    const last4Digits = typeof obj.last4Digits === 'string' ? obj.last4Digits : null;
    const cardType = typeof obj.cardType === 'string' ? obj.cardType : null;
    const nextBillingDate = typeof obj.nextBillingDate === 'string' ? obj.nextBillingDate : null;
    const planName = typeof obj.planName === 'string' ? obj.planName : null;
    if (!last4Digits || !cardType || !nextBillingDate || !planName) return undefined;
    return { last4Digits, cardType, nextBillingDate, planName };
  };

  let profileRow: unknown = null;
  try {
    profileRow = await findProfileRowByOrgAndClerkUserId({
      organizationId: resolved.workspace.id,
      clerkUserId: resolved.clerkUser.id,
    });
  } catch {
    // ignore
  }

  const profileObj = asObject(profileRow) ?? {};

  const nexusUserObj = asObject(resolved.user) ?? {};
  const now = new Date();
  const targets = normalizeTargets(nexusUserObj.targets);
  const notificationPreferences = normalizeNotificationPreferences(
    profileObj.notification_preferences ?? nexusUserObj.notificationPreferences
  );
  const uiPreferences = normalizeUiPreferences(profileObj.ui_preferences ?? nexusUserObj.uiPreferences);
  const billingInfo = normalizeBillingInfo(profileObj.billing_info ?? nexusUserObj.billingInfo);

  const canonicalUser: User = {
    id: String(nexusUserObj.id ?? ''),
    name: String(profileObj.full_name ?? nexusUserObj.name ?? ''),
    role: String(profileObj.role ?? nexusUserObj.role ?? resolved.clerkUser.role ?? 'עובד'),
    ...(typeof nexusUserObj.department === 'string' ? { department: nexusUserObj.department } : {}),
    avatar: String(profileObj.avatar_url ?? nexusUserObj.avatar ?? ''),
    online: isUserOnlineFromRow(nexusUserObj, now),
    capacity: Number(nexusUserObj.capacity ?? 0),
    email: String(profileObj.email ?? nexusUserObj.email ?? resolved.clerkUser.email ?? ''),
    phone: typeof profileObj.phone === 'string' ? profileObj.phone : undefined,
    location: typeof profileObj.location === 'string' ? profileObj.location : undefined,
    bio: typeof profileObj.bio === 'string' ? profileObj.bio : undefined,
    ...(targets ? { targets } : {}),
    ...(notificationPreferences ? { notificationPreferences } : {}),
    ...(uiPreferences ? { uiPreferences } : {}),
    twoFactorEnabled: Boolean(profileObj.two_factor_enabled ?? nexusUserObj.twoFactorEnabled ?? false),
    isSuperAdmin: Boolean(
      nexusUserObj.is_super_admin ?? nexusUserObj.isSuperAdmin ?? resolved.clerkUser.isSuperAdmin
    ),
    isTenantAdmin: Boolean(nexusUserObj.isTenantAdmin ?? false),
    organizationId: resolved.workspace.id,
    tenantId: resolved.workspace.id,
    ...(billingInfo ? { billingInfo } : {}),
  };

  let tenant: unknown = null;
  let tenantAdminStatus = false;
  try {
    tenant = await getOwnedTenant();
    tenantAdminStatus = await isTenantAdmin(String(asObject(tenant)?.id ?? ''));
  } catch {
    tenant = null;
    tenantAdminStatus = false;
  }

  const tenantObj = asObject(tenant);

  return {
    user: canonicalUser,
    clerkUser: resolved.clerkUser as ClerkUserContext,
    tenant: tenantObj
      ? {
          id: String(tenantObj.id ?? ''),
          name: String(tenantObj.name ?? ''),
          ownerEmail: String(tenantObj.ownerEmail ?? ''),
        }
      : null,
    isTenantAdmin: tenantAdminStatus,
    matched: true,
  };
}
