import PackageLandingPage from '@/components/landing/PackageLandingPage';
import { getContentByKey } from '@/app/actions/site-content';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SoloLandingPage() {
  const videoRes = await getContentByKey('landing', 'package_landings', 'solo_video_url');
  const videoUrl = videoRes.success ? (videoRes.data as string | null) : null;

  return (
    <PackageLandingPage
      badge="נקסוס בלבד"
      title="התחלה חכמה: ניהול משימות וצוות עם נקסוס."
      subtitle="מתחילים עם בסיס חזק — ניהול משימות, צוות ולקוחות במקום אחד."
      audience="פרילאנסרים ועצמאים · עסקים קטנים · צוותים בתחילת הדרך"
      pain="אין מקום אחד שמחזיק את כל המשימות, הלקוחות והצוות."
      bullets={[
        {
          title: 'ניהול משימות',
          desc: 'משימות, פרויקטים ומעקב אחרי התקדמות בצוות.',
        },
        {
          title: 'CRM בסיסי',
          desc: 'ניהול לקוחות ומעקב אחרי תקשורת.',
        },
        {
          title: 'מוכן לצמיחה',
          desc: 'כשתרצה — מוסיפים מודולים נוספים בלחיצת כפתור.',
        },
      ]}
      ctaPrimaryHref="/login?mode=sign-up&redirect=/workspaces/onboarding&plan=solo&module=nexus"
      ctaPrimaryLabel="התחל ניסיון חינם"
      ctaSecondaryHref="/pricing"
      ctaSecondaryLabel="ראה חבילות"
      videoUrl={videoUrl}
      videoTitle="סרטון הסבר · נקסוס"
    />
  );
}
