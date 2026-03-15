import PackageLandingPage from '@/components/landing/PackageLandingPage';
import { getContentByKey } from '@/app/actions/site-content';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SoloLandingPage() {
  const videoRes = await getContentByKey('landing', 'package_landings', 'solo_video_url');
  const videoUrl = videoRes.success ? (videoRes.data as string | null) : null;

  return (
    <PackageLandingPage
      badge="נקסוס בלבד"
      title="שהעסק יתחיל לעבוד: סידור עבודה וצוות."
      subtitle="הסוף ל'גננות'. דעו בדיוק מי עושה מה, מתי הכל יסתיים ומי פנוי לעוד עבודה."
      audience="פרילאנסרים · בעלי עסקים עם עובדים · מנהלי פרויקטים"
      pain="משימות הולכות לאיבוד בוואטסאפ, ואתה מגלה שפרויקט תקוע רק כשהלקוח צורח."
      bullets={[
        {
          title: 'סידור עבודה חכם',
          desc: 'מי עושה מה ומתי - הכל מול העיניים בדשבורד אחד נקי.',
        },
        {
          title: 'ניהול לקוחות (CRM)',
          desc: 'כל המידע על הלקוח במקום אחד, בלי לחפש בפתקים.',
        },
        {
          title: 'החזר השקעה (ROI)',
          desc: 'סגירת משימה אחת שחוסכת שעה בשבוע - והחזרת את ההשקעה.',
        },
      ]}
      ctaPrimaryHref="/login?mode=sign-up&redirect=/workspaces/onboarding&plan=solo&module=nexus"
      ctaPrimaryLabel="התחילו לעבוד עכשיו"
      ctaSecondaryHref="/pricing"
      ctaSecondaryLabel="ראה חבילות"
      videoUrl={videoUrl}
      videoTitle="סרטון הסבר · נקסוס"
    />
  );
}
