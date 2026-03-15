'use client';

/**
 * Booking Admin Panel - Main Component
 * MISRAD AI - Booking Management Interface
 * 
 * @module components/admin/BookingAdminPanel
 * @description Main admin panel with fast navigation and manual controls
 */

import React, { useState, useCallback, useMemo, Suspense, lazy } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  Users,
  Settings,
  Link as LinkIcon,
  Clock,
  DollarSign,
  AlertCircle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock4,
  Video,
  Phone,
  MapPin,
  Edit3,
  Trash2,
  Copy,
  Send,
  Ban,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface BookingAdminPanelProps {
  orgSlug: string;
  initialData?: {
    providersCount: number;
    servicesCount: number;
    linksCount: number;
    todayAppointments: number;
    pendingPayments: number;
  };
  children?: React.ReactNode;
}

type TabId = 'calendar' | 'appointments' | 'providers' | 'services' | 'links' | 'settings';

// ============================================
// MAIN COMPONENT
// ============================================

export function BookingAdminPanel({ orgSlug, initialData, children }: BookingAdminPanelProps) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<TabId>('calendar');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ==========================================
  // TABS CONFIGURATION
  // ==========================================

  const tabs: Array<{
    id: TabId;
    label: string;
    icon: React.ElementType;
    count?: number;
    path: string;
  }> = useMemo(() => [
    {
      id: 'calendar',
      label: 'יומן',
      icon: Calendar,
      path: `/app/admin/booking?org=${orgSlug}&tab=calendar`,
    },
    {
      id: 'appointments',
      label: 'תורים',
      icon: Clock,
      count: initialData?.todayAppointments,
      path: `/app/admin/booking?org=${orgSlug}&tab=appointments`,
    },
    {
      id: 'providers',
      label: 'נותני שירות',
      icon: Users,
      count: initialData?.providersCount,
      path: `/app/admin/booking?org=${orgSlug}&tab=providers`,
    },
    {
      id: 'services',
      label: 'שירותים',
      icon: Settings,
      count: initialData?.servicesCount,
      path: `/app/admin/booking?org=${orgSlug}&tab=services`,
    },
    {
      id: 'links',
      label: 'לינקים',
      icon: LinkIcon,
      count: initialData?.linksCount,
      path: `/app/admin/booking?org=${orgSlug}&tab=links`,
    },
    {
      id: 'settings',
      label: 'הגדרות',
      icon: Settings,
      path: `/app/admin/booking?org=${orgSlug}&tab=settings`,
    },
  ], [initialData, orgSlug]);

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // TODO: Implement data refresh
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, []);

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-6 h-6 text-indigo-600" />
                <h1 className="text-xl font-bold text-slate-900">ניהול תורים</h1>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="חיפוש..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-4 pr-10 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Refresh */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                title="רענון"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* New Appointment */}
              <Link
                href={`/app/admin/booking?org=${orgSlug}&action=new`}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">תור חדש</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="תורים היום"
            value={initialData?.todayAppointments || 0}
            icon={Clock}
            color="indigo"
          />
          <StatCard
            label="נותני שירות"
            value={initialData?.providersCount || 0}
            icon={Users}
            color="emerald"
          />
          <StatCard
            label="לינקים פעילים"
            value={initialData?.linksCount || 0}
            icon={LinkIcon}
            color="blue"
          />
          <StatCard
            label="תשלומים ממתינים"
            value={initialData?.pendingPayments || 0}
            icon={DollarSign}
            color="amber"
          />
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-slate-200 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = pathname === tab.path || activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tab.path}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                    transition-colors border-b-2 -mb-px
                    ${isActive
                      ? 'text-indigo-600 border-indigo-600 bg-indigo-50/50'
                      : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'
                    }
                  `}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`
                      px-2 py-0.5 text-xs rounded-full
                      ${isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}
                    `}>
                      {tab.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Content will be loaded by each page */}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: 'indigo' | 'emerald' | 'blue' | 'amber' | 'rose';
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// APPOINTMENT LIST COMPONENT
// ============================================

interface AppointmentListProps {
  appointments: Array<{
    id: string;
    customerName: string;
    customerEmail: string;
    startTime: Date;
    endTime: Date;
    status: string;
    locationType: string;
    serviceName: string;
    providerName: string;
    hasPayment: boolean;
  }>;
  onAction?: (appointmentId: string, action: string) => void;
}

export function AppointmentList({ appointments, onAction }: AppointmentListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
      confirmed: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2 },
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock4 },
      completed: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle2 },
      cancelled: { bg: 'bg-slate-100', text: 'text-slate-500', icon: XCircle },
      no_show: { bg: 'bg-rose-100', text: 'text-rose-700', icon: AlertCircle },
    };
    return styles[status] || styles.confirmed;
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'zoom':
      case 'meet':
        return Video;
      case 'phone':
        return Phone;
      case 'address':
        return MapPin;
      default:
        return MapPin;
    }
  };

  return (
    <div className="space-y-3">
      {appointments.map((apt) => {
        const statusStyle = getStatusBadge(apt.status);
        const LocationIcon = getLocationIcon(apt.locationType);
        const isSelected = selectedId === apt.id;

        return (
          <div
            key={apt.id}
            onClick={() => setSelectedId(isSelected ? null : apt.id)}
            className={`
              relative bg-white border rounded-lg p-4 cursor-pointer transition-all
              ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'}
            `}
          >
            <div className="flex items-start justify-between">
              {/* Main Info */}
              <div className="flex items-start gap-3">
                {/* Time */}
                <div className="text-right min-w-[60px]">
                  <div className="text-sm font-semibold text-slate-900">
                    {new Date(apt.startTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(apt.endTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{apt.customerName}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusStyle.bg} ${statusStyle.text}`}>
                      <statusStyle.icon className="w-3 h-3" />
                      {apt.status === 'confirmed' && 'מאושר'}
                      {apt.status === 'pending' && 'ממתין'}
                      {apt.status === 'completed' && 'הושלם'}
                      {apt.status === 'cancelled' && 'בוטל'}
                      {apt.status === 'no_show' && 'לא הגיע'}
                    </span>
                    {apt.hasPayment && (
                      <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                        💰
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                    <LocationIcon className="w-4 h-4" />
                    <span>{apt.serviceName}</span>
                    <span>•</span>
                    <span>{apt.providerName}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction?.(apt.id, 'edit');
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                  title="עריכה"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction?.(apt.id, 'cancel');
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                  title="ביטול"
                >
                  <Ban className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(isSelected ? null : apt.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                  title="עוד"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expanded Actions */}
            {isSelected && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onAction?.(apt.id, 'confirm'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    אשר
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAction?.(apt.id, 'complete'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    השלם
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAction?.(apt.id, 'no_show'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200"
                  >
                    <AlertCircle className="w-4 h-4" />
                    לא הגיע
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAction?.(apt.id, 'remind'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
                  >
                    <Send className="w-4 h-4" />
                    תזכורת
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAction?.(apt.id, 'reschedule'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200"
                  >
                    <Clock4 className="w-4 h-4" />
                    קבע מחדש
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAction?.(apt.id, 'refund'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                  >
                    <DollarSign className="w-4 h-4" />
                    החזר תשלום
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {appointments.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>אין תורים להצגה</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// CANCELLATION MODAL
// ============================================

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reasonId: string, customReason?: string, refundPayment?: boolean) => void;
  hasPayment: boolean;
}

export function CancellationModal({ isOpen, onClose, onConfirm, hasPayment }: CancellationModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [shouldRefund, setShouldRefund] = useState(true);

  if (!isOpen) return null;

  const reasons = [
    { id: 'customer_request', label: 'בקשת הלקוח' },
    { id: 'provider_emergency', label: 'מקרה חירום של נותן השירות' },
    { id: 'technical_issue', label: 'תקלה טכנית' },
    { id: 'no_show', label: 'הלקוח לא הגיע' },
    { id: 'weather', label: 'תנאי מזג אוויר' },
    { id: 'scheduling_conflict', label: 'כפילות בזימון' },
    { id: 'other', label: 'סיבה אחרת (פירוט)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">ביטול תור</h2>

        {/* Reason Selection */}
        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium text-slate-700">סיבת הביטול</label>
          <div className="space-y-2">
            {reasons.map((reason) => (
              <label
                key={reason.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                  ${selectedReason === reason.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-300'
                  }
                `}
              >
                <input
                  type="radio"
                  name="cancellationReason"
                  value={reason.id}
                  checked={selectedReason === reason.id}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="text-sm text-slate-700">{reason.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Custom Reason */}
        {selectedReason === 'other' && (
          <div className="mb-4">
            <label className="text-sm font-medium text-slate-700">פירוט</label>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={3}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="הזן סיבה..."
            />
          </div>
        )}

        {/* Refund Option */}
        {hasPayment && (
          <label className="flex items-center gap-3 mb-6 p-3 bg-amber-50 rounded-lg">
            <input
              type="checkbox"
              checked={shouldRefund}
              onChange={(e) => setShouldRefund(e.target.checked)}
              className="w-4 h-4 text-indigo-600"
            />
            <span className="text-sm text-slate-700">
              החזר תשלום ללקוח
            </span>
          </label>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            ביטול
          </button>
          <button
            onClick={() => {
              onConfirm(selectedReason, customReason, shouldRefund);
              onClose();
            }}
            disabled={!selectedReason}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50"
          >
            אשר ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookingAdminPanel;
