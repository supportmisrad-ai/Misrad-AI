'use client';

import React, { useState } from 'react';
import { Check, ArrowRight, ArrowLeft, Building2, Users, Package, UserCog, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import type { SetupCustomerInput } from '@/app/actions/setup-customer-wizard';
import { CustomSelect } from '@/components/CustomSelect';

const STEPS = [
  { id: 1, title: 'פרטי החברה', icon: Building2, description: 'מידע על הלקוח המשלם' },
  { id: 2, title: 'הגדרות ארגון', icon: Users, description: 'שם וסלאג לארגון' },
  { id: 3, title: 'חבילה ומודולים', icon: Package, description: 'תכנית ותוספות' },
  { id: 4, title: 'מנהל מערכת', icon: UserCog, description: 'בעלים וסיסמה' },
];

const PLANS = [
  { value: '', label: 'ללא חבילה (ניסיון בלבד)', price: '₪0', seats: 1, description: 'ללא עלות, מודול בסיסי אחד' },
  { value: 'solo', label: '🎯 נקסוס בלבד', price: '₪149', seats: 1, description: 'ניהול צוות ומשימות' },
  { value: 'the_closer', label: '💼 מכירות', price: '₪249', seats: 3, description: 'Nexus למכירות ומשימות' },
  { value: 'the_authority', label: '🎨 שיווק ומיתוג', price: '₪349', seats: 5, description: 'Social + Client + Nexus' },
  { value: 'the_operator', label: '🔧 תפעול ושטח', price: '₪349', seats: 5, description: 'Finance + Operations + Nexus' },
  { value: 'the_empire', label: '👑 הכל כלול', price: '₪499', seats: 5, description: 'כל המודולים ללא הגבלה' },
  { value: 'custom', label: '⚙️ מותאם אישית', price: 'משתנה', seats: 5, description: 'בחר מודולים ומחיר בעצמך' },
];

const LEGAL_ENTITY_TYPES = ['עוסק מורשה', 'חברה בע"מ', 'שותפות', 'עמותה', 'אחר'];
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501+'];
const INDUSTRIES = ['טכנולוגיה', 'שירותים פיננסיים', 'קמעונאות', 'בריאות', 'חינוך', 'נדל"ן', 'ייצור', 'אחר'];

type WizardData = Omit<SetupCustomerInput, 'adminUser'> & {
  adminUser: SetupCustomerInput['adminUser'];
};

export default function SetupCustomerWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [data, setData] = useState<WizardData>({
    businessClient: {
      company_name: '',
      company_name_en: '',
      business_number: '',
      tax_id: '',
      legal_entity_type: '',
      primary_email: '',
      phone: '',
      website: '',
      address_street: '',
      address_city: '',
      address_postal_code: '',
      industry: '',
      company_size: '',
      notes: '',
    },
    organization: {
      name: '',
      slug: '',
      logo: '',
    },
    package: {
      subscription_plan: '',
      seats_allowed: 5,
      trial_days: 7,
      coupon_code: '',
      custom_mrr: 0,
      has_nexus: true,
      has_social: false,
      has_finance: false,
      has_client: false,
      has_operations: false,
      is_shabbat_protected: true,
    },
    adminUser: {
      email: '',
      full_name: '',
      clerk_user_id: '',
    },
  });

  const updateData = (section: keyof WizardData, field: string, value: any) => {
    setData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
    setError('');
  };

  const validateStep = (step: number): boolean => {
    setError('');

    switch (step) {
      case 1:
        if (!data.businessClient.company_name.trim()) {
          setError('שם חברה הוא שדה חובה');
          return false;
        }
        if (!data.businessClient.primary_email.trim()) {
          setError('מייל חברה הוא שדה חובה');
          return false;
        }
        if (!data.businessClient.primary_email.includes('@')) {
          setError('כתובת מייל לא תקינה');
          return false;
        }
        break;

      case 2:
        if (!data.organization.name.trim()) {
          setError('שם ארגון הוא שדה חובה');
          return false;
        }
        break;

      case 3:
        if (data.package.seats_allowed < 1) {
          setError('מספר מקומות חייב להיות לפחות 1');
          return false;
        }
        break;

      case 4:
        if (!data.adminUser.email.trim()) {
          setError('מייל מנהל הוא שדה חובה');
          return false;
        }
        if (!data.adminUser.email.includes('@')) {
          setError('כתובת מייל מנהל לא תקינה');
          return false;
        }
        if (!data.adminUser.full_name.trim()) {
          setError('שם מלא הוא שדה חובה');
          return false;
        }
        break;
    }

    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    setError('');

    try {
      const { setupCompleteCustomer } = await import('@/app/actions/setup-customer-wizard');
      const result = await setupCompleteCustomer(data);

      if (!result.ok) {
        setError(result.error || 'שגיאה בהקמת לקוח');
        return;
      }

      setSuccess(true);

      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = '/app/admin/business-clients';
      }, 2000);
    } catch (err) {
      console.error('Setup failed:', err);
      setError('שגיאה לא צפויה בהקמת לקוח');
    } finally {
      setIsSubmitting(false);
    }
  };

  const autoGenerateSlug = () => {
    if (!data.organization.name.trim()) return;
    const slug = data.organization.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 50);
    updateData('organization', 'slug', slug);
  };

  const handlePlanChange = (plan: string) => {
    updateData('package', 'subscription_plan', plan);

    const selectedPlan = PLANS.find(p => p.value === plan);
    if (selectedPlan) {
      updateData('package', 'seats_allowed', selectedPlan.seats);
    }

    // Custom plan: don't change modules at all
    if (plan === 'custom') {
      return; // Keep current module selections
    }

    // Other plans: MERGE modules (add recommended ones, don't remove existing)
    if (plan === 'the_closer') {
      updateData('package', 'has_nexus', true);
      // Don't disable other modules - just ensure Nexus is on
    } else if (plan === 'the_authority') {
      updateData('package', 'has_nexus', true);
      updateData('package', 'has_social', true);
      updateData('package', 'has_client', true);
      // Keep Finance and Operations if already enabled
    } else if (plan === 'the_operator') {
      updateData('package', 'has_nexus', true);
      updateData('package', 'has_finance', true);
      updateData('package', 'has_operations', true);
      // Keep Social and Client if already enabled
    } else if (plan === 'the_empire') {
      // Enable everything
      updateData('package', 'has_nexus', true);
      updateData('package', 'has_social', true);
      updateData('package', 'has_finance', true);
      updateData('package', 'has_client', true);
      updateData('package', 'has_operations', true);
    } else if (plan === 'solo') {
      // Solo: just ensure at least one module is on
      updateData('package', 'has_nexus', true);
    }
  };

  if (success) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6"
        >
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-12 h-12 text-green-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900">הלקוח הוקם בהצלחה!</h2>
            <p className="text-slate-600">מעביר אותך לדף לקוחות עסקיים...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* Stepper */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-3 flex-1">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-green-600 text-white'
                        : isActive
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-sm font-bold ${
                        isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-slate-500'
                      }`}
                    >
                      {step.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{step.description}</div>
                  </div>
                </div>

                {index < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 bg-slate-200 mx-4 relative top-[-30px]">
                    <div
                      className={`h-full transition-all ${
                        currentStep > step.id ? 'bg-green-600' : 'bg-slate-200'
                      }`}
                      style={{ width: currentStep > step.id ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="sync">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white border border-slate-200 rounded-xl shadow-sm p-8"
        >
          {/* Step 1: Business Client */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">פרטי הלקוח המשלם</h2>
                <p className="text-slate-600">מידע על החברה או הארגון העסקי</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label htmlFor="company_name">שם חברה (עברית) *</Label>
                  <Input
                    id="company_name"
                    value={data.businessClient.company_name}
                    onChange={(e) => updateData('businessClient', 'company_name', e.target.value)}
                    placeholder="לדוגמה: חברת ABC בע״מ"
                    className="mt-2"
                    dir="rtl"
                  />
                </div>

                <div>
                  <Label htmlFor="company_name_en">שם חברה (אנגלית)</Label>
                  <Input
                    id="company_name_en"
                    value={data.businessClient.company_name_en}
                    onChange={(e) => updateData('businessClient', 'company_name_en', e.target.value)}
                    placeholder="ABC Company Ltd."
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="primary_email">מייל ראשי *</Label>
                  <Input
                    id="primary_email"
                    type="email"
                    value={data.businessClient.primary_email}
                    onChange={(e) => updateData('businessClient', 'primary_email', e.target.value)}
                    placeholder="info@company.com"
                    className="mt-2"
                    dir="ltr"
                  />
                </div>

                <div>
                  <Label htmlFor="business_number">מספר עוסק / ח.פ</Label>
                  <Input
                    id="business_number"
                    value={data.businessClient.business_number}
                    onChange={(e) => updateData('businessClient', 'business_number', e.target.value)}
                    placeholder="123456789"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="legal_entity_type">סוג ישות משפטית</Label>
                  <CustomSelect
                    value={data.businessClient.legal_entity_type || ''}
                    onChange={(val) => updateData('businessClient', 'legal_entity_type', val)}
                    placeholder="בחר..."
                    options={LEGAL_ENTITY_TYPES.map((type) => ({ value: type, label: type }))}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">טלפון</Label>
                  <Input
                    id="phone"
                    value={data.businessClient.phone}
                    onChange={(e) => updateData('businessClient', 'phone', e.target.value)}
                    placeholder="03-1234567"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="website">אתר אינטרנט</Label>
                  <Input
                    id="website"
                    value={data.businessClient.website}
                    onChange={(e) => updateData('businessClient', 'website', e.target.value)}
                    placeholder="https://company.com"
                    className="mt-2"
                    dir="ltr"
                  />
                </div>

                <div>
                  <Label htmlFor="industry">תחום עיסוק</Label>
                  <CustomSelect
                    value={data.businessClient.industry || ''}
                    onChange={(val) => updateData('businessClient', 'industry', val)}
                    placeholder="בחר..."
                    options={INDUSTRIES.map((ind) => ({ value: ind, label: ind }))}
                  />
                </div>

                <div>
                  <Label htmlFor="company_size">גודל חברה</Label>
                  <CustomSelect
                    value={data.businessClient.company_size || ''}
                    onChange={(val) => updateData('businessClient', 'company_size', val)}
                    placeholder="בחר..."
                    options={COMPANY_SIZES.map((size) => ({ value: size, label: `${size} עובדים` }))}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="address_street">כתובת רחוב</Label>
                  <Input
                    id="address_street"
                    value={data.businessClient.address_street}
                    onChange={(e) => updateData('businessClient', 'address_street', e.target.value)}
                    placeholder="רחוב הרצל 123"
                    className="mt-2"
                    dir="rtl"
                  />
                </div>

                <div>
                  <Label htmlFor="address_city">עיר</Label>
                  <Input
                    id="address_city"
                    value={data.businessClient.address_city}
                    onChange={(e) => updateData('businessClient', 'address_city', e.target.value)}
                    placeholder="תל אביב"
                    className="mt-2"
                    dir="rtl"
                  />
                </div>

                <div>
                  <Label htmlFor="address_postal_code">מיקוד</Label>
                  <Input
                    id="address_postal_code"
                    value={data.businessClient.address_postal_code}
                    onChange={(e) => updateData('businessClient', 'address_postal_code', e.target.value)}
                    placeholder="1234567"
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Organization */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">הגדרות ארגון</h2>
                <p className="text-slate-600">שם וסלאג לארגון שיתחבר ללקוח העסקי</p>
              </div>

              <div className="space-y-6 max-w-2xl">
                <div>
                  <Label htmlFor="org_name">שם ארגון *</Label>
                  <Input
                    id="org_name"
                    value={data.organization.name}
                    onChange={(e) => updateData('organization', 'name', e.target.value)}
                    placeholder="לדוגמה: מחלקת שיווק - ABC"
                    className="mt-2"
                    dir="rtl"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    הארגון ישויך ללקוח העסקי "{data.businessClient.company_name || '...'}"
                  </p>
                </div>

                <div>
                  <Label htmlFor="org_slug">Slug (מזהה ייחודי)</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="org_slug"
                      value={data.organization.slug}
                      onChange={(e) => updateData('organization', 'slug', e.target.value)}
                      placeholder="abc-marketing"
                      className="flex-1"
                      dir="ltr"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={autoGenerateSlug}
                      disabled={!data.organization.name.trim()}
                    >
                      <Sparkles className="w-4 h-4 ml-2" />
                      יצירה אוטומטית
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    אם ריק, המערכת תייצר slug ייחודי אוטומטית
                  </p>
                </div>

                <div>
                  <Label htmlFor="logo">URL לוגו (אופציונלי)</Label>
                  <Input
                    id="logo"
                    value={data.organization.logo}
                    onChange={(e) => updateData('organization', 'logo', e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="mt-2"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Package & Modules */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">חבילה ומודולים</h2>
                <p className="text-slate-600">בחר את תכנית המנוי והמודולים הפעילים</p>
              </div>

              <div className="space-y-6">
                {/* Plans */}
                <div>
                  <Label className="text-base font-bold">חבילת מנוי</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {PLANS.map((plan) => (
                      <button
                        key={plan.value}
                        type="button"
                        onClick={() => handlePlanChange(plan.value)}
                        className={`p-4 border-2 rounded-xl text-right transition-all ${
                          data.package.subscription_plan === plan.value
                            ? 'border-blue-600 bg-blue-50 shadow-md'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-lg font-bold text-slate-900">{plan.label}</div>
                        <div className="text-2xl font-black text-blue-600 mt-2">{plan.price}</div>
                        <div className="text-xs text-slate-500 mt-1">{plan.description}</div>
                        <div className="text-sm text-slate-600 mt-2 font-medium">{plan.seats} מקומות</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seats & Trial & MRR */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="seats_allowed">מספר מקומות</Label>
                    <Input
                      id="seats_allowed"
                      type="number"
                      min="1"
                      max="999"
                      value={data.package.seats_allowed}
                      onChange={(e) => updateData('package', 'seats_allowed', parseInt(e.target.value) || 1)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="trial_days">ימי ניסיון</Label>
                    <Input
                      id="trial_days"
                      type="number"
                      min="0"
                      max="365"
                      value={data.package.trial_days}
                      onChange={(e) => updateData('package', 'trial_days', parseInt(e.target.value) || 7)}
                      className="mt-2"
                    />
                  </div>

                  {data.package.subscription_plan === 'custom' && (
                    <div>
                      <Label htmlFor="custom_mrr">MRR מותאם (₪)</Label>
                      <Input
                        id="custom_mrr"
                        type="number"
                        min="0"
                        max="99999"
                        value={data.package.custom_mrr}
                        onChange={(e) => updateData('package', 'custom_mrr', parseInt(e.target.value) || 0)}
                        placeholder="499"
                        className="mt-2"
                      />
                      <p className="text-xs text-slate-500 mt-1">מחיר חודשי בשקלים</p>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="coupon_code">קוד קופון</Label>
                    <Input
                      id="coupon_code"
                      value={data.package.coupon_code}
                      onChange={(e) => updateData('package', 'coupon_code', e.target.value.toUpperCase())}
                      placeholder="DISCOUNT20"
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Modules */}
                <div>
                  <Label className="text-base font-bold">מודולים פעילים</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg">
                      <Checkbox
                        id="has_nexus"
                        checked={data.package.has_nexus}
                        onCheckedChange={(checked) => updateData('package', 'has_nexus', checked)}
                      />
                      <Label htmlFor="has_nexus" className="cursor-pointer flex-1">
                        <div className="font-bold">✅ Nexus</div>
                        <div className="text-xs text-slate-600">ניהול צוות ומשימות</div>
                      </Label>
                    </div>

                    <div className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg">
                      <Checkbox
                        id="has_social"
                        checked={data.package.has_social}
                        onCheckedChange={(checked) => updateData('package', 'has_social', checked)}
                      />
                      <Label htmlFor="has_social" className="cursor-pointer flex-1">
                        <div className="font-bold">📱 Social Media</div>
                        <div className="text-xs text-slate-600">ניהול תוכן ברשתות</div>
                      </Label>
                    </div>

                    <div className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg">
                      <Checkbox
                        id="has_finance"
                        checked={data.package.has_finance}
                        onCheckedChange={(checked) => updateData('package', 'has_finance', checked)}
                      />
                      <Label htmlFor="has_finance" className="cursor-pointer flex-1">
                        <div className="font-bold">💰 Finance</div>
                        <div className="text-xs text-slate-600">כספים וחשבוניות</div>
                      </Label>
                    </div>

                    <div className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg">
                      <Checkbox
                        id="has_client"
                        checked={data.package.has_client}
                        onCheckedChange={(checked) => updateData('package', 'has_client', checked)}
                      />
                      <Label htmlFor="has_client" className="cursor-pointer flex-1">
                        <div className="font-bold">👥 Client</div>
                        <div className="text-xs text-slate-600">ניהול לקוחות</div>
                      </Label>
                    </div>

                    <div className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg">
                      <Checkbox
                        id="has_operations"
                        checked={data.package.has_operations}
                        onCheckedChange={(checked) => updateData('package', 'has_operations', checked)}
                      />
                      <Label htmlFor="has_operations" className="cursor-pointer flex-1">
                        <div className="font-bold">⚙️ Operations</div>
                        <div className="text-xs text-slate-600">תפעול ושטח</div>
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Shabbat Protection - always on */}
                <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
                  <div className="font-bold text-sm text-violet-800">🕎 סגירת שבת</div>
                  <div className="text-xs text-violet-700 mt-1">
                    המערכת סגורה בשבת לכל הארגונים. פטור רפואי ניתן להגדיר בדף פרטי ארגון.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Admin User */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">מנהל מערכת</h2>
                <p className="text-slate-600">פרטי המשתמש שיהיה בעלים של הארגון</p>
              </div>

              <div className="space-y-6 max-w-2xl">
                <div>
                  <Label htmlFor="admin_full_name">שם מלא *</Label>
                  <Input
                    id="admin_full_name"
                    value={data.adminUser.full_name}
                    onChange={(e) => updateData('adminUser', 'full_name', e.target.value)}
                    placeholder="ישראל ישראלי"
                    className="mt-2"
                    dir="rtl"
                  />
                </div>

                <div>
                  <Label htmlFor="admin_email">מייל *</Label>
                  <Input
                    id="admin_email"
                    type="email"
                    value={data.adminUser.email}
                    onChange={(e) => updateData('adminUser', 'email', e.target.value)}
                    placeholder="israel@company.com"
                    className="mt-2"
                    dir="ltr"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    המשתמש יקבל הזמנה להצטרף למערכת במייל הזה
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h4 className="font-bold text-blue-900 mb-2">סיכום הקמה:</h4>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>✓ לקוח עסקי: {data.businessClient.company_name || '...'}</li>
                    <li>✓ ארגון: {data.organization.name || '...'}</li>
                    <li>✓ חבילה: {PLANS.find(p => p.value === data.package.subscription_plan)?.label || 'ניסיון'}</li>
                    <li>✓ מקומות: {data.package.seats_allowed}</li>
                    <li>✓ מנהל: {data.adminUser.full_name || '...'}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1 || isSubmitting}
            >
              <ArrowRight className="w-4 h-4 ml-2" />
              הקודם
            </Button>

            {currentStep < 4 ? (
              <Button type="button" onClick={nextStep} disabled={isSubmitting}>
                הבא
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    מקים לקוח...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 ml-2" />
                    הקם לקוח
                  </>
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
