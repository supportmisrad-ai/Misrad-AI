import PackageLandingPage from '@/components/landing/PackageLandingPage';
import { getContentByKey } from '@/app/actions/site-content';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function TheCloserLandingPage() {
  const videoRes = await getContentByKey('landing', 'package_landings', 'the_closer_video_url');
  const videoUrl = videoRes.success ? (videoRes.data as string | null) : null;

  return (
    <PackageLandingPage
      badge="חבילת מכירות"
      title="להפוך לידים לכסף: מערכת CRM חכמה שסוגרת יותר עסקאות."
      subtitle="להפסיק לאבד לקוחות בין הכיסאות. נהלו פייפליין, שיחות ומשימות במקום אחד."
      audience="סוכני ביטוח, נדל״ן, מוקדי מכירות, עסקים מבוססי לידים"
      pain="לידים נרשמים על פתקים, שוכחים פולואפ, ואין שליטה על הצפי הכספי."
      bullets={[
        {
          title: 'מעקב מלא',
          desc: 'תזכורות ותהליך מסודר כדי לא לשכוח אף לקוח.',
        },
        {
          title: 'תיעוד שיחות',
          desc: 'יודעים בדיוק מה נאמר ומה הסטטוס העדכני.',
        },
        {
          title: 'תמונת מצב',
          desc: 'דשבורד שמראה כמה כסף יש בצנרת ומה צריך לעשות היום כדי לסגור.',
        },
      ]}
      ctaPrimaryHref="/login?mode=sign-up&redirect=/workspaces/onboarding&plan=the_closer"
      ctaPrimaryLabel="נסה את ה-CRM בחינם"
      ctaSecondaryHref="/pricing"
      ctaSecondaryLabel="ראה חבילות"
      videoUrl={videoUrl}
      videoTitle="סרטון הדגמה · מכירות"
      price={249}
      priceNote="System + Nexus · משתמש אחד"
    />
  );
}
