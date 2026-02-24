'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Star, ExternalLink, Send, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { submitRating, getMyRating } from '@/app/actions/rating';
import Link from 'next/link';

interface RatePageClientProps {
  organizationId: string;
  initialRating: number;
}

export default function RatePageClient({ organizationId, initialRating }: RatePageClientProps) {
  const [rating, setRating] = useState<number>(initialRating > 0 && initialRating <= 5 ? initialRating : 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [existingRating, setExistingRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const googleUrl = (process.env.NEXT_PUBLIC_MISRAD_GOOGLE_REVIEW_URL || '').trim();

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        if (!organizationId) { setChecking(false); return; }
        const result = await getMyRating(organizationId);
        if (cancelled) return;
        if (result) {
          setAlreadyRated(true);
          setExistingRating(result.rating);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    check();
    return () => { cancelled = true; };
  }, [organizationId]);

  const handleSubmit = useCallback(async () => {
    if (rating === 0 || !organizationId) return;
    setLoading(true);
    setError(null);

    const result = await submitRating({
      organizationId,
      rating,
      feedback: feedback.trim() || undefined,
      source: 'email',
    });

    setLoading(false);

    if (result.alreadyRated) {
      setAlreadyRated(true);
      setExistingRating(rating);
      return;
    }

    if (!result.success) {
      setError(result.error || 'שגיאה בשליחה');
      return;
    }

    setSubmitted(true);
  }, [organizationId, rating, feedback]);

  if (!organizationId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 flex items-center justify-center p-6" dir="rtl">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-lg text-center">
          <div className="text-xl font-black text-slate-900 mb-2">קישור לא תקין</div>
          <p className="text-sm text-slate-500 mb-6">הקישור שלך פג תוקף או לא תקין.</p>
          <Link href="/me" className="text-indigo-600 font-bold text-sm hover:underline">
            חזרה לאזור האישי
          </Link>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-lg animate-pulse">
          <div className="h-6 bg-slate-100 rounded w-40 mx-auto mb-6" />
          <div className="flex gap-3 justify-center mb-6">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="w-12 h-12 bg-slate-100 rounded-xl" />
            ))}
          </div>
          <div className="h-24 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  // Already rated or just submitted
  if (alreadyRated || submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 flex items-center justify-center p-6" dir="rtl">
        <div className="max-w-md w-full bg-white border border-indigo-200 rounded-2xl p-8 shadow-lg text-center">
          {/* Logo */}
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>

          <h1 className="text-2xl font-black text-slate-900 mb-2">
            {submitted ? 'תודה רבה!' : 'כבר דירגת אותנו'}
          </h1>

          {/* Show stars */}
          <div className="flex gap-1 justify-center mb-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`h-7 w-7 ${n <= (existingRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
              />
            ))}
          </div>

          {submitted && (
            <p className="text-sm text-slate-600 mb-6">
              המשוב שלך חשוב לנו מאוד ועוזר לנו להשתפר כל יום.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {googleUrl && (
              <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Star className="h-4 w-4" />
                דרגו אותנו גם בגוגל
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            <Link
              href="/me"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              חזרה לאזור האישי
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Rating form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 flex items-center justify-center p-6" dir="rtl">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Star className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-1">נשמח לשמוע ממך</h1>
          <p className="text-sm text-slate-500">הדירוג שלך עוזר לנו להשתפר (פעם אחת בלבד)</p>
        </div>

        {/* Stars */}
        <div className="flex gap-3 justify-center mb-6">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(n)}
              className="group transition-transform hover:scale-125 active:scale-95"
              aria-label={`דירוג ${n} כוכבים`}
            >
              <Star
                className={`h-12 w-12 transition-colors ${
                  n <= (hoverRating || rating)
                    ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                    : 'text-slate-200 group-hover:text-amber-200'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Rating label */}
        {rating > 0 && (
          <div className="text-center mb-5">
            <span className={`text-base font-black ${
              rating <= 2 ? 'text-rose-600' : rating <= 3 ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              {rating === 1 && 'לא טוב 😞'}
              {rating === 2 && 'צריך שיפור 🤔'}
              {rating === 3 && 'סביר 👍'}
              {rating === 4 && 'טוב מאוד 😊'}
              {rating === 5 && 'מעולה! 🌟'}
            </span>
          </div>
        )}

        {/* Feedback */}
        {rating > 0 && (
          <div className="mb-5">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="מה היית רוצה לספר לנו? (אופציונלי)"
              className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
              rows={4}
              maxLength={1000}
            />
            <div className="text-left text-[10px] text-slate-400 mt-1">{feedback.length}/1000</div>
          </div>
        )}

        {error && (
          <div className="mb-4 text-xs font-bold text-rose-600 text-center bg-rose-50 border border-rose-200 rounded-lg p-2">{error}</div>
        )}

        {/* Actions */}
        {rating > 0 && (
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              size="lg"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl gap-2 h-12 text-base"
            >
              {loading ? (
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              {loading ? 'שולח...' : 'שליחת דירוג'}
            </Button>

            {googleUrl && (
              <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  // Track google click even before form submit
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-colors"
              >
                <Star className="h-4 w-4" />
                או דרגו אותנו בגוגל
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <span className="text-[11px] text-slate-400">MISRAD AI — המשוב שלך מוביל את הפיתוח שלנו</span>
        </div>
      </div>
    </div>
  );
}
