/**
 * MISRAD AI — Email Assets Configuration
 * Centralized image/asset URLs used across all emails.
 * Admin can override these via environment variables or future admin panel.
 *
 * Convention: Each key maps to a public URL.
 * Placeholder images use the app's own /public/icons/ or /public/email/ folder.
 */

import { getBaseUrl } from '@/lib/utils';

function base(): string {
    try {
        return getBaseUrl();
    } catch {
        return 'https://misrad-ai.com';
    }
}

/** All email image assets — override via env or admin panel */
export function getEmailAssets() {
    const b = base();

    return {
        // ─── Brand ──────────────────────────────────────────────────
        logo: process.env.EMAIL_ASSET_LOGO || `${b}/icons/misrad-icon-192.png`,
        logoDark: process.env.EMAIL_ASSET_LOGO_DARK || `${b}/icons/misrad-icon-192.png`,
        logoWide: process.env.EMAIL_ASSET_LOGO_WIDE || `${b}/email/logo-wide.png`,

        // ─── Founder ────────────────────────────────────────────────
        founderPhoto: process.env.EMAIL_ASSET_FOUNDER_PHOTO || `${b}/email/founder-itsik.jpg`,
        founderName: process.env.MISRAD_FOUNDER_NAME || 'איציק דהן',
        founderTitle: 'מייסד ומנכ"ל, MISRAD AI',
        founderSignature: process.env.MISRAD_FOUNDER_NAME || 'איציק',

        // ─── Welcome / Onboarding ───────────────────────────────────
        welcomeHero: process.env.EMAIL_ASSET_WELCOME_HERO || `${b}/email/welcome-hero.png`,
        welcomeDashboardScreenshot: process.env.EMAIL_ASSET_WELCOME_DASHBOARD || `${b}/email/dashboard-preview.png`,
        onboardingStep1: process.env.EMAIL_ASSET_ONBOARD_STEP1 || `${b}/email/onboard-step1.png`,
        onboardingStep2: process.env.EMAIL_ASSET_ONBOARD_STEP2 || `${b}/email/onboard-step2.png`,
        onboardingStep3: process.env.EMAIL_ASSET_ONBOARD_STEP3 || `${b}/email/onboard-step3.png`,

        // ─── Features / Product ─────────────────────────────────────
        featureHero: process.env.EMAIL_ASSET_FEATURE_HERO || `${b}/email/feature-hero.png`,
        featureScreenshot: process.env.EMAIL_ASSET_FEATURE_SCREENSHOT || `${b}/email/feature-screenshot.png`,
        aiModuleScreenshot: process.env.EMAIL_ASSET_AI_MODULE || `${b}/email/ai-module.png`,
        nexusScreenshot: process.env.EMAIL_ASSET_NEXUS || `${b}/email/nexus-preview.png`,
        systemScreenshot: process.env.EMAIL_ASSET_SYSTEM || `${b}/email/system-preview.png`,
        financeScreenshot: process.env.EMAIL_ASSET_FINANCE || `${b}/email/finance-preview.png`,
        socialScreenshot: process.env.EMAIL_ASSET_SOCIAL || `${b}/email/social-preview.png`,

        // ─── Reports ────────────────────────────────────────────────
        weeklyReportChart: process.env.EMAIL_ASSET_WEEKLY_CHART || `${b}/email/weekly-chart.png`,
        monthlyReportChart: process.env.EMAIL_ASSET_MONTHLY_CHART || `${b}/email/monthly-chart.png`,

        // ─── Marketing ──────────────────────────────────────────────
        newsletterBanner: process.env.EMAIL_ASSET_NEWSLETTER_BANNER || `${b}/email/newsletter-banner.png`,
        webinarBanner: process.env.EMAIL_ASSET_WEBINAR_BANNER || `${b}/email/webinar-banner.png`,
        specialOfferBanner: process.env.EMAIL_ASSET_OFFER_BANNER || `${b}/email/special-offer.png`,
        reengagementHero: process.env.EMAIL_ASSET_REENGAGEMENT || `${b}/email/miss-you.png`,
        winbackHero: process.env.EMAIL_ASSET_WINBACK || `${b}/email/winback-hero.png`,

        // ─── Version Update ─────────────────────────────────────────
        versionHero: process.env.EMAIL_ASSET_VERSION_HERO || `${b}/email/version-update.png`,

        // ─── Testimonial / Social Proof ─────────────────────────────
        testimonial1Photo: process.env.EMAIL_ASSET_TESTIMONIAL1_PHOTO || `${b}/email/testimonial-1.jpg`,
        testimonial1Name: 'יוסי כהן',
        testimonial1Title: 'מנהל פרויקטים, חברת אלפא',
        testimonial1Quote: 'מאז שהתחלנו להשתמש ב-MISRAD AI, החסכנו 15 שעות בשבוע על ניהול. המערכת פשוט עושה הכל.',

        // ─── Video Demos ────────────────────────────────────────────
        demoVideoThumbnail: process.env.EMAIL_ASSET_DEMO_THUMB || `${b}/email/demo-thumbnail.png`,
        demoVideoUrl: process.env.EMAIL_ASSET_DEMO_URL || 'https://youtube.com/@misrad-ai',
        quickStartVideoThumbnail: process.env.EMAIL_ASSET_QUICKSTART_THUMB || `${b}/email/quickstart-thumb.png`,
        quickStartVideoUrl: process.env.EMAIL_ASSET_QUICKSTART_URL || 'https://youtube.com/@misrad-ai',

        // ─── Billing ────────────────────────────────────────────────
        paymentSuccessIcon: `${b}/email/payment-success.png`,
        paymentFailedIcon: `${b}/email/payment-failed.png`,

        // ─── Misc ───────────────────────────────────────────────────
        confetti: `${b}/email/confetti.png`,
        heartEmoji: `${b}/email/heart.png`,
        rocketEmoji: `${b}/email/rocket.png`,
    };
}

export type EmailAssets = ReturnType<typeof getEmailAssets>;
