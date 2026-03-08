'use client';

import { useEffect, useState } from 'react';
import { X, Sparkles, Clock, TrendingUp } from 'lucide-react';
import { getActiveGlobalPromotion, type GlobalPromotion } from '@/app/actions/global-promotion';

interface GlobalPromotionBannerProps {
  onSignupPage?: boolean;
  onPricingPage?: boolean;
}

export default function GlobalPromotionBanner({
  onSignupPage = false,
  onPricingPage = false,
}: GlobalPromotionBannerProps) {
  const [promotion, setPromotion] = useState<GlobalPromotion | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPromotion();
  }, []);

  const loadPromotion = async () => {
    try {
      const result = await getActiveGlobalPromotion();
      if (result.success && result.data) {
        const promo = result.data;
        
        // Check if promotion should display on this page
        const shouldDisplay =
          (onSignupPage && promo.displayOnSignup) ||
          (onPricingPage && promo.displayOnPricing);

        if (shouldDisplay) {
          setPromotion(promo);
        }
      }
    } catch (error) {
      console.error('Failed to load promotion:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = () => {
    if (!promotion) return '';

    const now = new Date();
    const expires = new Date(promotion.expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'פג תוקף';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 1) return `${days} ימים`;
    if (days === 1) return `יום אחד ו-${hours} שעות`;
    if (hours > 1) return `${hours} שעות`;
    if (hours === 1) return `שעה אחת ו-${minutes} דקות`;
    return `${minutes} דקות`;
  };

  const getDiscountText = () => {
    if (!promotion) return '';
    
    if (promotion.discountPercent) {
      return `${promotion.discountPercent}% הנחה`;
    }
    
    if (promotion.discountAmountCents) {
      return `₪${(promotion.discountAmountCents / 100).toFixed(0)} הנחה`;
    }
    
    return '';
  };

  if (loading || !promotion || dismissed) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white shadow-2xl">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[url('/patterns/dots.svg')] animate-pulse"></div>
      </div>
      
      {/* Animated Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-400/30 rounded-full blur-3xl animate-pulse" 
           style={{ animationDuration: '3s' }}></div>
      <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-purple-400/30 rounded-full blur-3xl animate-pulse" 
           style={{ animationDuration: '4s', animationDelay: '1s' }}></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Content */}
          <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
            {/* Badge */}
            {promotion.badgeText && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/25 backdrop-blur-md rounded-full border-2 border-white/40 shadow-lg hover:scale-105 transition-transform duration-300">
                <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
                <span className="text-sm font-black tracking-wide">{promotion.badgeText}</span>
              </div>
            )}

            {/* Main Message */}
            <div className="flex-1">
              <h3 className="text-lg sm:text-xl font-black mb-1">{promotion.title}</h3>
              {promotion.subtitle && (
                <p className="text-sm sm:text-base opacity-90 font-medium">{promotion.subtitle}</p>
              )}
            </div>

            {/* Urgency & Discount */}
            <div className="flex items-center gap-4 shrink-0">
              {/* Time Remaining */}
              <div className="hidden sm:flex items-center gap-2 px-4 py-3 bg-white/15 backdrop-blur-md rounded-xl border-2 border-white/30 shadow-lg hover:scale-105 transition-all duration-300">
                <Clock className="w-5 h-5 animate-pulse" />
                <div className="text-right">
                  <div className="text-xs opacity-90 font-bold">נותרו</div>
                  <div className="text-lg font-black leading-none bg-gradient-to-r from-yellow-200 to-orange-200 bg-clip-text text-transparent">{getTimeRemaining()}</div>
                </div>
              </div>

              {/* Discount Badge */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl blur-md opacity-75 group-hover:opacity-100 transition duration-300 animate-pulse"></div>
                <div className="relative flex items-center gap-2 px-5 py-3 bg-white text-purple-600 rounded-xl shadow-2xl hover:scale-105 transition-transform duration-300">
                  <TrendingUp className="w-6 h-6 animate-bounce" style={{ animationDuration: '2s' }} />
                  <div className="text-right">
                    <div className="text-2xl font-black leading-none bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{getDiscountText()}</div>
                    <div className="text-xs font-medium opacity-80">על כל חבילה</div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button (Mobile) */}
            {promotion.ctaText && (
              <div className="sm:hidden w-full relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                <button className="relative w-full px-6 py-3 bg-white text-purple-600 font-black rounded-xl shadow-2xl hover:scale-105 transition-all duration-300">
                  {promotion.ctaText}
                </button>
              </div>
            )}
          </div>

          {/* Dismiss Button */}
          <button
            onClick={() => setDismissed(true)}
            className="p-2 hover:bg-white/30 rounded-lg transition-all duration-300 shrink-0 hover:rotate-90 hover:scale-110"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Urgency Message (Mobile) */}
        {promotion.urgencyMessage && (
          <div className="mt-3 sm:hidden">
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-yellow-400/25 backdrop-blur-md rounded-lg border-2 border-yellow-400/40 shadow-lg animate-pulse">
              <span className="text-xs font-bold text-yellow-100">{promotion.urgencyMessage}</span>
            </div>
          </div>
        )}

        {/* Time Remaining (Mobile) */}
        <div className="mt-2 sm:hidden text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-bold">נותרו {getTimeRemaining()}</span>
          </div>
        </div>
      </div>

      {/* Bottom Urgency Bar (Desktop) */}
      {promotion.urgencyMessage && (
        <div className="hidden sm:block border-t border-white/30 bg-gradient-to-r from-black/30 via-black/20 to-black/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm font-black text-yellow-300 animate-pulse tracking-wide">
                ⚠️ {promotion.urgencyMessage}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Coupon Code Display */}
      {promotion.couponCode && (
        <div className="border-t border-white/30 bg-gradient-to-r from-black/40 via-black/30 to-black/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span className="text-xs font-bold opacity-90">קוד קופון:</span>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-lg blur opacity-50 group-hover:opacity-75 transition duration-300"></div>
                <code className="relative px-4 py-1.5 bg-white/30 backdrop-blur-md rounded-lg font-mono font-black text-sm border-2 border-white/40 shadow-lg hover:scale-110 transition-transform duration-300">
                  {promotion.couponCode}
                </code>
              </div>
              <span className="text-xs font-medium opacity-90">
                (יוחל אוטומטית בתשלום)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
