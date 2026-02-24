'use client';

import React, { useState, useTransition } from 'react';
import { X, Clock, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

type ExtendTrialModalProps = {
  isOpen: boolean;
  organizationId: string;
  organizationName: string;
  currentTrial: {
    trial_start_date?: Date | null;
    trial_days?: number | null;
    trial_extended_days?: number | null;
    trial_end_date?: Date | null;
  };
  onClose: () => void;
  onSuccess: () => void;
};

export default function ExtendTrialModal({
  isOpen,
  organizationId,
  organizationName,
  currentTrial,
  onClose,
  onSuccess,
}: ExtendTrialModalProps) {
  const [isPending, startTransition] = useTransition();
  
  const [additionalDays, setAdditionalDays] = useState<number>(7);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  useBackButtonClose(isOpen, onClose);

  if (!isOpen) return null;

  const baseDays = currentTrial.trial_days || 7;
  const extendedDays = currentTrial.trial_extended_days || 0;
  const totalCurrentDays = baseDays + extendedDays;
  const newTotalDays = totalCurrentDays + additionalDays;

  const calculateNewEndDate = () => {
    if (!currentTrial.trial_start_date) return null;
    
    const startDate = new Date(currentTrial.trial_start_date);
    const endDate = new Date(startDate.getTime() + newTotalDays * 24 * 60 * 60 * 1000);
    return endDate;
  };

  const newEndDate = calculateNewEndDate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (additionalDays < 1 || additionalDays > 365) {
      setError('מספר ימים חייב להיות בין 1 ל-365');
      return;
    }

    startTransition(async () => {
      try {
        const { extendOrganizationTrial } = await import('@/app/actions/billing-actions');
        
        const result = await extendOrganizationTrial(
          organizationId,
          additionalDays,
          reason.trim() || undefined
        );

        if (!result.ok) {
          setError(result.error || 'שגיאה בהארכת ניסיון');
          return;
        }

        onSuccess();
        onClose();
        resetForm();
      } catch (err) {
        console.error('Failed to extend trial:', err);
        setError('שגיאה לא צפויה');
      }
    });
  };

  const resetForm = () => {
    setAdditionalDays(7);
    setReason('');
    setError('');
  };

  const handleClose = () => {
    if (isPending) return;
    resetForm();
    onClose();
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'לא ידוע';
    return new Date(date).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const quickOptions = [7, 14, 30, 60];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">הארכת תקופת ניסיון</h2>
              <p className="text-sm text-slate-500">{organizationName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isPending}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Current Trial Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-3">מצב ניסיון נוכחי</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-700">תאריך התחלה:</span>
                <span className="font-medium">{formatDate(currentTrial.trial_start_date)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-700">ימי ניסיון בסיס:</span>
                <span className="font-medium">{baseDays} ימים</span>
              </div>
              
              {extendedDays > 0 && (
                <div className="flex justify-between text-purple-600">
                  <span>הארכות קודמות:</span>
                  <span className="font-medium">+{extendedDays} ימים</span>
                </div>
              )}
              
              <div className="flex justify-between border-t border-slate-300 pt-2 mt-2">
                <span className="font-semibold text-slate-900">סה״כ ימים:</span>
                <span className="font-bold">{totalCurrentDays} ימים</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-700">תאריך סיום נוכחי:</span>
                <span className="font-medium">{formatDate(currentTrial.trial_end_date)}</span>
              </div>
            </div>
          </div>

          {/* Extension Input */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
              הארכה חדשה
            </div>
            
            <div>
              <Label htmlFor="additionalDays">הוסף ימים</Label>
              <Input
                id="additionalDays"
                type="number"
                min="1"
                max="365"
                value={additionalDays}
                onChange={(e) => setAdditionalDays(parseInt(e.target.value) || 7)}
                disabled={isPending}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                כמה ימי ניסיון להוסיף (1-365)
              </p>
            </div>

            {/* Quick Options */}
            <div>
              <Label>אפשרויות מהירות:</Label>
              <div className="flex gap-2 mt-2">
                {quickOptions.map((days) => (
                  <Button
                    key={days}
                    type="button"
                    variant={additionalDays === days ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAdditionalDays(days)}
                    disabled={isPending}
                  >
                    +{days} ימים
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="reason">סיבת הארכה (אופציונלי)</Label>
              <textarea
                id="reason"
                rows={3}
                placeholder="לדוגמה: הלקוח ביקש הארכה, צריכים יותר זמן להחלטה..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isPending}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md"
              />
              <p className="text-xs text-slate-500 mt-1">
                תיעוד פנימי למעקב
              </p>
            </div>
          </div>

          {/* New Trial Summary */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-purple-900 mb-3">תקופת ניסיון חדשה</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-700">הארכה:</span>
                    <span className="font-medium text-purple-600">+{additionalDays} ימים</span>
                  </div>
                  
                  <div className="flex justify-between border-t border-purple-300 pt-2 mt-2">
                    <span className="font-semibold text-slate-900">סה״כ ימי ניסיון:</span>
                    <span className="font-bold text-purple-900">{newTotalDays} ימים</span>
                  </div>
                  
                  <div className="flex justify-between bg-purple-100 rounded p-2 mt-2">
                    <span className="font-semibold text-purple-900">תאריך סיום חדש:</span>
                    <span className="font-bold text-purple-900">{formatDate(newEndDate)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            <strong>שים לב:</strong> הארכת תקופת ניסיון תאפשר ללקוח להמשיך להשתמש במערכת ללא חיוב עד לתאריך החדש.
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  מאריך...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  הארך תקופת ניסיון
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              ביטול
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
