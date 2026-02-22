import PackageLandingPage from '@/components/landing/PackageLandingPage';
import { getContentByKey } from '@/app/actions/site-content';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function TheEmpireLandingPage() {
  const videoRes = await getContentByKey('landing', 'package_landings', 'the_empire_video_url');
  const videoUrl = videoRes.success ? (videoRes.data as string | null) : null;

  return (
    <PackageLandingPage
      badge="הכל כלול"
      title="מערכת הפעלה לעסק: שיווק, מכירות, תפעול וכספים — במקום אחד."
      subtitle="להפסיק לשלם ל-5 תוכנות שונות. קבלו שליטה מלאה על העסק ב-360 מעלות."
      audience="מנכ״לים, בעלי עסקים עם 3+ עובדים, מי שמשלם היום ל-4 תוכנות שונות"
      pain="תשלומים כפולים, מידע מפוזר שלא מסתנכרן, ועייפות תוכנה."
      bullets={[
        {
          title: 'הכל מחובר',
          desc: 'מליד לחשבונית בלי להעתיק נתונים ובלי טעויות.',
        },
        {
          title: 'מגדל פיקוח (Nexus)',
          desc: 'דשבורד שמרכז ביצועים ומשימות בזמן אמת.',
        },
        {
          title: 'חיסכון ענק',
          desc: 'מחיר אחד, מערכת אחת, בלי אינטגרציות מסובכות.',
        },
      ]}
      ctaPrimaryHref="/login?mode=sign-up&redirect=/workspaces/onboarding&plan=the_empire"
      ctaPrimaryLabel="קבל גישה מלאה בחינם"
      ctaSecondaryHref="/pricing"
      ctaSecondaryLabel="ראה חבילות"
      videoUrl={videoUrl}
      videoTitle="סרטון הדגמה · הכל כלול"
      price={499}
      priceNote="כל 6 המודולים · 5 משתמשים כלולים"
    />
  );
}
