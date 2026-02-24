'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Star, ExternalLink, CheckCircle2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { submitRating, getMyRating, getMyOrganizationId } from '@/app/actions/rating';

interface RatingWidgetProps {
  organizationId?: string;
  googleReviewUrl?: string;
}

export default function RatingWidget({ organizationId: orgIdProp, googleReviewUrl }: RatingWidgetProps) {
  const [resolvedOrgId, setResolvedOrgId] = useState<string | null>(orgIdProp || null);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [existingRating, setExistingRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const googleUrl = googleReviewUrl || process.env.NEXT_PUBLIC_MISRAD_GOOGLE_REVIEW_URL || '';

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        let orgId = orgIdProp || null;
        if (!orgId) {
          orgId = await getMyOrganizationId();
          if (cancelled) return;
          if (!orgId) { setChecking(false); return; }
          setResolvedOrgId(orgId);
        }
        const result = await getMyRating(orgId);
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
  }, [orgIdProp]);

  const handleSubmit = useCallback(async () => {
    if (rating === 0) return;
    setLoading(true);
    setError(null);

    if (!resolvedOrgId) {
      setError('לא נמצא ארגון');
      setLoading(false);
      return;
    }

    const result = await submitRating({
      organizationId: resolvedOrgId,
      rating,
      feedback: feedback.trim() || undefined,
      source: 'in_app',
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
  }, [resolvedOrgId, rating, feedback]);

  if (checking) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-pulse">
        <div className="h-5 bg-slate-100 rounded w-32 mb-4" />
        <div className="h-10 bg-slate-100 rounded w-full" />
      </div>
    );
  }

  // Already rated
  if (alreadyRated || submitted) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-2xl p-6 shadow-sm" dir="rtl">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <span className="text-sm font-black text-slate-900">
            {submitted ? 'תודה על הדירוג!' : 'כבר דירגת אותנו'}
          </span>
        </div>

        {/* Show stars */}
        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={`h-6 w-6 ${n <= (existingRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
            />
          ))}
        </div>

        {submitted && (
          <p className="text-sm text-slate-600 mb-4">
            המשוב שלך חשוב לנו מאוד ועוזר לנו להשתפר.
          </p>
        )}

        {googleUrl && (
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Star className="h-4 w-4" />
            דרגו אותנו גם בגוגל
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    );
  }

  // Rating form
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" dir="rtl">
      <div className="mb-4">
        <h3 className="text-base font-black text-slate-900 mb-1">איך החוויה שלך?</h3>
        <p className="text-xs text-slate-500">הדירוג שלך עוזר לנו להשתפר (פעם אחת בלבד)</p>
      </div>

      {/* Stars */}
      <div className="flex gap-2 mb-5 justify-center">
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
              className={`h-10 w-10 transition-colors ${
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
        <div className="text-center mb-4">
          <span className={`text-sm font-bold ${
            rating <= 2 ? 'text-rose-600' : rating <= 3 ? 'text-amber-600' : 'text-emerald-600'
          }`}>
            {rating === 1 && 'לא טוב'}
            {rating === 2 && 'צריך שיפור'}
            {rating === 3 && 'סביר'}
            {rating === 4 && 'טוב מאוד'}
            {rating === 5 && 'מעולה!'}
          </span>
        </div>
      )}

      {/* Feedback textarea */}
      {rating > 0 && (
        <div className="mb-4">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="רוצה לשתף אותנו במשהו? (אופציונלי)"
            className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
            rows={3}
            maxLength={1000}
          />
        </div>
      )}

      {error && (
        <div className="mb-3 text-xs font-bold text-rose-600 text-center">{error}</div>
      )}

      {/* Submit */}
      {rating > 0 && (
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl gap-2"
          >
            {loading ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {loading ? 'שולח...' : 'שליחת דירוג'}
          </Button>

          {googleUrl && (
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-colors"
            >
              <Star className="h-4 w-4" />
              או דרגו אותנו בגוגל
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
