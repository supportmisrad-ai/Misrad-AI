'use client';

import React, { useState, useTransition } from 'react';
import { X, UserPlus, Mail, Loader2, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

type AddClientModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AddClientModal({ isOpen, onClose, onSuccess }: AddClientModalProps) {
  const [isPending, startTransition] = useTransition();
  useBackButtonClose(isOpen, onClose);

  const [ownerFullName, setOwnerFullName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [sendInviteEmail, setSendInviteEmail] = useState(true);
  const [error, setError] = useState('');
  const [signupUrl, setSignupUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!ownerFullName.trim()) {
      setError('שם מלא הוא שדה חובה');
      return;
    }
    if (!ownerEmail.trim() || !ownerEmail.includes('@')) {
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

        setSignupUrl(result.signupUrl);
        onSuccess();
      } catch (err) {
        console.error('Failed to create client:', err);
        setError('שגיאה לא צפויה ביצירת לקוח');
      }
    });
  };

  const handleCopy = async () => {
    if (!signupUrl) return;
    await navigator.clipboard.writeText(signupUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    if (isPending) return;
    setOwnerFullName('');
    setOwnerEmail('');
    setSendInviteEmail(true);
    setError('');
    setSignupUrl(null);
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">הזמנת לקוח חדש</h2>
              <p className="text-sm text-slate-500">שליחת לינק הרשמה ייחודי</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isPending} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Success State */}
        {signupUrl ? (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-900 text-sm">ההזמנה נוצרה בהצלחה!</p>
                <p className="text-xs text-green-700 mt-0.5">
                  {sendInviteEmail ? 'מייל הזמנה נשלח ל-' : 'לינק הרשמה נוצר עבור '}
                  <span className="font-bold">{ownerEmail}</span>
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">לינק הרשמה אישי</Label>
              <div className="flex gap-2">
                <Input
                  value={signupUrl}
                  readOnly
                  className="text-xs font-mono bg-slate-50 text-slate-600"
                  dir="ltr"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="shrink-0 gap-1.5">
                  <Copy className="w-4 h-4" />
                  {copied ? 'הועתק!' : 'העתק'}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                הלקוח יכול להירשם עם גוגל או סיסמה — הארגון שלו ייווצר אוטומטית.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" onClick={handleClose} className="flex-1">
                סגור
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open(signupUrl, '_blank')}
                className="gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                פתח לינק
              </Button>
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="space-y-4">
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
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">איך זה עובד?</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                נשלח ללקוח לינק הרשמה אישי. כשהוא נרשם (גוגל או סיסמה) — הארגון שלו נוצר אוטומטית ומקושר לחשבונו. אין צורך בהגדרה ידנית.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="sendInvite"
                checked={sendInviteEmail}
                onCheckedChange={(checked: boolean) => setSendInviteEmail(checked as boolean)}
                disabled={isPending}
              />
              <Label htmlFor="sendInvite" className="text-sm font-normal cursor-pointer flex items-center gap-2">
                <Mail className="w-4 h-4" />
                שלח מייל הזמנה אוטומטית
              </Label>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />יוצר הזמנה...</>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-2" />צור הזמנה</>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                ביטול
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
