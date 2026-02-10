'use client';

import React, { useState, useTransition } from 'react';
import { X, UserPlus, Building2, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

type AddClientModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AddClientModal({ isOpen, onClose, onSuccess }: AddClientModalProps) {
  const [isPending, startTransition] = useTransition();
  
  // Client (Owner) details
  const [ownerFullName, setOwnerFullName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  
  // Options
  const [sendInviteEmail, setSendInviteEmail] = useState(true);
  
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!ownerFullName.trim()) {
      setError('שם מלא הוא שדה חובה');
      return;
    }

    if (!ownerEmail.trim()) {
      setError('מייל הוא שדה חובה');
      return;
    }

    if (!ownerEmail.includes('@')) {
      setError('כתובת מייל לא תקינה');
      return;
    }

    startTransition(async () => {
      try {
        const { createClient } = await import('@/app/actions/admin-clients');
        
        const result = await createClient({
          fullName: ownerFullName.trim(),
          email: ownerEmail.trim().toLowerCase(),
          sendInviteEmail,
        });

        if (!result.ok) {
          setError(result.error || 'שגיאה ביצירת לקוח');
          return;
        }

        // Success
        onSuccess();
        onClose();
        
        // Reset form
        setOwnerFullName('');
        setOwnerEmail('');
        setSendInviteEmail(true);
      } catch (err) {
        console.error('Failed to create client:', err);
        setError('שגיאה לא צפויה ביצירת לקוח');
      }
    });
  };

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">הוספת לקוח חדש</h2>
              <p className="text-sm text-gray-500">יצירת בעלים (ארגונים ייווצרו אחר כך)</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isPending}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Client Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 border-b pb-2">
              <UserPlus className="w-4 h-4" />
              פרטי לקוח (בעלים)
            </div>
            
            <div>
              <Label htmlFor="ownerFullName">שם מלא *</Label>
              <Input
                id="ownerFullName"
                type="text"
                placeholder="לדוגמה: יוסי כהן"
                value={ownerFullName}
                onChange={(e) => setOwnerFullName(e.target.value)}
                disabled={isPending}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="ownerEmail">מייל *</Label>
              <Input
                id="ownerEmail"
                type="email"
                placeholder="לדוגמה: yossi@example.com"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                disabled={isPending}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                המייל ישמש להתחברות למערכת
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">יצירת ארגונים</p>
                <p className="text-xs text-blue-700 mt-1">
                  לאחר יצירת הלקוח, תוכל ליצור ארגון ראשון ולהקצות אותו ללקוח זה.
                  לקוח יכול להיות בעלים של מספר ארגונים.
                </p>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Checkbox
                id="sendInvite"
                checked={sendInviteEmail}
                onCheckedChange={(checked: boolean) => setSendInviteEmail(checked as boolean)}
                disabled={isPending}
              />
              <Label
                htmlFor="sendInvite"
                className="text-sm font-normal cursor-pointer flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                שלח מייל הזמנה לבעלים
              </Label>
            </div>
            <p className="text-xs text-gray-500 mr-6">
              אם מסומן, הבעלים יקבל מייל עם לינק להגדרת סיסמה וכניסה למערכת
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  יוצר לקוח...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  צור לקוח
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              ביטול
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
