'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Link from 'next/link';
import { getActiveBannersPublic, type ContextualBanner } from '@/app/actions/admin-landing-marketing';

interface ContextualBannerDisplayProps {
  onLandingPage?: boolean;
  onPricingPage?: boolean;
  onSignupPage?: boolean;
}

export default function ContextualBannerDisplay({
  onLandingPage = false,
  onPricingPage = false,
  onSignupPage = false,
}: ContextualBannerDisplayProps) {
  const [banners, setBanners] = useState<ContextualBanner[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const all = await getActiveBannersPublic();
        const filtered = all.filter((b) => {
          if (onLandingPage && b.showOnLanding) return true;
          if (onPricingPage && b.showOnPricing) return true;
          if (onSignupPage && b.showOnSignup) return true;
          return false;
        });
        setBanners(filtered);
      } catch {
        // silent fail
      } finally {
        setLoaded(true);
      }
    })();
  }, [onLandingPage, onPricingPage, onSignupPage]);

  const dismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  const visible = banners.filter((b) => !dismissed.has(b.id));

  if (!loaded || visible.length === 0) return null;

  return (
    <div className="w-full">
      {visible.map((banner) => (
        <div
          key={banner.id}
          className={`${banner.bgColor} ${banner.textColor} relative`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                  {banner.title && (
                    <span className="font-black text-sm shrink-0">{banner.title}</span>
                  )}
                  <span className="text-sm font-medium leading-relaxed">{banner.message}</span>
                  {banner.ctaText && banner.ctaUrl && (
                    <Link
                      href={banner.ctaUrl}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-white/60 hover:bg-white/80 rounded-lg text-xs font-bold shrink-0 transition-colors"
                    >
                      {banner.ctaText} →
                    </Link>
                  )}
                </div>
              </div>
              <button
                onClick={() => dismiss(banner.id)}
                className="p-1 hover:bg-black/10 rounded-lg transition-colors shrink-0"
                aria-label="סגור"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
