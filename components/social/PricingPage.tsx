'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getContentByKey } from '@/app/actions/site-content';

const DEFAULT_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 1490,
    desc: '2 פוסטים בשבוע',
    features: ['2 פוסטים בשבוע', 'גישה לפורטל', 'תמיכה במייל'],
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 2990,
    desc: '3 פוסטים + AI',
    features: ['3 פוסטים בשבוע', 'The Machine ✨', 'גבייה אוטומטית', 'תמיכה עדיפות'],
    popular: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 5490,
    desc: 'ניהול מלא',
    features: ['פוסטים ללא הגבלה', 'The Machine ✨', 'גבייה אוטומטית', 'ניהול קמפיינים', 'תמיכה 24/7'],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [heroTitle, setHeroTitle] = useState('בחרו את');
  const [heroSubtitle, setHeroSubtitle] = useState('ללא התחייבות. ביטול בכל עת. התחילו עם ניסיון חינם.');
  const [faq, setFaq] = useState<Array<{q: string, a: string}>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const [
          heroTitleResult,
          heroSubtitleResult,
          starterPrice, starterName, starterDesc, starterFeatures,
          proPrice, proName, proDesc, proFeatures,
          agencyPrice, agencyName, agencyDesc, agencyFeatures,
          popularPlan,
          faqResult
        ] = await Promise.all([
          getContentByKey('pricing', 'hero', 'hero_title'),
          getContentByKey('pricing', 'hero', 'hero_subtitle'),
          getContentByKey('pricing', 'plans', 'starter_price'),
          getContentByKey('pricing', 'plans', 'starter_name'),
          getContentByKey('pricing', 'plans', 'starter_desc'),
          getContentByKey('pricing', 'plans', 'starter_features'),
          getContentByKey('pricing', 'plans', 'pro_price'),
          getContentByKey('pricing', 'plans', 'pro_name'),
          getContentByKey('pricing', 'plans', 'pro_desc'),
          getContentByKey('pricing', 'plans', 'pro_features'),
          getContentByKey('pricing', 'plans', 'agency_price'),
          getContentByKey('pricing', 'plans', 'agency_name'),
          getContentByKey('pricing', 'plans', 'agency_desc'),
          getContentByKey('pricing', 'plans', 'agency_features'),
          getContentByKey('pricing', 'plans', 'popular_plan'),
          getContentByKey('pricing', 'faq', 'faq'),
        ]);

        // Set hero content
        if (heroTitleResult.success && heroTitleResult.data) {
          setHeroTitle(heroTitleResult.data);
        }
        if (heroSubtitleResult.success && heroSubtitleResult.data) {
          setHeroSubtitle(heroSubtitleResult.data);
        }

        // Set FAQ
        if (faqResult.success && faqResult.data && Array.isArray(faqResult.data)) {
          setFaq(faqResult.data);
        }

        // Get popular plan
        const popular = (popularPlan.success && popularPlan.data) ? popularPlan.data : 'pro';

        // Build plans array
        const loadedPlans = [
          {
            id: 'starter' as const,
            name: (starterName.success && starterName.data) ? starterName.data : DEFAULT_PLANS[0].name,
            price: (starterPrice.success && starterPrice.data) ? starterPrice.data : DEFAULT_PLANS[0].price,
            desc: (starterDesc.success && starterDesc.data) ? starterDesc.data : DEFAULT_PLANS[0].desc,
            features: (starterFeatures.success && starterFeatures.data) 
              ? (Array.isArray(starterFeatures.data) ? starterFeatures.data : [starterFeatures.data])
              : DEFAULT_PLANS[0].features,
            popular: popular === 'starter',
          },
          {
            id: 'pro' as const,
            name: (proName.success && proName.data) ? proName.data : DEFAULT_PLANS[1].name,
            price: (proPrice.success && proPrice.data) ? proPrice.data : DEFAULT_PLANS[1].price,
            desc: (proDesc.success && proDesc.data) ? proDesc.data : DEFAULT_PLANS[1].desc,
            features: (proFeatures.success && proFeatures.data)
              ? (Array.isArray(proFeatures.data) ? proFeatures.data : [proFeatures.data])
              : DEFAULT_PLANS[1].features,
            popular: popular === 'pro',
          },
          {
            id: 'agency' as const,
            name: (agencyName.success && agencyName.data) ? agencyName.data : DEFAULT_PLANS[2].name,
            price: (agencyPrice.success && agencyPrice.data) ? agencyPrice.data : DEFAULT_PLANS[2].price,
            desc: (agencyDesc.success && agencyDesc.data) ? agencyDesc.data : DEFAULT_PLANS[2].desc,
            features: (agencyFeatures.success && agencyFeatures.data)
              ? (Array.isArray(agencyFeatures.data) ? agencyFeatures.data : [agencyFeatures.data])
              : DEFAULT_PLANS[2].features,
            popular: popular === 'agency',
          },
        ];

        setPlans(loadedPlans);
      } catch (error) {
        console.error('Error loading pricing:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPricing();
  }, []);

  const handleGetStarted = () => {
    router.push('/sign-in');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900 overflow-x-hidden" dir="rtl">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/70 backdrop-blur-xl border-b border-slate-100/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">S</div>
            <span className="font-black text-2xl tracking-tighter text-slate-900">Social</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')} className="text-slate-500 font-black text-sm px-6 py-2 hover:bg-slate-50 rounded-xl transition-all">חזרה</button>
            <button 
              onClick={handleGetStarted}
              className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-[0_20px_40px_-12px_rgba(15,23,42,0.3)] hover:bg-black hover:scale-[1.02] active:scale-95 transition-all"
            >
              התחל בחינם
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-48 pb-32 px-6 relative">
        <div className="max-w-7xl mx-auto text-center flex flex-col gap-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center justify-center gap-3 bg-blue-50/50 border border-blue-100/50 text-blue-600 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest self-center shadow-sm w-fit mb-6">
              <Sparkles size={14} className="animate-pulse" /> מחירון שקוף
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.95] mb-6">
              {heroTitle.includes('החבילה') ? (
                <>
                  {heroTitle.split('החבילה')[0]}
                  <br />
                  <span className="text-blue-600 italic">החבילה{heroTitle.split('החבילה')[1]}</span>
                </>
              ) : (
                <>
                  {heroTitle}
                  <br />
                  <span className="text-blue-600 italic">החבילה המתאימה</span>
                </>
              )}
            </h1>

            <p className="text-xl md:text-2xl text-slate-400 font-bold max-w-3xl mx-auto leading-relaxed">
              {heroSubtitle}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`
                  relative bg-white rounded-[48px] p-10 border-2 shadow-xl transition-all duration-500
                  ${plan.popular 
                    ? 'border-blue-500 scale-105 shadow-2xl' 
                    : 'border-slate-200 hover:border-blue-200 hover:shadow-2xl'
                  }
                `}
              >
                {plan.popular && (
                  <div className="absolute -top-4 right-1/2 translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">
                    הכי פופולרי
                  </div>
                )}
                
                <div className="flex flex-col gap-8">
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 mb-2">{plan.name}</h3>
                    <p className="text-slate-400 font-bold mb-6">{plan.desc}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-slate-900">₪{plan.price.toLocaleString()}</span>
                      <span className="text-slate-400 font-bold">/חודש</span>
                    </div>
                  </div>

                  <ul className="flex flex-col gap-4">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-3">
                        <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
                        <span className="text-slate-700 font-bold">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={handleGetStarted}
                    className={`
                      w-full py-5 rounded-2xl font-black text-lg transition-all
                      ${plan.popular
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]'
                        : 'bg-slate-900 text-white hover:bg-black'
                      }
                    `}
                  >
                    התחל עכשיו
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      {faq.length > 0 && (
        <section className="py-32 px-6 bg-slate-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl font-black text-slate-900 text-center mb-16">שאלות נפוצות</h2>
            <div className="flex flex-col gap-6">
              {faq.map((faqItem, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm"
                >
                  <h3 className="text-xl font-black text-slate-900 mb-3">{faqItem.q}</h3>
                  <p className="text-slate-600 font-bold">{faqItem.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-900 font-black text-xl">S</div>
            <span className="font-black text-3xl tracking-tighter">Social</span>
          </div>
          <p className="text-slate-400 font-bold"> 2025 SOCIAL ISRAEL. </p>
        </div>
      </footer>
    </div>
  );
}
