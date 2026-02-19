/**
 * MISRAD AI — Email Assets Configuration
 * Centralized image/asset URLs used across all emails.
 *
 * Priority order (highest wins):
 *   1. DB overrides (set from Admin Panel → global/email-assets)
 *   2. Environment variables (EMAIL_ASSET_*)
 *   3. Default URLs (/public/email/*)
 *
 * Convention: Each key maps to a public URL.
 */

import { getBaseUrl } from '@/lib/utils';

function base(): string {
    try {
        return getBaseUrl();
    } catch {
        return 'https://misrad-ai.com';
    }
}

// ─── DB cache (module-level singleton) ─────────────────────────────
let _dbOverrides: Record<string, string> = {};
let _dbCacheTimestamp = 0;
const DB_CACHE_TTL_MS = 120_000; // 2 minutes

function dbVal(key: string): string | undefined {
    return _dbOverrides[key] || undefined;
}

/**
 * Warm the in-memory cache from DB.
 * Called automatically before email sends and by the admin page.
 * Uses a 2-minute TTL to avoid excessive DB reads.
 */
export async function ensureEmailAssetsCacheWarm(): Promise<void> {
    if (Object.keys(_dbOverrides).length > 0 && Date.now() - _dbCacheTimestamp < DB_CACHE_TTL_MS) {
        return;
    }
    try {
        const { getEmailAssetsFromDB } = await import('@/lib/server/emailAssetsStore');
        _dbOverrides = await getEmailAssetsFromDB();
        _dbCacheTimestamp = Date.now();
    } catch {
        // Silently fallback — DB might not be available
    }
}

/**
 * Force-invalidate the cache (called after admin saves).
 */
export function invalidateEmailAssetsCache(): void {
    _dbOverrides = {};
    _dbCacheTimestamp = 0;
}

/** All email image assets — DB overrides > env vars > defaults */
export function getEmailAssets() {
    const b = base();

    return {
        // ─── Brand ──────────────────────────────────────────────────
        logo: dbVal('logo') || process.env.EMAIL_ASSET_LOGO || `${b}/icons/misrad-icon-192.png`,
        logoDark: dbVal('logoDark') || process.env.EMAIL_ASSET_LOGO_DARK || `${b}/icons/misrad-icon-192.png`,
        logoWide: dbVal('logoWide') || process.env.EMAIL_ASSET_LOGO_WIDE || `${b}/email/logo-wide.png`,

        // ─── Founder ────────────────────────────────────────────────
        founderPhoto: dbVal('founderPhoto') || process.env.EMAIL_ASSET_FOUNDER_PHOTO || `${b}/email/founder-itsik.jpg`,
        founderName: dbVal('founderName') || process.env.MISRAD_FOUNDER_NAME || 'איציק דהן',
        founderTitle: dbVal('founderTitle') || 'מייסד ומנכ"ל, MISRAD AI',
        founderSignature: dbVal('founderSignature') || process.env.MISRAD_FOUNDER_NAME || 'איציק',

        // ─── Welcome / Onboarding ───────────────────────────────────
        welcomeHero: dbVal('welcomeHero') || process.env.EMAIL_ASSET_WELCOME_HERO || `${b}/email/welcome-hero.png`,
        welcomeDashboardScreenshot: dbVal('welcomeDashboardScreenshot') || process.env.EMAIL_ASSET_WELCOME_DASHBOARD || `${b}/email/dashboard-preview.png`,
        onboardingStep1: dbVal('onboardingStep1') || process.env.EMAIL_ASSET_ONBOARD_STEP1 || `${b}/email/onboard-step1.png`,
        onboardingStep2: dbVal('onboardingStep2') || process.env.EMAIL_ASSET_ONBOARD_STEP2 || `${b}/email/onboard-step2.png`,
        onboardingStep3: dbVal('onboardingStep3') || process.env.EMAIL_ASSET_ONBOARD_STEP3 || `${b}/email/onboard-step3.png`,

        // ─── Features / Product ─────────────────────────────────────
        featureHero: dbVal('featureHero') || process.env.EMAIL_ASSET_FEATURE_HERO || `${b}/email/feature-hero.png`,
        featureScreenshot: dbVal('featureScreenshot') || process.env.EMAIL_ASSET_FEATURE_SCREENSHOT || `${b}/email/feature-screenshot.png`,
        aiModuleScreenshot: dbVal('aiModuleScreenshot') || process.env.EMAIL_ASSET_AI_MODULE || `${b}/email/ai-module.png`,
        nexusScreenshot: dbVal('nexusScreenshot') || process.env.EMAIL_ASSET_NEXUS || `${b}/email/nexus-preview.png`,
        systemScreenshot: dbVal('systemScreenshot') || process.env.EMAIL_ASSET_SYSTEM || `${b}/email/system-preview.png`,
        financeScreenshot: dbVal('financeScreenshot') || process.env.EMAIL_ASSET_FINANCE || `${b}/email/finance-preview.png`,
        socialScreenshot: dbVal('socialScreenshot') || process.env.EMAIL_ASSET_SOCIAL || `${b}/email/social-preview.png`,

        // ─── Reports ────────────────────────────────────────────────
        weeklyReportChart: dbVal('weeklyReportChart') || process.env.EMAIL_ASSET_WEEKLY_CHART || `${b}/email/weekly-chart.png`,
        monthlyReportChart: dbVal('monthlyReportChart') || process.env.EMAIL_ASSET_MONTHLY_CHART || `${b}/email/monthly-chart.png`,

        // ─── Marketing ──────────────────────────────────────────────
        newsletterBanner: dbVal('newsletterBanner') || process.env.EMAIL_ASSET_NEWSLETTER_BANNER || `${b}/email/newsletter-banner.png`,
        webinarBanner: dbVal('webinarBanner') || process.env.EMAIL_ASSET_WEBINAR_BANNER || `${b}/email/webinar-banner.png`,
        specialOfferBanner: dbVal('specialOfferBanner') || process.env.EMAIL_ASSET_OFFER_BANNER || `${b}/email/special-offer.png`,
        reengagementHero: dbVal('reengagementHero') || process.env.EMAIL_ASSET_REENGAGEMENT || `${b}/email/miss-you.png`,
        winbackHero: dbVal('winbackHero') || process.env.EMAIL_ASSET_WINBACK || `${b}/email/winback-hero.png`,

        // ─── Version Update ─────────────────────────────────────────
        versionHero: dbVal('versionHero') || process.env.EMAIL_ASSET_VERSION_HERO || `${b}/email/version-update.png`,

        // ─── Testimonial / Social Proof ─────────────────────────────
        testimonial1Photo: dbVal('testimonial1Photo') || process.env.EMAIL_ASSET_TESTIMONIAL1_PHOTO || `${b}/email/testimonial-1.jpg`,
        testimonial1Name: dbVal('testimonial1Name') || 'יוסי כהן',
        testimonial1Title: dbVal('testimonial1Title') || 'מנהל פרויקטים, חברת אלפא',
        testimonial1Quote: dbVal('testimonial1Quote') || 'מאז שהתחלנו להשתמש ב-MISRAD AI, החסכנו 15 שעות בשבוע על ניהול. המערכת פשוט עושה הכל.',

        // ─── Video Demos ────────────────────────────────────────────
        demoVideoThumbnail: dbVal('demoVideoThumbnail') || process.env.EMAIL_ASSET_DEMO_THUMB || `${b}/email/demo-thumbnail.png`,
        demoVideoUrl: dbVal('demoVideoUrl') || process.env.EMAIL_ASSET_DEMO_URL || 'https://youtube.com/@misrad-ai',
        quickStartVideoThumbnail: dbVal('quickStartVideoThumbnail') || process.env.EMAIL_ASSET_QUICKSTART_THUMB || `${b}/email/quickstart-thumb.png`,
        quickStartVideoUrl: dbVal('quickStartVideoUrl') || process.env.EMAIL_ASSET_QUICKSTART_URL || 'https://youtube.com/@misrad-ai',

        // ─── Billing ────────────────────────────────────────────────
        paymentSuccessIcon: dbVal('paymentSuccessIcon') || `${b}/email/payment-success.png`,
        paymentFailedIcon: dbVal('paymentFailedIcon') || `${b}/email/payment-failed.png`,

        // ─── Misc ───────────────────────────────────────────────────
        confetti: dbVal('confetti') || `${b}/email/confetti.png`,
        heartEmoji: dbVal('heartEmoji') || `${b}/email/heart.png`,
        rocketEmoji: dbVal('rocketEmoji') || `${b}/email/rocket.png`,
    };
}

export type EmailAssets = ReturnType<typeof getEmailAssets>;

/** All asset keys with Hebrew labels for the admin UI */
export const EMAIL_ASSET_LABELS: Record<string, { label: string; category: string; hint?: string }> = {
    // Brand
    logo: { label: 'לוגו ראשי', category: 'מותג', hint: '192×192 px' },
    logoDark: { label: 'לוגו כהה', category: 'מותג', hint: '192×192 px' },
    logoWide: { label: 'לוגו רחב', category: 'מותג', hint: '400×80 px' },
    // Founder
    founderPhoto: { label: 'תמונת מייסד', category: 'מייסד', hint: '200×200 px, עגולה' },
    founderName: { label: 'שם מייסד', category: 'מייסד' },
    founderTitle: { label: 'תפקיד מייסד', category: 'מייסד' },
    founderSignature: { label: 'חתימה (שם קצר)', category: 'מייסד' },
    // Welcome
    welcomeHero: { label: 'באנר קבלת פנים', category: 'קבלת פנים', hint: '1080×540 px' },
    welcomeDashboardScreenshot: { label: 'צילום דשבורד', category: 'קבלת פנים', hint: '1080×600 px' },
    onboardingStep1: { label: 'שלב 1 — הקמת ארגון', category: 'קבלת פנים', hint: '540×300 px' },
    onboardingStep2: { label: 'שלב 2 — הזמנת צוות', category: 'קבלת פנים', hint: '540×300 px' },
    onboardingStep3: { label: 'שלב 3 — התחלת עבודה', category: 'קבלת פנים', hint: '540×300 px' },
    // Features
    featureHero: { label: 'באנר תכונות', category: 'מוצר', hint: '1080×540 px' },
    featureScreenshot: { label: 'צילום מסך תכונה', category: 'מוצר', hint: '1080×600 px' },
    aiModuleScreenshot: { label: 'מודול AI', category: 'מוצר', hint: '540×300 px' },
    nexusScreenshot: { label: 'מודול Nexus', category: 'מוצר', hint: '540×300 px' },
    systemScreenshot: { label: 'מודול System', category: 'מוצר', hint: '540×300 px' },
    financeScreenshot: { label: 'מודול Finance', category: 'מוצר', hint: '540×300 px' },
    socialScreenshot: { label: 'מודול Social', category: 'מוצר', hint: '540×300 px' },
    // Reports
    weeklyReportChart: { label: 'גרף שבועי', category: 'דוחות', hint: '1080×400 px' },
    monthlyReportChart: { label: 'גרף חודשי', category: 'דוחות', hint: '1080×400 px' },
    // Marketing
    newsletterBanner: { label: 'באנר ניוזלטר', category: 'שיווק', hint: '1080×400 px' },
    webinarBanner: { label: 'באנר וובינר', category: 'שיווק', hint: '1080×540 px' },
    specialOfferBanner: { label: 'באנר מבצע', category: 'שיווק', hint: '1080×540 px' },
    reengagementHero: { label: 'באנר חזרה', category: 'שיווק', hint: '1080×400 px' },
    winbackHero: { label: 'באנר Win-back', category: 'שיווק', hint: '1080×540 px' },
    // Version
    versionHero: { label: 'באנר עדכון גרסה', category: 'גרסאות', hint: '1080×540 px' },
    // Testimonials
    testimonial1Photo: { label: 'תמונת ממליץ', category: 'המלצות', hint: '200×200 px' },
    testimonial1Name: { label: 'שם ממליץ', category: 'המלצות' },
    testimonial1Title: { label: 'תפקיד ממליץ', category: 'המלצות' },
    testimonial1Quote: { label: 'ציטוט המלצה', category: 'המלצות' },
    // Videos
    demoVideoThumbnail: { label: 'תמונת סרטון דמו', category: 'סרטונים', hint: '1080×600 px' },
    demoVideoUrl: { label: 'קישור סרטון דמו', category: 'סרטונים' },
    quickStartVideoThumbnail: { label: 'תמונת Quick Start', category: 'סרטונים', hint: '1080×600 px' },
    quickStartVideoUrl: { label: 'קישור Quick Start', category: 'סרטונים' },
    // Billing
    paymentSuccessIcon: { label: 'אייקון תשלום הצליח', category: 'חיוב', hint: '200×200 px' },
    paymentFailedIcon: { label: 'אייקון תשלום נכשל', category: 'חיוב', hint: '200×200 px' },
    // Misc
    confetti: { label: 'קונפטי', category: 'כללי', hint: '200×200 px' },
    heartEmoji: { label: 'לב', category: 'כללי', hint: '200×200 px' },
    rocketEmoji: { label: 'רקטה', category: 'כללי', hint: '200×200 px' },
};
