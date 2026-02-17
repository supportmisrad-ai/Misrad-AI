'use client';

import React, { useState, useTransition } from 'react';
import { X, TriangleAlert, TrendingUp, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

type UpgradeSeatsModalProps = {
  isOpen: boolean;
  organizationId: string;
  organizationName: string;
  currentSeats: number;
  currentActiveUsers: number;
  requestedUsers: number; // כמה משתמשים מנסים להוסיף
  suggestedSeats: number; // המלצה אוטומטית
  onClose: () => void;
  onSuccess: (newSeats: number) => void;
};

export default function UpgradeSeatsModal({
  isOpen,
  organizationId,
  organizationName,
  currentSeats,
  currentActiveUsers,
  requestedUsers,
  suggestedSeats,
  onClose,
  onSuccess,
}: UpgradeSeatsModalProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedSeats, setSelectedSeats] = useState(suggestedSeats);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Calculate pricing (₪99 per seat for Pro)
  const PRICE_PER_SEAT = 99;
  const currentMRR = currentSeats * PRICE_PER_SEAT;
  const newMRR = selectedSeats * PRICE_PER_SEAT;
  const additionalCost = newMRR - currentMRR;
  const additionalSeats = selectedSeats - currentSeats;

  const minRequiredSeats = currentActiveUsers + requestedUsers;

  const handleUpgrade = async () => {
    setError('');

    if (selectedSeats < minRequiredSeats) {
      setError(`נדרשים לפחות ${minRequiredSeats} מקומות (${currentActiveUsers} משתמשים קיימים + ${requestedUsers} חדשים)`);
      return;
    }

    startTransition(async () => {
      try {
        const { autoUpgradeSeats } = await import('@/app/actions/billing-actions');
        
        const result = await autoUpgradeSeats(organizationId, selectedSeats);

        if (!result.ok) {
          setError(result.error || 'שגיאה בשדרוג מקומות');
          return;
        }

        onSuccess(selectedSeats);
        onClose();
      } catch (err) {
        console.error('Failed to upgrade seats:', err);
        setError('שגיאה לא צפויה בשדרוג');
      }
    });
  };

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  // Quick options
  const quickOptions = [
    minRequiredSeats,
    Math.ceil(minRequiredSeats * 1.2 / 5) * 5, // +20% buffer
    Math.ceil(minRequiredSeats * 1.5 / 5) * 5, // +50% buffer
  ].filter((val, idx, arr) => arr.indexOf(val) === idx && val > currentSeats);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl mx-4">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <TriangleAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">הגעת למכסת המשתמשים</h2>
                <p className="text-sm text-white/90">{organizationName}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={isPending} className="text-white hover:bg-white/20">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Situation */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <TriangleAlert className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">אין מספיק מקומות פנויים</p>
                <p className="text-sm text-red-700 mt-1">
                  יש לך <span className="font-semibold">{currentActiveUsers}</span> משתמשים פעילים,
                  ואתה מנסה להוסיף <span className="font-semibold">{requestedUsers}</span> נוספים.
                </p>
                <p className="text-sm text-red-700 mt-1">
                  החבילה הנוכחית מאפשרת רק <span className="font-semibold">{currentSeats}</span> מקומות.
                </p>
              </div>
            </div>
          </div>

          {/* Upgrade Solution */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">שדרג את החבילה</h3>
            </div>

            {/* Quick Options */}
            <div className="flex gap-2 mb-3">
              {quickOptions.slice(0, 3).map((seats) => (
                <button
                  key={seats}
                  onClick={() => setSelectedSeats(seats)}
                  disabled={isPending}
                  className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all ${
                    selectedSeats === seats
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-lg font-bold">{seats}</div>
                  <div className="text-xs text-gray-600">מקומות</div>
                </button>
              ))}
            </div>

            {/* Custom Seats Input */}
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                או בחר כמות מותאמת:
              </label>
              <input
                type="number"
                min={minRequiredSeats}
                max="999"
                value={selectedSeats}
                onChange={(e) => setSelectedSeats(Number(e.target.value))}
                disabled={isPending}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                מינימום נדרש: {minRequiredSeats} מקומות
              </p>
            </div>
          </div>

          {/* Price Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-3">סיכום תשלום</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">חבילה נוכחית ({currentSeats} מקומות)</span>
                <span className="font-medium">₪{currentMRR.toLocaleString()}/חודש</span>
              </div>
              <div className="flex justify-between text-blue-700">
                <span>הוספת {additionalSeats} מקומות</span>
                <span className="font-medium">+₪{additionalCost.toLocaleString()}/חודש</span>
              </div>
              <div className="border-t border-blue-300 pt-2 flex justify-between text-lg">
                <span className="font-bold text-blue-900">סה"כ חדש</span>
                <span className="font-bold text-blue-900">₪{newMRR.toLocaleString()}/חודש</span>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">מה תקבל:</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-800">
                <Check className="w-4 h-4" />
                <span>{selectedSeats} מקומות למשתמשים</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-800">
                <Check className="w-4 h-4" />
                <span>{selectedSeats - minRequiredSeats} מקומות נוספים לצמיחה</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-800">
                <Check className="w-4 h-4" />
                <span>אפשרות להוסיף עובדים מיד</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleUpgrade}
              disabled={isPending || selectedSeats < minRequiredSeats}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {isPending ? (
                'משדרג...'
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  אישור שדרוג (₪{newMRR.toLocaleString()}/חודש)
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              ביטול
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            השינוי ייכנס לתוקף מיידית. החיוב החודשי יתעדכן בהתאם.
          </p>
        </div>
      </div>
    </div>
  );
}
