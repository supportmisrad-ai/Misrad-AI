/**
 * MISRAD AI — Email Registry
 * Central catalog of ALL email types with categories, sender addresses,
 * unsubscribe policies, and notification preference keys.
 *
 * Every email the system sends MUST be registered here.
 */

// ─── Email Categories ───────────────────────────────────────────────
export type EmailCategory =
    | 'transactional'   // OTP, password reset, magic links, security alerts — NEVER blockable
    | 'onboarding'      // Welcome, first steps, founder message — can be muted after 30d
    | 'team'            // Invitations, role changes, employee add/remove
    | 'organization'    // Org created/closed/reactivated, settings changes
    | 'billing'         // Invoices, receipts, payment failures, card expiry, plan changes
    | 'support'         // Ticket received, reply, satisfaction survey
    | 'system'          // Alerts, reports, token usage, maintenance, version updates
    | 'marketing';      // Newsletter, webinars, features, product updates — MUST have unsubscribe

// ─── Sender Addresses ───────────────────────────────────────────────
// Each category maps to a dedicated "from" address for reputation isolation.
// Transactional and billing go through the reliable transactional pipe.
// Marketing goes through a separate pipe to protect transactional deliverability.
export const EMAIL_SENDERS = {
    transactional: {
        address: 'no-reply@misrad-ai.com',
        name: 'MISRAD AI',
        description: 'אימותים, סיסמאות, אבטחה — לא חוזרים אליה',
    },
    onboarding: {
        address: 'hello@misrad-ai.com',
        name: 'MISRAD AI',
        description: 'ברוכים הבאים, הדרכות, הודעה מהמייסד',
    },
    team: {
        address: 'team@misrad-ai.com',
        name: 'MISRAD AI — צוות',
        description: 'הזמנות צוות, שינויי הרשאות',
    },
    organization: {
        address: 'notifications@misrad-ai.com',
        name: 'MISRAD AI',
        description: 'פתיחת/סגירת ארגון, עדכוני הגדרות',
    },
    billing: {
        address: 'billing@misrad-ai.com',
        name: 'MISRAD AI — חשבונות',
        description: 'חשבוניות, קבלות, כשלונות תשלום',
    },
    support: {
        address: 'support@misrad-ai.com',
        name: 'MISRAD AI — תמיכה',
        description: 'קריאות שירות, מענה, סקרים',
    },
    system: {
        address: 'notifications@misrad-ai.com',
        name: 'MISRAD AI — מערכת',
        description: 'דוחות, התראות, תחזוקה',
    },
    marketing: {
        address: 'news@misrad-ai.com',
        name: 'MISRAD AI',
        description: 'ניוזלטר, וובינרים, פיצ\'רים חדשים — ניתן לביטול',
    },
    founder: {
        address: 'itsik@misrad-ai.com',
        name: 'איציק דהן — MISRAD AI',
        description: 'הודעות אישיות מהמייסד',
    },
    customer_service: {
        address: 'itzhak@misrad-ai.com',
        name: 'MISRAD AI שירות לקוחות',
        description: 'שירות לקוחות — מענה אישי',
    },
    info: {
        address: 'info@misrad-ai.com',
        name: 'MISRAD AI מידע',
        description: 'מידע כללי ופניות',
    },
    everybody: {
        address: 'everybody@misrad-ai.com',
        name: 'Misrad-ai כולם',
        description: 'הודעות כלליות לכולם',
    },
    newsletter: {
        address: 'newsletter@misrad-ai.com',
        name: 'newsletter ניוזלטר',
        description: 'ניוזלטר תקופתי',
    },
    tips: {
        address: 'tips@misrad-ai.com',
        name: 'tips טיפים',
        description: 'טיפים ומדריכים',
    },
} as const;

export type SenderKey = keyof typeof EMAIL_SENDERS;

// ─── Email Type Definition ──────────────────────────────────────────
export interface EmailTypeDefinition {
    /** Unique slug — used as DB key and in notification preferences */
    id: string;
    /** Hebrew display name for admin panel */
    label: string;
    /** Category determines sender address, unsubscribe rules, routing */
    category: EmailCategory;
    /** Override sender key (defaults to category) */
    senderKey?: SenderKey;
    /** Who receives this email */
    audience: 'user' | 'admin' | 'owner' | 'billing_contact' | 'all_team';
    /** Can user unsubscribe from this email? */
    canUnsubscribe: boolean;
    /** Notification preference key stored in Profile.notificationPreferences */
    preferenceKey: string;
    /** Short description for settings UI */
    description: string;
    /** Whether this email exists and is implemented */
    implemented: boolean;
    /** Trigger description */
    trigger: string;
}

// ─── Master Email Catalog ───────────────────────────────────────────
export const EMAIL_CATALOG: EmailTypeDefinition[] = [
    // ══════════════════════════════════════════════════════════════════
    // TRANSACTIONAL — Cannot be unsubscribed
    // ══════════════════════════════════════════════════════════════════
    {
        id: 'auth_verification',
        label: 'אימות כתובת מייל',
        category: 'transactional',
        audience: 'user',
        canUnsubscribe: false,
        preferenceKey: 'auth_verification',
        description: 'קוד אימות OTP בעת הרשמה או התחברות',
        implemented: true, // Handled by Clerk
        trigger: 'הרשמה / התחברות',
    },
    {
        id: 'auth_password_reset',
        label: 'איפוס סיסמה',
        category: 'transactional',
        audience: 'user',
        canUnsubscribe: false,
        preferenceKey: 'auth_password_reset',
        description: 'קישור לאיפוס סיסמה',
        implemented: true, // Handled by Clerk
        trigger: 'בקשת איפוס סיסמה',
    },
    {
        id: 'auth_magic_link',
        label: 'קישור כניסה',
        category: 'transactional',
        audience: 'user',
        canUnsubscribe: false,
        preferenceKey: 'auth_magic_link',
        description: 'קישור חד-פעמי לכניסה מהירה',
        implemented: true, // Handled by Clerk
        trigger: 'בקשת Magic Link',
    },
    {
        id: 'security_new_device',
        label: 'התראת התקן חדש',
        category: 'transactional',
        audience: 'user',
        canUnsubscribe: false,
        preferenceKey: 'security_new_device',
        description: 'זוהתה כניסה ממכשיר חדש',
        implemented: false,
        trigger: 'כניסה ממכשיר/IP חדש',
    },
    {
        id: 'security_password_changed',
        label: 'סיסמה שונתה',
        category: 'transactional',
        audience: 'user',
        canUnsubscribe: false,
        preferenceKey: 'security_password_changed',
        description: 'אישור שינוי סיסמה',
        implemented: false,
        trigger: 'שינוי סיסמה מוצלח',
    },
    {
        id: 'security_email_changed',
        label: 'כתובת מייל שונתה',
        category: 'transactional',
        audience: 'user',
        canUnsubscribe: false,
        preferenceKey: 'security_email_changed',
        description: 'אישור שינוי כתובת מייל',
        implemented: false,
        trigger: 'שינוי מייל מוצלח',
    },

    // ══════════════════════════════════════════════════════════════════
    // ONBOARDING — Can be muted after initial period
    // ══════════════════════════════════════════════════════════════════
    {
        id: 'onboarding_welcome',
        label: 'ברוכים הבאים ל-MISRAD',
        category: 'onboarding',
        audience: 'owner',
        canUnsubscribe: false,
        preferenceKey: 'onboarding_welcome',
        description: 'מייל ברוכים הבאים עם משאבים להתחלה מהירה',
        implemented: true,
        trigger: 'יצירת חשבון חדש',
    },
    {
        id: 'onboarding_founder_message',
        label: 'הודעה אישית מהמייסד',
        category: 'onboarding',
        senderKey: 'founder',
        audience: 'owner',
        canUnsubscribe: false,
        preferenceKey: 'onboarding_founder_message',
        description: 'הודעה אישית מאיציק דהן, מייסד MISRAD',
        implemented: true,
        trigger: 'הרשמה ראשונה (first customer)',
    },
    {
        id: 'onboarding_org_ready',
        label: 'הארגון מוכן לפעולה',
        category: 'onboarding',
        audience: 'owner',
        canUnsubscribe: false,
        preferenceKey: 'onboarding_org_ready',
        description: 'אישור שהארגון הוקם בהצלחה + צעדים ראשונים',
        implemented: true,
        trigger: 'יצירת ארגון חדש',
    },
    {
        id: 'onboarding_day2_checkin',
        label: 'בדיקה — יומיים',
        category: 'onboarding',
        senderKey: 'founder',
        audience: 'owner',
        canUnsubscribe: true,
        preferenceKey: 'onboarding_tips',
        description: 'מייל אישי מהמייסד — האם הכל בסדר? צריך עזרה? + פרטי קשר תמיכה',
        implemented: true,
        trigger: 'Cron — 2 ימים אחרי יצירת ארגון',
    },
    {
        id: 'onboarding_day7_checkin',
        label: 'בדיקת שביעות רצון — שבוע',
        category: 'onboarding',
        senderKey: 'founder',
        audience: 'owner',
        canUnsubscribe: true,
        preferenceKey: 'onboarding_tips',
        description: 'מייל ידידותי — מסתדרים? טיפים לשימוש יעיל + קישור לתמיכה',
        implemented: true,
        trigger: 'Cron — 7 ימים אחרי יצירת ארגון',
    },
    {
        id: 'onboarding_day45_feedback',
        label: 'בקשת משוב — 45 יום',
        category: 'onboarding',
        senderKey: 'founder',
        audience: 'owner',
        canUnsubscribe: true,
        preferenceKey: 'onboarding_tips',
        description: 'בקשת פידבק כנה לאחר חודש וחצי + אפשרות לדרג + קישור לגוגל',
        implemented: true,
        trigger: 'Cron — 45 ימים אחרי יצירת ארגון',
    },
    {
        id: 'onboarding_abandoned_signup',
        label: 'מעקב אחרי הרשמה ללא מנוי',
        category: 'onboarding',
        senderKey: 'founder',
        audience: 'owner',
        canUnsubscribe: true,
        preferenceKey: 'onboarding_tips',
        description: 'תזכורת ידידותית מהמייסד — נרשמת אבל לא התחלת',
        implemented: true,
        trigger: 'Cron — 24h אחרי הרשמה ללא מנוי פעיל',
    },

    // ══════════════════════════════════════════════════════════════════
    // TEAM — Invitations and changes
    // ══════════════════════════════════════════════════════════════════
    {
        id: 'team_invitation',
        label: 'הזמנה לצוות',
        category: 'team',
        audience: 'user',
        canUnsubscribe: false,
        preferenceKey: 'team_invitation',
        description: 'הזמנה להצטרף לצוות בתפקיד מסוים',
        implemented: true,
        trigger: 'Admin שולח הזמנה מהפאנל',
    },
    {
        id: 'team_employee_invitation',
        label: 'הזמנת עובד',
        category: 'team',
        audience: 'user',
        canUnsubscribe: false,
        preferenceKey: 'team_employee_invitation',
        description: 'הזמנה להצטרף כעובד עם מחלקה ותפקיד',
        implemented: true,
        trigger: 'יצירת הזמנת עובד בפאנל Nexus',
    },
    {
        id: 'team_member_added',
        label: 'חבר צוות חדש הצטרף',
        category: 'team',
        audience: 'owner',
        canUnsubscribe: true,
        preferenceKey: 'team_updates',
        description: 'התראה לבעלים שעובד חדש הצטרף לארגון',
        implemented: false,
        trigger: 'עובד מאשר הזמנה ומצטרף',
    },
    {
        id: 'team_member_removed',
        label: 'עובד הוסר מהצוות',
        category: 'team',
        audience: 'user',
        canUnsubscribe: false,
        preferenceKey: 'team_member_removed',
        description: 'הודעה לעובד שהוסר מהארגון',
        implemented: false,
        trigger: 'Admin מסיר עובד',
    },
    {
        id: 'team_role_changed',
        label: 'שינוי תפקיד/הרשאות',
        category: 'team',
        audience: 'user',
        canUnsubscribe: false,
        preferenceKey: 'team_role_changed',
        description: 'הודעה על שינוי תפקיד או הרשאות',
        implemented: false,
        trigger: 'Admin משנה תפקיד/מודולים',
    },

    // ══════════════════════════════════════════════════════════════════
    // ORGANIZATION — Lifecycle events
    // ══════════════════════════════════════════════════════════════════
    {
        id: 'org_created',
        label: 'ארגון נוצר',
        category: 'organization',
        audience: 'admin',
        canUnsubscribe: true,
        preferenceKey: 'org_lifecycle',
        description: 'התראת אדמין — ארגון חדש נפתח במערכת',
        implemented: false,
        trigger: 'יצירת ארגון חדש (Webhook Clerk user.created)',
    },
    {
        id: 'org_closed',
        label: 'ארגון נסגר',
        category: 'organization',
        audience: 'owner',
        canUnsubscribe: false,
        preferenceKey: 'org_closed',
        description: 'אישור סגירת ארגון + מידע על שמירת נתונים',
        implemented: false,
        trigger: 'ביטול/סגירת ארגון',
    },
    {
        id: 'org_reactivated',
        label: 'ארגון הופעל מחדש',
        category: 'organization',
        audience: 'owner',
        canUnsubscribe: false,
        preferenceKey: 'org_reactivated',
        description: 'ארגון הופעל מחדש לאחר סגירה/ביטול',
        implemented: false,
        trigger: 'חידוש מנוי/הפעלה מחדש',
    },
    {
        id: 'org_settings_changed',
        label: 'שינוי הגדרות ארגון',
        category: 'organization',
        audience: 'owner',
        canUnsubscribe: true,
        preferenceKey: 'org_lifecycle',
        description: 'התראה על שינוי הגדרות קריטיות (מודולים, מושבים)',
        implemented: false,
        trigger: 'שינוי הגדרות ארגון',
    },
    {
        id: 'org_tenant_invitation',
        label: 'הזמנה להקמת עסק',
        category: 'organization',
        audience: 'user',
        canUnsubscribe: false,
        preferenceKey: 'org_tenant_invitation',
        description: 'הזמנה עם קישור להקמת עסק חדש במערכת',
        implemented: true,
        trigger: 'Admin יוצר tenant חדש',
    },

    // ══════════════════════════════════════════════════════════════════
    // BILLING — Financial emails
    // ══════════════════════════════════════════════════════════════════
    {
        id: 'billing_invoice_sent',
        label: 'חשבונית נשלחה',
        category: 'billing',
        audience: 'billing_contact',
        canUnsubscribe: false,
        preferenceKey: 'billing_invoices',
        description: 'חשבונית חדשה עם קישור לתשלום',
        implemented: false,
        trigger: 'יצירת חשבונית ב-Morning',
    },
    {
        id: 'billing_payment_success',
        label: 'תשלום התקבל',
        category: 'billing',
        audience: 'billing_contact',
        canUnsubscribe: false,
        preferenceKey: 'billing_invoices',
        description: 'אישור קבלת תשלום + קבלה',
        implemented: false,
        trigger: 'Webhook — payment.successful',
    },
    {
        id: 'billing_payment_failed',
        label: 'כשלון תשלום',
        category: 'billing',
        audience: 'billing_contact',
        canUnsubscribe: false,
        preferenceKey: 'billing_payment_failed',
        description: 'התראה שהתשלום נכשל + קישור לעדכון אמצעי תשלום',
        implemented: false,
        trigger: 'Webhook — payment.failed',
    },
    {
        id: 'billing_payment_failed_reminder',
        label: 'תזכורת כשלון תשלום',
        category: 'billing',
        audience: 'billing_contact',
        canUnsubscribe: false,
        preferenceKey: 'billing_payment_failed',
        description: 'תזכורת נוספת — 3/7 ימים לאחר כשלון',
        implemented: false,
        trigger: 'Cron — 3/7 ימים אחרי כשלון',
    },
    {
        id: 'billing_plan_changed',
        label: 'שינוי חבילה',
        category: 'billing',
        audience: 'owner',
        canUnsubscribe: false,
        preferenceKey: 'billing_plan_changed',
        description: 'אישור שדרוג/שנמוך חבילה + פירוט שינויים',
        implemented: false,
        trigger: 'שינוי חבילה מוצלח',
    },
    {
        id: 'billing_trial_expiry_warning',
        label: 'תקופת ניסיון מסתיימת',
        category: 'billing',
        audience: 'owner',
        canUnsubscribe: false,
        preferenceKey: 'billing_trial',
        description: 'אזהרה 7/3/1 ימים לפני סיום הניסיון',
        implemented: true,
        trigger: 'Cron — 7/3/1 ימים לפני סיום',
    },
    {
        id: 'billing_trial_expired',
        label: 'תקופת ניסיון הסתיימה',
        category: 'billing',
        audience: 'owner',
        canUnsubscribe: false,
        preferenceKey: 'billing_trial',
        description: 'הניסיון הסתיים — הגישה נחסמת',
        implemented: true,
        trigger: 'Cron — trial_end_date עבר',
    },
    {
        id: 'billing_subscription_cancelled',
        label: 'מנוי בוטל',
        category: 'billing',
        audience: 'owner',
        canUnsubscribe: false,
        preferenceKey: 'billing_subscription_cancelled',
        description: 'אישור ביטול מנוי + מתי הגישה תיפסק',
        implemented: false,
        trigger: 'ביטול מנוי',
    },
    {
        id: 'billing_receipt',
        label: 'קבלה',
        category: 'billing',
        audience: 'billing_contact',
        canUnsubscribe: false,
        preferenceKey: 'billing_invoices',
        description: 'קבלה דיגיטלית לאחר תשלום מוצלח',
        implemented: false,
        trigger: 'תשלום מוצלח',
    },

    // ══════════════════════════════════════════════════════════════════
    // SUPPORT — Tickets & satisfaction
    // ══════════════════════════════════════════════════════════════════
    {
        id: 'support_ticket_received',
        label: 'דיווח תקלה התקבל',
        category: 'support',
        audience: 'user',
        canUnsubscribe: false,
        preferenceKey: 'support_tickets',
        description: 'אישור שהדיווח התקבל + מספר קריאה',
        implemented: true,
        trigger: 'פתיחת קריאת שירות',
    },
    {
        id: 'support_ticket_reply',
        label: 'עדכון לקריאת שירות',
        category: 'support',
        audience: 'user',
        canUnsubscribe: false,
        preferenceKey: 'support_tickets',
        description: 'תגובה חדשה מצוות התמיכה',
        implemented: true,
        trigger: 'Admin משיב לקריאה',
    },
    {
        id: 'support_ticket_admin_notification',
        label: 'התראת אדמין — קריאה חדשה',
        category: 'support',
        audience: 'admin',
        canUnsubscribe: true,
        preferenceKey: 'support_admin_notifications',
        description: 'התראה לאדמין על קריאה חדשה',
        implemented: true,
        trigger: 'פתיחת קריאת שירות',
    },
    {
        id: 'support_ticket_resolved',
        label: 'קריאה נסגרה',
        category: 'support',
        audience: 'user',
        canUnsubscribe: false,
        preferenceKey: 'support_tickets',
        description: 'הודעה שהקריאה טופלה ונסגרה',
        implemented: false,
        trigger: 'סגירת קריאה',
    },
    {
        id: 'support_satisfaction_survey',
        label: 'סקר שביעות רצון',
        category: 'support',
        audience: 'user',
        canUnsubscribe: true,
        preferenceKey: 'support_surveys',
        description: 'סקר NPS קצר לאחר סגירת קריאה',
        implemented: false,
        trigger: '24h אחרי סגירת קריאה',
    },

    // ══════════════════════════════════════════════════════════════════
    // CONTACT — Public contact form
    // ══════════════════════════════════════════════════════════════════
    {
        id: 'contact_form_received',
        label: 'פנייה מטופס צור קשר התקבלה',
        category: 'transactional',
        audience: 'user',
        canUnsubscribe: false,
        preferenceKey: 'contact_form',
        description: 'אישור אוטומטי שהפנייה מטופס צור קשר התקבלה',
        implemented: true,
        trigger: 'שליחת טופס צור קשר',
    },
    {
        id: 'contact_form_admin_notification',
        label: 'התראת אדמין — פנייה חדשה',
        category: 'transactional',
        audience: 'admin',
        canUnsubscribe: true,
        preferenceKey: 'contact_admin_notifications',
        description: 'התראה לאדמין על פנייה חדשה מטופס צור קשר',
        implemented: true,
        trigger: 'שליחת טופס צור קשר',
    },

    // ══════════════════════════════════════════════════════════════════
    // SYSTEM — Alerts, reports, maintenance
    // ══════════════════════════════════════════════════════════════════
    {
        id: 'system_weekly_report',
        label: 'דוח שבועי',
        category: 'system',
        audience: 'owner',
        canUnsubscribe: true,
        preferenceKey: 'system_reports',
        description: 'סיכום שבועי — פעילות, AI credits, צוות',
        implemented: false,
        trigger: 'Cron — ראשון בבוקר',
    },
    {
        id: 'system_monthly_report',
        label: 'דוח חודשי',
        category: 'system',
        audience: 'owner',
        canUnsubscribe: true,
        preferenceKey: 'system_reports',
        description: 'סיכום חודשי מפורט עם מגמות',
        implemented: false,
        trigger: 'Cron — 1 בחודש',
    },
    {
        id: 'system_ai_credits_low',
        label: 'קרדיטי AI נמוכים',
        category: 'system',
        audience: 'owner',
        canUnsubscribe: true,
        preferenceKey: 'system_alerts',
        description: 'חריגה מ-80% של מכסת טוקני AI',
        implemented: false,
        trigger: 'שימוש > 80% ממכסת AI',
    },
    {
        id: 'system_ai_credits_exhausted',
        label: 'קרדיטי AI נגמרו',
        category: 'system',
        audience: 'owner',
        canUnsubscribe: false,
        preferenceKey: 'system_ai_credits_exhausted',
        description: 'מכסת AI נגמרה — דרוש שדרוג',
        implemented: false,
        trigger: 'שימוש = 100% ממכסת AI',
    },
    {
        id: 'system_maintenance',
        label: 'תחזוקה מתוכננת',
        category: 'system',
        audience: 'all_team',
        canUnsubscribe: true,
        preferenceKey: 'system_maintenance',
        description: 'הודעה מקדימה על חלון תחזוקה',
        implemented: false,
        trigger: 'Admin מפרסם תחזוקה מתוכננת',
    },
    {
        id: 'system_version_update',
        label: 'עדכון גרסה קריטי',
        category: 'system',
        audience: 'owner',
        canUnsubscribe: true,
        preferenceKey: 'system_updates',
        description: 'עדכון גרסה חדש עם שינויים קריטיים',
        implemented: false,
        trigger: 'Admin מפרסם גרסה קריטית',
    },
    {
        id: 'attendance_monthly_report',
        label: 'דוח נוכחות חודשי',
        category: 'system',
        audience: 'user',
        canUnsubscribe: true,
        preferenceKey: 'system_reports',
        description: 'דוח נוכחות חודשי מפורט עם שעות נוספות — נשלח ב-1 לכל חודש',
        implemented: true,
        trigger: 'Cron — 1 בחודש',
    },
    {
        id: 'ai_monthly_report_ready',
        label: 'דוח AI חודשי מוכן',
        category: 'system',
        audience: 'admin',
        canUnsubscribe: true,
        preferenceKey: 'system_reports',
        description: 'התראה שהדוח החודשי של AI מוכן לצפייה במערכת',
        implemented: true,
        trigger: 'Cron — סוף כל חודש',
    },
    {
        id: 'system_admin_org_created',
        label: 'אדמין — ארגון חדש במערכת',
        category: 'system',
        audience: 'admin',
        canUnsubscribe: true,
        preferenceKey: 'system_admin_alerts',
        description: 'התראת Super Admin — ארגון חדש נוצר',
        implemented: false,
        trigger: 'יצירת ארגון חדש',
    },
    {
        id: 'system_admin_org_closed',
        label: 'אדמין — ארגון נסגר',
        category: 'system',
        audience: 'admin',
        canUnsubscribe: true,
        preferenceKey: 'system_admin_alerts',
        description: 'התראת Super Admin — ארגון נסגר',
        implemented: false,
        trigger: 'סגירת/ביטול ארגון',
    },

    // ══════════════════════════════════════════════════════════════════
    // MARKETING — Must have unsubscribe
    // ══════════════════════════════════════════════════════════════════
    {
        id: 'marketing_newsletter',
        label: 'ניוזלטר חודשי',
        category: 'marketing',
        audience: 'user',
        canUnsubscribe: true,
        preferenceKey: 'marketing_newsletter',
        description: 'עדכוני מוצר, טיפים, חדשות מהתעשייה',
        implemented: false,
        trigger: 'Admin שולח ניוזלטר מהפאנל',
    },
    {
        id: 'marketing_webinar',
        label: 'הזמנה לוובינר',
        category: 'marketing',
        audience: 'user',
        canUnsubscribe: true,
        preferenceKey: 'marketing_events',
        description: 'הזמנה לוובינר/אירוע מקצועי',
        implemented: false,
        trigger: 'Admin יוצר אירוע שיווקי',
    },
    {
        id: 'marketing_new_feature',
        label: 'פיצ\'ר חדש',
        category: 'marketing',
        audience: 'user',
        canUnsubscribe: true,
        preferenceKey: 'marketing_product_updates',
        description: 'הודעה על פיצ\'ר חדש שהושק',
        implemented: false,
        trigger: 'Admin מפרסם פיצ\'ר חדש',
    },
    {
        id: 'marketing_product_update',
        label: 'עדכון מוצר',
        category: 'marketing',
        audience: 'user',
        canUnsubscribe: true,
        preferenceKey: 'marketing_product_updates',
        description: 'סיכום עדכוני מוצר תקופתי',
        implemented: false,
        trigger: 'Admin מפרסם עדכון מוצר',
    },
    {
        id: 'marketing_special_offer',
        label: 'הצעה מיוחדת',
        category: 'marketing',
        audience: 'user',
        canUnsubscribe: true,
        preferenceKey: 'marketing_promotions',
        description: 'מבצעים, הנחות, הצעות מיוחדות',
        implemented: false,
        trigger: 'Admin יוצר קמפיין שיווקי',
    },
    {
        id: 'marketing_reengagement',
        label: 'חזרת משתמש לא פעיל',
        category: 'marketing',
        audience: 'user',
        canUnsubscribe: true,
        preferenceKey: 'marketing_reengagement',
        description: 'הודעה למשתמש שלא התחבר 30+ ימים',
        implemented: false,
        trigger: 'Cron — 30 ימים ללא כניסה',
    },
    {
        id: 'marketing_winback',
        label: 'Win-Back — חזרה ללקוח שביטל',
        category: 'marketing',
        audience: 'owner',
        canUnsubscribe: true,
        preferenceKey: 'marketing_reengagement',
        description: 'הצעה מיוחדת ללקוח שביטל מנוי',
        implemented: false,
        trigger: '30 ימים אחרי ביטול',
    },

    // ══════════════════════════════════════════════════════════════════
    // ADMIN — Internal notifications (Super Admin)
    // ══════════════════════════════════════════════════════════════════
    {
        id: 'admin_new_signup',
        label: 'אדמין — לקוח חדש נרשם',
        category: 'system',
        audience: 'admin',
        canUnsubscribe: true,
        preferenceKey: 'system_admin_alerts',
        description: 'התראת Super Admin — לקוח חדש נרשם למערכת',
        implemented: true,
        trigger: 'Webhook — user.created (Clerk)',
    },
    {
        id: 'admin_payment_received',
        label: 'אדמין — תשלום התקבל',
        category: 'system',
        audience: 'admin',
        canUnsubscribe: true,
        preferenceKey: 'system_admin_alerts',
        description: 'התראת Super Admin — לקוח שילם וממתין לאישור',
        implemented: true,
        trigger: 'הגשת הוכחת תשלום מלקוח',
    },

    // ══════════════════════════════════════════════════════════════════
    // RATING — Customer feedback & reviews
    // ══════════════════════════════════════════════════════════════════
    {
        id: 'rating_request',
        label: 'בקשת דירוג ומשוב',
        category: 'onboarding',
        senderKey: 'founder',
        audience: 'owner',
        canUnsubscribe: true,
        preferenceKey: 'onboarding_tips',
        description: 'בקשת דירוג פנימי + קישור לדירוג בגוגל — אחרי 45 יום',
        implemented: true,
        trigger: 'Cron — 45 ימים אחרי יצירת ארגון (ביחד עם onboarding_day45_feedback)',
    },
];

// ─── Helper Functions ───────────────────────────────────────────────

/** Get email definition by ID */
export function getEmailDefinition(id: string): EmailTypeDefinition | undefined {
    return EMAIL_CATALOG.find((e) => e.id === id);
}

/** Get all emails in a category */
export function getEmailsByCategory(category: EmailCategory): EmailTypeDefinition[] {
    return EMAIL_CATALOG.filter((e) => e.category === category);
}

/** Get sender config for a category (with optional override) */
export function getSenderForEmail(emailId: string): typeof EMAIL_SENDERS[SenderKey] {
    const def = getEmailDefinition(emailId);
    if (!def) return EMAIL_SENDERS.transactional;
    const key = def.senderKey || def.category;
    return EMAIL_SENDERS[key as SenderKey] || EMAIL_SENDERS.transactional;
}

/** Get all unique preference keys for settings UI */
export function getNotificationPreferenceGroups(): Array<{
    key: string;
    label: string;
    category: EmailCategory;
    canUnsubscribe: boolean;
    emailIds: string[];
}> {
    const map = new Map<string, {
        key: string;
        label: string;
        category: EmailCategory;
        canUnsubscribe: boolean;
        emailIds: string[];
    }>();

    for (const email of EMAIL_CATALOG) {
        if (!email.canUnsubscribe) continue;
        const existing = map.get(email.preferenceKey);
        if (existing) {
            existing.emailIds.push(email.id);
        } else {
            map.set(email.preferenceKey, {
                key: email.preferenceKey,
                label: email.label,
                category: email.category,
                canUnsubscribe: true,
                emailIds: [email.id],
            });
        }
    }

    return Array.from(map.values());
}

/** Get all implemented emails */
export function getImplementedEmails(): EmailTypeDefinition[] {
    return EMAIL_CATALOG.filter((e) => e.implemented);
}

/** Get all not-yet-implemented emails */
export function getUnimplementedEmails(): EmailTypeDefinition[] {
    return EMAIL_CATALOG.filter((e) => !e.implemented);
}

/** Check if a user has opted out of a specific email type via their preferences */
export function isEmailOptedOut(
    preferenceKey: string,
    notificationPreferences: Record<string, unknown>
): boolean {
    const value = notificationPreferences[preferenceKey];
    // Explicit false means opted out. undefined/true means opted in (default: in)
    return value === false;
}
