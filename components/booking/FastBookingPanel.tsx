'use client';

/**
 * Fast Booking Panel - Client-Side Only Navigation
 * MISRAD AI - Instant Tab Switching without Server Re-renders
 */

import { useState, useCallback } from 'react';
import { BookingContextProvider, useBookingContext } from '@/components/booking/BookingContext';
import { CreateAppointmentModal } from '@/components/booking/CreateAppointmentModal';
import { CreateServiceModal } from '@/components/booking/CreateServiceModal';
import { BookingCalendar } from '@/components/admin/BookingCalendar';
import { LinksPageClient } from '@/components/admin/booking/LinksPageClient';
import { ProvidersPageClient } from '@/components/admin/booking/ProvidersPageClient';
import ServicesPageClient from '@/components/admin/booking/ServicesPageClient';
import {
  Calendar,
  Users,
  Settings,
  Link as LinkIcon,
  Clock,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BookingStats } from '@/components/booking/BookingContext';
import type { BookingLink } from '@/types/booking';

type TabId = 'calendar' | 'appointments' | 'providers' | 'services' | 'links' | 'settings';

interface FastBookingPanelProps {
  orgSlug: string;
  initialStats: BookingStats;
  initialLinks: { links: BookingLink[] };
}

export function FastBookingPanel({ orgSlug, initialStats, initialLinks }: FastBookingPanelProps) {
  return (
    <BookingContextProvider 
      orgSlug={orgSlug} 
      initialStats={initialStats}
      initialLinks={initialLinks.links}
    >
      <BookingPanelContent orgSlug={orgSlug} initialLinks={initialLinks} />
    </BookingContextProvider>
  );
}

function BookingPanelContent({ orgSlug, initialLinks }: { orgSlug: string; initialLinks: { links: BookingLink[] } }) {
  const {
    activeTab,
    setActiveTab,
    services,
    providers,
    appointments,
    links,
    stats,
    isLoading,
    errors,
    refreshAll,
  } = useBookingContext();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalDate, setModalDate] = useState<Date>(new Date());
  const [modalTime, setModalTime] = useState<string>('09:00');

  const tabs: Array<{
    id: TabId;
    label: string;
    icon: React.ElementType;
    count?: number;
  }> = [
    { id: 'calendar', label: 'יומן', icon: Calendar },
    { id: 'appointments', label: 'תורים', icon: Clock, count: stats.todayAppointments },
    { id: 'providers', label: 'נותני שירות', icon: Users, count: stats.providersCount },
    { id: 'services', label: 'שירותים', icon: Settings, count: stats.servicesCount },
    { id: 'links', label: 'לינקים', icon: LinkIcon, count: stats.linksCount },
    { id: 'settings', label: 'הגדרות', icon: Settings },
  ];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshAll();
    setIsRefreshing(false);
  }, [refreshAll]);

  const handleCreateAppointment = useCallback((date: Date, time: string) => {
    setModalDate(date);
    setModalTime(time);
    setIsCreateModalOpen(true);
  }, []);

  const handleAppointmentClick = useCallback((appointment: any) => {
    // TODO: Open edit modal
    console.log('Edit appointment:', appointment.id);
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'calendar':
        return (
          <BookingCalendar
            appointments={appointments}
            providers={providers}
            onCreateAppointment={handleCreateAppointment}
            onAppointmentClick={handleAppointmentClick}
            defaultView="week"
          />
        );
      
      case 'appointments':
        return (
          <div className="space-y-4">
            <div className="text-center py-8 bg-white rounded-xl border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">רשימת תורים</h3>
              <p className="text-slate-500 mb-4">התצוגה המורחבת בפיתוח</p>
            </div>
            <BookingCalendar
              appointments={appointments}
              providers={providers}
              onCreateAppointment={handleCreateAppointment}
              onAppointmentClick={handleAppointmentClick}
              defaultView="week"
            />
          </div>
        );
      
      case 'providers':
        return <ProvidersPageClient orgSlug={orgSlug} />;
      
      case 'services':
        return (
          <ServicesPageClientWrapper
            services={services}
            isLoading={isLoading.services}
            error={errors.services}
            onAddClick={() => setIsServiceModalOpen(true)}
          />
        );
      
      case 'links':
        return <LinksPageClient orgSlug={orgSlug} initialLinks={initialLinks} />;
      
      case 'settings':
        return (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">הגדרות</h3>
            <p className="text-slate-500">הגדרות מערכת התורים בפיתוח</p>
          </div>
        );
      
      default:
        return null;
    }
  };

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
              <Button
                onClick={() => handleCreateAppointment(new Date(), '09:00')}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">תור חדש</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="תורים היום" value={stats.todayAppointments} icon={Clock} color="indigo" />
          <StatCard label="נותני שירות" value={stats.providersCount} icon={Users} color="emerald" />
          <StatCard label="לינקים פעילים" value={stats.linksCount} icon={LinkIcon} color="blue" />
          <StatCard label="שירותים" value={stats.servicesCount} icon={Settings} color="amber" />
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Tab Headers - Client Side Only! */}
          <div className="flex border-b border-slate-200 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                    transition-all border-b-2 -mb-px
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
                </button>
              );
            })}
          </div>

          {/* Tab Content - INSTANT! No loading */}
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateAppointmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          // Refresh will happen automatically via context
        }}
        orgSlug={orgSlug}
        initialDate={modalDate}
        initialTime={modalTime}
      />

      <CreateServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        onSuccess={() => setIsServiceModalOpen(false)}
        orgSlug={orgSlug}
      />
    </div>
  );
}

// Wrapper for services that uses context data
function ServicesPageClientWrapper({
  services,
  isLoading,
  error,
  onAddClick,
}: {
  services: any[];
  isLoading: boolean;
  error: string | null;
  onAddClick: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4" />
        <p className="text-slate-500">טוען שירותים...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-rose-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          נסה שוב
        </Button>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Settings className="w-8 h-8 text-indigo-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">אין שירותים עדיין</h3>
        <p className="text-slate-500 mb-4">הוסף את השירות הראשון שלך</p>
        <Button onClick={onAddClick} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 ml-2" />
          הוסף שירות
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900">שירותים ({services.length})</h3>
        <Button onClick={onAddClick} className="bg-indigo-600 hover:bg-indigo-700" size="sm">
          <Plus className="w-4 h-4 ml-2" />
          הוסף חדש
        </Button>
      </div>
      {/* Services list would go here - simplified for now */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <div key={service.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <h4 className="font-semibold text-slate-900">{service.name}</h4>
            <p className="text-sm text-slate-500">{service.durationMinutes} דקות</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// StatCard component
function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: 'indigo' | 'emerald' | 'blue' | 'amber';
}) {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
