'use client';

import { useState, useMemo } from 'react';
import { useBookingProviders, useUpsertProvider } from '@/hooks/useBooking';
import type { BookingProvider } from '@/types/booking';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  MoreHorizontal,
  User,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  Video,
  Phone,
  MapPin,
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface ProviderWithStats {
  id: string;
  organizationId: string;
  userId?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  isActive: boolean;
  bufferMinutes: number;
  title?: string | null;
  bio?: string | null;
  _count?: {
    appointments: number;
  };
  services?: Array<{
    service: {
      name: string;
    };
  }>;
}

interface ProvidersPageClientProps {
  orgSlug: string;
}

export function ProvidersPageClient({ orgSlug }: ProvidersPageClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading, error } = useBookingProviders(orgSlug);
  const upsertMutation = useUpsertProvider(orgSlug);

  const providers = (data?.providers || []) as ProviderWithStats[];

  const filteredProviders = useMemo(() => {
    if (!searchQuery) return providers;
    const query = searchQuery.toLowerCase();
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query) ||
        p.title?.toLowerCase().includes(query)
    );
  }, [providers, searchQuery]);

  const handleToggleActive = async (providerId: string, currentStatus: boolean) => {
    await upsertMutation.mutateAsync({
      id: providerId,
      isActive: !currentStatus,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-rose-600">
        <p>שגיאה בטעינת נותני שירות</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">נותני שירות</h1>
          <p className="text-slate-500 mt-1">{providers.length} נותני שירות</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          הוסף נותן שירות
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="חיפוש נותן שירות..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-10 pl-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProviders.map((provider) => (
          <div
            key={provider.id}
            className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {provider.avatar ? (
                  <img
                    src={provider.avatar}
                    alt={provider.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-indigo-600" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-slate-900">{provider.name}</h3>
                  {provider.title && (
                    <p className="text-sm text-slate-500">{provider.title}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedProvider(selectedProvider === provider.id ? null : provider.id)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <MoreHorizontal className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span>{provider._count?.appointments || 0} תורים קרובים</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span>{provider.services?.length || 0} שירותים</span>
              </div>
            </div>

            {/* Services */}
            {provider.services && provider.services.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {provider.services.slice(0, 3).map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded"
                  >
                    {s.service?.name || 'שירות'}
                  </span>
                ))}
                {provider.services.length > 3 && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                    +{provider.services.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            {selectedProvider === provider.id && (
              <div className="mt-4 pt-4 border-t border-slate-200 flex gap-2">
                <button
                  onClick={() => handleToggleActive(provider.id, provider.isActive)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg ${
                    provider.isActive
                      ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  }`}
                >
                  {provider.isActive ? (
                    <>
                      <XCircle className="w-4 h-4" />
                      השבת
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      הפעל
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    // TODO: Open edit modal
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200"
                >
                  <Edit3 className="w-4 h-4" />
                  עריכה
                </button>
              </div>
            )}

            {/* Status Badge */}
            <div className="mt-3 flex items-center justify-between">
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  provider.isActive
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {provider.isActive ? 'פעיל' : 'לא פעיל'}
              </span>
              {provider.bufferMinutes && provider.bufferMinutes > 0 && (
                <span className="text-xs text-slate-500">
                  Buffer: {provider.bufferMinutes} דק'
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredProviders.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <User className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>לא נמצאו נותני שירות</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <ProviderModal
          orgSlug={orgSlug}
          onClose={() => setShowCreateModal(false)}
          onSave={async (data) => {
            await upsertMutation.mutateAsync(data);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

// ============================================
// PROVIDER MODAL
// ============================================

interface ProviderModalProps {
  orgSlug: string;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  initialData?: Record<string, unknown>;
}

function ProviderModal({ onClose, onSave, initialData }: ProviderModalProps) {
  const [name, setName] = useState((initialData?.name as string) || '');
  const [email, setEmail] = useState((initialData?.email as string) || '');
  const [title, setTitle] = useState((initialData?.title as string) || '');
  const [phone, setPhone] = useState((initialData?.phone as string) || '');
  const [bio, setBio] = useState((initialData?.bio as string) || '');
  const [bufferMinutes, setBufferMinutes] = useState((initialData?.bufferMinutes as number) || 0);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave({
        name,
        email,
        title,
        phone,
        bio,
        bufferMinutes,
        isActive: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            {initialData ? 'עריכת נותן שירות' : 'הוספת נותן שירות'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                שם <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                אימייל
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                תפקיד
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                טלפון
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                תיאור קצר
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Buffer */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                זמן Buffer (דקות)
              </label>
              <input
                type="number"
                value={bufferMinutes}
                onChange={(e) => setBufferMinutes(parseInt(e.target.value) || 0)}
                min={0}
                max={60}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                זמן מנוחה בין פגישות
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={isLoading || !name}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {isLoading ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProvidersPageClient;
