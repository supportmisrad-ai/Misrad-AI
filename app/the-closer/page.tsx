import PackageLandingPage from '@/components/landing/PackageLandingPage';
import { getContentByKey } from '@/app/actions/site-content';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function TheCloserLandingPage() {
  const videoRes = await getContentByKey('landing', 'package_landings', 'the_closer_video_url');
  const videoUrl = videoRes.success ? (videoRes.data as string | null) : null;

  return (
    <PackageLandingPage
      badge="מכונות מכירה"
      title="להפוך לידים לכסף: ה-AI שסוגר לך עסקאות."
      subtitle="המערכת שרודפת אחרי לידים, מדרגת אותם, ואומרת לך למי להתקשר עכשיו."
      audience="סוכני ביטוח, נדל״ן, מוקדי מכירות, עסקים מבוססי לידים"
      pain="לידים נכנסים בערב ונשכחים, פולואפ מתפספס, וכסף נשאר בחוץ."
      bullets={[
        {
          title: 'רדיפה אוטומטית',
          desc: 'לינק ייחודי בוואטסאפ או באתר - לידים נכנסים וה-AI כבר איתם.',
        },
        {
          title: 'חיזוי סגירות חכם',
          desc: 'המערכת אומרת לך: "ליד X עם 80% סיכוי לסגור" - אל תבזבז זמן על אחרים.',
        },
        {
          title: 'תיעוד בלי להקליד',
          desc: 'המערכת מסכמת שיחות, מוציאה התנגדויות וממליצה על הצעד הבא.',
        },
        {
          title: 'החזר השקעה (ROI)',
          desc: 'סגירת ליד אחד נוסף בחודש - והחזרת את ההשקעה פי 5.',
        },
      ]}
      ctaPrimaryHref="/login?mode=sign-up&redirect=/workspaces/onboarding&plan=the_closer"
      ctaPrimaryLabel="התחילו לסגור עכשיו"
      ctaSecondaryHref="/pricing"
      ctaSecondaryLabel="ראה חבילות"
      videoUrl={videoUrl}
      videoTitle="סרטון הדגמה · מכירות"
      price={249}
      priceNote="System + Nexus · משתמש אחד"
    />
  );
}
