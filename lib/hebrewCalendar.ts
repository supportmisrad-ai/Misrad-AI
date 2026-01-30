/**
 * Hebrew Calendar Utilities
 * Converts Gregorian dates to Hebrew dates and calculates Jewish holidays
 */

import { HDate, HebrewCalendar, Location } from '@hebcal/core';

export interface HebrewDate {
  year: number;
  month: number;
  day: number;
  monthName: string;
  dayName: string;
  isShabbat: boolean;
  holiday?: string;
  isHoliday: boolean;
  isFastDay?: boolean;
  fastDay?: string;
  dayHebrew?: string; // Day in Hebrew letters
  yearHebrew?: string; // Year in Hebrew letters
}

/**
 * Hebrew month names
 */
const HEBREW_MONTHS = [
  'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול',
  'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר'
];

const HEBREW_MONTHS_LEAP = [
  'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול',
  'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר א׳', 'אדר ב׳'
];

/**
 * Day names in Hebrew
 */
const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

/**
 * Convert number to Hebrew letters (Gematria)
 * Uses traditional Hebrew numbering system
 */
function numberToHebrewLetters(num: number): string {
  if (num <= 0 || num > 9999) return num.toString();
  
  // Units (1-9)
  const units = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  // Tens (10-90)
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  // Hundreds (100-900)
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];
  
  // Special cases for 15 and 16 (to avoid יה and יו which are names of God)
  if (num === 15) return 'טו';
  if (num === 16) return 'טז';
  
  let result = '';
  let remaining = num;
  
  // Thousands (for years like 5786)
  if (remaining >= 1000) {
    const thousands = Math.floor(remaining / 1000);
    result += units[thousands] || '';
    result += "'";
    remaining = remaining % 1000;
  }
  
  // Hundreds
  if (remaining >= 100) {
    const hundredsDigit = Math.floor(remaining / 100);
    result += hundreds[hundredsDigit] || '';
    remaining = remaining % 100;
  }
  
  // Special handling for 15 and 16 in the remaining part
  if (remaining === 15) {
    result += 'טו';
    remaining = 0;
  } else if (remaining === 16) {
    result += 'טז';
    remaining = 0;
  } else {
    // Tens
    if (remaining >= 10) {
      const tensDigit = Math.floor(remaining / 10);
      result += tens[tensDigit] || '';
      remaining = remaining % 10;
    }
    
    // Units
    if (remaining > 0) {
      result += units[remaining];
    }
  }
  
  // Add geresh (') for numbers > 10 and < 1000 (not for thousands which already have it)
  if (num > 10 && num < 1000) {
    result += "'";
  }
  
  return result;
}

/**
 * Jewish holidays and fast days
 * Format: 'month-day' -> holiday/fast name
 * Note: Months use hebrew-date numbering: 1=Tishrei, 2=Cheshvan, 3=Kislev, 4=Tevet, 5=Shevat, 6=Adar, 7=Nisan, 8=Iyar, 9=Sivan, 10=Tammuz, 11=Av, 12=Elul
 */
const HOLIDAYS: Record<string, string> = {
  // Holidays - Tishrei (month 1)
  '1-1': 'ראש השנה',
  '1-2': 'ראש השנה',
  '1-10': 'יום כיפור',
  '1-15': 'סוכות',
  '1-16': 'סוכות',
  '1-17': 'סוכות',
  '1-18': 'סוכות',
  '1-19': 'סוכות',
  '1-20': 'סוכות',
  '1-21': 'הושענה רבה',
  '1-22': 'שמיני עצרת',
  '1-23': 'שמחת תורה',
  // Holidays - Kislev (month 3) - Hanukkah
  '3-25': 'חנוכה',
  '3-26': 'חנוכה',
  '3-27': 'חנוכה',
  '3-28': 'חנוכה',
  '3-29': 'חנוכה',
  '3-30': 'חנוכה',
  // Holidays - Tevet (month 4) - Hanukkah continuation
  '4-1': 'חנוכה',
  '4-2': 'חנוכה',
  // Holidays - Adar (month 6) - Purim
  '6-14': 'פורים',
  '6-15': 'שושן פורים',
  // Holidays - Nisan (month 7) - Passover
  '7-15': 'פסח',
  '7-16': 'פסח',
  '7-17': 'פסח',
  '7-18': 'פסח',
  '7-19': 'פסח',
  '7-20': 'פסח',
  '7-21': 'פסח',
  '7-22': 'פסח',
  // Holidays - Sivan (month 9) - Shavuot
  '9-6': 'שבועות',
  '9-7': 'שבועות',
};

/**
 * Fast days (צומות)
 * Format: 'month-day' -> fast day name
 * Note: Months use hebrew-date numbering: 1=Tishrei, 2=Cheshvan, 3=Kislev, 4=Tevet, 5=Shevat, 6=Adar, 7=Nisan, 8=Iyar, 9=Sivan, 10=Tammuz, 11=Av, 12=Elul
 */
const FAST_DAYS: Record<string, string> = {
  '1-3': 'צום גדליה',      // ג' תשרי
  '1-10': 'יום כיפור',     // י' תשרי (גם חג וגם צום)
  '4-10': 'צום עשרה בטבת', // י' טבת
  '6-11': 'תענית אסתר',   // י"א אדר (אם י"ג חל בשבת)
  '6-13': 'תענית אסתר',   // י"ג אדר
  '10-17': 'צום י"ז בתמוז', // י"ז תמוז
  '11-9': 'תשעה באב',       // ט' אב
};

/**
 * Convert Gregorian Date to Hebrew Date
 */
export function gregorianToHebrew(date: Date): HebrewDate {
  // Use @hebcal/core to convert
  const hd = new HDate(date);
  
  const hebrewYear = hd.getFullYear();
  // @hebcal/core months: 1=Nisan ... 7=Tishrei
  const hebrewMonth = hd.getMonth(); 
  const hebrewDay = hd.getDate();
  
  // Get month name in Hebrew
  const isLeapYear = HDate.isLeapYear(hebrewYear);
  const monthIndex = hebrewMonth - 1;
  const monthName =
    (isLeapYear ? HEBREW_MONTHS_LEAP : HEBREW_MONTHS)[monthIndex] ||
    hd.getMonthName();
  
  // Get day of week
  const dayOfWeek = date.getDay();
  const dayName = DAY_NAMES[dayOfWeek];
  const isShabbat = dayOfWeek === 6;
  
  // Check for holidays and fast days using @hebcal/core
  const events = HebrewCalendar.getHolidaysOnDate(hd) || [];
  
  let holiday: string | undefined;
  let fastDay: string | undefined;
  
  for (const event of events) {
    const desc = event.render('he');
    // Simple logic to distinguish holidays vs fasts - in reality might need more robust filtering
    if (desc.includes('תענית') || desc.includes('צום') || desc.includes('תשעה')) {
      fastDay = desc;
    } else {
      holiday = desc;
    }
  }
  
  // Convert to Hebrew letters
  const dayHebrew = numberToHebrewLetters(hebrewDay);
  const yearHebrew = numberToHebrewLetters(hebrewYear);
  
  return {
    year: hebrewYear,
    month: hebrewMonth, 
    day: hebrewDay,
    monthName,
    dayName,
    isShabbat,
    holiday: holiday || fastDay,
    isHoliday: !!holiday,
    isFastDay: !!fastDay,
    fastDay: fastDay || undefined,
    dayHebrew,
    yearHebrew,
  };
}

/**
 * Get Hebrew date string (with Hebrew letters)
 */
export function getHebrewDateString(date: Date): string {
  const heb = gregorianToHebrew(date);
  return `${heb.dayHebrew || heb.day} ב${heb.monthName} ${heb.yearHebrew || heb.year}`;
}

/**
 * Check if date is Shabbat
 */
export function isShabbat(date: Date): boolean {
  return date.getDay() === 6;
}

/**
 * Get holiday name for date
 */
export function getHoliday(date: Date): string | null {
  const heb = gregorianToHebrew(date);
  return heb.holiday || null;
}

/**
 * Check if date is a Jewish holiday
 */
export function isHoliday(date: Date): boolean {
  const heb = gregorianToHebrew(date);
  return heb.isHoliday;
}

/**
 * Check if date is a fast day
 */
export function isFastDay(date: Date): boolean {
  const heb = gregorianToHebrew(date);
  return heb.isFastDay || false;
}

/**
 * Get fast day name for date
 */
export function getFastDay(date: Date): string | null {
  const heb = gregorianToHebrew(date);
  return heb.fastDay || null;
}

/**
 * Get all holidays for a given year range
 */
export function getHolidaysForYearRange(startYear: number, endYear: number): Map<string, string> {
  const holidays = new Map<string, string>();
  
  for (let year = startYear; year <= endYear; year++) {
    // Add major holidays (simplified)
    // In production, calculate exact Hebrew dates for each holiday
    holidays.set(`${year}-09-29`, 'ראש השנה');
    holidays.set(`${year}-09-30`, 'ראש השנה');
    holidays.set(`${year}-10-09`, 'יום כיפור');
    holidays.set(`${year}-10-14`, 'סוכות');
    holidays.set(`${year}-10-21`, 'הושענה רבה');
    holidays.set(`${year}-10-22`, 'שמיני עצרת');
    holidays.set(`${year}-10-23`, 'שמחת תורה');
    holidays.set(`${year}-12-25`, 'חנוכה');
    holidays.set(`${year}-03-06`, 'פורים');
    holidays.set(`${year}-04-15`, 'פסח');
    holidays.set(`${year}-06-06`, 'שבועות');
  }
  
  return holidays;
}

