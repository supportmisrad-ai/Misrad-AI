import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import prisma, { accelerateCache } from '@/lib/prisma';
import { Navbar } from '@/components/landing/Navbar';
import { auth } from '@clerk/nextjs/server';
import { LandingHeroSection } from '@/components/landing/LandingHeroSection';
import { asObject } from '@/lib/shared/unknown';

// Below-fold sections — lazy-loaded so they don't block first paint
const LandingValueProps = dynamic(() => import('@/components/landing/LandingValueProps').then(m => ({ default: m.LandingValueProps })));
const LandingModulesSection = dynamic(() => import('@/components/landing/LandingModulesSection').then(m => ({ default: m.LandingModulesSection })));
const UnifiedBusinessSection = dynamic(() => import('@/components/landing/UnifiedBusinessSection').then(m => ({ default: m.UnifiedBusinessSection })));
const KillerFeaturesBox = dynamic(() => import('@/components/landing/KillerFeaturesBox'));
const AiManagementSection = dynamic(() => import('@/components/landing/AiManagementSection').then(m => ({ default: m.AiManagementSection })));
const ModularitySimplicitySection = dynamic(() => import('@/components/landing/ModularitySimplicitySection').then(m => ({ default: m.ModularitySimplicitySection })));
const LandingPricingCTA = dynamic(() => import('@/components/landing/LandingPricingCTA').then(m => ({ default: m.LandingPricingCTA })));
const TechTransparencySection = dynamic(() => import('@/components/landing/TechTransparencySection').then(m => ({ default: m.TechTransparencySection })));
const SecurityTrustSection = dynamic(() => import('@/components/landing/SecurityTrustSection').then(m => ({ default: m.SecurityTrustSection })));
const CostComparisonSection = dynamic(() => import('@/components/landing/CostComparisonSection').then(m => ({ default: m.CostComparisonSection })));
const DataOwnershipSection = dynamic(() => import('@/components/landing/DataOwnershipSection').then(m => ({ default: m.DataOwnershipSection })));
const WhyMisradSection = dynamic(() => import('@/components/landing/WhyMisradSection').then(m => ({ default: m.WhyMisradSection })));
const TestimonialsSection = dynamic(() => import('@/components/landing/TestimonialsSection'));
const SalesFaq = dynamic(() => import('@/components/landing/SalesFaq').then(m => ({ default: m.SalesFaq })));
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

      <main className="flex-1">
        <LandingHeroSection />

        <Suspense>
          <div className="landing-section-lazy">
            <LandingValueProps />
          </div>
          <div className="landing-section-lazy">
            <LandingModulesSection />
          </div>
          <div className="landing-section-lazy">
            <UnifiedBusinessSection />
          </div>
          <div className="landing-section-lazy">
            <KillerFeaturesBox id="features" />
          </div>
          <div className="landing-section-lazy">
            <AiManagementSection />
          </div>
          <div className="landing-section-lazy">
            <ModularitySimplicitySection />
          </div>
          <div className="landing-section-lazy">
            <LandingPricingCTA />
          </div>
          <div className="landing-section-lazy">
            <CostComparisonSection />
          </div>
          <div className="landing-section-lazy">
            <TechTransparencySection />
          </div>
          <div className="landing-section-lazy">
            <SecurityTrustSection />
          </div>
          <div className="landing-section-lazy">
            <DataOwnershipSection />
          </div>
          <div className="landing-section-lazy">
            <WhyMisradSection />
          </div>
          <div className="landing-section-lazy">
            <TestimonialsSection />
          </div>
          <div className="landing-section-lazy">
            <SalesFaq variant="default" />
          </div>
        </Suspense>
      </main>

      <Suspense>
        <Footer />
      </Suspense>
    </div>
  );
}
