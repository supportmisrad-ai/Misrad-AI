// lib/entitlements.ts - תוכנית ארכיטקטורית למערכת הרשאות

export type AccessLevel = 
  | 'full'           // משלם או ב-trial פעיל
  | 'read-only'      // expired - ראייה וייצוא בלבד
  | 'restricted'     // grace period - עריכה חלקית
  | 'none';          // אין גישה בכלל

export interface EntitlementCheck {
  canView: boolean;
  canEdit: boolean;
  canUseAI: boolean;
  canExport: boolean;
  canInvite: boolean;
  banner?: {
    type: 'warning' | 'error' | 'info';
    message: string;
    action?: { label: string; href: string };
  };
}

/**
 * מערכת הרשאות מרכזית - כל הדפים והAPI משתמשים בזה
 * במקום לבדוק subscription_status ישירות
 */
export function checkEntitlements(
  subscriptionStatus: string,
  subscriptionPlan: string | null,
  daysSinceExpired: number
): EntitlementCheck {
  switch (subscriptionStatus) {
    case 'active':
    case 'trial':
      return {
        canView: true,
        canEdit: true,
        canUseAI: true,
        canExport: true,
        canInvite: true,
      };
      
    case 'expired':
      // Archive mode: 30 ימים ראשונים - ראייה וייצוא בלבד
      if (daysSinceExpired <= 30) {
        return {
          canView: true,
          canEdit: false,
          canUseAI: false,
          canExport: true,
          canInvite: false,
          banner: {
            type: 'error',
            message: 'תקופת הניסיון הסתיימה. הנתונים שלך מוגנים. שדרג לחבילה בתשלום כדי להמשיך לעבוד.',
            action: { label: 'צפה בחבילות', href: '/subscribe/checkout' }
          }
        };
      }
      // אחרי 30 יום - נעילה מלאה
      return {
        canView: false,
        canEdit: false,
        canUseAI: false,
        canExport: false,
        canInvite: false,
        banner: {
          type: 'error',
          message: 'הגישה למערכת נעולה. צור קשר עם התמיכה לשחזור נתונים.',
          action: { label: 'צור קשר', href: 'mailto:support@misrad-ai.com' }
        }
      };
      
    default:
      return { canView: false, canEdit: false, canUseAI: false, canExport: false, canInvite: false };
  }
}

/**
 * HOC לדפים - מעטפת כל דף שצריך הרשאות
 * Usage: withEntitlements(MyPageComponent)
 */
export function withEntitlements<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function ProtectedComponent(props: P) {
    const entitlements = useEntitlements(); // hook שמושך מהקונטקסט
    
    if (!entitlements.canView) {
      redirect('/app/trial-expired');
    }
    
    return (
      <>
        {entitlements.banner && <EntitlementBanner {...entitlements.banner} />}
        <Component {...props} readOnly={!entitlements.canEdit} />
      </>
    );
  };
}
