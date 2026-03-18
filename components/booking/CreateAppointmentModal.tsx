'use client';

/**
 * Create Appointment Modal
 * MISRAD AI - Manual Appointment Creation
 */

import { useState, useCallback, useEffect } from 'react';
import { X, Calendar, Clock, User, Phone, Mail, MapPin, Video, PhoneCall, DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { BookingService, BookingProvider } from '@/types/booking';

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orgSlug: string;
  initialDate?: Date;
  initialTime?: string;
}

export function CreateAppointmentModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  orgSlug,
  initialDate,
  initialTime
}: CreateAppointmentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [services, setServices] = useState<BookingService[]>([]);
  const [providers, setProviders] = useState<BookingProvider[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    serviceId: '',
    providerId: '',
    date: initialDate ? formatDateForInput(initialDate) : formatDateForInput(new Date()),
    time: initialTime || '09:00',
    duration: 30,
    locationType: 'address' as 'address' | 'zoom' | 'meet' | 'phone',
    address: '',
    notes: '',
    price: 0,
  });

  // Load services and providers
  useEffect(() => {
    if (!isOpen) return;
    
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const [servicesRes, providersRes] = await Promise.all([
          fetch(`/api/booking/services?orgSlug=${orgSlug}`),
          fetch(`/api/booking/providers?orgSlug=${orgSlug}`)
        ]);

        if (servicesRes.ok) {
          const servicesData = await servicesRes.json();
          setServices(servicesData.services || []);
          // Auto-select first service and set price/duration
          if (servicesData.services?.[0]) {
            const firstService = servicesData.services[0];
            setFormData(prev => ({
              ...prev,
              serviceId: firstService.id,
              duration: firstService.durationMinutes || 30,
              price: firstService.priceAmount || 0,
            }));
          }
        }

        if (providersRes.ok) {
          const providersData = await providersRes.json();
          setProviders(providersData.providers || []);
          if (providersData.providers?.[0]) {
            setFormData(prev => ({
              ...prev,
              providerId: providersData.providers[0].id
            }));
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('שגיאה בטעינת נתונים');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [isOpen, orgSlug]);

  // Update form when initialDate/Time changes
  useEffect(() => {
    if (initialDate) {
      setFormData(prev => ({
        ...prev,
        date: formatDateForInput(initialDate),
        time: initialTime || prev.time
      }));
    }
  }, [initialDate, initialTime]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const [year, month, day] = formData.date.split('-').map(Number);
      const [hours, minutes] = formData.time.split(':').map(Number);
      
      const startTime = new Date(year, month - 1, day, hours, minutes);
      const endTime = new Date(startTime.getTime() + formData.duration * 60000);

      const response = await fetch('/api/booking/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgSlug,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone,
          serviceId: formData.serviceId,
          providerId: formData.providerId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          locationType: formData.locationType,
          locationDetails: formData.address,
          notes: formData.notes,
          price: formData.price,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'שגיאה ביצירת התור');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת התור');
    } finally {
      setIsLoading(false);
    }
  }, [formData, orgSlug, onSuccess, onClose]);

  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setFormData(prev => ({
        ...prev,
        serviceId,
        duration: service.durationMinutes || 30,
        price: Number(service.priceAmount) || 0,
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">תור חדש</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoadingData ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
              <p className="text-slate-500">טוען נתונים...</p>
            </div>
          ) : (
            <form id="create-appointment-form" onSubmit={handleSubmit} className="space-y-4">
              {/* Customer Info */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-900">פרטי לקוח</Label>
                <div className="grid grid-cols-1 gap-3">
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="שם מלא"
                      value={formData.customerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                      className="pr-10"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="אימייל"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                      className="pr-10"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="טלפון"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                      className="pr-10"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Service Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">שירות</Label>
                <select
                  value={formData.serviceId}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes} דק׳)</option>
                  ))}
                </select>
              </div>

              {/* Provider Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">נותן שירות</Label>
                <select
                  value={formData.providerId}
                  onChange={(e) => setFormData(prev => ({ ...prev, providerId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-900">תאריך</Label>
                  <div className="relative">
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="pr-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-900">שעה</Label>
                  <div className="relative">
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                      className="pr-10"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">מיקום</Label>
                <div className="flex gap-2">
                  {[
                    { id: 'address', icon: MapPin, label: 'כתובת' },
                    { id: 'zoom', icon: Video, label: 'Zoom' },
                    { id: 'meet', icon: Video, label: 'Meet' },
                    { id: 'phone', icon: PhoneCall, label: 'טלפון' },
                  ].map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, locationType: id as any }))}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.locationType === id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
                {formData.locationType === 'address' && (
                  <Input
                    placeholder="כתובת מפורטת"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="mt-2"
                  />
                )}
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">מחיר (₪)</Label>
                <div className="relative">
                  <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                    className="pr-10"
                    min={0}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">הערות</Label>
                <Textarea
                  placeholder="הערות נוספות..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
                  {error}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 bg-slate-50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            ביטול
          </Button>
          <Button
            type="submit"
            form="create-appointment-form"
            disabled={isLoading || isLoadingData}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                יוצר...
              </>
            ) : (
              'צור תור'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
