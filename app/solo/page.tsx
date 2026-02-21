import PackageLandingPage from '@/components/landing/PackageLandingPage';
import { getContentByKey } from '@/app/actions/site-content';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SoloLandingPage() {
  const videoRes = await getContentByKey('landing', 'package_landings', 'solo_video_url');
  const videoUrl = videoRes.success ? (videoRes.data as string | null) : null;

  return (
    <PackageLandingPage
      badge="מודול בודד"
      title="התחלה חכמה: לבחור מודול אחד ולהתחיל לעבוד מסודר."
      subtitle="מתחילים קטן — גדלים חכם. בוחרים מודול ומתמקדים במה שכואב."
      audience="פרילאנסרים ועצמאים · עסקים קטנים · ארגונים בצמיחה · צוותים בתחילת הדרך"
      pain="יותר מדי כלים, יותר מדי רעש, ואין מקום אחד שמחזיק תהליך."
      bullets={[
        {
          title: 'פשוט וקל',
          desc: 'ממשק נקי שלא מפחיד להשתמש בו.',
        },
        {
          title: 'ממוקד',
          desc: 'משלמים רק על מה שצריכים באמת.',
        },
        {
          title: 'מוכן לצמיחה',
          desc: 'כשתרצה — מוסיפים עוד מודולים בלחיצת כפתור.',
        },
      ]}
      ctaPrimaryHref="/login?mode=sign-up&redirect=/workspaces/onboarding&plan=solo"
      ctaPrimaryLabel="התחל ניסיון חינם"
      ctaSecondaryHref="/pricing"
      ctaSecondaryLabel="ראה חבילות"
      videoUrl={videoUrl}
      videoTitle="סרטון הסבר · מודול בודד"
    />
  );
}
