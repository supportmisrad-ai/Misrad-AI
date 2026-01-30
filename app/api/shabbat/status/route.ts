import { NextResponse } from 'next/server';
import { calculateShabbatTimes, formatShabbatTime, formatCountdown } from '@/lib/shabbat';

export async function GET() {
  try {
    const shabbatTimes = calculateShabbatTimes();
    
    return NextResponse.json({
      isShabbat: shabbatTimes.isShabbat,
      candleLighting: formatShabbatTime(shabbatTimes.candleLighting),
      shabbatStart: formatShabbatTime(shabbatTimes.shabbatStart),
      shabbatEnd: formatShabbatTime(shabbatTimes.shabbatEnd),
      timeUntilEnd: shabbatTimes.isShabbat ? formatCountdown(shabbatTimes.timeUntilEnd) : null,
      nextShabbat: formatShabbatTime(shabbatTimes.nextShabbat),
      message: shabbatTimes.isShabbat 
        ? `המערכת תחזור לפעול אחרי צאת הכוכבים ב-${formatShabbatTime(shabbatTimes.shabbatEnd)}`
        : 'המערכת פעילה',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'שגיאה בחישוב זמני שבת' },
      { status: 500 }
    );
  }
}

