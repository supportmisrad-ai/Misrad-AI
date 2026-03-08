import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import prisma, { accelerateCache } from '@/lib/prisma';
import { Navbar } from '@/components/landing/Navbar';
import { auth } from '@clerk/nextjs/server';
import { LandingHeroSection } from '@/components/landing/LandingHeroSection';
import { AudienceSelector } from '@/components/landing/AudienceSelector';
import { asObject } from '@/lib/shared/unknown';
import GlobalPromotionBanner from '@/components/promotions/GlobalPromotionBanner';
import ContextualBannerDisplay from '@/components/promotions/ContextualBannerDisplay';

// Below-fold sections — lazy-loaded so they don't block first paint
const LandingModulesSection = dynamic(() => import('@/components/landing/LandingModulesSection').then(m => ({ default: m.LandingModulesSection })));
const LandingIsraeliDifferentiatorsSection = dynamic(() => import('@/components/landing/LandingIsraeliDifferentiatorsSection').then(m => ({ default: m.LandingIsraeliDifferentiatorsSection })));
const TestimonialsSection = dynamic(() => import('@/components/landing/TestimonialsSection'));
const HomepageCTA = dynamic(() => import('@/components/landing/HomepageCTA').then(m => ({ default: m.HomepageCTA })));
const Footer = dynamic(() => import('@/components/landing/Footer').then(m => ({ default: m.Footer })));

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls
export const maxDuration = 10;

// Aggressive caching for landing settings - they rarely change
// TTL: 10 minutes, SWR: 1 hour
async function getLandingSettings() {
  try {
    const row = await Promise.race([
      prisma.coreSystemSettings.findUnique({
        where: { key: 'landing_settings' },
        select: { value: true },
        ...accelerateCache({ ttl: 600, swr: 3600 }),
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]);
    const rowObj = asObject(row);
    const value = asObject(rowObj?.value) ?? {};
    return {
      logo: (value.logo as string | null) ?? null,
      logoText: (value.logoText as string | null) ?? null,
    };
  } catch {
    // Return default values on error/timeout - don't block page render
    return { logo: null, logoText: null };
  }
}

export default async function RootPage() {
  // Landing page is now always accessible for all users (logged in or not)
  // Logged-in users can navigate to /me for automatic workspace routing
  
  const [landingSettings, authData] = await Promise.all([
    getLandingSettings(),
    auth(),
  ]);
  
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden flex flex-col" dir="rtl">
      <Navbar 
        initialLogo={landingSettings.logo}
        initialLogoText={landingSettings.logoText}
        isSignedIn={!!authData.userId}
      />

      <ContextualBannerDisplay onLandingPage />
      <GlobalPromotionBanner onSignupPage />

      <main className="flex-1">
        <LandingHeroSection />

        <AudienceSelector />

        <Suspense>
          <div className="landing-section-lazy">
            <LandingIsraeliDifferentiatorsSection />
          </div>
          <div className="landing-section-lazy">
            <LandingModulesSection />
          </div>
          <div className="landing-section-lazy">
            <TestimonialsSection />
          </div>
          <div className="landing-section-lazy">
            <HomepageCTA />
          </div>
        </Suspense>
      </main>

      <Suspense>
        <Footer 
          initialLogo={landingSettings.logo}
          initialLogoText={landingSettings.logoText}
        />
      </Suspense>
    </div>
  );
}
