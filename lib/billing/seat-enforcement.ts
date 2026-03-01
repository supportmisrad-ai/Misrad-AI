import 'server-only';
import prisma from '@/lib/prisma';

/**
 * Seat Enforcement & Analytics
 * Real-time seat management for organizations
 */

export type SeatStatus = {
  organizationId: string;
  organizationName: string;
  seatsAllowed: number;
  activeUsersCount: number;
  availableSeats: number;
  utilizationPercent: number;
  isOverLimit: boolean;
  isApproachingLimit: boolean; // >= 90%
  overageCount: number;
};

/**
 * Get real-time seat status for an organization
 */
export async function getOrganizationSeatStatus(organizationId: string): Promise<SeatStatus | null> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        seats_allowed: true,
        coupon_seats_cap: true,
        active_users_count: true,
      },
    });

    if (!org) return null;

    const seatsAllowedRaw = org.seats_allowed || 0;
    const couponCapRaw = org.coupon_seats_cap;
    const couponCap = typeof couponCapRaw === 'number' && Number.isFinite(couponCapRaw) && couponCapRaw > 0 ? couponCapRaw : null;
    const seatsAllowedBase = typeof seatsAllowedRaw === 'number' && Number.isFinite(seatsAllowedRaw) && seatsAllowedRaw > 0 ? seatsAllowedRaw : 0;
    const seatsAllowed = couponCap != null ? Math.min(seatsAllowedBase, couponCap) : seatsAllowedBase;
    const activeUsersCount = org.active_users_count || 0;
    const availableSeats = Math.max(0, seatsAllowed - activeUsersCount);
    const utilizationPercent = seatsAllowed > 0 
      ? Math.round((activeUsersCount / seatsAllowed) * 100) 
      : 0;
    const isOverLimit = activeUsersCount > seatsAllowed;
    const isApproachingLimit = activeUsersCount >= seatsAllowed * 0.9;
    const overageCount = Math.max(0, activeUsersCount - seatsAllowed);

    return {
      organizationId: org.id,
      organizationName: org.name,
      seatsAllowed,
      activeUsersCount,
      availableSeats,
      utilizationPercent,
      isOverLimit,
      isApproachingLimit,
      overageCount,
    };
  } catch (error) {
    console.error('[getOrganizationSeatStatus] Error:', error);
    return null;
  }
}

/**
 * Check if organization can add more users
 */
export async function canAddUsers(organizationId: string, count: number = 1): Promise<{
  allowed: boolean;
  reason?: string;
  currentSeats: number;
  allowedSeats: number;
}> {
  try {
    const status = await getOrganizationSeatStatus(organizationId);
    
    if (!status) {
      return {
        allowed: false,
        reason: 'ארגון לא נמצא',
        currentSeats: 0,
        allowedSeats: 0,
      };
    }

    const wouldExceed = (status.activeUsersCount + count) > status.seatsAllowed;

    if (wouldExceed) {
      return {
        allowed: false,
        reason: `הגעת למכסת המשתמשים (${status.activeUsersCount}/${status.seatsAllowed}). כדי להוסיף ${count} משתמשים נוספים, יש לשדרג את החבילה.`,
        currentSeats: status.activeUsersCount,
        allowedSeats: status.seatsAllowed,
      };
    }

    return {
      allowed: true,
      currentSeats: status.activeUsersCount,
      allowedSeats: status.seatsAllowed,
    };
  } catch (error) {
    console.error('[canAddUsers] Error:', error);
    return {
      allowed: false,
      reason: 'שגיאה בבדיקת מכסת משתמשים',
      currentSeats: 0,
      allowedSeats: 0,
    };
  }
}

/**
 * Get all organizations with seat issues (overage or approaching limit)
 */
export async function getOrganizationsWithSeatIssues(): Promise<{
  overLimit: SeatStatus[];
  approachingLimit: SeatStatus[];
}> {
  try {
    const orgs = await prisma.organization.findMany({
      where: {
        subscription_status: {
          in: ['trial', 'active'],
        },
        OR: [
          // Over limit
          {
            active_users_count: {
              gt: prisma.organization.fields.seats_allowed,
            },
          },
          {
            coupon_seats_cap: {
              not: null,
            },
            active_users_count: {
              gt: prisma.organization.fields.coupon_seats_cap,
            },
          },
          // Approaching limit (>= 90%)
          // Note: This is approximate in SQL, exact calc in JS below
        ],
      },
      select: {
        id: true,
        name: true,
        seats_allowed: true,
        coupon_seats_cap: true,
        active_users_count: true,
      },
    });

    const overLimit: SeatStatus[] = [];
    const approachingLimit: SeatStatus[] = [];

    for (const org of orgs) {
      const couponCap = typeof org.coupon_seats_cap === 'number' && Number.isFinite(org.coupon_seats_cap) && org.coupon_seats_cap > 0 ? org.coupon_seats_cap : null;
      const seatsAllowedBase = org.seats_allowed || 0;
      const seatsAllowed = couponCap != null ? Math.min(seatsAllowedBase, couponCap) : seatsAllowedBase;
      const activeUsersCount = org.active_users_count || 0;
      const utilizationPercent = seatsAllowed > 0 
        ? Math.round((activeUsersCount / seatsAllowed) * 100) 
        : 0;
      const isOverLimit = activeUsersCount > seatsAllowed;
      const isApproachingLimit = activeUsersCount >= seatsAllowed * 0.9;

      const status: SeatStatus = {
        organizationId: org.id,
        organizationName: org.name,
        seatsAllowed,
        activeUsersCount,
        availableSeats: Math.max(0, seatsAllowed - activeUsersCount),
        utilizationPercent,
        isOverLimit,
        isApproachingLimit,
        overageCount: Math.max(0, activeUsersCount - seatsAllowed),
      };

      if (isOverLimit) {
        overLimit.push(status);
      } else if (isApproachingLimit) {
        approachingLimit.push(status);
      }
    }

    return { overLimit, approachingLimit };
  } catch (error) {
    console.error('[getOrganizationsWithSeatIssues] Error:', error);
    return { overLimit: [], approachingLimit: [] };
  }
}

/**
 * Calculate suggested seats based on usage
 * Adds 20% buffer for growth
 */
export function suggestSeatsForOrganization(status: SeatStatus): number {
  const buffer = Math.ceil(status.activeUsersCount * 0.2); // 20% buffer
  const suggested = status.activeUsersCount + buffer;
  
  // Round up to nearest 5 for cleaner pricing
  return Math.ceil(suggested / 5) * 5;
}

/**
 * Get client-level seat analytics
 */
export async function getClientSeatAnalytics(clientId: string): Promise<{
  totalOrganizations: number;
  totalSeatsAllowed: number;
  totalActiveUsers: number;
  totalOverage: number;
  organizations: SeatStatus[];
}> {
  try {
    const orgs = await prisma.organization.findMany({
      where: {
        client_id: clientId,
        subscription_status: {
          in: ['trial', 'active'],
        },
      },
      select: {
        id: true,
        name: true,
        seats_allowed: true,
        coupon_seats_cap: true,
        active_users_count: true,
      },
    });

    const organizations: SeatStatus[] = orgs.map((org) => {
      const couponCap = typeof org.coupon_seats_cap === 'number' && Number.isFinite(org.coupon_seats_cap) && org.coupon_seats_cap > 0 ? org.coupon_seats_cap : null;
      const seatsAllowedBase = org.seats_allowed || 0;
      const seatsAllowed = couponCap != null ? Math.min(seatsAllowedBase, couponCap) : seatsAllowedBase;
      const activeUsersCount = org.active_users_count || 0;
      const utilizationPercent = seatsAllowed > 0 
        ? Math.round((activeUsersCount / seatsAllowed) * 100) 
        : 0;
      const isOverLimit = activeUsersCount > seatsAllowed;
      const isApproachingLimit = activeUsersCount >= seatsAllowed * 0.9;
      const overageCount = Math.max(0, activeUsersCount - seatsAllowed);

      return {
        organizationId: org.id,
        organizationName: org.name,
        seatsAllowed,
        activeUsersCount,
        availableSeats: Math.max(0, seatsAllowed - activeUsersCount),
        utilizationPercent,
        isOverLimit,
        isApproachingLimit,
        overageCount,
      };
    });

    const totalSeatsAllowed = organizations.reduce((sum, o) => sum + o.seatsAllowed, 0);
    const totalActiveUsers = organizations.reduce((sum, o) => sum + o.activeUsersCount, 0);
    const totalOverage = organizations.reduce((sum, o) => sum + o.overageCount, 0);

    return {
      totalOrganizations: organizations.length,
      totalSeatsAllowed,
      totalActiveUsers,
      totalOverage,
      organizations,
    };
  } catch (error) {
    console.error('[getClientSeatAnalytics] Error:', error);
    return {
      totalOrganizations: 0,
      totalSeatsAllowed: 0,
      totalActiveUsers: 0,
      totalOverage: 0,
      organizations: [],
    };
  }
}
