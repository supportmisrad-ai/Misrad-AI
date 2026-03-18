'use client';

/**
 * Services Page Client - Real Data Loading
 * MISRAD AI - Booking Services Management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getBookingServices } from '@/app/actions/booking-services';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Briefcase, Plus, Clock, DollarSign, CheckCircle2, XCircle, Settings } from 'lucide-react';
import type { BookingService } from '@/types/booking';

interface ServicesPageClientProps {
  orgSlug: string;
}

export default function ServicesPageClient({ orgSlug }: ServicesPageClientProps) {
  const [services, setServices] = useState<BookingService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use orgSlug to fetch services
      const result = await getBookingServices(orgSlug);
      
      if (result.success && result.data) {
        setServices(result.data);
      } else {
        setError(result.error || 'שגיאה בטעינת שירותים');
      }
    } catch (err) {
      console.error('Error loading services:', err);
      setError('שגיאה בטעינת נתונים');
    } finally {
      setIsLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">טוען שירותים...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Briefcase className="w-8 h-8 text-rose-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">שגיאה בטעינת הנתונים</h3>
        <p className="text-slate-500 mb-4">{error}</p>
        <Button onClick={loadServices} variant="outline">
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
        <Button 
          onClick={() => window.location.href = `/app/admin/booking?action=new-service`}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 ml-2" />
          הוסף שירות
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900">
          שירותים ({services.length})
        </h3>
        <Button 
          onClick={() => window.location.href = `/app/admin/booking?action=new-service`}
          className="bg-indigo-600 hover:bg-indigo-700"
          size="sm"
        >
          <Plus className="w-4 h-4 ml-2" />
          הוסף חדש
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <Card key={service.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: service.color || '#e0e7ff' }}
                  >
                    <Briefcase className="w-5 h-5" style={{ color: service.color ? '#fff' : '#4f46e5' }} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{service.name}</CardTitle>
                    {service.description && (
                      <p className="text-sm text-slate-500 line-clamp-1">{service.description}</p>
                    )}
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  service.isActive 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {service.isActive ? (
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> פעיל</span>
                  ) : (
                    <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> לא פעיל</span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4" />
                  <span>{service.durationMinutes} דקות</span>
                </div>
                {service.priceAmount && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <DollarSign className="w-4 h-4" />
                    <span>₪{service.priceAmount.toString()}</span>
                  </div>
                )}
                {service.requiresPayment && (
                  <div className="text-xs text-amber-600 font-medium">
                    נדרש תשלום מראש
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-100">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => window.location.href = `/app/admin/booking?action=edit-service&id=${service.id}`}
                >
                  ערוך שירות
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
