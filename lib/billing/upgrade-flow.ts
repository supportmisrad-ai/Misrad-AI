import 'server-only';
import { getOrganizationSeatStatus } from './seat-enforcement';

/**
 * Self-Service Upgrade Flow
 * Handles automatic seat upgrades when users hit limits
 */

export type UpgradeRecommendation = {
  needed: boolean;
  currentSeats: number;
  activeUsers: number;
  requestedUsers: number;
  minimumSeats: number;
  suggestedSeats: number;
  reason: string;
};

/**
 * Check if upgrade is needed and suggest optimal seats
 */
export async function checkUpgradeNeeded(
  organizationId: string,
  usersToAdd: number = 1
): Promise<UpgradeRecommendation> {
  const status = await getOrganizationSeatStatus(organizationId);

  if (!status) {
    return {
      needed: false,
      currentSeats: 0,
      activeUsers: 0,
      requestedUsers: usersToAdd,
      minimumSeats: 0,
      suggestedSeats: 0,
      reason: 'ארגון לא נמצא',
    };
  }

  const { seatsAllowed, activeUsersCount } = status;
  const wouldExceed = (activeUsersCount + usersToAdd) > seatsAllowed;

  if (!wouldExceed) {
    return {
      needed: false,
      currentSeats: seatsAllowed,
      activeUsers: activeUsersCount,
      requestedUsers: usersToAdd,
      minimumSeats: seatsAllowed,
      suggestedSeats: seatsAllowed,
      reason: 'יש מספיק מקומות פנויים',
    };
  }

  // Calculate suggestions
  const minimumSeats = activeUsersCount + usersToAdd;
  const withBuffer = Math.ceil(minimumSeats * 1.2); // 20% buffer
  const suggestedSeats = Math.ceil(withBuffer / 5) * 5; // Round to nearest 5

  return {
    needed: true,
    currentSeats: seatsAllowed,
    activeUsers: activeUsersCount,
    requestedUsers: usersToAdd,
    minimumSeats,
    suggestedSeats,
    reason: `נדרשים ${minimumSeats} מקומות (${activeUsersCount} קיימים + ${usersToAdd} חדשים), אך יש רק ${seatsAllowed}`,
  };
}

/**
 * Calculate upgrade options with pricing
 */
export function calculateUpgradeOptions(
  currentSeats: number,
  minimumSeats: number,
  pricePerSeat: number = 99
): Array<{
  seats: number;
  label: string;
  monthlyPrice: number;
  additionalCost: number;
  recommended: boolean;
}> {
  const currentMRR = currentSeats * pricePerSeat;

  // Option 1: Minimum required
  const option1Seats = minimumSeats;
  const option1MRR = option1Seats * pricePerSeat;

  // Option 2: With 20% buffer (recommended)
  const option2Seats = Math.ceil(minimumSeats * 1.2 / 5) * 5;
  const option2MRR = option2Seats * pricePerSeat;

  // Option 3: With 50% buffer (growth)
  const option3Seats = Math.ceil(minimumSeats * 1.5 / 5) * 5;
  const option3MRR = option3Seats * pricePerSeat;

  const options = [
    {
      seats: option1Seats,
      label: 'מינימלי',
      monthlyPrice: option1MRR,
      additionalCost: option1MRR - currentMRR,
      recommended: false,
    },
    {
      seats: option2Seats,
      label: 'מומלץ (+20%)',
      monthlyPrice: option2MRR,
      additionalCost: option2MRR - currentMRR,
      recommended: true,
    },
    {
      seats: option3Seats,
      label: 'צמיחה (+50%)',
      monthlyPrice: option3MRR,
      additionalCost: option3MRR - currentMRR,
      recommended: false,
    },
  ];

  // Remove duplicates
  return options.filter((opt, idx, arr) => 
    arr.findIndex(o => o.seats === opt.seats) === idx
  );
}

/**
 * Get upgrade message for display
 */
export function getUpgradeMessage(recommendation: UpgradeRecommendation): string {
  if (!recommendation.needed) {
    return 'יש מספיק מקומות זמינים';
  }

  const { currentSeats, activeUsers, requestedUsers, suggestedSeats } = recommendation;
  const additionalSeats = suggestedSeats - currentSeats;

  return `כרגע יש לך ${currentSeats} מקומות עם ${activeUsers} משתמשים פעילים. להוספת ${requestedUsers} משתמשים נוספים, מומלץ לשדרג ל-${suggestedSeats} מקומות (${additionalSeats}+ מקומות נוספים).`;
}
