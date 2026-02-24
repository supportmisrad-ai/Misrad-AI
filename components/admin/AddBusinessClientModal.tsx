'use client';

import React, { useState, useTransition } from 'react';
import { X, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';
import { CustomSelect } from '@/components/CustomSelect';

type AddBusinessClientModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const COMPANY_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000+',
];

const INDUSTRIES = [
  'טכנולוגיה',
  'שירותים פיננסיים',
  'קמעונאות',
  'בריאות',
  'חינוך',
  'נדל"ן',
  'ייצור',
  'תיירות ואירוח',
  'שירותים מקצועיים',
  'אחר',
];

const LEGAL_ENTITY_TYPES = [
  'עוסק מורשה',
  'חברה בע"מ',
  'שותפות',
  'עמותה',
  'אחר',
];

export default function AddBusinessClientModal({ isOpen, onClose, onSuccess }: AddBusinessClientModalProps) {
  const [isPending, startTransition] = useTransition();
  
  // Basic Info
  const [companyName, setCompanyName] = useState('');
  const [companyNameEn, setCompanyNameEn] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [legalEntityType, setLegalEntityType] = useState('');
  
  // Contact Info
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  
  // Address
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressPostalCode, setAddressPostalCode] = useState('');
  
  // Business Details
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [leadSource, setLeadSource] = useState('');
  const [notes, setNotes] = useState('');
  
  const [error, setError] = useState('');
  useBackButtonClose(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!companyName.trim()) {
      setError('שם חברה הוא שדה חובה');
      return;
    }

    if (!primaryEmail.trim()) {
      setError('מייל הוא שדה חובה');
      return;
    }

    if (!primaryEmail.includes('@')) {
      setError('כתובת מייל לא תקינה');
      return;
    }

    startTransition(async () => {
      try {
        const { createBusinessClient } = await import('@/app/actions/business-clients');
        
        const result = await createBusinessClient({
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
          address_country: 'ישראל',
          industry: industry || undefined,
          company_size: companySize || undefined,
          lead_source: leadSource.trim() || undefined,
          notes: notes.trim() || undefined,
        });

        if (!result.ok) {
          setError(result.error || 'שגיאה ביצירת לקוח עסקי');
          return;
        }

        // Success
        onSuccess();
        onClose();
        
        // Reset form
        resetForm();
      } catch (err) {
        console.error('Failed to create business client:', err);
        setError('שגיאה לא צפויה ביצירת לקוח עסקי');
      }
    });
  };

  const resetForm = () => {
    setCompanyName('');
    setCompanyNameEn('');
    setBusinessNumber('');
    setTaxId('');
    setLegalEntityType('');
    setPrimaryEmail('');
    setPhone('');
    setWebsite('');
    setAddressStreet('');
    setAddressCity('');
    setAddressPostalCode('');
    setIndustry('');
    setCompanySize('');
    setLeadSource('');
    setNotes('');
  };

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">הוספת לקוח עסקי</h2>
              <p className="text-sm text-slate-500">חברה/ארגון עסקי (B2B)</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isPending}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
              מידע בסיסי
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">שם חברה (עברית) *</Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="לדוגמה: חברת ABC בע״מ"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={isPending}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="companyNameEn">שם חברה (אנגלית)</Label>
                <Input
                  id="companyNameEn"
                  type="text"
                  placeholder="ABC Company Ltd."
                  value={companyNameEn}
                  onChange={(e) => setCompanyNameEn(e.target.value)}
                  disabled={isPending}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="businessNumber">מספר עוסק / ח.פ</Label>
                <Input
                  id="businessNumber"
                  type="text"
                  placeholder="123456789"
                  value={businessNumber}
                  onChange={(e) => setBusinessNumber(e.target.value)}
                  disabled={isPending}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="taxId">מספר זיהוי מס</Label>
                <Input
                  id="taxId"
                  type="text"
                  placeholder="123456789"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  disabled={isPending}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="legalEntityType">סוג ישות משפטית</Label>
                <CustomSelect
                  value={legalEntityType}
                  onChange={(val) => setLegalEntityType(val)}
                  disabled={isPending}
                  placeholder="בחר..."
                  options={LEGAL_ENTITY_TYPES.map((type) => ({ value: type, label: type }))}
                />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
              פרטי התקשרות
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="primaryEmail">מייל ראשי *</Label>
                <Input
                  id="primaryEmail"
                  type="email"
                  placeholder="info@company.com"
                  value={primaryEmail}
                  onChange={(e) => setPrimaryEmail(e.target.value)}
                  disabled={isPending}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phone">טלפון</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="03-1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isPending}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="website">אתר אינטרנט</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://company.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  disabled={isPending}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
              כתובת
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="addressStreet">רחוב</Label>
                <Input
                  id="addressStreet"
                  type="text"
                  placeholder="רחוב הרצל 123"
                  value={addressStreet}
                  onChange={(e) => setAddressStreet(e.target.value)}
                  disabled={isPending}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="addressPostalCode">מיקוד</Label>
                <Input
                  id="addressPostalCode"
                  type="text"
                  placeholder="1234567"
                  value={addressPostalCode}
                  onChange={(e) => setAddressPostalCode(e.target.value)}
                  disabled={isPending}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="addressCity">עיר</Label>
              <Input
                id="addressCity"
                type="text"
                placeholder="תל אביב"
                value={addressCity}
                onChange={(e) => setAddressCity(e.target.value)}
                disabled={isPending}
                className="mt-1"
              />
            </div>
          </div>

          {/* Business Details */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
              פרטים עסקיים
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="industry">תחום עיסוק</Label>
                <CustomSelect
                  value={industry}
                  onChange={(val) => setIndustry(val)}
                  disabled={isPending}
                  placeholder="בחר..."
                  options={INDUSTRIES.map((ind) => ({ value: ind, label: ind }))}
                />
              </div>

              <div>
                <Label htmlFor="companySize">גודל חברה</Label>
                <CustomSelect
                  value={companySize}
                  onChange={(val) => setCompanySize(val)}
                  disabled={isPending}
                  placeholder="בחר..."
                  options={COMPANY_SIZES.map((size) => ({ value: size, label: `${size} עובדים` }))}
                />
              </div>

              <div>
                <Label htmlFor="leadSource">מקור ליד</Label>
                <Input
                  id="leadSource"
                  type="text"
                  placeholder="לדוגמה: המלצה, אתר, תערוכה"
                  value={leadSource}
                  onChange={(e) => setLeadSource(e.target.value)}
                  disabled={isPending}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">הערות</Label>
            <textarea
              id="notes"
              rows={3}
              placeholder="הערות נוספות..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>שלב הבא:</strong> לאחר יצירת הלקוח העסקי, תוכל להוסיף אנשי קשר וליצור ארגונים עבורו.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  יוצר לקוח עסקי...
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4 mr-2" />
                  צור לקוח עסקי
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
