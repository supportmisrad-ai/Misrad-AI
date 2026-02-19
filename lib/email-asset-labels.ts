/** All asset keys with Hebrew labels for the admin UI — no imports, safe for client components */
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
