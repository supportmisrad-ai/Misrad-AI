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

export { EMAIL_ASSET_LABELS } from '@/lib/email-asset-labels';

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
        founderPhoto: dbVal('founderPhoto') || process.env.EMAIL_ASSET_FOUNDER_PHOTO || `${b}/icons/misrad-icon-192.png`,
        founderName: dbVal('founderName') || process.env.MISRAD_FOUNDER_NAME || 'איציק דהן',
        founderTitle: dbVal('founderTitle') || 'מייסד ומנכ"ל, MISRAD AI',
        founderSignature: dbVal('founderSignature') || process.env.MISRAD_FOUNDER_FIRST_NAME || (process.env.MISRAD_FOUNDER_NAME?.split(' ')[0] ?? 'איציק'),

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

