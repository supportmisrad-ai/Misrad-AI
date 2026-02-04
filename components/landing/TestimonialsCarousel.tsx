'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Star, Quote } from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  company?: string;
  content: string;
  rating: number;
  imageUrl?: string;
  videoUrl?: string;
  coverImageUrl?: string;
}

interface TestimonialsCarouselProps {
  testimonials: Testimonial[];
}

export function TestimonialsCarousel({ testimonials }: TestimonialsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const itemsPerView = 3;
  const totalSlides = Math.ceil(testimonials.length / itemsPerView);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setProgress(0);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
    setProgress(0);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    setProgress(0);
  }, [totalSlides]);

  // Auto-play logic
  useEffect(() => {
    if (!isAutoPlaying || totalSlides <= 1) return;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextSlide();
          return 0;
        }
        return prev + 2; // 50 intervals = 5 seconds
      });
    }, 100);

    return () => clearInterval(progressInterval);
  }, [isAutoPlaying, nextSlide, totalSlides]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') nextSlide(); // RTL: left = next
      if (e.key === 'ArrowRight') prevSlide(); // RTL: right = prev
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  // Touch/Swipe support
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) {
      // Swiped left (next in RTL)
      prevSlide();
    }
    if (touchStart - touchEnd < -50) {
      // Swiped right (prev in RTL)
      nextSlide();
    }
  };

  const visibleTestimonials = testimonials.slice(
    currentIndex * itemsPerView,
    (currentIndex + 1) * itemsPerView
  );

  return (
    <div
      className="relative"
      dir="rtl"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress Bar */}
      {isAutoPlaying && totalSlides > 1 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200 rounded-full overflow-hidden z-10">
          <div
            className="h-full bg-gradient-to-l from-indigo-600 to-purple-600 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Carousel Container */}
      <div className="relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {visibleTestimonials.map((testimonial, idx) => (
            <div
              key={testimonial.id}
              className="group bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 animate-fade-in"
              style={{
                animationDelay: `${idx * 100}ms`,
              }}
            >
              {/* Video or Cover Image */}
              {testimonial.videoUrl && (
                <div className="relative aspect-video bg-slate-100">
                  <video
                    src={testimonial.videoUrl}
                    poster={testimonial.coverImageUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {!testimonial.videoUrl && testimonial.coverImageUrl && (
                <div className="relative aspect-video bg-slate-100">
                  <img
                    src={testimonial.coverImageUrl}
                    alt={testimonial.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-8">
                {/* Rating */}
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={`${
                        i < testimonial.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-slate-200 text-slate-200'
                      }`}
                    />
                  ))}
                </div>

                {/* Content */}
                <div className="relative">
                  <Quote
                    size={32}
                    className="absolute -top-2 -right-2 text-slate-200 opacity-50"
                  />
                  <p className="relative text-slate-700 leading-relaxed text-sm">
                    {testimonial.content}
                  </p>
                </div>

                {/* Author */}
                <div className="mt-6 pt-6 border-t border-slate-100 flex items-center gap-3">
                  {testimonial.imageUrl && (
                    <img
                      src={testimonial.imageUrl}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                    />
                  )}
                  {!testimonial.imageUrl && (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {testimonial.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">{testimonial.name}</div>
                    <div className="text-xs text-slate-500">
                      {testimonial.role}
                      {testimonial.company && ` • ${testimonial.company}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Controls */}
      {totalSlides > 1 && (
        <>
          {/* Arrow Buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-12 h-12 rounded-full bg-white border-2 border-slate-200 shadow-xl flex items-center justify-center hover:bg-slate-50 hover:border-indigo-300 hover:scale-110 transition-all duration-200 z-20"
            aria-label="העדות הקודמת"
          >
            <ChevronRight size={24} className="text-slate-700" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-12 h-12 rounded-full bg-white border-2 border-slate-200 shadow-xl flex items-center justify-center hover:bg-slate-50 hover:border-indigo-300 hover:scale-110 transition-all duration-200 z-20"
            aria-label="העדות הבאה"
          >
            <ChevronLeft size={24} className="text-slate-700" />
          </button>

          {/* Pagination Dots */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentIndex
                    ? 'w-8 h-3 bg-gradient-to-l from-indigo-600 to-purple-600'
                    : 'w-3 h-3 bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`עבור לעדות ${idx + 1}`}
              />
            ))}
          </div>

          {/* Counter */}
          <div className="text-center mt-4 text-sm text-slate-500">
            {currentIndex + 1} מתוך {totalSlides}
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
