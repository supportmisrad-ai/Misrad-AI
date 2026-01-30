/**
 * Hebrew Calendar Utilities
 * 
 * Functions for converting between Hebrew and Gregorian calendars
 * and formatting Hebrew dates
 */

import { HDate, HebrewCalendar, gematriya } from '@hebcal/core';

/**
 * Convert Gregorian date to Hebrew date
 */
export function gregorianToHebrew(date: Date): HDate {
  return new HDate(date);
}

/**
 * Convert Hebrew date to Gregorian date
 */
export function hebrewToGregorian(hDate: HDate): Date {
  return hDate.greg();
}

/**
 * Format Hebrew date as string (e.g., "כ״ה בכסלו תשפ״ה")
 */
export function formatHebrewDate(date: Date, options?: {
  includeYear?: boolean;
  shortFormat?: boolean;
}): string {
  try {
    const hDate = gregorianToHebrew(date);
    // Use gematriya to get Hebrew letters for the day
    const dayNum = hDate.getDate();
    const day = gematriya(dayNum);
    // Use our function that converts to Hebrew
    const month = getHebrewMonthName(date);
    // HDate uses 'year' property
    const year = options?.includeYear ? ` ${getHebrewYear(date)}` : '';
    
    if (options?.shortFormat) {
      return `${day} ${month}${year}`;
    }
    
    return `${day} ב${month}${year}`;
  } catch (error) {
    console.error('[Hebrew Calendar] Error formatting date:', error);
    return '';
  }
}

/**
 * Format Hebrew date with day name (e.g., "יום ראשון, כ״ה בכסלו תשפ״ה")
 */
export function formatHebrewDateWithDay(date: Date): string {
  try {
    const dayName = new Intl.DateTimeFormat('he-IL', { weekday: 'long' }).format(date);
    const dateStr = formatHebrewDate(date, { includeYear: true });
    return `${dayName}, ${dateStr}`;
  } catch (error) {
    console.error('[Hebrew Calendar] Error formatting date with day:', error);
    return '';
  }
}

/**
 * Get Hebrew month name
 */
export function getHebrewMonthName(date: Date): string {
  try {
    const hDate = gregorianToHebrew(date);
    // Get month index using getMonth() method
    const monthIndex = hDate.getMonth();
    
    // Direct mapping by month index - always returns Hebrew
    // Hebrew calendar months: 0=Nisan, 1=Iyyar, 2=Sivan, 3=Tammuz, 4=Av, 5=Elul,
    //                         6=Tishrei, 7=Cheshvan, 8=Kislev, 9=Tevet, 10=Shevat, 11=Adar
    const hebrewMonths: string[] = [
      'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול',
      'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר'
    ];
    
    // For leap years, Adar might be Adar I or Adar II
    // Check if it's a leap year and which Adar
    const year = hDate.getFullYear();
    const isLeapYear = HDate.isLeapYear(year);
    
    // In leap years, month 11 is Adar I and month 12 is Adar II
    if (isLeapYear) {
      if (monthIndex === 11) {
        return 'אדר א׳';
      }
      if (monthIndex === 12) {
        return 'אדר ב׳';
      }
    }
    
    // Return Hebrew month name by index
    if (monthIndex >= 0 && monthIndex < hebrewMonths.length) {
      return hebrewMonths[monthIndex];
    }
    
    // Fallback: try getMonthName and map
    const monthName = hDate.getMonthName();
    const monthMap: Record<string, string> = {
      'Nisan': 'ניסן', 'Iyyar': 'אייר', 'Sivan': 'סיוון',
      'Tammuz': 'תמוז', 'Tamuz': 'תמוז',
      'Av': 'אב', 'Elul': 'אלול',
      'Tishrei': 'תשרי', 'Cheshvan': 'חשוון', 'Kislev': 'כסלו',
      'Tevet': 'טבת', 'Shevat': 'שבט', 'Shvat': 'שבט',
      'Adar': 'אדר', 'Adar I': 'אדר א׳', 'Adar II': 'אדר ב׳'
    };
    
    // Try exact match first
    if (monthMap[monthName]) {
      return monthMap[monthName];
    }
    
    // Try case-insensitive match
    const lowerName = monthName.toLowerCase();
    for (const [key, value] of Object.entries(monthMap)) {
      if (key.toLowerCase() === lowerName) {
        return value;
      }
    }
    
    return monthName || '';
  } catch (error) {
    console.error('[Hebrew Calendar] Error getting month name:', error);
    return '';
  }
}

/**
 * Get number of days in Hebrew month
 */
export function getHebrewMonthDays(date: Date): number {
  try {
    const hDate = gregorianToHebrew(date);
    // Use HDate's daysInMonth method
    return hDate.daysInMonth();
  } catch (error) {
    console.error('[Hebrew Calendar] Error getting month days:', error);
    return 0;
  }
}

/**
 * Check if Hebrew year is a leap year
 */
export function isHebrewLeapYear(date: Date): boolean {
  try {
    const year = getHebrewYear(date);
    return HDate.isLeapYear(year);
  } catch (error) {
    console.error('[Hebrew Calendar] Error checking leap year:', error);
    return false;
  }
}

/**
 * Get Hebrew year (as number)
 */
export function getHebrewYear(date: Date): number {
  try {
    const hDate = gregorianToHebrew(date);
    // Use getFullYear() method to get the Hebrew year
    return hDate.getFullYear();
  } catch (error) {
    console.error('[Hebrew Calendar] Error getting year:', error);
    // Fallback calculation
    const gregYear = date.getFullYear();
    return gregYear + 3760;
  }
}

/**
 * Get Hebrew year in Hebrew letters (e.g., "תשפ״ו")
 */
export function getHebrewYearLetters(date: Date): string {
  try {
    const year = getHebrewYear(date);
    // Use gematriya to convert year to Hebrew letters
    // Hebrew years are typically written without thousands (e.g., 5785 -> תשפ״ה)
    // We need to extract the last 3 digits (or 4 if needed)
    const yearStr = year.toString();
    // Take last 3-4 digits (usually last 3 for modern years)
    const yearNum = parseInt(yearStr.slice(-3));
    return gematriya(yearNum);
  } catch (error) {
    console.error('[Hebrew Calendar] Error getting year letters:', error);
    return '';
  }
}

/**
 * Get Hebrew day of month (as Hebrew letters, e.g., "כ״ה")
 */
export function getHebrewDay(date: Date): string {
  try {
    const hDate = gregorianToHebrew(date);
    const dayNum = hDate.getDate();
    // Use gematriya to convert number to Hebrew letters
    return gematriya(dayNum);
  } catch (error) {
    console.error('[Hebrew Calendar] Error getting day:', error);
    return '';
  }
}

/**
 * Get Hebrew day name (abbreviated)
 */
export function getHebrewDayName(date: Date, abbreviated: boolean = true): string {
  try {
    if (abbreviated) {
      const dayNames = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
      return dayNames[date.getDay()] || '';
    }
    return new Intl.DateTimeFormat('he-IL', { weekday: 'long' }).format(date);
  } catch (error) {
    console.error('[Hebrew Calendar] Error getting day name:', error);
    return '';
  }
}

/**
 * Check if date is Shabbat (Saturday)
 */
export function isShabbat(date: Date): boolean {
  return date.getDay() === 6; // 6 = Saturday
}

/**
 * Check if date is a Jewish holiday
 */
export function isJewishHoliday(date: Date): boolean {
  try {
    const hDate = gregorianToHebrew(date);
    // Use our getHebrewYear function
    const year = getHebrewYear(date);
    const events = HebrewCalendar.calendar({
      year: year,
      isHebrewYear: true,
      start: hDate,
      end: hDate,
    });
    
    return events.some(event => event.getFlags() > 0);
  } catch (error) {
    console.error('[Hebrew Calendar] Error checking holiday:', error);
    return false;
  }
}

/**
 * Get Jewish holiday name for a date (if it's a holiday)
 */
export function getJewishHolidayName(date: Date): string | null {
  try {
    const hDate = gregorianToHebrew(date);
    const year = getHebrewYear(date);
    const events = HebrewCalendar.calendar({
      year: year,
      isHebrewYear: true,
      start: hDate,
      end: hDate,
    });
    
    const holidayEvent = events.find(event => event.getFlags() > 0);
    if (holidayEvent) {
      return holidayEvent.render('he'); // Hebrew name
    }
    return null;
  } catch (error) {
    console.error('[Hebrew Calendar] Error getting holiday name:', error);
    return null;
  }
}

/**
 * Get Jewish holidays for a date range
 */
export function getJewishHolidays(startDate: Date, endDate: Date): Array<{
  date: Date;
  name: string;
  hebrewName: string;
}> {
  try {
    const startHDate = gregorianToHebrew(startDate);
    const endHDate = gregorianToHebrew(endDate);
    
    const events = HebrewCalendar.calendar({
      start: startHDate,
      end: endHDate,
      candlelighting: false,
    });
    
    return events
      .filter(event => event.getFlags() > 0)
      .map(event => ({
        date: event.getDate().greg(),
        name: event.render('en'),
        hebrewName: event.render('he'),
      }));
  } catch (error) {
    console.error('[Hebrew Calendar] Error getting holidays:', error);
    return [];
  }
}

/**
 * Get Hebrew month names array
 */
export const HEBREW_MONTH_NAMES = [
  'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול',
  'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר'
];

/**
 * Get Hebrew month names for leap years (includes אדר א׳ ואדר ב׳)
 */
export const HEBREW_MONTH_NAMES_LEAP = [
  'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול',
  'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר א׳', 'אדר ב׳'
];

/**
 * Get Hebrew day names (abbreviated)
 */
export const HEBREW_DAY_NAMES = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

/**
 * Get Hebrew day names (full)
 */
export const HEBREW_DAY_NAMES_FULL = [
  'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'
];
