import dynamic from 'next/dynamic';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { WhyMisradSection } from '@/components/landing/WhyMisradSection';
import { AiManagementSection } from '@/components/landing/AiManagementSection';
import { SecurityTrustSection } from '@/components/landing/SecurityTrustSection';
import { DataOwnershipSection } from '@/components/landing/DataOwnershipSection';
import { CostComparisonSection } from '@/components/landing/CostComparisonSection';
import { TechTransparencySection } from '@/components/landing/TechTransparencySection';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

const SalesFaq = dynamic(() => import('@/components/landing/SalesFaq').then(m => ({ default: m.SalesFaq })));

export default function WhyMisradPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <Navbar />
      <main className="pt-24">
        {/* Page Hero */}
        <section className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white">
          <div className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-slate-100 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-[500px] h-[500px] bg-slate-50 rounded-full blur-[140px] pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6 relative text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-white text-xs font-black mb-6 shadow-xl">
              <Sparkles size={14} />
              למה דווקא MISRAD AI?
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-tight tracking-tighter">
              כל מה שצריך לדעת
              <span className="block text-slate-400 mt-2">
                לפני שמחליטים
              </span>
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              AI, אבטחה, בעלות על הנתונים, עלויות לעומת מתחרים — הכל פה, בלי שיווק ריק.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login?mode=sign-up&redirect=/workspaces/onboarding"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-slate-900 text-white font-black shadow-lg hover:bg-slate-800 transition-colors"
              >
                התחל ניסיון חינם
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-slate-200 text-slate-700 font-black hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                ראה חבילות ומחירים
              </Link>
            </div>
          </div>
        </section>

        <WhyMisradSection />
        <AiManagementSection />
        <CostComparisonSection />
        <SecurityTrustSection />
        <DataOwnershipSection />
        <TechTransparencySection />
        <SalesFaq variant="default" />
      </main>
      <Footer />
    </div>
  );
}
