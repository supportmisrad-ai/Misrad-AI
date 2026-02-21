'use client';

import React, { useState, useTransition } from 'react';
import { X, UserCog, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

type ContactForEdit = {
  user_id: string;
  role: string | null;
  title: string | null;
  department: string | null;
  is_primary: boolean;
  is_billing_contact: boolean;
  is_technical_contact: boolean;
  user: {
    full_name: string | null;
    email: string | null;
  } | null;
};

type EditContactModalProps = {
  isOpen: boolean;
  clientId: string;
  clientName: string;
  contact: ContactForEdit;
  onClose: () => void;
  onSuccess: () => void;
};

export default function EditContactModal({
  isOpen,
  clientId,
  clientName,
  contact,
  onClose,
  onSuccess,
}: EditContactModalProps) {
  const [isPending, startTransition] = useTransition();

  const [role, setRole] = useState(contact.role ?? 'contact');
  const [title, setTitle] = useState(contact.title ?? '');
  const [department, setDepartment] = useState(contact.department ?? '');
  const [isPrimary, setIsPrimary] = useState(contact.is_primary);
  const [isBillingContact, setIsBillingContact] = useState(contact.is_billing_contact);
  const [isTechnicalContact, setIsTechnicalContact] = useState(contact.is_technical_contact);
  const [error, setError] = useState('');
  useBackButtonClose(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    startTransition(async () => {
      try {
        const { updateContactOnClient } = await import('@/app/actions/business-clients');
        const result = await updateContactOnClient(clientId, contact.user_id, {
          role,
          title: title.trim() || undefined,
          department: department.trim() || undefined,
          is_primary: isPrimary,
          is_billing_contact: isBillingContact,
          is_technical_contact: isTechnicalContact,
        });

        if (!result.ok) {
          setError(result.error ?? 'שגיאה בעדכון איש קשר');
          return;
        }

        onSuccess();
        onClose();
      } catch (err) {
        console.error('Failed to update contact:', err);
        setError('שגיאה לא צפויה');
      }
    });
  };

  const displayName = contact.user?.full_name ?? contact.user?.email ?? 'איש קשר';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserCog className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">עריכת איש קשר</h2>
              <p className="text-sm text-gray-500">{displayName} • {clientName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ec-role">תפקיד במערכת</Label>
              <select
                id="ec-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isPending}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="contact">איש קשר</option>
                <option value="primary">איש קשר ראשי</option>
                <option value="billing">חיובים</option>
                <option value="technical">טכני</option>
              </select>
            </div>
            <div>
              <Label htmlFor="ec-title">תפקיד בחברה</Label>
              <Input
                id="ec-title"
                type="text"
                placeholder='מנכ"ל, מנהל IT...'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPending}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="ec-dept">מחלקה</Label>
            <Input
              id="ec-dept"
              type="text"
              placeholder="IT, שיווק, כספים..."
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={isPending}
              className="mt-1"
            />
          </div>

          <div className="space-y-3 pt-1">
            <p className="text-sm font-semibold text-gray-700 border-b pb-2">הגדרות</p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ec-primary"
                checked={isPrimary}
                onCheckedChange={(v: boolean) => setIsPrimary(v)}
                disabled={isPending}
              />
              <Label htmlFor="ec-primary" className="cursor-pointer">איש קשר ראשי</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ec-billing"
                checked={isBillingContact}
                onCheckedChange={(v: boolean) => setIsBillingContact(v)}
                disabled={isPending}
              />
              <Label htmlFor="ec-billing" className="cursor-pointer">איש קשר לחיובים</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ec-technical"
                checked={isTechnicalContact}
                onCheckedChange={(v: boolean) => setIsTechnicalContact(v)}
                disabled={isPending}
              />
              <Label htmlFor="ec-technical" className="cursor-pointer">איש קשר טכני</Label>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  שומר...
                </>
              ) : (
                'שמור שינויים'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              ביטול
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
