'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { safeBrowserUrl } from '@/lib/shared/safe-browser-url';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Package,
  Users,
  CreditCard,
  Save,
  Loader2,
  Trash2,
  Plus,
  Calendar,
  CircleAlert,
  CircleCheckBig,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CustomSelect } from '@/components/CustomSelect';
import { Checkbox } from '@/components/ui/checkbox';
import {
  updateOrganizationSettings,
  updateOrganizationPackage,
  updateOrganizationUserRole,
  removeUserFromOrganization,
  extendOrganizationTrial,
  updateOrganizationBusinessClientDetails,
  deactivateOrganization,
  reactivateOrganization,
} from '@/app/actions/manage-organization';
import { generatePaymentLink, adjustBalanceManually, getOrganizationInvoices, createOrganizationInvoice, type AdminInvoice } from '@/app/actions/app-billing';

type Tab = 'settings' | 'package' | 'users' | 'billing' | 'business_client';

type OrganizationData = {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  seats_allowed: number | null;
  mrr?: any;
  balance?: any;
  trial_start_date: Date | null;
  trial_days: number | null;
  trial_extended_days: number | null;
  discount_percent: number | null;
  has_nexus: boolean | null;
  has_social: boolean | null;
  has_finance: boolean | null;
  has_client: boolean | null;
  has_operations: boolean | null;
  is_shabbat_protected: boolean | null;
  owner: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  business_client: {
    id: string;
    company_name: string;
    business_number: string | null;
    tax_id: string | null;
    primary_email: string;
    phone: string | null;
    website: string | null;
    address_street: string | null;
    address_city: string | null;
    address_postal_code: string | null;
    address_country: string | null;
    billing_contact_name: string | null;
  } | null;
  organizationUsers: {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    created_at: Date | null;
  }[];
};

const PLANS = [
  { value: '', label: 'ללא חבילה (ניסיון בלבד)', price: '₪0', seats: 1 },
  { value: 'solo', label: '🎯 מודול בודד', price: '₪149', seats: 1 },
  { value: 'the_closer', label: '💼 מכירות', price: '₪249', seats: 3 },
  { value: 'the_authority', label: '🎨 שיווק ומיתוג', price: '₪349', seats: 5 },
  { value: 'the_operator', label: '🔧 תפעול ושטח', price: '₪349', seats: 5 },
  { value: 'the_empire', label: '👑 הכל כלול', price: '₪499', seats: 5 },
  { value: 'custom', label: '⚙️ מותאם אישית', price: 'משתנה', seats: 5 },
];

const ROLES = [
  { value: 'owner', label: 'בעלים', color: 'bg-purple-100 text-purple-800' },
  { value: 'admin', label: 'מנהל', color: 'bg-blue-100 text-blue-800' },
  { value: 'team_member', label: 'חבר צוות', color: 'bg-slate-100 text-slate-800' },
];

export default function ManageOrganizationClient({ initialData }: { initialData: OrganizationData }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('settings');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab 1: Settings
  const [settingsData, setSettingsData] = useState({
    name: initialData.name,
    slug: initialData.slug,
    logo: initialData.logo || '',
  });

  // Tab 2: Package
  const [packageData, setPackageData] = useState({
    subscription_plan: initialData.subscription_plan || '',
    seats_allowed: initialData.seats_allowed,
    custom_mrr: initialData.mrr ? parseFloat(initialData.mrr) : 0,
    has_nexus: initialData.has_nexus,
    has_social: initialData.has_social,
    has_finance: initialData.has_finance,
    has_client: initialData.has_client,
    has_operations: initialData.has_operations,
  });

  // Tab 4: Billing
  const [trialDaysToExtend, setTrialDaysToExtend] = useState(7);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  // Balance adjustment
  const [showBalanceAdjustment, setShowBalanceAdjustment] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentMethod, setAdjustmentMethod] = useState<'cash' | 'bit' | 'bank_transfer' | 'check' | 'correction'>('cash');
  const [adjustingBalance, setAdjustingBalance] = useState(false);

  // Invoice History
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesLoaded, setInvoicesLoaded] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  // Tab 5: Business Client Details
  const [businessClientData, setBusinessClientData] = useState({
    company_name: initialData.business_client?.company_name || '',
    business_number: initialData.business_client?.business_number || '',
    tax_id: initialData.business_client?.tax_id || '',
    address_street: initialData.business_client?.address_street || '',
    address_city: initialData.business_client?.address_city || '',
    address_postal_code: initialData.business_client?.address_postal_code || '',
    address_country: initialData.business_client?.address_country || 'ישראל',
    phone: initialData.business_client?.phone || '',
    primary_email: initialData.business_client?.primary_email || '',
    billing_contact_name: initialData.business_client?.billing_contact_name || '',
  });

  // Deactivate Organization (soft)
  const [isDeactivating, setIsDeactivating] = useState(false);

  const tabs = [
    { id: 'settings' as Tab, label: 'הגדרות', icon: Settings },
    { id: 'package' as Tab, label: 'חבילה ומודולים', icon: Package },
    { id: 'users' as Tab, label: 'משתמשים', icon: Users },
    { id: 'billing' as Tab, label: 'חיוב', icon: CreditCard },
    { id: 'business_client' as Tab, label: 'פרטי לקוח עסקי', icon: Building2 },
  ];

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Calculate trial status
  const calculateTrialStatus = () => {
    if (!initialData.trial_start_date) return null;

    const trialStart = new Date(initialData.trial_start_date);
    const totalTrialDays = (initialData.trial_days || 0) + (initialData.trial_extended_days || 0);
    const trialEnd = new Date(trialStart.getTime() + totalTrialDays * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    return {
      daysRemaining,
      totalDays: totalTrialDays,
      isActive: daysRemaining > 0,
      endDate: trialEnd.toLocaleDateString('he-IL'),
    };
  };

  const trialStatus = calculateTrialStatus();

  // Load invoices when billing tab becomes active
  const loadInvoices = async (force = false) => {
    if (!force && (invoicesLoaded || invoicesLoading)) return;
    setInvoicesLoading(true);
    try {
      const result = await getOrganizationInvoices(initialData.id);
      if (result.success && result.data) {
        setInvoices(result.data);
      }
      setInvoicesLoaded(true);
    } catch {
      // silent
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    setCreatingInvoice(true);
    try {
      const result = await createOrganizationInvoice(initialData.id);
      if (result.success && result.data) {
        showMessage('success', `חשבונית #${result.data.invoiceNumber || 'N/A'} נוצרה ונשלחה בהצלחה!`);
        await loadInvoices(true);
      } else {
        showMessage('error', result.error || 'שגיאה ביצירת חשבונית');
      }
    } catch {
      showMessage('error', 'שגיאה ביצירת חשבונית');
    } finally {
      setCreatingInvoice(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'billing' && !invoicesLoaded) {
      loadInvoices();
    }
  }, [activeTab]);

  // Handlers
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const result = await updateOrganizationSettings(initialData.id, {
        name: settingsData.name,
        slug: settingsData.slug || undefined,
        logo: settingsData.logo,
      });
      if (result.ok) {
        showMessage('success', 'ההגדרות עודכנו בהצלחה');
        router.refresh();
      } else {
        showMessage('error', result.error || 'שגיאה בעדכון הגדרות');
      }
    } catch (error) {
      showMessage('error', 'שגיאה בעדכון הגדרות');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePackage = async () => {
    setSaving(true);
    try {
      const result = await updateOrganizationPackage(initialData.id, {
        ...packageData,
        seats_allowed: packageData.seats_allowed || undefined,
        has_nexus: packageData.has_nexus || undefined,
        has_social: packageData.has_social || undefined,
        has_finance: packageData.has_finance || undefined,
        has_client: packageData.has_client || undefined,
        has_operations: packageData.has_operations || undefined,
      });
      if (result.ok) {
        showMessage('success', 'החבילה והמודולים עודכנו בהצלחה');
        router.refresh();
      } else {
        showMessage('error', result.error || 'שגיאה בעדכון חבילה');
      }
    } catch (error) {
      showMessage('error', 'שגיאה בעדכון חבילה');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeUserRole = async (userId: string, newRole: string) => {
    setSaving(true);
    try {
      const result = await updateOrganizationUserRole(userId, newRole);
      if (result.ok) {
        showMessage('success', 'תפקיד המשתמש עודכן בהצלחה');
        router.refresh();
      } else {
        showMessage('error', result.error || 'שגיאה בעדכון תפקיד');
      }
    } catch (error) {
      showMessage('error', 'שגיאה בעדכון תפקיד');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!confirm(`האם להסיר את ${userName} מהארגון?`)) return;

    setSaving(true);
    try {
      const result = await removeUserFromOrganization(userId);
      if (result.ok) {
        showMessage('success', 'המשתמש הוסר בהצלחה');
        router.refresh();
      } else {
        showMessage('error', result.error || 'שגיאה בהסרת משתמש');
      }
    } catch (error) {
      showMessage('error', 'שגיאה בהסרת משתמש');
    } finally {
      setSaving(false);
    }
  };

  const handleExtendTrial = async () => {
    setSaving(true);
    try {
      const result = await extendOrganizationTrial(initialData.id, trialDaysToExtend);
      if (result.ok) {
        showMessage('success', `תקופת הניסיון הוארכה ב-${trialDaysToExtend} ימים`);
        router.refresh();
      } else {
        showMessage('error', result.error || 'שגיאה בהארכת ניסיון');
      }
    } catch (error) {
      showMessage('error', 'שגיאה בהארכת ניסיון');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePaymentLink = async () => {
    setGeneratingLink(true);
    setPaymentLink(null);
    try {
      const result = await generatePaymentLink(initialData.id);
      if (result.success && result.data) {
        setPaymentLink(result.data.paymentUrl);
        showMessage('success', `קישור תשלום נוצר בהצלחה! חשבונית: ${result.data.invoiceNumber}`);
      } else {
        showMessage('error', result.error || 'שגיאה ביצירת קישור תשלום');
      }
    } catch (error) {
      showMessage('error', 'שגיאה ביצירת קישור תשלום');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleAdjustBalance = async () => {
    const amount = parseFloat(adjustmentAmount);

    if (!Number.isFinite(amount) || amount === 0) {
      showMessage('error', 'יש להזין סכום תקין');
      return;
    }

    if (!adjustmentReason.trim()) {
      showMessage('error', 'יש לציין סיבה לעדכון');
      return;
    }

    setAdjustingBalance(true);
    try {
      const result = await adjustBalanceManually(
        initialData.id,
        amount,
        adjustmentReason.trim(),
        adjustmentMethod
      );

      if (result.success && result.data) {
        showMessage(
          'success',
          `היתרה עודכנה בהצלחה! יתרה חדשה: ₪${result.data.newBalance.toFixed(2)}`
        );
        setShowBalanceAdjustment(false);
        setAdjustmentAmount('');
        setAdjustmentReason('');
        router.refresh();
      } else {
        showMessage('error', result.error || 'שגיאה בעדכון יתרה');
      }
    } catch (error) {
      showMessage('error', 'שגיאה בעדכון יתרה');
    } finally {
      setAdjustingBalance(false);
    }
  };

  const handleSaveBusinessClient = async () => {
    setSaving(true);
    try {
      const result = await updateOrganizationBusinessClientDetails(initialData.id, businessClientData);
      if (result.ok) {
        showMessage('success', 'פרטי הלקוח העסקי עודכנו בהצלחה');
        router.refresh();
      } else {
        showMessage('error', result.error || 'שגיאה בעדכון פרטי לקוח עסקי');
      }
    } catch (error) {
      showMessage('error', 'שגיאה בעדכון פרטי לקוח עסקי');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateOrganization = async () => {
    if (!confirm(`האם לבטל את הארגון "${initialData.name}"? הנתונים יישמרו ותוכל לשחזר בכל עת.`)) return;

    setIsDeactivating(true);
    try {
      const result = await deactivateOrganization(initialData.id);
      if (result.ok) {
        showMessage('success', 'הארגון בוטל בהצלחה — ניתן לשחזר אותו בכל עת');
        router.refresh();
      } else {
        showMessage('error', result.error || 'שגיאה בביטול ארגון');
      }
    } catch (error) {
      showMessage('error', 'שגיאה בביטול ארגון');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleReactivateOrganization = async () => {
    setIsDeactivating(true);
    try {
      const result = await reactivateOrganization(initialData.id);
      if (result.ok) {
        showMessage('success', 'הארגון שוחזר בהצלחה!');
        router.refresh();
      } else {
        showMessage('error', result.error || 'שגיאה בשחזור ארגון');
      }
    } catch (error) {
      showMessage('error', 'שגיאה בשחזור ארגון');
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Message Banner */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`flex items-center gap-3 p-4 rounded-xl border ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CircleCheckBig className="w-5 h-5 shrink-0" />
            ) : (
              <CircleAlert className="w-5 h-5 shrink-0" />
            )}
            <p className="text-sm font-medium">{message.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Organization Header */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex items-start gap-4">
          {initialData.logo ? (
            <img src={safeBrowserUrl(initialData.logo) || '/icons/misrad-icon.svg'} alt={initialData.name} className="w-16 h-16 rounded-xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-black text-slate-900 truncate">{initialData.name}</h2>
            <p className="text-sm text-slate-600 mt-1">/{initialData.slug}</p>
            {initialData.business_client && (
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {initialData.business_client.company_name}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {initialData.business_client.primary_email}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[120px] px-4 py-4 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-2 ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Tab 1: Settings */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <Label htmlFor="name">שם ארגון *</Label>
                  <Input
                    id="name"
                    value={settingsData.name}
                    onChange={(e) => setSettingsData({ ...settingsData, name: e.target.value })}
                    placeholder="שם הארגון"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="slug">סלאג (URL) *</Label>
                  <Input
                    id="slug"
                    value={settingsData.slug || ''}
                    onChange={(e) => setSettingsData({ ...settingsData, slug: e.target.value })}
                    placeholder="my-organization"
                    className="mt-2 font-mono"
                  />
                  <p className="text-xs text-slate-500 mt-1">ישמש לכתובת URL: /{settingsData.slug}</p>
                </div>

                <div>
                  <Label htmlFor="logo">לוגו (URL)</Label>
                  <Input
                    id="logo"
                    value={settingsData.logo}
                    onChange={(e) => setSettingsData({ ...settingsData, logo: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="mt-2"
                  />
                  <p className="text-xs text-slate-500 mt-1">URL ללוגו של הארגון</p>
                </div>

                <Button onClick={handleSaveSettings} disabled={saving} className="w-full sm:w-auto">
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      שומר...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 ml-2" />
                      שמור הגדרות
                    </>
                  )}
                </Button>

                {/* Deactivate / Reactivate Organization Section */}
                <div className="mt-12 pt-8 border-t-2 border-slate-200">
                  {initialData.subscription_status === 'cancelled' ? (
                    <div className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-emerald-100">
                          <CircleCheckBig className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-black text-emerald-900 mb-2">ארגון מבוטל — ניתן לשחזר</h4>
                          <p className="text-sm text-emerald-700 mb-4">
                            הארגון כרגע במצב מבוטל. כל הנתונים שמורים. ניתן לשחזר אותו ולהחזיר את הגישה לכל המשתמשים.
                          </p>
                          <Button
                            onClick={handleReactivateOrganization}
                            disabled={saving || isDeactivating}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            {isDeactivating ? (
                              <>
                                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                משחזר...
                              </>
                            ) : (
                              <>
                                <CircleCheckBig className="w-4 h-4 ml-2" />
                                שחזר ארגון
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-amber-100">
                          <CircleAlert className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-black text-amber-900 mb-2">ביטול ארגון</h4>
                          <p className="text-sm text-amber-700 mb-4">
                            ביטול הארגון יסגור את הגישה למערכת לכל המשתמשים.
                            <br />
                            <strong>הנתונים נשמרים</strong> — ניתן לשחזר את הארגון בכל עת מעמוד זה.
                          </p>
                          <Button
                            onClick={handleDeactivateOrganization}
                            disabled={saving || isDeactivating}
                            variant="outline"
                            className="border-amber-300 text-amber-800 hover:bg-amber-100"
                          >
                            {isDeactivating ? (
                              <>
                                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                מבטל...
                              </>
                            ) : (
                              'בטל ארגון'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Tab 2: Package & Modules */}
            {activeTab === 'package' && (
              <motion.div
                key="package"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <Label htmlFor="plan">חבילת מנוי</Label>
                  <CustomSelect
                    value={packageData.subscription_plan}
                    onChange={(val) => setPackageData({ ...packageData, subscription_plan: val })}
                    options={PLANS.map((plan) => ({ value: plan.value, label: `${plan.label} - ${plan.price}` }))}
                  />
                </div>

                <div>
                  <Label htmlFor="seats">מספר מקומות מותרים</Label>
                  <Input
                    id="seats"
                    type="number"
                    min="1"
                    max="1000"
                    value={packageData.seats_allowed || 1}
                    onChange={(e) => setPackageData({ ...packageData, seats_allowed: parseInt(e.target.value) || 1 })}
                    className="mt-2"
                  />
                </div>

                {packageData.subscription_plan === 'custom' && (
                  <div>
                    <Label htmlFor="custom_mrr">MRR מותאם (₪)</Label>
                    <Input
                      id="custom_mrr"
                      type="number"
                      min="0"
                      max="99999"
                      value={packageData.custom_mrr}
                      onChange={(e) => setPackageData({ ...packageData, custom_mrr: parseFloat(e.target.value) || 0 })}
                      placeholder="499"
                      className="mt-2"
                    />
                    <p className="text-xs text-slate-500 mt-1">מחיר חודשי בשקלים</p>
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-bold text-slate-900">מודולים פעילים</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'has_nexus', label: '📋 Nexus (משימות)', color: 'blue' },
                      { key: 'has_social', label: '🎨 Social (שיווק)', color: 'purple' },
                      { key: 'has_finance', label: '💰 Finance (כספים)', color: 'green' },
                      { key: 'has_client', label: '👥 Client (ניהול לקוחות)', color: 'orange' },
                      { key: 'has_operations', label: '🔧 Operations (תפעול)', color: 'red' },
                    ].map((module) => (
                      <label
                        key={module.key}
                        className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        <Checkbox
                          checked={packageData[module.key as keyof typeof packageData] as boolean}
                          onCheckedChange={(checked) =>
                            setPackageData({ ...packageData, [module.key]: checked })
                          }
                        />
                        <span className="text-sm font-medium text-slate-900">{module.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
                  <div className="font-bold text-sm text-violet-800">🕎 סגירת שבת</div>
                  <div className="text-xs text-violet-700 mt-1">המערכת סגורה בשבת לכל הארגונים. פטור רפואי ניתן להגדיר בדף פרטי ארגון.</div>
                </div>

                <Button onClick={handleSavePackage} disabled={saving} className="w-full sm:w-auto">
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      שומר...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 ml-2" />
                      שמור חבילה
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Tab 3: Users */}
            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">
                    משתמשים ({initialData.organizationUsers.length})
                  </h4>
                  <Button size="sm" variant="outline" disabled>
                    <Plus className="w-4 h-4 ml-2" />
                    הוסף משתמש
                  </Button>
                </div>

                <div className="space-y-3">
                  {initialData.organizationUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{user.full_name || 'ללא שם'}</p>
                        <p className="text-sm text-slate-600 truncate">{user.email}</p>
                      </div>

                      <CustomSelect
                        value={user.role || 'team_member'}
                        onChange={(val) => handleChangeUserRole(user.id, val)}
                        disabled={saving || user.role === 'owner'}
                        options={ROLES.map((role) => ({ value: role.value, label: role.label }))}
                      />

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveUser(user.id, user.full_name || user.email || 'Unknown')}
                        disabled={saving || user.role === 'owner'}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Tab 5: Business Client Details */}
            {activeTab === 'business_client' && (
              <motion.div
                key="business_client"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                  <p className="text-sm text-blue-800">
                    <strong>💼 פרטים לחשבונאות:</strong> המידע כאן ישמש ליצירת חשבוניות ב-MISRAD AI ולניהול חשבונאי
                  </p>
                </div>

                {/* Company Info */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 text-lg">פרטי חברה</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="company_name">שם חברה רשמי (לחשבונית) *</Label>
                      <Input
                        id="company_name"
                        value={businessClientData.company_name}
                        onChange={(e) => setBusinessClientData({ ...businessClientData, company_name: e.target.value })}
                        placeholder="למשל: MISRAD AI בע״מ"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="business_number">מספר עוסק / ח״פ</Label>
                      <Input
                        id="business_number"
                        value={businessClientData.business_number}
                        onChange={(e) => setBusinessClientData({ ...businessClientData, business_number: e.target.value })}
                        placeholder="123456789"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="tax_id">מספר מס (אם שונה מעוסק)</Label>
                      <Input
                        id="tax_id"
                        value={businessClientData.tax_id}
                        onChange={(e) => setBusinessClientData({ ...businessClientData, tax_id: e.target.value })}
                        placeholder="987654321"
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-4 pt-6 border-t">
                  <h4 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    כתובת
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="address_street">רחוב ומספר בית</Label>
                      <Input
                        id="address_street"
                        value={businessClientData.address_street}
                        onChange={(e) => setBusinessClientData({ ...businessClientData, address_street: e.target.value })}
                        placeholder="רחוב הרצל 123"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="address_city">עיר</Label>
                      <Input
                        id="address_city"
                        value={businessClientData.address_city}
                        onChange={(e) => setBusinessClientData({ ...businessClientData, address_city: e.target.value })}
                        placeholder="תל אביב"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="address_postal_code">מיקוד</Label>
                      <Input
                        id="address_postal_code"
                        value={businessClientData.address_postal_code}
                        onChange={(e) => setBusinessClientData({ ...businessClientData, address_postal_code: e.target.value })}
                        placeholder="6000000"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="address_country">מדינה</Label>
                      <Input
                        id="address_country"
                        value={businessClientData.address_country}
                        onChange={(e) => setBusinessClientData({ ...businessClientData, address_country: e.target.value })}
                        placeholder="ישראל"
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="space-y-4 pt-6 border-t">
                  <h4 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    פרטי קשר
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="billing_contact_name">שם איש קשר</Label>
                      <Input
                        id="billing_contact_name"
                        value={businessClientData.billing_contact_name}
                        onChange={(e) => setBusinessClientData({ ...businessClientData, billing_contact_name: e.target.value })}
                        placeholder="ישראל ישראלי"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">טלפון</Label>
                      <Input
                        id="phone"
                        value={businessClientData.phone}
                        onChange={(e) => setBusinessClientData({ ...businessClientData, phone: e.target.value })}
                        placeholder="050-1234567"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="primary_email">מייל</Label>
                      <Input
                        id="primary_email"
                        type="email"
                        value={businessClientData.primary_email}
                        onChange={(e) => setBusinessClientData({ ...businessClientData, primary_email: e.target.value })}
                        placeholder="email@example.com"
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-6">
                  <Button onClick={handleSaveBusinessClient} disabled={saving} className="w-full sm:w-auto">
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        שומר...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 ml-2" />
                        שמור פרטי לקוח עסקי
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Tab 4: Billing */}
            {activeTab === 'billing' && (
              <motion.div
                key="billing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Trial Status */}
                {trialStatus && (
                  <div
                    className={`p-6 rounded-xl border-2 ${
                      trialStatus.isActive
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-xl ${
                          trialStatus.isActive ? 'bg-green-100' : 'bg-red-100'
                        }`}
                      >
                        <Calendar
                          className={`w-6 h-6 ${
                            trialStatus.isActive ? 'text-green-600' : 'text-red-600'
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-black text-slate-900 mb-1">סטטוס תקופת ניסיון</h4>
                        <p
                          className={`text-2xl font-black mb-2 ${
                            trialStatus.isActive ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {trialStatus.isActive
                            ? `${trialStatus.daysRemaining} ימים נותרו`
                            : 'תקופת הניסיון הסתיימה'}
                        </p>
                        <p className="text-sm text-slate-600">
                          סיום: {trialStatus.endDate} | סה״כ: {trialStatus.totalDays} ימים
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* MRR and Balance Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* MRR */}
                  <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl">
                    <h4 className="font-black text-slate-900 mb-2">הכנסה חודשית (MRR)</h4>
                    <p className="text-3xl font-black text-blue-600">
                      ₪{parseFloat(initialData.mrr || '0').toFixed(0)}
                    </p>
                    {initialData.discount_percent && (
                      <p className="text-sm text-slate-600 mt-1">
                        הנחה פעילה: {initialData.discount_percent}%
                      </p>
                    )}
                  </div>

                  {/* Balance */}
                  <div className={`p-6 border-2 rounded-xl ${
                    parseFloat(initialData.balance || '0') >= 0
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                      : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-black text-slate-900">יתרה</h4>
                      <button
                        onClick={() => setShowBalanceAdjustment(!showBalanceAdjustment)}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 underline"
                      >
                        {showBalanceAdjustment ? 'ביטול' : 'עדכון ידני'}
                      </button>
                    </div>
                    <p className={`text-3xl font-black ${
                      parseFloat(initialData.balance || '0') >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      ₪{parseFloat(initialData.balance || '0').toFixed(2)}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {parseFloat(initialData.balance || '0') >= 0 ? '✅ זכות' : '⚠️ חוב'}
                    </p>
                  </div>
                </div>

                {/* Balance Adjustment Form */}
                <AnimatePresence>
                  {showBalanceAdjustment && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-6 bg-yellow-50 border-2 border-yellow-300 rounded-xl space-y-4"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <CircleAlert className="w-6 h-6 text-yellow-600" />
                        <div>
                          <h4 className="font-black text-slate-900">עדכון יתרה ידני</h4>
                          <p className="text-sm text-slate-600">למקרי תשלום במזומן / ביט / תיקון ידני</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="adjustment_amount">סכום (₪)</Label>
                          <Input
                            id="adjustment_amount"
                            type="number"
                            step="0.01"
                            value={adjustmentAmount}
                            onChange={(e) => setAdjustmentAmount(e.target.value)}
                            placeholder="499.00"
                            className="mt-2"
                            disabled={adjustingBalance}
                          />
                          <p className="text-xs text-slate-600 mt-1">
                            חיובי להוספה, שלילי לניכוי
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="adjustment_method">אמצעי תשלום</Label>
                          <CustomSelect
                            value={adjustmentMethod}
                            onChange={(val) => setAdjustmentMethod(val as typeof adjustmentMethod)}
                            disabled={adjustingBalance}
                            options={[
                              { value: 'cash', label: 'מזומן' },
                              { value: 'bit', label: 'ביט' },
                              { value: 'bank_transfer', label: 'העברה בנקאית' },
                              { value: 'check', label: 'צ׳ק' },
                              { value: 'correction', label: 'תיקון ידני' },
                            ]}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="adjustment_reason">סיבה *</Label>
                        <Textarea
                          id="adjustment_reason"
                          value={adjustmentReason}
                          onChange={(e) => setAdjustmentReason(e.target.value)}
                          placeholder="למשל: תשלום במזומן בפגישה, תיקון שגיאה קודמת, וכו׳"
                          className="mt-2"
                          rows={2}
                          disabled={adjustingBalance}
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={handleAdjustBalance}
                          disabled={adjustingBalance || !adjustmentAmount || !adjustmentReason.trim()}
                          className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                        >
                          {adjustingBalance ? (
                            <>
                              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                              מעדכן...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 ml-2" />
                              עדכן יתרה
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowBalanceAdjustment(false);
                            setAdjustmentAmount('');
                            setAdjustmentReason('');
                          }}
                          disabled={adjustingBalance}
                        >
                          ביטול
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Extend Trial */}
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <h4 className="font-black text-slate-900">הארכת תקופת ניסיון</h4>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <Label htmlFor="extend_days">ימים להוספה</Label>
                      <Input
                        id="extend_days"
                        type="number"
                        min="1"
                        max="365"
                        value={trialDaysToExtend}
                        onChange={(e) => setTrialDaysToExtend(parseInt(e.target.value) || 7)}
                        className="mt-2"
                      />
                    </div>
                    <Button onClick={handleExtendTrial} disabled={saving}>
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'הוסף ימים'
                      )}
                    </Button>
                  </div>
                </div>

                {/* Subscription Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-600 mb-1">סטטוס מנוי</p>
                    <p className="font-bold text-slate-900">
                      {initialData.subscription_status === 'trial' && '🔄 ניסיון'}
                      {initialData.subscription_status === 'active' && '✅ פעיל'}
                      {initialData.subscription_status === 'cancelled' && '❌ מבוטל'}
                    </p>
                  </div>
                  <div className="p-4 bg-white border border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-600 mb-1">מקומות מאושרים</p>
                    <p className="font-bold text-slate-900">{initialData.seats_allowed}</p>
                  </div>
                </div>

                {/* Payment Link Generation */}
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-green-100">
                      <CreditCard className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-slate-900 mb-2">יצירת קישור לתשלום</h4>
                      <p className="text-sm text-slate-600 mb-4">
                        צור קישור תשלום דרך Morning (חשבונית ירוקה) וש לח ללקוח
                      </p>
                      <Button
                        onClick={handleGeneratePaymentLink}
                        disabled={generatingLink || !initialData.mrr || parseFloat(initialData.mrr) <= 0}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {generatingLink ? (
                          <>
                            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                            יוצר קישור...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 ml-2" />
                            צור קישור תשלום
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {paymentLink && (
                    <div className="p-4 bg-white border border-green-300 rounded-lg">
                      <p className="text-xs font-bold text-green-700 mb-2">✅ קישור נוצר בהצלחה!</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={paymentLink}
                          className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded font-mono"
                          onClick={(e) => e.currentTarget.select()}
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(paymentLink);
                            showMessage('success', 'הקישור הועתק ללוח');
                          }}
                        >
                          העתק
                        </Button>
                      </div>
                    </div>
                  )}

                  {(!initialData.mrr || parseFloat(initialData.mrr) <= 0) && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-800">
                        ⚠️ יש להגדיר MRR (הכנסה חודשית) בטאב "חבילה ומודולים" לפני יצירת קישור תשלום
                      </p>
                    </div>
                  )}
                </div>

                {/* Invoice Creation + History */}
                <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-slate-900 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                      חשבוניות ({invoices.length})
                    </h4>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadInvoices(true)}
                        disabled={invoicesLoading}
                      >
                        {invoicesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'רענן'}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleCreateInvoice}
                        disabled={creatingInvoice || !initialData.mrr || parseFloat(initialData.mrr) <= 0}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {creatingInvoice ? (
                          <>
                            <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                            יוצר...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 ml-1" />
                            צור חשבונית + שלח מייל
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {invoicesLoading && !invoicesLoaded && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                  )}

                  {invoicesLoaded && invoices.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <p className="font-medium">אין חשבוניות עדיין</p>
                      <p className="text-sm mt-1">לחץ "צור חשבונית" ליצירה ושליחה אוטומטית</p>
                    </div>
                  )}

                  {invoices.length > 0 && (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {invoices.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors text-sm">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              inv.status === 'paid' ? 'bg-green-500' :
                              inv.status === 'pending' ? 'bg-amber-500' :
                              inv.status === 'overdue' ? 'bg-red-500' : 'bg-slate-400'
                            }`} />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900">#{inv.invoiceNumber}</p>
                              {inv.description && <p className="text-xs text-slate-500 truncate">{inv.description}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-black text-slate-900">₪{inv.amount.toLocaleString()}</span>
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-lg ${
                              inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                              inv.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              inv.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {inv.status === 'paid' ? 'שולם' : inv.status === 'pending' ? 'ממתין' : inv.status === 'overdue' ? 'באיחור' : inv.status}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(inv.createdAt).toLocaleDateString('he-IL')}
                            </span>
                            {inv.emailSent && <span title="מייל נשלח"><Mail className="w-3.5 h-3.5 text-green-500" /></span>}
                            {inv.pdfUrl && (
                              <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-xs font-bold">
                                PDF
                              </a>
                            )}
                            {inv.paymentUrl && inv.status === 'pending' && (
                              <a href={inv.paymentUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800 text-xs font-bold">
                                תשלום
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
