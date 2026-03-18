'use client';

/**
 * Booking Links Management Page
 * MISRAD AI - Public Booking Links Administration
 */

import { useState, useCallback, useEffect } from 'react';
import { useBookingLinks, useUpsertLink, useBookingProviders, useBookingServices } from '@/hooks/useBooking';
import { 
  Link2, 
  Plus, 
  Copy, 
  Check, 
  Edit2, 
  ExternalLink,
  Calendar,
  MapPin,
  Users,
  Settings,
  X
} from 'lucide-react';
import Link from 'next/link';

import type { Prisma } from '@prisma/client';
import type { BookingLink, BookingService, BookingProvider } from '@/types/booking';

type PrismaLinkWithRelations = Prisma.BookingLinkGetPayload<{
  include: {
    services: { include: { service: true } };
    provider: true;
  };
}>;

interface LinksPageClientProps {
  orgSlug: string;
  initialLinks?: { links: PrismaLinkWithRelations[] };
}

export function LinksPageClient({ orgSlug, initialLinks }: LinksPageClientProps) {
  const { data, isLoading, error } = useBookingLinks(orgSlug, initialLinks);
  const upsertLink = useUpsertLink(orgSlug);
  const { data: providersData } = useBookingProviders(orgSlug);
  const { data: servicesData } = useBookingServices(orgSlug);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<any | null>(null);

  const links = data?.links || [];
  const providers = providersData?.providers || [];
  const services = servicesData?.services || [];

  const handleCopyLink = useCallback((slug: string, id: string) => {
    const url = `${window.location.origin}/booking/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleCreateLink = useCallback(async (formData: any) => {
    try {
      await upsertLink.mutateAsync({ ...formData, orgSlug });
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create link:', error);
      alert('שגיאה ביצירת הקישור');
    }
  }, [upsertLink, orgSlug]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">שגיאה בטעינת הקישורים</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">ניהול קישורים ציבוריים</h2>
          <p className="text-slate-500 mt-1">
            צור ונהל קישורים לקביעת תורים ללקוחות
          </p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          קישור חדש
        </button>
      </div>

      {/* Links Grid */}
      {links.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Link2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            אין קישורים עדיין
          </h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            צור קישור ציבורי ראשון כדי שלקוחות יוכלו לקבוע תורים ישירות דרך האתר שלך
          </p>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors mx-auto"
          >
            <Plus className="w-4 h-4" />
            צור קישור חדש
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {links.map((link) => (
            <div 
              key={link.id} 
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              {/* Link Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Link2 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{link.title}</h3>
                    <p className="text-sm text-slate-500">/{link.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopyLink(link.slug, link.id)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="העתק קישור"
                  >
                    {copiedId === link.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setEditingLink(link)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="ערוך"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Link Details */}
              <div className="space-y-2 text-sm">
                {link.provider && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="w-4 h-4" />
                    <span>{link.provider.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span>{link.services?.length || 0} שירותים</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4" />
                  <span>{link.locationType === 'zoom' ? 'זום' : link.locationType === 'phone' ? 'טלפון' : 'פגישה פיזית'}</span>
                </div>
                {link.requirePayment && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <Settings className="w-4 h-4" />
                    <span>דורש תשלום</span>
                  </div>
                )}
              </div>

              {/* Link Footer */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <Link
                  href={`/booking/${link.slug}`}
                  target="_blank"
                  className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  צפה בדף הקישור
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Link Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">צור קישור ציבורי חדש</h2>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <CreateLinkForm 
              orgSlug={orgSlug}
              providers={providers}
              services={services}
              onSubmit={handleCreateLink}
              onCancel={() => setIsCreateModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Create Link Form Component
function CreateLinkForm({ 
  orgSlug,
  providers,
  services, 
  onSubmit, 
  onCancel 
}: { 
  orgSlug: string;
  providers: BookingProvider[];
  services: BookingService[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    providerId: '',
    serviceIds: [] as string[],
    locationType: 'zoom',
    locationDetails: '',
    requirePayment: false,
    paymentAmount: '',
    requireApproval: false,
    allowCancellations: true,
    availableDays: [0, 1, 2, 3, 4],
    minNoticeHours: 24,
    maxBookingDays: 30,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'כותרת היא שדה חובה';
    }
    if (!formData.slug.trim()) {
      newErrors.slug = 'מזהה URL הוא שדה חובה';
    }
    if (!formData.providerId) {
      newErrors.providerId = 'חובה לבחור נותן שירות';
    }
    if (formData.serviceIds.length === 0) {
      newErrors.serviceIds = 'חובה לבחור לפחות שירות אחד';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Provider Selection - REQUIRED */}
      <div className="space-y-2">
        <label htmlFor="providerId" className="block text-sm font-medium text-slate-700">
          נותן שירות <span className="text-rose-500">*</span>
        </label>
        <select
          id="providerId"
          value={formData.providerId}
          onChange={(e) => {
            setFormData({ ...formData, providerId: e.target.value });
            if (errors.providerId) setErrors({ ...errors, providerId: '' });
          }}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.providerId ? 'border-rose-300' : 'border-slate-200'
          }`}
          required
        >
          <option value="">בחר נותן שירות...</option>
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>
        {errors.providerId && (
          <p className="text-sm text-rose-600">{errors.providerId}</p>
        )}
        {providers.length === 0 && (
          <p className="text-sm text-amber-600">
            אין נותני שירות זמינים. יש ליצור נותן שירות תחילה.
          </p>
        )}
      </div>

      {/* Services Selection - REQUIRED */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          שירותים זמינים <span className="text-rose-500">*</span>
        </label>
        <div className={`border rounded-lg p-3 max-h-40 overflow-y-auto ${
          errors.serviceIds ? 'border-rose-300 bg-rose-50' : 'border-slate-200'
        }`}>
          {services.length === 0 ? (
            <p className="text-sm text-amber-600">אין שירותים זמינים. יש ליצור שירות תחילה.</p>
          ) : (
            <div className="space-y-2">
              {services.map((service) => (
                <label key={service.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={formData.serviceIds.includes(service.id)}
                    onChange={(e) => {
                      const newServiceIds = e.target.checked
                        ? [...formData.serviceIds, service.id]
                        : formData.serviceIds.filter(id => id !== service.id);
                      setFormData({ ...formData, serviceIds: newServiceIds });
                      if (errors.serviceIds) setErrors({ ...errors, serviceIds: '' });
                    }}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-sm text-slate-700 flex-1">{service.name}</span>
                  <span className="text-xs text-slate-500">{service.durationMinutes} דק׳</span>
                  {service.priceAmount && (
                    <span className="text-xs text-emerald-600">₪{Number(service.priceAmount).toString()}</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
        {errors.serviceIds && (
          <p className="text-sm text-rose-600">{errors.serviceIds}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium text-slate-700">
            כותרת <span className="text-rose-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => {
              setFormData({ ...formData, title: e.target.value });
              if (errors.title) setErrors({ ...errors, title: '' });
            }}
            placeholder="לדוג׳: ייעוץ אישי"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.title ? 'border-rose-300' : 'border-slate-200'
            }`}
            required
          />
          {errors.title && <p className="text-sm text-rose-600">{errors.title}</p>}
        </div>
        <div className="space-y-2">
          <label htmlFor="slug" className="block text-sm font-medium text-slate-700">
            מזהה URL <span className="text-rose-500">*</span>
          </label>
          <input
            id="slug"
            type="text"
            value={formData.slug}
            onChange={(e) => {
              setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') });
              if (errors.slug) setErrors({ ...errors, slug: '' });
            }}
            placeholder="consultation"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.slug ? 'border-rose-300' : 'border-slate-200'
            }`}
            required
          />
          {errors.slug && <p className="text-sm text-rose-600">{errors.slug}</p>}
          <p className="text-xs text-slate-500">
            הלינק יהיה: /booking/{formData.slug || 'example'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium text-slate-700">תיאור</label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="תיאור הקישור שיוצג ללקוחות"
          rows={2}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="locationType" className="block text-sm font-medium text-slate-700">סוג מיקום</label>
          <select
            id="locationType"
            value={formData.locationType}
            onChange={(e) => setFormData({ ...formData, locationType: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="zoom">זום</option>
            <option value="phone">טלפון</option>
            <option value="address">כתובת פיזית</option>
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="locationDetails" className="block text-sm font-medium text-slate-700">פרטי מיקום</label>
          <input
            id="locationDetails"
            type="text"
            value={formData.locationDetails}
            onChange={(e) => setFormData({ ...formData, locationDetails: e.target.value })}
            placeholder="לינק זום או כתובת"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.requireApproval}
            onChange={(e) => setFormData({ ...formData, requireApproval: e.target.checked })}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <span className="text-sm text-slate-700">דרוש אישור</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.requirePayment}
            onChange={(e) => setFormData({ ...formData, requirePayment: e.target.checked })}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <span className="text-sm text-slate-700">דורש תשלום</span>
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <button 
          type="button" 
          onClick={onCancel} 
          className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
        >
          ביטול
        </button>
        <button 
          type="submit" 
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
        >
          צור קישור
        </button>
      </div>
    </form>
  );
}
