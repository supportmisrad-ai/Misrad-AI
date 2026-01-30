import PackageLandingPage from '@/components/landing/PackageLandingPage';
import { getContentByKey } from '@/app/actions/site-content';

export const dynamic = 'force-dynamic';

export default async function TheOperatorLandingPage() {
  const videoRes = await getContentByKey('landing', 'package_landings', 'the_operator_video_url');
  const videoUrl = videoRes.success ? (videoRes.data as string | null) : null;

  return (
    <PackageLandingPage
      badge="The Operator · תפעול ושטח"
      title="הסוף לבלגן בשטח: לנהל קריאות, טכנאים ומלאי מהנייד."
      subtitle="בלי וואטסאפ ובלי מחברות. ניסיון חינם מלא ל-7 ימים — בלי כרטיס."
      audience="קבלני שיפוצים, מיזוג אוויר, אינסטלציה, חברות ניהול ואחזקה"
      pain="הודעות נעלמות, טכנאים לא מדווחים, ויכוחים עם לקוחות, וחוסר תיעוד."
      bullets={[
        {
          title: 'שליטה מהכיס',
          desc: 'הטכנאי רואה את המשימה, מנווט ליעד ומדווח מהשטח בלחיצה.',
        },
        {
          title: 'חדש! שליטה קולית מלאה',
          desc: 'פתחו קריאות, והכינו חשבוניות — הכל בדיבור, בלי להוריד את הכפפות.',
        },
        {
          title: 'AI לזיהוי חלקים',
          desc: 'מצלמים את החלק והמערכת מזהה אותו — פחות טעויות בהזמנות מלאי.',
        },
        {
          title: 'הוכחת ביצוע',
          desc: 'חתימה דיגיטלית של הלקוח בשטח שסוגרת את הפינה לחשבונית.',
        },
      ]}
      ctaPrimaryHref="/sign-up"
      ctaPrimaryLabel="התחל ניסיון חינם (בלי כרטיס)"
      ctaSecondaryHref="/pricing"
      ctaSecondaryLabel="ראה חבילות"
      videoUrl={videoUrl}
      videoTitle="סרטון הסבר · תפעול ושטח"
    />
  );
}
