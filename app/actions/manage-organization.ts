'use server';

import { logger } from '@/lib/server/logger';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/errorHandler';
import { getAuthenticatedUser } from '@/lib/auth';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

async function requireSuperAdminOrReturn(): Promise<{ ok: true } | { ok: false; error: string }> {
  const authCheck = await requireAuth();
  if (!authCheck.success) return { ok: false, error: authCheck.error || 'נדרשת התחברות' };

  const user = await getAuthenticatedUser();
  if (!user.isSuperAdmin) return { ok: false, error: 'אין הרשאה (נדרש Super Admin)' };

  return { ok: true };
}

// ============================================================
// Get Organization Details
// ============================================================

export async function getOrganizationDetails(organizationId: string) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    const organization = await withTenantIsolationContext(
      {
        source: 'app/actions/manage-organization.getOrganizationDetails',
        reason: 'global_admin_get_organization_details',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        return await prisma.organization.findUnique({
          where: { id: organizationId },
          include: {
            owner: true,
            business_client: true,
            organizationUsers: {
              orderBy: { created_at: 'desc' },
            },
          },
        });
      }
    );

    if (!organization) {
      return { ok: false, error: 'ארגון לא נמצא' };
    }

    return { ok: true, organization };
  } catch (error) {
    logger.error('getOrganizationDetails', 'Error:', error);
    return { ok: false, error: 'שגיאה בטעינת פרטי ארגון' };
  }
}

// ============================================================
// Update Organization Settings
// ============================================================

export async function updateOrganizationSettings(
  organizationId: string,
  data: {
    name?: string;
    slug?: string;
    logo?: string;
  }
) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    if (data.name && !data.name.trim()) {
      return { ok: false, error: 'שם ארגון הוא שדה חובה' };
    }

    const updated = await withTenantIsolationContext(
      {
        source: 'app/actions/manage-organization.updateOrganizationSettings',
        reason: 'global_admin_update_organization_settings',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        return await prisma.organization.update({
          where: { id: organizationId },
          data: {
            ...(data.name && { name: data.name.trim() }),
            ...(data.slug && { slug: data.slug.trim() }),
            ...(data.logo !== undefined && { logo: data.logo || null }),
            updated_at: new Date(),
          },
        });
      }
    );

    logger.info('updateOrganizationSettings', 'Organization settings updated', {
      organizationId,
      changes: data,
    });

    return { ok: true, organization: updated };
  } catch (error) {
    logger.error('updateOrganizationSettings', 'Error:', error);
    return { ok: false, error: 'שגיאה בעדכון הגדרות ארגון' };
  }
}

// ============================================================
// Update Organization Package & Modules
// ============================================================

export async function updateOrganizationPackage(
  organizationId: string,
  data: {
    subscription_plan?: string;
    seats_allowed?: number;
    custom_mrr?: number;
    has_nexus?: boolean;
    has_social?: boolean;
    has_finance?: boolean;
    has_client?: boolean;
    has_operations?: boolean;
    is_shabbat_protected?: boolean;
  }
) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    if (data.seats_allowed && data.seats_allowed < 1) {
      return { ok: false, error: 'מספר מקומות חייב להיות לפחות 1' };
    }

    const updated = await withTenantIsolationContext(
      {
        source: 'app/actions/manage-organization.updateOrganizationPackage',
        reason: 'global_admin_update_organization_package',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        const updateData: any = {
          updated_at: new Date(),
        };

        if (data.subscription_plan !== undefined) {
          updateData.subscription_plan = data.subscription_plan || null;
        }

        if (data.seats_allowed !== undefined) {
          updateData.seats_allowed = data.seats_allowed;
        }

        if (data.custom_mrr !== undefined && data.subscription_plan === 'custom') {
          updateData.mrr = String(data.custom_mrr);
        }

        if (data.has_nexus !== undefined) updateData.has_nexus = data.has_nexus;
        if (data.has_social !== undefined) updateData.has_social = data.has_social;
        if (data.has_finance !== undefined) updateData.has_finance = data.has_finance;
        if (data.has_client !== undefined) updateData.has_client = data.has_client;
        if (data.has_operations !== undefined) updateData.has_operations = data.has_operations;
        if (data.is_shabbat_protected !== undefined) updateData.is_shabbat_protected = data.is_shabbat_protected;

        return await prisma.organization.update({
          where: { id: organizationId },
          data: updateData,
        });
      }
    );

    logger.info('updateOrganizationPackage', 'Organization package updated', {
      organizationId,
      changes: data,
    });

    return { ok: true, organization: updated };
  } catch (error) {
    logger.error('updateOrganizationPackage', 'Error:', error);
    return { ok: false, error: 'שגיאה בעדכון חבילה ומודולים' };
  }
}

// ============================================================
// Update Organization User Role
// ============================================================

export async function updateOrganizationUserRole(
  userId: string,
  role: string
) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    const validRoles = ['owner', 'admin', 'team_member'];
    if (!validRoles.includes(role)) {
      return { ok: false, error: 'תפקיד לא תקין' };
    }

    const updated = await withTenantIsolationContext(
      {
        source: 'app/actions/manage-organization.updateOrganizationUserRole',
        reason: 'global_admin_update_user_role',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        return await prisma.organizationUser.update({
          where: { id: userId },
          data: { role, updated_at: new Date() },
        });
      }
    );

    logger.info('updateOrganizationUserRole', 'User role updated', { userId, role });

    return { ok: true, user: updated };
  } catch (error) {
    logger.error('updateOrganizationUserRole', 'Error:', error);
    return { ok: false, error: 'שגיאה בעדכון תפקיד משתמש' };
  }
}

// ============================================================
// Remove User from Organization
// ============================================================

export async function removeUserFromOrganization(userId: string) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    await withTenantIsolationContext(
      {
        source: 'app/actions/manage-organization.removeUserFromOrganization',
        reason: 'global_admin_remove_user',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        // Check if user is owner
        const user = await prisma.organizationUser.findUnique({
          where: { id: userId },
          select: { role: true, organization_id: true },
        });

        if (user?.role === 'owner') {
          throw new Error('לא ניתן להסיר את הבעלים של הארגון');
        }

        // Remove user
        await prisma.organizationUser.update({
          where: { id: userId },
          data: { organization_id: null, updated_at: new Date() },
        });
      }
    );

    logger.info('removeUserFromOrganization', 'User removed', { userId });

    return { ok: true };
  } catch (error) {
    logger.error('removeUserFromOrganization', 'Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'שגיאה בהסרת משתמש';
    return { ok: false, error: errorMessage };
  }
}

// ============================================================
// Extend Trial
// ============================================================

export async function extendOrganizationTrial(
  organizationId: string,
  additionalDays: number
) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    if (additionalDays < 1 || additionalDays > 365) {
      return { ok: false, error: 'מספר הימים חייב להיות בין 1 ל-365' };
    }

    const updated = await withTenantIsolationContext(
      {
        source: 'app/actions/manage-organization.extendOrganizationTrial',
        reason: 'global_admin_extend_trial',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        const org = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { trial_extended_days: true },
        });

        const currentExtended = org?.trial_extended_days || 0;

        return await prisma.organization.update({
          where: { id: organizationId },
          data: {
            trial_extended_days: currentExtended + additionalDays,
            updated_at: new Date(),
          },
        });
      }
    );

    logger.info('extendOrganizationTrial', 'Trial extended', {
      organizationId,
      additionalDays,
    });

    return { ok: true, organization: updated };
  } catch (error) {
    logger.error('extendOrganizationTrial', 'Error:', error);
    return { ok: false, error: 'שגיאה בהארכת ניסיון' };
  }
}

// ============================================================
// Delete Organization (Hard Delete with CASCADE)
// ============================================================

export async function deleteOrganization(organizationId: string) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    const result = await withTenantIsolationContext(
      {
        source: 'app/actions/manage-organization.deleteOrganization',
        reason: 'global_admin_delete_organization',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        // Get organization details before deletion
        const org = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: {
            id: true,
            name: true,
            slug: true,
            owner_id: true,
            organizationUsers: {
              select: { id: true },
            },
          },
        });

        if (!org) {
          throw new Error('ארגון לא נמצא');
        }

        // Store info for logging
        const deletionInfo = {
          organizationId: org.id,
          organizationName: org.name,
          organizationSlug: org.slug,
          usersCount: org.organizationUsers.length,
        };

        // Hard delete the organization
        // CASCADE rules in the database will automatically delete:
        // - organizationUsers
        // - billing_events
        // - nexus_time_entries
        // - tasks
        // - and all other related records
        await prisma.organization.delete({
          where: { id: organizationId },
        });

        return deletionInfo;
      }
    );

    logger.info('deleteOrganization', 'Organization permanently deleted', {
      organizationId,
      result,
    });

    return { ok: true, data: result };
  } catch (error) {
    logger.error('deleteOrganization', 'Error deleting organization', error);
    const errorMessage = error instanceof Error ? error.message : 'שגיאה במחיקת ארגון';
    return { ok: false, error: errorMessage };
  }
}

// ============================================================
// Update Organization Business Client Details
// ============================================================

export async function updateOrganizationBusinessClientDetails(
  organizationId: string,
  data: {
    company_name?: string;
    business_number?: string;
    tax_id?: string;
    address_street?: string;
    address_city?: string;
    address_postal_code?: string;
    address_country?: string;
    phone?: string;
    primary_email?: string;
    billing_contact_name?: string;
  }
) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    const result = await withTenantIsolationContext(
      {
        source: 'app/actions/manage-organization.updateOrganizationBusinessClientDetails',
        reason: 'global_admin_update_business_client_details',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        // Get organization with business client
        const org = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { client_id: true, name: true, owner: { select: { email: true } } },
        });

        if (!org) {
          throw new Error('ארגון לא נמצא');
        }

        // If no business client exists, create one
        if (!org.client_id) {
          // Validation for creating new client
          if (!data.company_name?.trim()) {
            throw new Error('שם חברה הוא שדה חובה');
          }

          const primaryEmail = data.primary_email?.trim() || org.owner.email || '';
          if (!primaryEmail) {
            throw new Error('מייל הוא שדה חובה');
          }

          // Create new business client
          const newClient = await prisma.businessClient.create({
            data: {
              company_name: data.company_name.trim(),
              business_number: data.business_number?.trim(),
              tax_id: data.tax_id?.trim(),
              primary_email: primaryEmail.toLowerCase(),
              phone: data.phone?.trim(),
              address_street: data.address_street?.trim(),
              address_city: data.address_city?.trim(),
              address_postal_code: data.address_postal_code?.trim(),
              address_country: data.address_country?.trim() || 'ישראל',
              billing_contact_name: data.billing_contact_name?.trim(),
              status: 'active',
              lifecycle_stage: 'customer',
            },
          });

          // Link organization to new business client
          await prisma.organization.update({
            where: { id: organizationId },
            data: { client_id: newClient.id, updated_at: new Date() },
          });

          return newClient;
        } else {
          // Update existing business client
          const updateData: any = {};

          if (data.company_name !== undefined) updateData.company_name = data.company_name.trim();
          if (data.business_number !== undefined) updateData.business_number = data.business_number?.trim() || null;
          if (data.tax_id !== undefined) updateData.tax_id = data.tax_id?.trim() || null;
          if (data.address_street !== undefined) updateData.address_street = data.address_street?.trim() || null;
          if (data.address_city !== undefined) updateData.address_city = data.address_city?.trim() || null;
          if (data.address_postal_code !== undefined) updateData.address_postal_code = data.address_postal_code?.trim() || null;
          if (data.address_country !== undefined) updateData.address_country = data.address_country?.trim() || null;
          if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
          if (data.primary_email !== undefined) updateData.primary_email = data.primary_email.trim().toLowerCase();
          if (data.billing_contact_name !== undefined) updateData.billing_contact_name = data.billing_contact_name?.trim() || null;

          if (Object.keys(updateData).length > 0) {
            updateData.updated_at = new Date();
          }

          return await prisma.businessClient.update({
            where: { id: org.client_id },
            data: updateData,
          });
        }
      }
    );

    logger.info('updateOrganizationBusinessClientDetails', 'Business client details updated', {
      organizationId,
      changes: data,
    });

    return { ok: true, businessClient: result };
  } catch (error) {
    logger.error('updateOrganizationBusinessClientDetails', 'Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'שגיאה בעדכון פרטי לקוח עסקי';
    return { ok: false, error: errorMessage };
  }
}
