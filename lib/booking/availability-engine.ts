/**
 * Booking Availability Engine
 * MISRAD AI - Appointment Scheduling
 * 
 * @module lib/booking/availability-engine
 * @description Core logic for calculating available time slots with dynamic buffer
 */

import { prisma } from '@/lib/prisma';
import type {
  TimeSlot,
  AvailabilityResult,
  BookingLocationType,
  BufferRule,
} from '@/types/booking';

// ============================================
// CONFIGURATION
// ============================================

const DEFAULT_BUFFER_RULE: BufferRule = {
  locationBufferMap: {
    zoom: 10,
    meet: 10,
    phone: 5,
    address: 30,
  },
  conditionalRules: [
    { condition: 'sameLocationAsPrevious', reduction: 15 },
    { condition: 'highPriorityClient', reduction: 5 },
    { condition: 'backToBackMeetings', minimumBuffer: 5 },
  ],
};

const SLOT_DURATION = 30; // minutes

// ============================================
// CORE AVAILABILITY CALCULATION
// ============================================

/**
 * מנוע חישוב זמנים פנויים - הליבה של המערכת
 */
export class AvailabilityEngine {
  /**
   * חישוב חלונות זמן פנויים לתאריך מסוים
   */
  static async getAvailableSlots(
    providerId: string,
    date: Date,
    durationMinutes: number,
    locationType: BookingLocationType = 'zoom'
  ): Promise<AvailabilityResult> {
    try {
      // שלב 1: קבלת הגדרות זמינות (weekly + overrides)
      const availabilityRules = await this.getAvailabilityRules(providerId, date);
      
      if (!availabilityRules.isAvailable) {
        return {
          success: true,
          slots: [],
        };
      }

      // שלב 2: קבלת תורים קיימים
      const existingAppointments = await this.getExistingAppointments(
        providerId,
        date
      );

      // שלב 3: חישוב חלונות פנויים
      const freeSlots = this.calculateFreeSlots(
        availabilityRules.startTime,
        availabilityRules.endTime,
        existingAppointments,
        durationMinutes,
        locationType
      );

      // שלב 4: סינון זמנים שעברו
      const now = new Date();
      const filteredSlots = freeSlots.filter(slot => slot.startTime > now);

      return {
        success: true,
        slots: filteredSlots,
      };
    } catch (error) {
      console.error('AvailabilityEngine.getAvailableSlots error:', error);
      return {
        success: false,
        slots: [],
        error: 'שגיאה בחישוב זמינות',
      };
    }
  }

  /**
   * קבלת הגדרות זמינות לתאריך
   */
  private static async getAvailabilityRules(
    providerId: string,
    date: Date
  ): Promise<{
    isAvailable: boolean;
    startTime: Date;
    endTime: Date;
    reason?: string;
  }> {
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split('T')[0];

    // בדיקת override (חסימה/זמינות חד-פעמית)
    const override = await prisma.bookingAvailability.findFirst({
      where: {
        providerId,
        type: 'override',
        specificDate: new Date(dateStr),
      },
    });

    if (override) {
      if (!override.isAvailable) {
        return {
          isAvailable: false,
          startTime: new Date(),
          endTime: new Date(),
          reason: override.reason || 'חסום',
        };
      }
      return {
        isAvailable: true,
        startTime: this.parseTimeString(override.startTime, date),
        endTime: this.parseTimeString(override.endTime, date),
      };
    }

    // בדיקת חסימה (blocked)
    const blocked = await prisma.bookingAvailability.findFirst({
      where: {
        providerId,
        type: 'blocked',
        specificDate: new Date(dateStr),
        isAvailable: false,
      },
    });

    if (blocked) {
      return {
        isAvailable: false,
        startTime: new Date(),
        endTime: new Date(),
        reason: blocked.reason || 'חסום',
      };
    }

    // בדיקת weekly (חזרתי)
    const weekly = await prisma.bookingAvailability.findFirst({
      where: {
        providerId,
        type: 'weekly',
        dayOfWeek,
        isAvailable: true,
      },
    });

    if (!weekly) {
      return {
        isAvailable: false,
        startTime: new Date(),
        endTime: new Date(),
        reason: 'לא זמין ביום זה',
      };
    }

    return {
      isAvailable: true,
      startTime: this.parseTimeString(weekly.startTime, date),
      endTime: this.parseTimeString(weekly.endTime, date),
    };
  }

  /**
   * קבלת תורים קיימים לתאריך
   */
  private static async getExistingAppointments(
    providerId: string,
    date: Date
  ): Promise<Array<{ startTime: Date; endTime: Date; locationType: BookingLocationType }>> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await prisma.bookingAppointment.findMany({
      where: {
        providerId,
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ['cancelled', 'no_show'] },
      },
      select: {
        startTime: true,
        endTime: true,
        locationType: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return appointments as Array<{ startTime: Date; endTime: Date; locationType: BookingLocationType }>;
  }

  /**
   * חישוב חלונות זמן פנויים
   */
  private static calculateFreeSlots(
    dayStart: Date,
    dayEnd: Date,
    existingAppointments: Array<{ startTime: Date; endTime: Date; locationType: BookingLocationType }>,
    durationMinutes: number,
    locationType: BookingLocationType
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    let currentTime = new Date(dayStart);

    // עובר על כל התורים הקיימים ומוצא חלונות פנויים
    for (const appointment of existingAppointments) {
      // חישוב buffer לתור הנוכחי
      const bufferBefore = this.calculateBuffer(
        locationType,
        appointment.locationType,
        false
      );

      // זמן סיום החלון הפנוי (לפני התור + buffer)
      const slotEnd = new Date(appointment.startTime);
      slotEnd.setMinutes(slotEnd.getMinutes() - bufferBefore);

      // יצירת slots בחלון הפנוי
      while (currentTime.getTime() + durationMinutes * 60000 <= slotEnd.getTime()) {
        const slotEndTime = new Date(currentTime);
        slotEndTime.setMinutes(slotEndTime.getMinutes() + durationMinutes);

        slots.push({
          startTime: new Date(currentTime),
          endTime: slotEndTime,
          duration: durationMinutes,
          isAvailable: true,
        });

        currentTime = new Date(slotEndTime);
      }

      // קידום הזמן לסוף התור הקיים + buffer
      const bufferAfter = this.calculateBuffer(
        appointment.locationType,
        locationType,
        true
      );
      currentTime = new Date(appointment.endTime);
      currentTime.setMinutes(currentTime.getMinutes() + bufferAfter);
    }

    // slots נותרים עד סוף היום
    while (currentTime.getTime() + durationMinutes * 60000 <= dayEnd.getTime()) {
      const slotEndTime = new Date(currentTime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + durationMinutes);

      slots.push({
        startTime: new Date(currentTime),
        endTime: slotEndTime,
        duration: durationMinutes,
        isAvailable: true,
      });

      currentTime = new Date(slotEndTime);
    }

    return slots;
  }

  /**
   * חישוב Buffer דינמי
   */
  private static calculateBuffer(
    currentLocation: BookingLocationType,
    nextLocation: BookingLocationType,
    isAfter: boolean
  ): number {
    const baseBuffer = DEFAULT_BUFFER_RULE.locationBufferMap[currentLocation];

    // אם אותו מיקום - הפחתת buffer
    if (isAfter && currentLocation === nextLocation) {
      return Math.max(baseBuffer - 15, 5);
    }

    return baseBuffer;
  }

  /**
   * המרת מחרוזת זמן ל-Date
   */
  private static parseTimeString(timeStr: string, baseDate: Date): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(baseDate);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}

// ============================================
// AVAILABILITY MANAGEMENT
// ============================================

/**
 * יצירת זמינות חדשה
 */
export async function createAvailability(
  providerId: string,
  data: {
    type: 'weekly' | 'override' | 'blocked';
    dayOfWeek?: number;
    specificDate?: Date;
    startTime: string;
    endTime: string;
    isAvailable?: boolean;
    reason?: string;
  }
) {
  return await prisma.bookingAvailability.create({
    data: {
      providerId,
      organizationId: (await prisma.bookingProvider.findUnique({
        where: { id: providerId },
        select: { organizationId: true },
      }))!.organizationId,
      ...data,
      isAvailable: data.isAvailable ?? true,
    },
  });
}

/**
 * עדכון זמינות
 */
export async function updateAvailability(
  availabilityId: string,
  data: Partial<{
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    reason: string;
  }>
) {
  return await prisma.bookingAvailability.update({
    where: { id: availabilityId },
    data,
  });
}

/**
 * מחיקת זמינות
 */
export async function deleteAvailability(availabilityId: string) {
  return await prisma.bookingAvailability.delete({
    where: { id: availabilityId },
  });
}

/**
 * קבלת זמינות של provider
 */
export async function getProviderAvailability(providerId: string) {
  const [weekly, overrides] = await Promise.all([
    prisma.bookingAvailability.findMany({
      where: { providerId, type: 'weekly' },
      orderBy: { dayOfWeek: 'asc' },
    }),
    prisma.bookingAvailability.findMany({
      where: {
        providerId,
        type: { in: ['override', 'blocked'] },
        specificDate: { gte: new Date() },
      },
      orderBy: { specificDate: 'asc' },
      take: 30,
    }),
  ]);

  return { weekly, overrides };
}

// ============================================
// HEBREW CALENDAR INTEGRATION
// ============================================

/**
 * בדיקה אם תאריך הוא שבת
 */
export function isShabbat(date: Date): boolean {
  return date.getDay() === 6; // 6 = שבת
}

/**
 * בדיקה אם תאריך הוא חג (לפי מטמון)
 */
export async function isHoliday(date: Date): Promise<boolean> {
  const dateStr = date.toISOString().split('T')[0];
  
  const cached = await prisma.bookingHebrewDateCache.findUnique({
    where: { gregorianDate: new Date(dateStr) },
  });

  return cached?.isHoliday ?? false;
}

/**
 * קבלת נתוני יום עברי
 */
export async function getHebrewDateData(date: Date) {
  const dateStr = date.toISOString().split('T')[0];
  
  let cached = await prisma.bookingHebrewDateCache.findUnique({
    where: { gregorianDate: new Date(dateStr) },
  });

  if (!cached) {
    // יצירת מטמון חדש (בפרודקשן - יש לשלוף מ-Hebcal API)
    // כרגע יוצר רשומה בסיסית
    cached = await prisma.bookingHebrewDateCache.create({
      data: {
        gregorianDate: new Date(dateStr),
        hebrewDate: '', // ימולא ע"י שירות חיצוני
        hebrewShort: '',
        isShabbat: date.getDay() === 6,
      },
    });
  }

  return cached;
}
