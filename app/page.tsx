import prisma, { accelerateCache } from '@/lib/prisma';
import { Navbar } from '@/components/landing/Navbar';
import { auth } from '@clerk/nextjs/server';
import { Footer } from '@/components/landing/Footer';
import KillerFeaturesBox from '@/components/landing/KillerFeaturesBox';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import { SalesFaq } from '@/components/landing/SalesFaq';
import { PartnersLogosSection } from '@/components/landing/PartnersLogosSection';
import { LandingHeroSection } from '@/components/landing/LandingHeroSection';
import { LandingDeviceMockups } from '@/components/landing/LandingDeviceMockups';
import { LandingModulesSection } from '@/components/landing/LandingModulesSection';
import { LandingPricingCTA } from '@/components/landing/LandingPricingCTA';
import { LandingValueProps } from '@/components/landing/LandingValueProps';
import { asObject } from '@/lib/shared/unknown';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

async function getLandingSettings() {
  try {
    const row = await Promise.race([
      prisma.coreSystemSettings.findUnique({
        where: { key: 'landing_settings' },
        select: { value: true },
        ...accelerateCache({ ttl: 120, swr: 300 }),
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]);
    const rowObj = asObject(row);
    const value = asObject(rowObj?.value) ?? {};
    return {
      logo: (value.logo as string | null) ?? null,
      logoText: (value.logoText as string | null) ?? null,
    };
  } catch {
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
        <LandingDeviceMockups />
        <LandingModulesSection />
        <KillerFeaturesBox id="features" />
        <LandingPricingCTA />
        <LandingValueProps />
        <TestimonialsSection />
        <PartnersLogosSection />
        <SalesFaq variant="default" />
      </main>
      <Footer />
      
    </div>
  );
}
