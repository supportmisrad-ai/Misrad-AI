'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { X, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

type EditOrganizationModalProps = {
  isOpen: boolean;
  organization: {
    id: string;
    name: string;
    slug?: string | null;
    has_nexus?: boolean | null;
    has_social?: boolean | null;
    has_finance?: boolean | null;
    has_client?: boolean | null;
    has_operations?: boolean | null;
    is_shabbat_protected?: boolean;
  };
  onClose: () => void;
  onSuccess: () => void;
};

export default function EditOrganizationModal({ isOpen, organization, onClose, onSuccess }: EditOrganizationModalProps) {
  const [isPending, startTransition] = useTransition();
  
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [hasNexus, setHasNexus] = useState(true);
  const [hasSocial, setHasSocial] = useState(false);
  const [hasFinance, setHasFinance] = useState(false);
  const [hasClient, setHasClient] = useState(false);
  const [hasOperations, setHasOperations] = useState(false);
  const [isShabatProtected, setIsShabatProtected] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && organization) {
      setOrgName(organization.name || '');
      setOrgSlug(organization.slug || '');
      setHasNexus(organization.has_nexus ?? true);
      setHasSocial(organization.has_social ?? false);
      setHasFinance(organization.has_finance ?? false);
      setHasClient(organization.has_client ?? false);
      setHasOperations(organization.has_operations ?? false);
      setIsShabatProtected(organization.is_shabbat_protected ?? true);
    }
  }, [isOpen, organization]);
  useBackButtonClose(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!orgName.trim()) {
      setError('שם ארגון הוא שדה חובה');
      return;
    }

    startTransition(async () => {
      try {
        const { updateOrganization } = await import('@/app/actions/business-clients');
        
        const result = await updateOrganization(organization.id, {
          name: orgName.trim(),
          slug: orgSlug.trim() || undefined,
          has_nexus: hasNexus,
          has_social: hasSocial,
          has_finance: hasFinance,
          has_client: hasClient,
          has_operations: hasOperations,
          is_shabbat_protected: isShabatProtected,
        });

        if (!result.ok) {
          setError(result.error || 'שגיאה בעדכון ארגון');
          return;
        }

        onSuccess();
        onClose();
      } catch (err) {
        console.error('Failed to update organization:', err);
        setError('שגיאה לא צפויה');
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
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">עריכת ארגון</h2>
              <p className="text-sm text-slate-500">{organization.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isPending}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-700 border-b pb-2">פרטי ארגון</div>
            <div>
              <Label htmlFor="orgName">שם ארגון *</Label>
              <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} disabled={isPending} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="orgSlug">Slug (מזהה ייחודי)</Label>
              <Input id="orgSlug" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} disabled={isPending} className="mt-1" />
              <p className="text-xs text-slate-500 mt-1">אזהרה: שינוי slug יכול לשבור קישורים קיימים</p>
            </div>
          </div>

          {/* Modules */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-700 border-b pb-2">מודולים פעילים</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Checkbox id="hasNexus" checked={hasNexus} onCheckedChange={(checked) => setHasNexus(checked as boolean)} disabled={isPending} />
                <Label htmlFor="hasNexus" className="cursor-pointer">✅ Nexus (ניהול צוות ומשימות)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="hasSocial" checked={hasSocial} onCheckedChange={(checked) => setHasSocial(checked as boolean)} disabled={isPending} />
                <Label htmlFor="hasSocial" className="cursor-pointer">📱 Social Media (ניהול תוכן)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="hasFinance" checked={hasFinance} onCheckedChange={(checked) => setHasFinance(checked as boolean)} disabled={isPending} />
                <Label htmlFor="hasFinance" className="cursor-pointer">💰 Finance (כספים)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="hasClient" checked={hasClient} onCheckedChange={(checked) => setHasClient(checked as boolean)} disabled={isPending} />
                <Label htmlFor="hasClient" className="cursor-pointer">👥 Client (ניהול לקוחות)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="hasOperations" checked={hasOperations} onCheckedChange={(checked) => setHasOperations(checked as boolean)} disabled={isPending} />
                <Label htmlFor="hasOperations" className="cursor-pointer">⚙️ Operations (תפעול)</Label>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-700 border-b pb-2">הגדרות</div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Checkbox id="isShabatProtected" checked={isShabatProtected} onCheckedChange={(checked) => setIsShabatProtected(checked as boolean)} disabled={isPending} className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="isShabatProtected" className="cursor-pointer font-medium">🕎 החרגת שבת</Label>
                <p className="text-xs text-slate-700 mt-1">חסימת פעולות במערכת בשבת ומועדים</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">{error}</div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />שומר...</>) : (<><Building2 className="w-4 h-4 mr-2" />שמור שינויים</>)}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>ביטול</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
