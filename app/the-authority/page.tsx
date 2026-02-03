import PackageLandingPage from '@/components/landing/PackageLandingPage';
import { getContentByKey } from '@/app/actions/site-content';

export const dynamic = 'force-dynamic';

export default async function TheAuthorityLandingPage() {
  const videoRes = await getContentByKey('landing', 'package_landings', 'the_authority_video_url');
  const videoUrl = videoRes.success ? (videoRes.data as string | null) : null;

  return (
    <PackageLandingPage
      badge="The Authority · שיווק ומיתוג"
      title="מהתוכן ללקוח: לחבר את השיווק לניהול הלקוחות."
      subtitle="להפוך עוקבים ללקוחות משלמים ולנהל את כל התקשורת במקום אחד."
      audience="מנהלי סושיאל, משפיענים, עסקים שמייצרים תוכן וקהילות"
      pain="יש שיווק (לייקים) אבל אין סדר לניהול לקוחות, והלידים נעלמים."
      bullets={[
        {
          title: 'ניהול קמפיינים',
          desc: 'רואים את כל הפעילות השיווקית מול העיניים.',
        },
        {
          title: 'תיק לקוח חכם',
          desc: 'היסטוריה מלאה של כל לקוח — מההודעה הראשונה ועד הרכישה.',
        },
        {
          title: 'המשכיות',
          desc: 'העוקב לא הולך לאיבוד — הוא נכנס לתהליך מסודר.',
        },
      ]}
      ctaPrimaryHref="/login?mode=sign-up&plan=the_authority"
      ctaPrimaryLabel="התחל לנהל את הלקוחות בחינם"
      ctaSecondaryHref="/pricing"
      ctaSecondaryLabel="ראה חבילות"
      videoUrl={videoUrl}
      videoTitle="סרטון הדגמה · שיווק"
    />
  );
}
