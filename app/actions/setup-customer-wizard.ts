'use server';

import { logger } from '@/lib/server/logger';
import prisma, { prismaForInteractiveTransaction } from '@/lib/prisma';
import { generateUniqueOrgSlug } from '@/lib/server/orgSlug';
import { DEFAULT_TRIAL_DAYS } from '@/lib/trial';
import { requireAuth } from '@/lib/errorHandler';
import { getAuthenticatedUser } from '@/lib/auth';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

// ============================================================
// Types
// ============================================================

export type SetupCustomerInput = {
  // Step 1: Business Client
  businessClient: {
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
    address_postal_code?: string;
    industry?: string;
    company_size?: string;
    notes?: string;
  };

  // Step 2: Organization
  organization: {
    name: string;
    slug?: string;
    logo?: string;
  };

  // Step 3: Package & Modules
  package: {
    subscription_plan: string;
    seats_allowed: number;
    trial_days: number;
    coupon_code?: string;
    custom_mrr?: number;
    has_nexus: boolean;
    has_social: boolean;
    has_finance: boolean;
    has_client: boolean;
    has_operations: boolean;
    is_shabbat_protected: boolean;
  };

  // Step 4: Admin User
  adminUser: {
    email: string;
    full_name: string;
    clerk_user_id?: string; // If user already exists in Clerk
  };
};

async function requireSuperAdminOrReturn(): Promise<{ ok: true } | { ok: false; error: string }> {
  const authCheck = await requireAuth();
  if (!authCheck.success) return { ok: false, error: authCheck.error || 'נדרשת התחברות' };

  const user = await getAuthenticatedUser();
  if (!user.isSuperAdmin) return { ok: false, error: 'אין הרשאה (נדרש Super Admin)' };

  return { ok: true };
}

// ============================================================
// Main Action: Setup Complete Customer
// ============================================================

export async function setupCompleteCustomer(input: SetupCustomerInput) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    // Validation
    if (!input.businessClient.company_name?.trim()) {
      return { ok: false, error: 'שם חברה הוא שדה חובה' };
    }

    if (!input.businessClient.primary_email?.trim()) {
      return { ok: false, error: 'מייל חברה הוא שדה חובה' };
    }

    if (!input.organization.name?.trim()) {
      return { ok: false, error: 'שם ארגון הוא שדה חובה' };
    }

    if (!input.adminUser.email?.trim()) {
      return { ok: false, error: 'מייל מנהל הוא שדה חובה' };
    }

    if (!input.adminUser.full_name?.trim()) {
      return { ok: false, error: 'שם מלא של מנהל הוא שדה חובה' };
    }

    if (input.package.seats_allowed < 1) {
      return { ok: false, error: 'מספר מקומות חייב להיות לפחות 1' };
    }

    const normalizedBusinessEmail = input.businessClient.primary_email.trim().toLowerCase();
    const normalizedAdminEmail = input.adminUser.email.trim().toLowerCase();

    if (!normalizedBusinessEmail.includes('@')) {
      return { ok: false, error: 'כתובת מייל חברה לא תקינה' };
    }

    if (!normalizedAdminEmail.includes('@')) {
      return { ok: false, error: 'כתובת מייל מנהל לא תקינה' };
    }

    // Execute atomic transaction
    const result = await withTenantIsolationContext(
      {
        source: 'app/actions/setup-customer-wizard.setupCompleteCustomer',
        reason: 'global_admin_setup_complete_customer',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        return await prismaForInteractiveTransaction().$transaction(async (tx) => {
          // Step 1: Check if business client email already exists
          const existingClient = await tx.businessClient.findUnique({
            where: { primary_email: normalizedBusinessEmail },
            select: { id: true, company_name: true },
          });

          if (existingClient) {
            throw new Error(`לקוח עסקי עם מייל ${normalizedBusinessEmail} כבר קיים (${existingClient.company_name})`);
          }

          // Step 2: Check if business number already exists (if provided)
          if (input.businessClient.business_number) {
            const existingBN = await tx.businessClient.findUnique({
              where: { business_number: input.businessClient.business_number },
              select: { id: true, company_name: true },
            });

            if (existingBN) {
              throw new Error(`לקוח עסקי עם ח.פ/עוסק ${input.businessClient.business_number} כבר קיים (${existingBN.company_name})`);
            }
          }

          // Step 3: Create Business Client
          const businessClient = await tx.businessClient.create({
            data: {
              company_name: input.businessClient.company_name.trim(),
              company_name_en: input.businessClient.company_name_en?.trim(),
              business_number: input.businessClient.business_number?.trim(),
              tax_id: input.businessClient.tax_id?.trim(),
              legal_entity_type: input.businessClient.legal_entity_type?.trim(),
              primary_email: normalizedBusinessEmail,
              phone: input.businessClient.phone?.trim(),
              website: input.businessClient.website?.trim(),
              address_street: input.businessClient.address_street?.trim(),
              address_city: input.businessClient.address_city?.trim(),
              address_postal_code: input.businessClient.address_postal_code?.trim(),
              address_country: 'ישראל',
              industry: input.businessClient.industry?.trim(),
              company_size: input.businessClient.company_size?.trim(),
              notes: input.businessClient.notes?.trim(),
              status: 'active',
              lifecycle_stage: 'customer',
            },
          });

          // Step 4: Create or find Admin User (OrganizationUser)
          // Note: In production, this should integrate with Clerk
          // For now, we'll create a placeholder user
          let adminUser;

          if (input.adminUser.clerk_user_id) {
            // User already exists in Clerk
            adminUser = await tx.organizationUser.findUnique({
              where: { clerk_user_id: input.adminUser.clerk_user_id },
            });

            if (!adminUser) {
              throw new Error('משתמש לא נמצא במערכת Clerk');
            }
          } else {
            // Check if user with this email already exists
            const existingUser = await tx.organizationUser.findFirst({
              where: { email: normalizedAdminEmail },
            });

            if (existingUser) {
              adminUser = existingUser;
            } else {
              // Create placeholder user (in production, this should be done via Clerk webhook)
              // Generate a temporary clerk_user_id
              const tempClerkId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

              adminUser = await tx.organizationUser.create({
                data: {
                  clerk_user_id: tempClerkId,
                  email: normalizedAdminEmail,
                  full_name: input.adminUser.full_name.trim(),
                  role: 'owner',
                  terms_accepted_at: new Date(),
                  privacy_accepted_at: new Date(),
                  terms_accepted_version: '1.0',
                  privacy_accepted_version: '1.0',
                },
              });
            }
          }

          // Step 5: Generate unique slug for organization
          const baseSlug = input.organization.slug?.trim() || input.organization.name.trim();
          const uniqueSlug = await generateUniqueOrgSlug(baseSlug);

          // Step 6: Create Organization
          // Calculate MRR if custom plan with custom_mrr provided
          const customMrr = input.package.subscription_plan === 'custom' && input.package.custom_mrr
            ? input.package.custom_mrr
            : null;

          const organization = await tx.organization.create({
            data: {
              name: input.organization.name.trim(),
              slug: uniqueSlug,
              logo: input.organization.logo || null,
              owner_id: adminUser.id,
              client_id: businessClient.id,

              // Trial & Subscription
              subscription_status: 'trial',
              trial_start_date: new Date(),
              trial_days: input.package.trial_days || DEFAULT_TRIAL_DAYS,
              subscription_plan: input.package.subscription_plan || null,
              seats_allowed: input.package.seats_allowed,

              // Custom MRR (if provided)
              mrr: customMrr ? String(customMrr) : '0',

              // Modules
              has_nexus: input.package.has_nexus,
              has_social: input.package.has_social,
              has_finance: input.package.has_finance,
              has_client: input.package.has_client,
              has_operations: input.package.has_operations,

              // Settings
              is_shabbat_protected: input.package.is_shabbat_protected,
            },
          });

          // Step 7: Update admin user with organization_id
          await tx.organizationUser.update({
            where: { id: adminUser.id },
            data: {
              organization_id: organization.id,
              allowed_modules: [
                input.package.has_nexus ? 'nexus' : null,
                input.package.has_social ? 'social' : null,
                input.package.has_finance ? 'finance' : null,
                input.package.has_client ? 'client' : null,
                input.package.has_operations ? 'operations' : null,
              ].filter(Boolean) as string[],
            },
          });

          // Step 8: Create contact relationship
          await tx.businessClientContact.create({
            data: {
              client_id: businessClient.id,
              user_id: adminUser.id,
              role: 'owner',
              is_primary: true,
              is_billing_contact: true,
              is_technical_contact: true,
            },
          });

          // Step 9: Apply coupon if provided
          // TODO: Implement coupon hashing and lookup
          // Coupons are stored with code_hash, not plain text code
          // For now, this feature is disabled until proper hashing is implemented
          if (input.package.coupon_code?.trim()) {
            // const couponCode = input.package.coupon_code.trim().toUpperCase();
            // Need to hash the code before looking it up
            logger.info('setupCompleteCustomer', 'Coupon code provided but lookup not implemented yet', {
              code_last4: input.package.coupon_code.slice(-4),
            });
          }

          return {
            businessClient,
            adminUser,
            organization,
          };
        });
      }
    );

    logger.info('setupCompleteCustomer', 'Customer setup completed successfully', {
      businessClientId: result.businessClient.id,
      organizationId: result.organization.id,
      adminUserId: result.adminUser.id,
    });

    return {
      ok: true,
      data: {
        businessClientId: result.businessClient.id,
        organizationId: result.organization.id,
        organizationSlug: result.organization.slug,
        adminUserId: result.adminUser.id,
        message: 'הלקוח הוקם בהצלחה!',
      },
    };
  } catch (error) {
    logger.error('setupCompleteCustomer', 'Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'שגיאה בהקמת לקוח';
    return { ok: false, error: errorMessage };
  }
}
