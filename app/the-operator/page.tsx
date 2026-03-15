import PackageLandingPage from '@/components/landing/PackageLandingPage';
import { getContentByKey } from '@/app/actions/site-content';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function TheOperatorLandingPage() {
  const videoRes = await getContentByKey('landing', 'package_landings', 'the_operator_video_url');
  const videoUrl = videoRes.success ? (videoRes.data as string | null) : null;

  return (
    <PackageLandingPage
      badge="עבודת שטח"
      title="הסוף לבלגן בשטח: לנהל קריאות וטכנאים מהנייד."
      subtitle="בלי וואטסאפ ובלי ניירת. 7 דקות הקמה - 7 ימים לראות תוצאות."
      audience="קבלני שיפוצים, מיזוג אוויר, אינסטלציה, חברות ניהול ואחזקה"
      pain="הודעות נעלמות, טכנאים לא מדווחים בזמן, ואין לך מושג איפה כולם נמצאים."
      bullets={[
        {
          title: 'דיווח מהכיס',
          desc: 'הטכנאי רואה את המשימה, מנווט ליעד ומדווח מהשטח בלחיצה.',
        },
        {
          title: 'פקודות קוליות בעברית',
          desc: 'הידיים תפוסות? פשוט תגיד מה נעשה. המערכת מבינה ומעדכנת.',
        },
        {
          title: 'חיבור ישיר למשרד',
          desc: 'העבודה נגמרה? החשבונית כבר בדרך ללקוח והדיווח במערכת.',
        },
        {
          title: 'החזר השקעה (ROI)',
          desc: 'מניעת "שעות מתות" בצוות השטח - החזר השקעה מהיום הראשון.',
        },
      ]}
      ctaPrimaryHref="/login?mode=sign-up&redirect=/workspaces/onboarding&plan=the_operator"
      ctaPrimaryLabel="התחילו לעבוד עכשיו"
      ctaSecondaryHref="/pricing"
      ctaSecondaryLabel="ראה חבילות"
      videoUrl={videoUrl}
      videoTitle="סרטון הסבר · תפעול ושטח"
      price={349}
      priceNote="Operations + Nexus · 5 משתמשים"
    />
  );
}
