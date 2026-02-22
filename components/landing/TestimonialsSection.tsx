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
        if (res.status === 429) return; // Rate limited — use defaults silently
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

  if (isLoading || testimonials.length === 0) return null;

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

        <TestimonialsCarousel testimonials={testimonials} />

        {error && (
          <div className="mt-4 text-center text-sm text-amber-600">
            {error}
          </div>
        )}
      </div>
    </section>
  );
}
