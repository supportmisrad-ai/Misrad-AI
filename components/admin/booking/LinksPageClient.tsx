'use client';

/**
 * Booking Links Management Page
 * MISRAD AI - Public Booking Links Administration
 */

import { useState, useCallback } from 'react';
import { useBookingLinks, useUpsertLink } from '@/hooks/useBooking';
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

import type { BookingLink } from '@/types/booking';

interface LinksPageClientProps {
  orgSlug: string;
  initialLinks?: { links: BookingLink[] };
}

export function LinksPageClient({ orgSlug, initialLinks }: LinksPageClientProps) {
  const { data, isLoading, error } = useBookingLinks(orgSlug, initialLinks);
  const upsertLink = useUpsertLink(orgSlug);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<any | null>(null);

  const links = data?.links || [];

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

      {/* Create Link Modal - Simple Overlay */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
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
  onSubmit, 
  onCancel 
}: { 
  orgSlug: string; 
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.slug.trim()) {
      alert('כותרת ומזהה URL הם שדות חובה');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium text-slate-700">כותרת *</label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="לדוג׳: ייעוץ אישי"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="slug" className="block text-sm font-medium text-slate-700">מזהה URL *</label>
          <input
            id="slug"
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
            placeholder="consultation"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
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
