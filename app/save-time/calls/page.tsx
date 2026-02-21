import PackageLandingPage from '@/components/landing/PackageLandingPage';
import { getContentByKey } from '@/app/actions/site-content';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SaveTimeCallsLandingPage() {
  const videoRes = await getContentByKey('landing', 'package_landings', 'save_time_calls_video_url');
  const videoUrl = videoRes.success ? (videoRes.data as string | null) : null;

  return (
    <PackageLandingPage
      badge="חוסכים זמן · מכירות"
      title={'מסיימים שיחה — MISRAD AI מסכמת, מזהה התנגדויות, ומוציאה משימות אופרטיביות.'}
      subtitle={'מעלים הקלטה או מדביקים תמלול, ומקבלים תוצאה מובנית: סיכום, ציון, כוונה, התנגדויות ומשימות.'}
      audience="בעלי עסקים ואנשי מכירות/שירות (5–20 עובדים)"
      pain="שוכחים פרטים, לא חוזרים ללקוח בזמן, והרבה עבודה שחורה אחרי כל שיחה."
      variant="tactical"
      bullets={[
        {
          title: 'סיכום וציון בשניות',
          desc: 'סיכום קצר + ציון שיחה כדי להבין מה קרה ומה לשפר.',
        },
        {
          title: 'מענה להתנגדויות',
          desc: 'המערכת מחזירה הצעות מענה (objection → reply → next_question) בצורה מסודרת.',
        },
        {
          title: 'משימות אופרטיביות לצעד הבא',
          desc: 'רשימת משימות ברורה שמחליפה פתקים ורשימות אחרי השיחה.',
        },
        {
          title: 'היסטוריה של ניתוחים',
          desc: 'שומרים תוצאות כדי לחזור לשיחות ולראות מה השתנה לאורך זמן.',
        },
      ]}
      ctaPrimaryHref="/login?mode=sign-up&redirect=/workspaces/onboarding&plan=the_closer"
      ctaPrimaryLabel="התחל ניסיון חינם"
      ctaSecondaryHref="/pricing"
      ctaSecondaryLabel="ראה מחירים"
      videoUrl={videoUrl}
      videoTitle="סרטון הדגמה · שיחה → סיכום"
    />
  );
}
