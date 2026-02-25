import PackageLandingPage from '@/components/landing/PackageLandingPage';
import { getContentByKey } from '@/app/actions/site-content';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function TheCloserLandingPage() {
  const videoRes = await getContentByKey('landing', 'package_landings', 'the_closer_video_url');
  const videoUrl = videoRes.success ? (videoRes.data as string | null) : null;

  return (
    <PackageLandingPage
      badge="חבילת מכירות"
      title="להפוך לידים לכסף: ה-AI שסוגר לך יותר עסקאות."
      subtitle="מערכת שמנהלת את הלידים, מדרגת אותם אוטומטית, ואומרת לך בדיוק למי לחזור היום."
      audience="סוכני ביטוח, נדל״ן, מוקדי מכירות, עסקים מבוססי לידים"
      pain="לידים נרשמים על פתקים, שוכחים פולואפ, ואין שקיפות על מה בצנרת."
      bullets={[
        {
          title: 'טופס לידים עם לינק לשיתוף',
          desc: 'לינק ייחודי שמשתפים בוואטסאפ, בפייסבוק או באתר — לידים נכנסים ישר למערכת.',
        },
        {
          title: 'AI שמדרג לידים',
          desc: 'כל ליד מקבל ציון אוטומטי. המערכת אומרת לך מי חם ולמי כדאי לחזור קודם.',
        },
        {
          title: 'ייבוא חכם מאקסל',
          desc: 'מעלים קובץ — ה-AI ממפה עמודות לבד, בודק כפילויות ומייבא עד 10,000 לידים.',
        },
        {
          title: 'Pipeline + תיעוד שיחות',
          desc: 'מעקב שלב-אחרי-שלב, תזכורות, תיעוד שיחות ודשבורד עם הצפי הכספי.',
        },
      ]}
      ctaPrimaryHref="/login?mode=sign-up&redirect=/workspaces/onboarding&plan=the_closer"
      ctaPrimaryLabel="התחל ניסיון חינם"
      ctaSecondaryHref="/pricing"
      ctaSecondaryLabel="ראה חבילות"
      videoUrl={videoUrl}
      videoTitle="סרטון הדגמה · מכירות"
      price={249}
      priceNote="System + Nexus · משתמש אחד"
    />
  );
}
