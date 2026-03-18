'use server';

import { logger } from '@/lib/server/logger';
import prisma from '@/lib/prisma';
import { generateOrgSlug, generateUniqueOrgSlug } from '@/lib/server/orgSlug';
import { DEFAULT_TRIAL_DAYS } from '@/lib/trial';
import { requireAuth } from '@/lib/errorHandler';
import { getAuthenticatedUser } from '@/lib/auth';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

// ============================================================
// Types
// ============================================================

export type BusinessClientInput = {
  company_name: string;
  company_name_en?: string;
  business_number?: string;
  tax_id?: string;
  legal_entity_type?: string;
  primary_email: string;
  phone?: string;
  website?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_postal_code?: string;
  address_country?: string;
  industry?: string;
  company_size?: string;
  lead_source?: string;
  notes?: string;
  status?: string;
  lifecycle_stage?: string;
};

export type ContactInput = {
  user_id: string;
  role?: string;
  title?: string;
  department?: string;
  is_primary?: boolean;
  is_billing_contact?: boolean;
  is_technical_contact?: boolean;
};

export type OrganizationInput = {
  name: string;
  slug?: string;
  subscription_plan?: string;
  seats_allowed?: number;
  trial_days?: number;
  coupon_code?: string;
  has_nexus?: boolean;
  has_social?: boolean;
  has_finance?: boolean;
  has_client?: boolean;
  has_operations?: boolean;
};

async function requireSuperAdminOrReturn(): Promise<{ ok: true } | { ok: false; error: string }> {
  const authCheck = await requireAuth();
  if (!authCheck.success) return { ok: false, error: authCheck.error || 'נדרשת התחברות' };

  const user = await getAuthenticatedUser();
  if (!user.isSuperAdmin) return { ok: false, error: 'אין הרשאה (נדרש Super Admin)' };

  return { ok: true };
}

// ============================================================
// Create Business Client
// ============================================================

export async function createBusinessClient(input: BusinessClientInput) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    // Validation
    if (!input.company_name?.trim()) {
      return { ok: false, error: 'שם חברה הוא שדה חובה' };
    }

    if (!input.primary_email?.trim()) {
      return { ok: false, error: 'מייל הוא שדה חובה' };
    }

    const normalizedEmail = input.primary_email.trim().toLowerCase();
    if (!normalizedEmail.includes('@')) {
      return { ok: false, error: 'כתובת מייל לא תקינה' };
    }

    const client = await withTenantIsolationContext(
      {
        source: 'app/actions/business-clients.createBusinessClient',
        reason: 'global_admin_create_business_client',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        // Check if email already exists
        const existing = await prisma.businessClient.findUnique({
          where: { primary_email: normalizedEmail },
          select: { id: true, company_name: true },
        });

        if (existing) {
          throw new Error(`לקוח עסקי עם מייל ${normalizedEmail} כבר קיים (${existing.company_name})`);
        }

        // Check business number if provided
        if (input.business_number) {
          const existingBN = await prisma.businessClient.findUnique({
            where: { business_number: input.business_number },
            select: { id: true, company_name: true },
          });

          if (existingBN) {
            throw new Error(`לקוח עסקי עם ח.פ/עוסק ${input.business_number} כבר קיים (${existingBN.company_name})`);
          }
        }

        // Create client
        return await prisma.businessClient.create({
          data: {
            company_name: input.company_name.trim(),
            company_name_en: input.company_name_en?.trim(),
            business_number: input.business_number?.trim(),
            tax_id: input.tax_id?.trim(),
            legal_entity_type: input.legal_entity_type?.trim(),
            primary_email: normalizedEmail,
            phone: input.phone?.trim(),
            website: input.website?.trim(),
            address_street: input.address_street?.trim(),
            address_city: input.address_city?.trim(),
            address_state: input.address_state?.trim(),
            address_postal_code: input.address_postal_code?.trim(),
            address_country: input.address_country?.trim() || 'ישראל',
            industry: input.industry?.trim(),
            company_size: input.company_size?.trim(),
            lead_source: input.lead_source?.trim(),
            notes: input.notes?.trim(),
            status: 'active',
            lifecycle_stage: 'customer',
          },
          select: {
            id: true,
            company_name: true,
            primary_email: true,
          },
        });
      }
    );

    return {
      ok: true,
      client: {
        id: client.id,
        company_name: client.company_name,
        primary_email: client.primary_email,
      },
    };
  } catch (error) {
    logger.error('createBusinessClient', 'Error:', error);
    return { ok: false, error: 'שגיאה ביצירת לקוח עסקי' };
  }
}

// ============================================================
// Get Business Clients
// ============================================================

export async function getBusinessClients(filters?: {
  status?: string;
  lifecycle_stage?: string;
  industry?: string;
  search?: string;
}) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    const where: Record<string, unknown> = {
      deleted_at: null,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.lifecycle_stage) {
      where.lifecycle_stage = filters.lifecycle_stage;
    }

    if (filters?.industry) {
      where.industry = filters.industry;
    }

    if (filters?.search) {
      const search = filters.search.trim();
      where.OR = [
        { company_name: { contains: search, mode: 'insensitive' } },
        { company_name_en: { contains: search, mode: 'insensitive' } },
        { primary_email: { contains: search, mode: 'insensitive' } },
        { business_number: { contains: search, mode: 'insensitive' } },
      ];
    }

    const clients = await withTenantIsolationContext(
      {
        source: 'app/actions/business-clients.getBusinessClients',
        reason: 'global_admin_list_business_clients',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () =>
        await prisma.businessClient.findMany({
          where,
          include: {
            contacts: {
              include: {
                user: {
                  select: {
                    id: true,
                    full_name: true,
                    email: true,
                    avatar_url: true,
                  },
                },
              },
            },
            organizations: {
              select: {
                id: true,
                name: true,
                slug: true,
                subscription_plan: true,
                subscription_status: true,
                billing_cycle: true,
                seats_allowed: true,
                active_users_count: true,
                billing_email: true,
                payment_method_id: true,
                mrr: true,
                arr: true,
                next_billing_date: true,
                trial_start_date: true,
                trial_days: true,
                trial_extended_days: true,
                trial_end_date: true,
                created_at: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
        })
    );

    // Serialize Decimal fields to plain numbers for client transport
    const serialized = (clients as any[]).map((c: any) => ({
      ...c,
      total_revenue_lifetime: c.total_revenue_lifetime != null ? Number(c.total_revenue_lifetime) : 0,
      mrr: c.mrr != null ? Number(c.mrr) : 0,
      arr: c.arr != null ? Number(c.arr) : 0,
      organizations: (c.organizations as any[]).map((o: any) => ({
        ...o,
        mrr: o.mrr != null ? Number(o.mrr) : 0,
        arr: o.arr != null ? Number(o.arr) : 0,
      })),
    }));

    return { ok: true, clients: serialized };
  } catch (error) {
    logger.error('getBusinessClients', 'Error:', error);
    return { ok: false, error: 'שגיאה בטעינת לקוחות עסקיים' };
  }
}

// ============================================================
// Get Single Business Client
// ============================================================

export async function getBusinessClient(clientId: string) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    const client = await withTenantIsolationContext(
      {
        source: 'app/actions/business-clients.getBusinessClient',
        reason: 'global_admin_get_business_client',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () =>
        await prisma.businessClient.findUnique({
          where: { id: clientId },
          include: {
            contacts: {
              include: {
                user: {
                  select: {
                    id: true,
                    full_name: true,
                    email: true,
                    avatar_url: true,
                    role: true,
                  },
                },
              },
              orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }],
            },
            organizations: {
              select: {
                id: true,
                name: true,
                slug: true,
                subscription_status: true,
                subscription_plan: true,
                trial_start_date: true,
                trial_days: true,
                created_at: true,
                has_nexus: true,
                has_social: true,
                has_finance: true,
                has_client: true,
                has_operations: true,
              },
              orderBy: { created_at: 'desc' },
            },
          },
        })
    );

    if (!client) {
      return { ok: false, error: 'לקוח עסקי לא נמצא' };
    }

    return { ok: true, client };
  } catch (error) {
    logger.error('getBusinessClient', 'Error:', error);
    return { ok: false, error: 'שגיאה בטעינת לקוח עסקי' };
  }
}

// ============================================================
// Update Business Client
// ============================================================

export async function updateBusinessClient(clientId: string, input: Partial<BusinessClientInput>) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    const client = await withTenantIsolationContext(
      {
        source: 'app/actions/business-clients.updateBusinessClient',
        reason: 'global_admin_update_business_client',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        // Check if email is being changed
        if (input.primary_email) {
          const normalizedEmail = input.primary_email.trim().toLowerCase();
          const existing = await prisma.businessClient.findFirst({
            where: {
              primary_email: normalizedEmail,
              NOT: { id: clientId },
            },
          });

          if (existing) {
            throw new Error('מייל זה כבר בשימוש');
          }

          input.primary_email = normalizedEmail;
        }

        // Check if business number is being changed
        if (input.business_number) {
          const existing = await prisma.businessClient.findFirst({
            where: {
              business_number: input.business_number,
              NOT: { id: clientId },
            },
          });

          if (existing) {
            throw new Error('מספר עוסק/ח.פ זה כבר בשימוש');
          }
        }

        return await prisma.businessClient.update({
          where: { id: clientId },
          data: input,
          select: {
            id: true,
            company_name: true,
          },
        });
      }
    );

    return { ok: true, client };
  } catch (error) {
    logger.error('updateBusinessClient', 'Error:', error);
    const message = error instanceof Error ? String(error.message || '').trim() : '';
    if (message === 'מייל זה כבר בשימוש' || message === 'מספר עוסק/ח.פ זה כבר בשימוש') {
      return { ok: false, error: message };
    }
    return { ok: false, error: 'שגיאה בעדכון לקוח עסקי' };
  }
}

// ============================================================
// Add Contact to Client
// ============================================================

export async function addContactToClient(clientId: string, input: ContactInput) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    // Check if contact already exists
    const existing = await prisma.businessClientContact.findUnique({
      where: {
        client_id_user_id: {
          client_id: clientId,
          user_id: input.user_id,
        },
      },
    });

    if (existing) {
      return { ok: false, error: 'איש קשר זה כבר מקושר ללקוח' };
    }

    // If this is primary, unset other primary contacts
    if (input.is_primary) {
      await prisma.businessClientContact.updateMany({
        where: { client_id: clientId, is_primary: true },
        data: { is_primary: false },
      });
    }

    const contact = await withTenantIsolationContext(
      {
        source: 'app/actions/business-clients.addContactToClient',
        reason: 'global_admin_add_contact_to_business_client',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () =>
        await prisma.businessClientContact.create({
          data: {
            client_id: clientId,
            user_id: input.user_id,
            role: input.role || 'contact',
            title: input.title,
            department: input.department,
            is_primary: input.is_primary || false,
            is_billing_contact: input.is_billing_contact || false,
            is_technical_contact: input.is_technical_contact || false,
          },
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                email: true,
              },
            },
          },
        })
    );

    return { ok: true, contact };
  } catch (error) {
    logger.error('addContactToClient', 'Error:', error);
    return { ok: false, error: 'שגיאה בהוספת איש קשר' };
  }
}

// ============================================================
// Remove Contact from Client
// ============================================================

export async function removeContactFromClient(clientId: string, userId: string) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    await withTenantIsolationContext(
      {
        source: 'app/actions/business-clients.removeContactFromClient',
        reason: 'global_admin_remove_business_client_contact',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        await prisma.businessClientContact.delete({
          where: {
            client_id_user_id: {
              client_id: clientId,
              user_id: userId,
            },
          },
        });
      }
    );

    return { ok: true };
  } catch (error) {
    logger.error('removeContactFromClient', 'Error:', error);
    return { ok: false, error: 'שגיאה בהסרת איש קשר' };
  }
}

// ============================================================
// Update Contact on Client
// ============================================================

export async function updateContactOnClient(
  clientId: string,
  userId: string,
  input: {
    role?: string;
    title?: string;
    department?: string;
    is_primary?: boolean;
    is_billing_contact?: boolean;
    is_technical_contact?: boolean;
  }
) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    if (input.is_primary) {
      await prisma.businessClientContact.updateMany({
        where: { client_id: clientId, is_primary: true, NOT: { user_id: userId } },
        data: { is_primary: false },
      });
    }

    const contact = await withTenantIsolationContext(
      {
        source: 'app/actions/business-clients.updateContactOnClient',
        reason: 'global_admin_update_business_client_contact',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () =>
        await prisma.businessClientContact.update({
          where: { client_id_user_id: { client_id: clientId, user_id: userId } },
          data: input,
        })
    );

    return { ok: true, contact };
  } catch (error) {
    logger.error('updateContactOnClient', 'Error:', error);
    return { ok: false, error: 'שגיאה בעדכון איש קשר' };
  }
}

// ============================================================
// Create Organization for Client
// ============================================================

export async function createOrganizationForClient(
  clientId: string,
  primaryContactUserId: string,
  input: OrganizationInput
) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    // Validate
    if (!input.name?.trim()) {
      return { ok: false, error: 'שם ארגון הוא שדה חובה' };
    }

    // Generate unique slug
    const baseSlug = input.slug?.trim() || generateOrgSlug(input.name);
    const uniqueSlug = await generateUniqueOrgSlug(baseSlug);

    const now = new Date();

    // Apply coupon if provided (TODO: implement coupon validation)
    const appliedTrialDays = input.trial_days ?? DEFAULT_TRIAL_DAYS;
    if (input.coupon_code) {
      // TODO: Validate coupon and adjust trial_days or subscription_plan
      logger.debug('createOrganizationForClient', 'Coupon code provided:', input.coupon_code);
    }

    // Create organization
    const org = await withTenantIsolationContext(
      {
        source: 'app/actions/business-clients.createOrganizationForClient',
        reason: 'global_admin_create_organization_for_business_client',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        return await prisma.organization.create({
          data: {
            name: input.name.trim(),
            slug: uniqueSlug,
            owner_id: primaryContactUserId,
            client_id: clientId,

            // Subscription
            subscription_status: 'trial',
            subscription_plan: input.subscription_plan || null,
            trial_start_date: now,
            trial_days: appliedTrialDays,
            seats_allowed: input.seats_allowed || null,

            // Modules
            has_nexus: input.has_nexus ?? true,
            has_social: input.has_social ?? false,
            has_finance: input.has_finance ?? false,
            has_client: input.has_client ?? false,
            has_operations: input.has_operations ?? false,

            // Timestamps
            created_at: now,
            updated_at: now,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            subscription_plan: true,
            seats_allowed: true,
            trial_days: true,
          },
        });
      }
    );

    return { ok: true, organization: org };
  } catch (error) {
    logger.error('createOrganizationForClient', 'Error:', error);
    return { ok: false, error: 'שגיאה ביצירת ארגון' };
  }
}

// ============================================================
// Update Organization
// ============================================================

export async function updateOrganization(orgId: string, input: {
  name?: string;
  slug?: string;
  has_nexus?: boolean;
  has_social?: boolean;
  has_finance?: boolean;
  has_client?: boolean;
  has_operations?: boolean;
}) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    const org = await withTenantIsolationContext(
      {
        source: 'app/actions/business-clients.updateOrganization',
        reason: 'global_admin_update_organization_from_business_client',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        return await prisma.organization.update({
          where: { id: orgId },
          data: {
            ...input,
            updated_at: new Date(),
          },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        });
      }
    );

    return { ok: true, organization: org };
  } catch (error) {
    logger.error('updateOrganization', 'Error:', error);
    return { ok: false, error: 'שגיאה בעדכון ארגון' };
  }
}

// ============================================================
// Suspend / Unsuspend Business Client (+ linked organizations)
// ============================================================

export async function suspendBusinessClient(clientId: string) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    const result = await withTenantIsolationContext(
      {
        source: 'app/actions/business-clients.suspendBusinessClient',
        reason: 'global_admin_suspend_business_client',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        // 1. Set client status to suspended
        await prisma.businessClient.update({
          where: { id: clientId },
          data: { status: 'suspended' },
        });

        // 2. Suspend all linked organizations (blocks AI features)
        const updated = await prisma.organization.updateMany({
          where: { client_id: clientId, subscription_status: { not: 'suspended' } },
          data: { subscription_status: 'suspended' },
        });

        return { orgsAffected: updated.count };
      }
    );

    return { ok: true, orgsAffected: result.orgsAffected };
  } catch (error) {
    logger.error('suspendBusinessClient', 'Error:', error);
    return { ok: false, error: 'שגיאה בהשעיית לקוח עסקי' };
  }
}

export async function unsuspendBusinessClient(clientId: string) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    const result = await withTenantIsolationContext(
      {
        source: 'app/actions/business-clients.unsuspendBusinessClient',
        reason: 'global_admin_unsuspend_business_client',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        // 1. Set client status back to active
        await prisma.businessClient.update({
          where: { id: clientId },
          data: { status: 'active' },
        });

        // 2. Restore all linked organizations to active
        const updated = await prisma.organization.updateMany({
          where: { client_id: clientId, subscription_status: 'suspended' },
          data: { subscription_status: 'active' },
        });

        return { orgsRestored: updated.count };
      }
    );

    return { ok: true, orgsRestored: result.orgsRestored };
  } catch (error) {
    logger.error('unsuspendBusinessClient', 'Error:', error);
    return { ok: false, error: 'שגיאה בהסרת השעיית לקוח עסקי' };
  }
}

// ============================================================
// Delete Business Client (Soft)
// ============================================================

export async function deleteBusinessClient(clientId: string) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    await withTenantIsolationContext(
      {
        source: 'app/actions/business-clients.deleteBusinessClient',
        reason: 'global_admin_soft_delete_business_client',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        // Unlink all organizations from this client BEFORE soft-deleting.
        // Without this, orgs stay pointing at a deleted client and vanish
        // from the UI (getBusinessClients filters deleted_at: null).
        await prisma.organization.updateMany({
          where: { client_id: clientId },
          data: { client_id: null },
        });

        await prisma.businessClient.update({
          where: { id: clientId },
          data: { deleted_at: new Date() },
        });
      }
    );

    return { ok: true };
  } catch (error) {
    logger.error('deleteBusinessClient', 'Error:', error);
    return { ok: false, error: 'שגיאה במחיקת לקוח עסקי' };
  }
}

// ============================================================
// Recycle Bin — Deleted Business Clients
// ============================================================

export async function getDeletedBusinessClients() {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    const clients = await withTenantIsolationContext(
      {
        source: 'app/actions/business-clients.getDeletedBusinessClients',
        reason: 'global_admin_list_deleted_business_clients',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () =>
        prisma.businessClient.findMany({
          where: { deleted_at: { not: null } },
          select: {
            id: true,
            company_name: true,
            primary_email: true,
            status: true,
            deleted_at: true,
          },
          orderBy: { deleted_at: 'desc' },
          take: 100,
        })
    );

    return { ok: true, clients };
  } catch (error) {
    logger.error('getDeletedBusinessClients', 'Error:', error);
    return { ok: false, error: 'שגיאה בטעינת סל המיחזור' };
  }
}

export async function restoreBusinessClient(clientId: string) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    await withTenantIsolationContext(
      {
        source: 'app/actions/business-clients.restoreBusinessClient',
        reason: 'global_admin_restore_business_client',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        await prisma.businessClient.update({
          where: { id: clientId },
          data: { deleted_at: null },
        });
      }
    );

    return { ok: true };
  } catch (error) {
    logger.error('restoreBusinessClient', 'Error:', error);
    return { ok: false, error: 'שגיאה בשחזור לקוח עסקי' };
  }
}

// ============================================================
// Create New User & Add as Contact
// ============================================================

export async function createUserAndAddAsContact(
  clientId: string,
  input: {
    email: string;
    full_name: string;
    role?: string;
    is_primary?: boolean;
  }
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    const email = (input.email || '').trim().toLowerCase();
    const fullName = (input.full_name || '').trim();

    if (!email || !email.includes('@')) {
      return { ok: false, error: 'כתובת מייל לא תקינה' };
    }
    if (!fullName) {
      return { ok: false, error: 'שם מלא הוא שדה חובה' };
    }

    return await withTenantIsolationContext(
      {
        source: 'app/actions/business-clients.createUserAndAddAsContact',
        reason: 'global_admin_create_user_and_add_as_contact',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        // Check if OrganizationUser already exists by email
        let user = await prisma.organizationUser.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
          select: { id: true, clerk_user_id: true },
        });

        if (!user) {
          // Create OrganizationUser with pending clerk_user_id
          const pendingClerkId = `pending_${crypto.randomUUID()}`;
          user = await prisma.organizationUser.create({
            data: {
              clerk_user_id: pendingClerkId,
              email,
              full_name: fullName,
              role: 'team_member',
            },
            select: { id: true, clerk_user_id: true },
          });

          // Send Clerk invitation (best-effort)
          try {
            const { clerkClient } = await import('@clerk/nextjs/server');
            const client = await clerkClient();
            if (client) {
              await client.invitations.createInvitation({ emailAddress: email });
            }
          } catch (inviteErr) {
            logger.error('createUserAndAddAsContact', 'Clerk invitation failed (non-fatal):', inviteErr);
          }
        }

        // Check if already linked as contact
        const existingContact = await prisma.businessClientContact.findUnique({
          where: {
            client_id_user_id: {
              client_id: clientId,
              user_id: user.id,
            },
          },
          select: { id: true },
        });

        if (existingContact) {
          return { ok: false as const, error: 'איש קשר זה כבר מקושר ללקוח' };
        }

        // If this is primary, unset other primary contacts
        if (input.is_primary) {
          await prisma.businessClientContact.updateMany({
            where: { client_id: clientId, is_primary: true },
            data: { is_primary: false },
          });
        }

        // Add as contact
        await prisma.businessClientContact.create({
          data: {
            client_id: clientId,
            user_id: user.id,
            role: input.role || 'contact',
            is_primary: input.is_primary || false,
          },
        });

        return { ok: true as const, userId: user.id };
      }
    );
  } catch (error) {
    logger.error('createUserAndAddAsContact', 'Error:', error);
    return { ok: false, error: 'שגיאה ביצירת משתמש והוספת איש קשר' };
  }
}

// ============================================================
// Search Users for Contact (not yet linked to client)
// ============================================================

export async function searchUsersForContact(clientId: string, searchTerm: string) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    if (!searchTerm.trim()) {
      return { ok: true, users: [] };
    }

    // Get users already linked to this client
    const linkedContacts = await prisma.businessClientContact.findMany({
      where: { client_id: clientId },
      select: { user_id: true },
    });

    const linkedUserIds = linkedContacts.map((c) => c.user_id);

    // Search for users not yet linked
    const users = await withTenantIsolationContext(
      {
        source: 'app/actions/business-clients.searchUsersForContact',
        reason: 'global_admin_search_users_for_contact',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () =>
        await prisma.organizationUser.findMany({
          where: {
            AND: [
              {
                OR: [
                  { full_name: { contains: searchTerm, mode: 'insensitive' } },
                  { email: { contains: searchTerm, mode: 'insensitive' } },
                ],
              },
              {
                NOT: {
                  id: { in: linkedUserIds },
                },
              },
            ],
          },
          select: {
            id: true,
            full_name: true,
            email: true,
            avatar_url: true,
            role: true,
          },
          take: 10,
        })
    );

    return { ok: true, users };
  } catch (error) {
    logger.error('searchUsersForContact', 'Error:', error);
    return { ok: false, error: 'שגיאה בחיפוש משתמשים' };
  }
}

// ============================================================
// Sync Organizations → Business Clients
// ============================================================

/**
 * Ensures a BusinessClient exists for the given organization.
 * Called automatically after every org creation to keep the two tables in sync.
 * If the org already has a client_id, this is a no-op.
 * Otherwise, finds or creates a BusinessClient based on the owner's email and links it.
 *
 * Safe to call from non-admin context — uses global_admin isolation internally.
 */
export async function ensureBusinessClientForOrg(orgId: string): Promise<void> {
  try {
    const org = await withTenantIsolationContext(
      {
        source: 'business-clients.ensureBusinessClientForOrg',
        reason: 'auto_link_org_to_business_client',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () =>
        prisma.organization.findUnique({
          where: { id: orgId },
          select: {
            id: true,
            name: true,
            client_id: true,
            owner_id: true,
            owner: { select: { id: true, email: true, full_name: true } },
          },
        })
    );

    if (!org || org.client_id) return; // already linked or not found

    const ownerEmail = org.owner?.email ? String(org.owner.email).trim().toLowerCase() : '';
    const ownerName = org.owner?.full_name ? String(org.owner.full_name) : org.name;

    await withTenantIsolationContext(
      {
        source: 'business-clients.ensureBusinessClientForOrg',
        reason: 'auto_create_or_link_business_client',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        // Try to find existing BusinessClient by owner email.
        // Three cases:
        //   1. Found & alive → reuse it
        //   2. Found & soft-deleted → skip entirely (intentionally deleted, unique constraint)
        //   3. Not found → create new
        let bizClient: { id: string } | null = null;
        let skipLinking = false;

        if (ownerEmail) {
          const existing = await prisma.businessClient.findUnique({
            where: { primary_email: ownerEmail },
            select: { id: true, deleted_at: true },
          });
          if (existing) {
            if (existing.deleted_at) {
              // Intentionally deleted — do NOT restore, do NOT create duplicate.
              // The org will stay unlinked until admin restores or handles manually.
              skipLinking = true;
            } else {
              bizClient = { id: existing.id };
            }
          }
        }

        if (!skipLinking && !bizClient) {
          const normalizedEmail = ownerEmail || `org-${org.id}@placeholder.local`;
          // Guard against placeholder collision too
          const existingPlaceholder = await prisma.businessClient.findUnique({
            where: { primary_email: normalizedEmail },
            select: { id: true, deleted_at: true },
          });
          if (existingPlaceholder) {
            if (existingPlaceholder.deleted_at) {
              skipLinking = true;
            } else {
              bizClient = { id: existingPlaceholder.id };
            }
          } else {
            bizClient = await prisma.businessClient.create({
              data: {
                company_name: ownerName,
                primary_email: normalizedEmail,
                status: 'active',
                lifecycle_stage: 'customer',
              },
              select: { id: true },
            });
          }
        }

        if (skipLinking || !bizClient) return;

        // Link org to business client
        await prisma.organization.update({
          where: { id: org.id },
          data: { client_id: bizClient.id },
        });

        // Link owner as contact if not already linked
        if (org.owner?.id) {
          const existingContact = await prisma.businessClientContact.findUnique({
            where: {
              client_id_user_id: {
                client_id: bizClient.id,
                user_id: org.owner.id,
              },
            },
            select: { id: true },
          });

          if (!existingContact) {
            await prisma.businessClientContact.create({
              data: {
                client_id: bizClient.id,
                user_id: org.owner.id,
                role: 'owner',
                is_primary: true,
              },
            });
          }
        }
      }
    );
  } catch (error) {
    // Best-effort — never fail the parent flow
    logger.error('ensureBusinessClientForOrg', 'Failed (non-fatal):', error);
  }
}

/**
 * Server-only backfill: finds all orgs that need a (live) BusinessClient and links them.
 * Catches two cases:
 *   1. client_id is null (never linked)
 *   2. client_id points to a soft-deleted BusinessClient (deleted_at not null)
 * No auth check — designed to be called from SSR page components.
 * Idempotent: safe to call on every page load (no-op when all orgs are properly linked).
 */
export async function backfillUnlinkedOrganizations(): Promise<number> {
  try {
    const orgsToFix = await withTenantIsolationContext(
      {
        source: 'business-clients.backfillUnlinkedOrganizations',
        reason: 'auto_backfill_unlinked_orgs',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () =>
        prisma.organization.findMany({
          where: {
            deleted_at: null,
            OR: [
              { client_id: null },
              { business_client: { deleted_at: { not: null } } },
            ],
          },
          select: { id: true, client_id: true },
        })
    );

    if (orgsToFix.length === 0) return 0;

    // For orgs linked to deleted clients, unlink first so ensureBusinessClientForOrg can re-link
    const linkedToDeleted = orgsToFix.filter((o) => o.client_id !== null);
    if (linkedToDeleted.length > 0) {
      await withTenantIsolationContext(
        {
          source: 'business-clients.backfillUnlinkedOrganizations',
          reason: 'unlink_orgs_from_deleted_clients',
          mode: 'global_admin',
          isSuperAdmin: true,
          suppressReporting: true,
        },
        async () =>
          prisma.organization.updateMany({
            where: { id: { in: linkedToDeleted.map((o) => o.id) } },
            data: { client_id: null },
          })
      );
    }

    let synced = 0;
    for (const org of orgsToFix) {
      await ensureBusinessClientForOrg(org.id);
      synced++;
    }

    return synced;
  } catch (error) {
    logger.error('backfillUnlinkedOrganizations', 'Failed (non-fatal):', error);
    return 0;
  }
}

export async function syncOrganizationsToBusinessClients(): Promise<
  { ok: true; created: number; linked: number } | { ok: false; error: string }
> {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    return await withTenantIsolationContext(
      {
        source: 'app/actions/business-clients.syncOrganizationsToBusinessClients',
        reason: 'global_admin_sync_orgs_to_biz_clients',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        // Find all organizations that don't have a business client linked
        const unlinkedOrgs = await prisma.organization.findMany({
          where: { client_id: null },
          select: {
            id: true,
            name: true,
            slug: true,
            owner_id: true,
            subscription_plan: true,
            subscription_status: true,
            billing_email: true,
            billing_cycle: true,
            seats_allowed: true,
            active_users_count: true,
            mrr: true,
            arr: true,
            created_at: true,
            owner: {
              select: {
                id: true,
                full_name: true,
                email: true,
              },
            },
          },
          orderBy: { created_at: 'asc' },
        });

        if (unlinkedOrgs.length === 0) {
          return { ok: true as const, created: 0, linked: 0 };
        }

        // Group organizations by owner_id so the same owner gets one BusinessClient
        const byOwner = new Map<string, typeof unlinkedOrgs>();
        for (const org of unlinkedOrgs) {
          const key = org.owner_id;
          if (!byOwner.has(key)) byOwner.set(key, []);
          byOwner.get(key)!.push(org);
        }

        // Batch: collect all owner emails to check existing business clients
        const ownerEmails = new Set<string>();
        for (const [, ownerOrgs] of byOwner) {
          const email = ownerOrgs[0].owner?.email;
          if (email) ownerEmails.add(email.toLowerCase());
        }

        // Batch lookup: find all LIVE existing business clients by email
        const existingBizClients = ownerEmails.size > 0
          ? await prisma.businessClient.findMany({
              where: { primary_email: { in: Array.from(ownerEmails) }, deleted_at: null },
              select: { id: true, primary_email: true },
            })
          : [];
        const bizClientByEmail = new Map(existingBizClients.map((bc) => [bc.primary_email, bc.id]));

        // Also find deleted emails so we can skip them (unique constraint guard)
        const deletedBizClients = ownerEmails.size > 0
          ? await prisma.businessClient.findMany({
              where: { primary_email: { in: Array.from(ownerEmails) }, deleted_at: { not: null } },
              select: { primary_email: true },
            })
          : [];
        const deletedEmails = new Set(deletedBizClients.map((bc) => bc.primary_email));

        // Batch lookup: find all existing contacts for these business clients
        const existingBizClientIds = existingBizClients.map((bc) => bc.id);
        const existingContacts = existingBizClientIds.length > 0
          ? await prisma.businessClientContact.findMany({
              where: { client_id: { in: existingBizClientIds } },
              select: { client_id: true, user_id: true },
            })
          : [];
        const contactSet = new Set(existingContacts.map((c) => `${c.client_id}::${c.user_id}`));

        let created = 0;
        let linked = 0;

        // Process each owner group — creates are sequential (need IDs), but we minimized reads
        for (const [, ownerOrgs] of byOwner) {
          const firstOrg = ownerOrgs[0];
          const ownerEmail = firstOrg.owner?.email || '';
          const ownerName = firstOrg.owner?.full_name || firstOrg.name;
          const normalizedEmail = (ownerEmail || `org-${firstOrg.id}@placeholder.local`).toLowerCase();

          // Skip if this email belongs to an intentionally-deleted client
          if (deletedEmails.has(normalizedEmail)) continue;

          let bizClientId = bizClientByEmail.get(normalizedEmail);

          if (!bizClientId) {
            const newBizClient = await prisma.businessClient.create({
              data: {
                company_name: ownerName,
                primary_email: normalizedEmail,
                status: 'active',
                lifecycle_stage: 'customer',
              },
              select: { id: true },
            });
            bizClientId = newBizClient.id;
            bizClientByEmail.set(normalizedEmail, bizClientId);
            created++;
          }

          // Link the owner as a contact if not already linked
          if (firstOrg.owner?.id && !contactSet.has(`${bizClientId}::${firstOrg.owner.id}`)) {
            await prisma.businessClientContact.create({
              data: {
                client_id: bizClientId,
                user_id: firstOrg.owner.id,
                role: 'owner',
                is_primary: true,
              },
            });
            contactSet.add(`${bizClientId}::${firstOrg.owner.id}`);
          }

          // Batch update: link all owner's orgs to this BusinessClient
          const orgIds = ownerOrgs.map((o) => o.id);
          await prisma.organization.updateMany({
            where: { id: { in: orgIds } },
            data: { client_id: bizClientId },
          });
          linked += orgIds.length;
        }

        return { ok: true as const, created, linked };
      }
    );
  } catch (error) {
    logger.error('syncOrganizationsToBusinessClients', 'Error:', error);
    return { ok: false, error: 'שגיאה בסנכרון ארגונים ללקוחות עסקיים' };
  }
}
