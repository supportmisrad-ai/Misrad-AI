'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Product } from '../../types';

interface PricingCardProps {
  title: string;
  price: number;
  features: string[];
  recommended?: boolean;
  onSelect: () => void;
  billingCycle: 'monthly' | 'yearly';
}

const PricingCard = ({ title, price, features, recommended = false, onSelect, billingCycle }: PricingCardProps) => {
  const finalPrice = billingCycle === 'yearly' ? Math.round(price * 0.8) : price;

  return (
    <div className={`relative p-6 sm:p-8 rounded-3xl border flex flex-col h-full transition-all duration-300 ${
      recommended 
        ? 'bg-slate-800 border-indigo-500 shadow-2xl shadow-indigo-900/20 z-10 scale-105' 
        : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
    }`}>
      {recommended && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
          הכי משתלם
        </div>
      )}
      <div className="mb-6 sm:mb-8">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl sm:text-4xl font-black text-white">₪{finalPrice}</span>
          <span className="text-slate-400 text-sm font-bold">/חודש</span>
        </div>
        {billingCycle === 'yearly' && (
          <div className="text-xs text-green-400 mt-1 font-bold">חסוך 20% בתשלום שנתי</div>
        )}
      </div>
      <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
            <div className={`mt-0.5 rounded-full p-0.5 shrink-0 ${
              recommended ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-400'
            }`}>
              <Check size={12} strokeWidth={3} />
            </div>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <button 
        onClick={onSelect}
        className={`w-full py-3 sm:py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
          recommended 
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20' 
            : 'bg-white text-black hover:bg-slate-200'
        }`}
      >
        בחר חבילה <ArrowRight size={16} className="rotate-180" />
      </button>
    </div>
  );
};

interface PricingSectionProps {
  isAuthenticated: boolean;
  billingCycle: 'monthly' | 'yearly';
  onBillingCycleChange: (cycle: 'monthly' | 'yearly') => void;
  onSelectPlan: (plan: 'starter' | 'pro' | 'enterprise') => void;
}

export default function PricingSection({ 
  isAuthenticated, 
  billingCycle, 
  onBillingCycleChange,
  onSelectPlan 
}: PricingSectionProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);

  // Load products from constants (single source of truth)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Use DEFAULT_PRODUCTS from constants as single source of truth
        // These match the prices in constants.ts: 199, 499, 1500
        const defaultProducts: Product[] = [
          {
            id: 'prod_saas_starter', 
            name: 'חבילת בסיס', 
            price: 199, 
            color: 'bg-gray-500 text-white',
            modules: ['crm', 'team'],
            maxUsers: 5,
            maxStorageGB: 10,
            features: ['CRM בסיסי', 'ניהול צוות עד 5 משתמשים', '10GB אחסון', 'עד 50 לקוחות']
          },
          { 
            id: 'prod_saas_pro', 
            name: 'חבילת פרו', 
            price: 499, 
            color: 'bg-indigo-600 text-white',
            modules: ['crm', 'finance', 'team', 'ai'],
            maxUsers: 20,
            maxStorageGB: 100,
            features: ['כל התכונות של בסיס', 'כספים ודוחות', 'Nexus AI', 'עד 20 משתמשים', '100GB אחסון', 'מותאם אישית', 'API access']
          },
          { 
            id: 'prod_saas_ent', 
            name: 'חבילת ארגונים', 
            price: 1500, 
            color: 'bg-purple-600 text-white',
            modules: ['crm', 'finance', 'team', 'ai', 'content'],
            maxUsers: 999,
            maxStorageGB: 1000,
            features: ['כל התכונות', 'משתמשים ללא הגבלה', '1TB אחסון', 'תמיכה 24/7', 'API מותאם אישית', 'Webhooks', 'דוחות מתקדמים']
          }
        ];
        
        // Check localStorage for custom products (set by admin)
        const savedProducts = localStorage.getItem('products');
        if (savedProducts) {
          try {
            const parsed = JSON.parse(savedProducts);
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Validate that prices match constants (admin can override but we warn)
              setProducts(parsed);
              return;
            }
          } catch (e) {
            console.warn('Invalid products in localStorage, using defaults');
          }
        }
        
        setProducts(defaultProducts);
        // Sync to localStorage for consistency
        localStorage.setItem('products', JSON.stringify(defaultProducts));
      } catch (e) {
        console.error('Error loading products:', e);
      }
    }
  }, []);

  const handleSelectPlan = (planId: string) => {
    // Map plan IDs to legacy plan names for compatibility
    const planMap: Record<string, 'starter' | 'pro' | 'enterprise'> = {
      'prod_starter': 'starter',
      'prod_pro': 'pro',
      'prod_enterprise': 'enterprise'
    };
    const legacyPlan = planMap[planId] || 'starter';
    onSelectPlan(legacyPlan);
    // Navigate to checkout page
    router.push(`/subscribe/checkout?plan=${legacyPlan}&billing=${billingCycle}&planId=${planId}`);
  };

  // Get up to 3 products, sorted by price
  const displayProducts = products
    .sort((a, b) => a.price - b.price)
    .slice(0, 3);

  // If no products loaded yet, show loading or use defaults
  const productsToShow = displayProducts.length > 0 ? displayProducts : [
    { id: 'prod_starter', name: 'סטארטר', price: 299, color: 'bg-gray-500 text-white', modules: ['crm', 'team'], features: ['טוען...'] },
    { id: 'prod_pro', name: 'פרו', price: 599, color: 'bg-blue-600 text-white', modules: ['crm', 'finance', 'team', 'ai'], features: ['טוען...'] },
    { id: 'prod_enterprise', name: 'אנטרפרייז', price: 1299, color: 'bg-purple-600 text-white', modules: ['crm', 'finance', 'team', 'ai', 'assets'], features: ['טוען...'] }
  ] as Product[];

  return (
    <section id="pricing" className="py-32 bg-[#020617] relative z-10 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/30 border border-slate-700/50 text-indigo-300 text-xs font-bold mb-6 backdrop-blur-md">
            <span>מחירים</span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-6">
            תוכניות שמתאימות
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              לכל עסק
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
            בחר את התוכנית שמתאימה לך. כל התוכניות כוללות ניסיון חינם של 14 יום.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-500'}`}>
              חודשי
            </span>
            <button
              onClick={() => onBillingCycleChange(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                billingCycle === 'yearly' ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <motion.div
                className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg"
                animate={{ x: billingCycle === 'yearly' ? 24 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-sm font-bold ${billingCycle === 'yearly' ? 'text-white' : 'text-slate-500'}`}>
              שנתי
              <span className="ml-2 text-xs text-green-400">(חסכון 20%)</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards - Dynamic from managed plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {productsToShow.map((product, index) => {
            const finalPrice = billingCycle === 'yearly' ? Math.round(product.price * 0.8) : product.price;
            const isRecommended = index === 1 || product.name.toLowerCase().includes('פרו') || product.name.toLowerCase().includes('pro');
            const features = product.features || [];
            
            return (
              <PricingCard
                key={product.id}
                title={product.name}
                price={finalPrice}
                features={features}
                recommended={isRecommended}
                onSelect={() => handleSelectPlan(product.id)}
                billingCycle={billingCycle}
              />
            );
          })}
        </div>

        {/* Important Note */}
        <div className="mt-12 text-center">
          <div className="inline-block bg-slate-900/50 border border-slate-800 rounded-2xl p-6 max-w-2xl">
            <p className="text-slate-400 text-sm mb-2">
              <strong className="text-white">חשוב לדעת:</strong> Misrad היא המערכת הראשית שכוללת את כל הפיצ'רים הבסיסיים.
            </p>
            <p className="text-slate-400 text-sm">
              <strong className="text-emerald-400">System</strong> ו-<strong className="text-purple-400">Client</strong> הן תוספות מתקדמות שיימכרו בנפרד בעתיד. כרגע הן כלולות בתוכניות פרו ואנטרפרייז.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
