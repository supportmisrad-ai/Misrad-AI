'use client';

import { Quote } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TestimonialsCarousel } from './TestimonialsCarousel';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  imageUrl?: string;
  videoUrl?: string;
  coverImageUrl?: string;
}

const defaultTestimonials: Testimonial[] = [];
// הסרנו את עדויות הדמו - המנהל יוסיף עדויות אמיתיות דרך פאנל האדמין

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(defaultTestimonials);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadTestimonials = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch('/api/landing/testimonials');
        if (!res.ok) throw new Error('Failed to load testimonials');

        const data = await res.json();
        if (cancelled) return;

        if (data.testimonials && data.testimonials.length > 0) {
          setTestimonials(data.testimonials);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error loading testimonials:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadTestimonials();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-amber-100/30 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto px-6 relative">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100 text-amber-600 text-xs font-black mb-4">
            <Quote size={14} />
            המלצות לקוחות
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
            מה הלקוחות שלנו אומרים
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            עסקים אמיתיים שעברו למערכת ולא מסתכלים אחורה
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl border border-slate-200 p-8 animate-pulse">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <div key={s} className="w-4 h-4 bg-slate-200 rounded"></div>
                  ))}
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-full"></div>
                  <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                  <div className="h-4 bg-slate-200 rounded w-4/6"></div>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-200"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-slate-200 rounded w-24"></div>
                    <div className="h-2 bg-slate-200 rounded w-32"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : testimonials.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Quote size={32} className="text-slate-400" />
            </div>
            <p className="text-slate-500 text-lg">בקרוב יתווספו המלצות מלקוחות...</p>
          </div>
        ) : (
          <TestimonialsCarousel testimonials={testimonials} />
        )}

        {error && (
          <div className="mt-4 text-center text-sm text-amber-600">
            {error}
          </div>
        )}
      </div>
    </section>
  );
}
