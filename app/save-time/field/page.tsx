import PackageLandingPage from '@/components/landing/PackageLandingPage';
import { getContentByKey } from '@/app/actions/site-content';

export const dynamic = 'force-dynamic';

export default async function SaveTimeFieldLandingPage() {
  const videoRes = await getContentByKey('landing', 'package_landings', 'save_time_field_video_url');
  const videoUrl = videoRes.success ? (videoRes.data as string | null) : null;

  return (
    <PackageLandingPage
      badge="חוסכים זמן · שטח"
      title={'מצלמים חלק בשטח — MISRAD AI אומרת לך איפה הוא עכשיו: רכב 2 / רכב 1 / מחסן ראשי.'}
      subtitle={'הסטוק שלי = הרכב הפעיל שלי. לכל קריאה יש מקור מלאי חד-משמעי, והורדה מהמלאי מתועדת אוטומטית.'}
      audience="קבלני משנה, טכנאים וחברות שירות (5–20 עובדים)"
      pain="נסיעות למחסן, בזבוז זמן, ויכוחים 'איפה החלק', וחוסר תיעוד של מה ירד מאיפה."
      variant="tactical"
      bullets={[
        {
          title: 'הסטוק שלי = הרכב הפעיל',
          desc: 'בכל רגע יש רכב פעיל אחד שממנו עובדים כברירת מחדל — בלי בלבול.',
        },
        {
          title: 'מקור מלאי לקריאה — חד-משמעי',
          desc: 'אם יש טכנאי משויך: המקור הוא הרכב הפעיל שלו. אחרת: המחסן הראשי.',
        },
        {
          title: 'הוסף חומר והורד מהמלאי',
          desc: 'מוסיפים פריט וכמות מתוך הקריאה, והמערכת מורידה מהמיקום הנכון ומתעדת תנועת מלאי.',
        },
        {
          title: 'Override קטן כשצריך',
          desc: 'אפשר להוריד ממיקום אחר (רכב/מחסן/אצל טכנאי אחר) בלי להפוך את העבודה למסובכת.',
        },
      ]}
      ctaPrimaryHref="/login?mode=sign-up&plan=the_operator"
      ctaPrimaryLabel="התחל ניסיון חינם"
      ctaSecondaryHref="/pricing"
      ctaSecondaryLabel="ראה מחירים"
      videoUrl={videoUrl}
      videoTitle="סרטון הדגמה · מלאי בשטח"
    />
  );
}
