'use client';

import { useEffect, useState } from 'react';
import { Rocket } from 'lucide-react';
import { getContentByKey } from '@/app/actions/site-content';
import { DEFAULT_FEATURES, DEFAULT_TESTIMONIALS, ICON_MAP } from './constants';

export function useLandingContent() {
  const [heroTitle, setHeroTitle] = useState('נהלו את הסושיאל באפס מאמץ.');
  const [heroSubtitle, setHeroSubtitle] = useState(
    'שחררו את המחסומים. פוסטים ב-DNA של המותג בלחיצת כפתור, גבייה אוטומטית ופורטלים ממותגים ללקוחות - הכל במקום אחד, שקט ומאורגן.'
  );
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [testimonials, setTestimonials] = useState(DEFAULT_TESTIMONIALS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      const timeoutId = setTimeout(() => {
        setIsLoading(false);
      }, 3000);

      try {
        const [titleResult, subtitleResult, featuresResult, testimonialsResult] = await Promise.all([
          getContentByKey('landing', 'hero', 'hero_title').catch(() => ({ success: false, data: null })),
          getContentByKey('landing', 'hero', 'hero_subtitle').catch(() => ({ success: false, data: null })),
          getContentByKey('landing', 'features', 'features').catch(() => ({ success: false, data: null })),
          getContentByKey('landing', 'testimonials', 'testimonials').catch(() => ({ success: false, data: null })),
        ]);

        clearTimeout(timeoutId);

        if (titleResult.success && titleResult.data) {
          setHeroTitle(titleResult.data);
        }
        if (subtitleResult.success && subtitleResult.data) {
          setHeroSubtitle(subtitleResult.data);
        }
        if (featuresResult.success && featuresResult.data) {
          const mappedFeatures = featuresResult.data.map((f: unknown) => {
            const feat = f as Record<string, unknown>;
            return {
              ...feat,
              icon: ICON_MAP[feat.icon as string] || Rocket,
            };
          });
          setFeatures(mappedFeatures as typeof features);
        }
        if (testimonialsResult.success && testimonialsResult.data) {
          setTestimonials(testimonialsResult.data);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error loading site content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, []);

  return {
    heroTitle,
    heroSubtitle,
    features,
    testimonials,
    isLoading,
  };
}
