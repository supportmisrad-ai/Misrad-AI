import PackageLandingPage from '@/components/landing/PackageLandingPage';
import { getContentByKey } from '@/app/actions/site-content';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function TheAuthorityLandingPage() {
  const videoRes = await getContentByKey('landing', 'package_landings', 'the_authority_video_url');
  const videoUrl = videoRes.success ? (videoRes.data as string | null) : null;

  return (
    <PackageLandingPage
      badge="חבילת שיווק ומיתוג"
      title="מהתוכן ללקוח: AI שמחבר שיווק לניהול לקוחות."
      subtitle="להפוך עוקבים ללקוחות משלמים, לנהל תיקי לקוח חכמים, ולקלוט לידים ישר מהרשתות."
      audience="מנהלי סושיאל, משפיענים, עסקים שמייצרים תוכן וקהילות"
      pain="יש שיווק (לייקים) אבל אין סדר לניהול לקוחות, והלידים נעלמים."
      bullets={[
        {
          title: 'ניהול קמפיינים',
          desc: 'כל הפעילות השיווקית במקום אחד — ברור ומסודר.',
        },
        {
          title: 'תיק לקוח חכם + טופס לידים',
          desc: 'היסטוריה מלאה של כל לקוח + לינק לשיתוף שמכניס לידים ישר למערכת.',
        },
        {
          title: 'המשכיות',
          desc: 'העוקב לא הולך לאיבוד — הוא נכנס לתהליך מסודר.',
        },
      ]}
      ctaPrimaryHref="/login?mode=sign-up&redirect=/workspaces/onboarding&plan=the_authority"
      ctaPrimaryLabel="התחל ניסיון חינם"
      ctaSecondaryHref="/pricing"
      ctaSecondaryLabel="ראה חבילות"
      videoUrl={videoUrl}
      videoTitle="סרטון הדגמה · שיווק"
      price={349}
      priceNote="Social + Client + Nexus · 5 משתמשים"
    />
  );
}
