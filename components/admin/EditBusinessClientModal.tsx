'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { X, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type EditBusinessClientModalProps = {
  isOpen: boolean;
  client: {
    id: string;
    company_name: string;
    company_name_en?: string | null;
    business_number?: string | null;
    tax_id?: string | null;
    legal_entity_type?: string | null;
    primary_email: string;
    phone?: string | null;
    website?: string | null;
    address_street?: string | null;
    address_city?: string | null;
    address_postal_code?: string | null;
    industry?: string | null;
    company_size?: string | null;
    lead_source?: string | null;
    notes?: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
};

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];
const INDUSTRIES = ['טכנולוגיה', 'שירותים פיננסיים', 'קמעונאות', 'בריאות', 'חינוך', 'נדל"ן', 'ייצור', 'תיירות ואירוח', 'שירותים מקצועיים', 'אחר'];
const LEGAL_ENTITY_TYPES = ['עוסק מורשה', 'חברה בע"מ', 'שותפות', 'עמותה', 'אחר'];

export default function EditBusinessClientModal({ isOpen, client, onClose, onSuccess }: EditBusinessClientModalProps) {
  const [isPending, startTransition] = useTransition();
  
  const [companyName, setCompanyName] = useState('');
  const [companyNameEn, setCompanyNameEn] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [legalEntityType, setLegalEntityType] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressPostalCode, setAddressPostalCode] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [leadSource, setLeadSource] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && client) {
      setCompanyName(client.company_name || '');
      setCompanyNameEn(client.company_name_en || '');
      setBusinessNumber(client.business_number || '');
      setTaxId(client.tax_id || '');
      setLegalEntityType(client.legal_entity_type || '');
      setPrimaryEmail(client.primary_email || '');
      setPhone(client.phone || '');
      setWebsite(client.website || '');
      setAddressStreet(client.address_street || '');
      setAddressCity(client.address_city || '');
      setAddressPostalCode(client.address_postal_code || '');
      setIndustry(client.industry || '');
      setCompanySize(client.company_size || '');
      setLeadSource(client.lead_source || '');
      setNotes(client.notes || '');
    }
  }, [isOpen, client]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!companyName.trim()) {
      setError('שם חברה הוא שדה חובה');
      return;
    }

    if (!primaryEmail.trim() || !primaryEmail.includes('@')) {
      setError('כתובת מייל לא תקינה');
      return;
    }

    startTransition(async () => {
      try {
        const { updateBusinessClient } = await import('@/app/actions/business-clients');
        
        const result = await updateBusinessClient(client.id, {
          company_name: companyName.trim(),
          company_name_en: companyNameEn.trim() || undefined,
          business_number: businessNumber.trim() || undefined,
          tax_id: taxId.trim() || undefined,
          legal_entity_type: legalEntityType || undefined,
          primary_email: primaryEmail.trim(),
          phone: phone.trim() || undefined,
          website: website.trim() || undefined,
          address_street: addressStreet.trim() || undefined,
          address_city: addressCity.trim() || undefined,
          address_postal_code: addressPostalCode.trim() || undefined,
          industry: industry || undefined,
          company_size: companySize || undefined,
          lead_source: leadSource.trim() || undefined,
          notes: notes.trim() || undefined,
        });

        if (!result.ok) {
          setError(result.error || 'שגיאה בעדכון לקוח עסקי');
          return;
        }

        onSuccess();
        onClose();
      } catch (err) {
        console.error('Failed to update business client:', err);
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
      <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">עריכת לקוח עסקי</h2>
              <p className="text-sm text-gray-500">{client.company_name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isPending}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-700 border-b pb-2">מידע בסיסי</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">שם חברה (עברית) *</Label>
                <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={isPending} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="companyNameEn">שם חברה (אנגלית)</Label>
                <Input id="companyNameEn" value={companyNameEn} onChange={(e) => setCompanyNameEn(e.target.value)} disabled={isPending} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="businessNumber">מספר עוסק / ח.פ</Label>
                <Input id="businessNumber" value={businessNumber} onChange={(e) => setBusinessNumber(e.target.value)} disabled={isPending} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="taxId">מספר זיהוי מס</Label>
                <Input id="taxId" value={taxId} onChange={(e) => setTaxId(e.target.value)} disabled={isPending} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="legalEntityType">סוג ישות משפטית</Label>
                <select id="legalEntityType" value={legalEntityType} onChange={(e) => setLegalEntityType(e.target.value)} disabled={isPending} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="">בחר...</option>
                  {LEGAL_ENTITY_TYPES.map((type) => (<option key={type} value={type}>{type}</option>))}
                </select>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-700 border-b pb-2">פרטי התקשרות</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="primaryEmail">מייל ראשי *</Label>
                <Input id="primaryEmail" type="email" value={primaryEmail} onChange={(e) => setPrimaryEmail(e.target.value)} disabled={isPending} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="phone">טלפון</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isPending} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="website">אתר אינטרנט</Label>
                <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} disabled={isPending} className="mt-1" />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-700 border-b pb-2">כתובת</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="addressStreet">רחוב</Label>
                <Input id="addressStreet" value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} disabled={isPending} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="addressPostalCode">מיקוד</Label>
                <Input id="addressPostalCode" value={addressPostalCode} onChange={(e) => setAddressPostalCode(e.target.value)} disabled={isPending} className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="addressCity">עיר</Label>
              <Input id="addressCity" value={addressCity} onChange={(e) => setAddressCity(e.target.value)} disabled={isPending} className="mt-1" />
            </div>
          </div>

          {/* Business Details */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-700 border-b pb-2">פרטים עסקיים</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="industry">תחום עיסוק</Label>
                <select id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} disabled={isPending} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="">בחר...</option>
                  {INDUSTRIES.map((ind) => (<option key={ind} value={ind}>{ind}</option>))}
                </select>
              </div>
              <div>
                <Label htmlFor="companySize">גודל חברה</Label>
                <select id="companySize" value={companySize} onChange={(e) => setCompanySize(e.target.value)} disabled={isPending} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="">בחר...</option>
                  {COMPANY_SIZES.map((size) => (<option key={size} value={size}>{size} עובדים</option>))}
                </select>
              </div>
              <div>
                <Label htmlFor="leadSource">מקור ליד</Label>
                <Input id="leadSource" value={leadSource} onChange={(e) => setLeadSource(e.target.value)} disabled={isPending} className="mt-1" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">הערות</Label>
            <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isPending} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />שומר שינויים...</>) : (<><Building2 className="w-4 h-4 mr-2" />שמור שינויים</>)}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>ביטול</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
