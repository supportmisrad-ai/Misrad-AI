import prisma, { accelerateCache } from '@/lib/prisma';
import { Navbar } from '@/components/landing/Navbar';
import { auth } from '@clerk/nextjs/server';
import { Footer } from '@/components/landing/Footer';
import KillerFeaturesBox from '@/components/landing/KillerFeaturesBox';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import { SalesFaq } from '@/components/landing/SalesFaq';
import { LandingHeroSection } from '@/components/landing/LandingHeroSection';
import { LandingModulesSection } from '@/components/landing/LandingModulesSection';
import { LandingPricingCTA } from '@/components/landing/LandingPricingCTA';
import { LandingValueProps } from '@/components/landing/LandingValueProps';
import { UnifiedBusinessSection } from '@/components/landing/UnifiedBusinessSection';
import { AiManagementSection } from '@/components/landing/AiManagementSection';
import { ModularitySimplicitySection } from '@/components/landing/ModularitySimplicitySection';
import { asObject } from '@/lib/shared/unknown';

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
        <LandingValueProps />
        <LandingModulesSection />
        <UnifiedBusinessSection />
        <KillerFeaturesBox id="features" />
        <AiManagementSection />
        <ModularitySimplicitySection />
        <LandingPricingCTA />
        <TestimonialsSection />
        <SalesFaq variant="default" />
      </main>
      <Footer />
      
    </div>
  );
}
