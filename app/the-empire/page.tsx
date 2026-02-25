import PackageLandingPage from '@/components/landing/PackageLandingPage';
import { getContentByKey } from '@/app/actions/site-content';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function TheEmpireLandingPage() {
  const videoRes = await getContentByKey('landing', 'package_landings', 'the_empire_video_url');
  const videoUrl = videoRes.success ? (videoRes.data as string | null) : null;

  return (
    <PackageLandingPage
      badge="הכל כלול"
      title="מערכת הפעלה לעסק: AI שמנהל את הכל במקום אחד."
      subtitle="לידים, שיווק, תפעול, כספים וצוות — הכל במערכת אחת עם AI שמנתח, מדרג וממליץ."
      audience="מנכ״לים, ארגונים בצמיחה, עסקים עם 3+ עובדים שמשלמים היום ל-4 תוכנות שונות"
      pain="תשלומים כפולים, מידע מפוזר שלא מסתנכרן, ואף אחד לא רואה תמונה מלאה."
      bullets={[
        {
          title: 'הכל מחובר עם AI',
          desc: 'מליד לחשבונית, מכירות לשיווק, מתפעול לכספים — ה-AI מנתח וממליץ בכל שלב.',
        },
        {
          title: 'טופס לידים + ייבוא חכם',
          desc: 'לינק לשיתוף לקליטת לידים, ייבוא חכם מאקסל, ו-Pipeline מלא.',
        },
        {
          title: 'מגדל פיקוח (Nexus)',
          desc: 'דשבורד מרכזי עם ביצועים, משימות, לוח שנה עברי ונוכחות.',
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
