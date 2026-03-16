'use client';

/**
 * Public Booking Page Component
 * MISRAD AI - Public appointment booking interface
 * 
 * @module components/booking/PublicBookingPage
 * @description Public booking page with OTP verification and payment
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Building,
  MessageSquare,
  Video,
  MapPin,
  Phone as PhoneIcon,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Lock,
  Sparkles,
  Users,
  Timer,
  Download,
} from 'lucide-react';
import { format, addDays, startOfDay, endOfDay, isSameDay, getDay } from 'date-fns';
import { he } from 'date-fns/locale';
import type {
  BookingLink,
  TimeSlot,
  BookingLocationType,
  BookingAppointment,
} from '@/types/booking';

// ============================================
// TYPES
// ============================================

interface PublicBookingPageProps {
  link: BookingLink;
  provider: {
    id: string;
    name: string;
    avatar?: string;
  };
  services: Array<{
    id: string;
    name: string;
    durationMinutes: number;
    priceAmount?: number;
    requiresPayment: boolean;
  }>;
  availableSlots: TimeSlot[];
  socialProof?: {
    currentlyViewing: number;
    recentlyBooked: Array<{ name: string; timeAgo: string }>;
    slotsRemainingToday: number;
  };
  onVerifyOTP: (phone: string, email: string, otp: string) => Promise<boolean>;
  onSendOTP: (phone: string, email: string) => Promise<boolean>;
  onBook: (data: BookingFormData) => Promise<{ success: boolean; pdfUrl?: string; error?: string }>;
}

interface BookingFormData {
  serviceId: string;
  selectedDate: Date;
  selectedSlot: TimeSlot;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompany?: string;
  customerReason?: string;
}

type BookingStep = 'verify' | 'select' | 'details' | 'confirm' | 'payment' | 'success';

// ============================================
// MAIN COMPONENT
// ============================================

export function PublicBookingPage({
  link,
  provider,
  services,
  availableSlots,
  socialProof,
  onVerifyOTP,
  onSendOTP,
  onBook,
}: PublicBookingPageProps) {
  // State
  const [step, setStep] = useState<BookingStep>('verify');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Verification
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);
  
  // Selection
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  
  // Details
  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerReason, setCustomerReason] = useState('');
  const [bookedPdfUrl, setBookedPdfUrl] = useState<string | undefined>(undefined);
  
  // Calendar
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // ==========================================
  // COMPUTED VALUES
  // ==========================================

  const selectedService = useMemo(() => {
    return services.find(s => s.id === selectedServiceId);
  }, [services, selectedServiceId]);

  const daysInMonth = useMemo(() => {
    const start = startOfDay(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
    const end = endOfDay(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0));
    const days: Date[] = [];
    
    let current = start;
    while (current <= end) {
      days.push(new Date(current));
      current = addDays(current, 1);
    }
    
    return days;
  }, [currentMonth]);

  const availableDays = useMemo(() => {
    return link.availableDays || [0, 1, 2, 3, 4]; // ראשון עד חמישי ברירת מחדל
  }, [link]);

  const slotsForSelectedDate = useMemo(() => {
    return availableSlots.filter(slot => 
      isSameDay(new Date(slot.startTime), selectedDate)
    );
  }, [availableSlots, selectedDate]);

  // History
  const [showHistory, setShowHistory] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<BookingAppointment[]>([]);

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleSendOTP = useCallback(async () => {
    if (!email || !phone) {
      setError('נא למלא מייל וטלפון');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await onSendOTP(phone, email);
      if (success) {
        setOtpSent(true);
      } else {
        setError('שגיאה בשליחת קוד האימות');
      }
    } catch {
      setError('שגיאה בשליחת קוד האימות');
    } finally {
      setIsLoading(false);
    }
  }, [email, phone, onSendOTP]);

  const handleVerifyOTP = useCallback(async () => {
    if (!otpCode || otpCode.length < 4) {
      setError('נא להזין קוד אימות תקין');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await onVerifyOTP(phone, email, otpCode);
      if (success) {
        // Fetch history after verification
        const res = await fetch(`/api/booking/customer-history?email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`);
        if (res.ok) {
          const historyData = await res.json();
          setCustomerHistory(historyData.appointments || []);
        }
        setStep('select');
      } else {
        setOtpAttempts(prev => prev + 1);
        setError('קוד האימות שגוי');
      }
    } catch {
      setError('שגיאה באימות הקוד');
    } finally {
      setIsLoading(false);
    }
  }, [otpCode, phone, email, onVerifyOTP]);

  const handleBook = useCallback(async () => {
    if (!selectedServiceId || !selectedSlot || !customerName || !email || !phone) {
      setError('נא למלא את כל השדות החובה');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await onBook({
        serviceId: selectedServiceId,
        selectedDate,
        selectedSlot,
        customerName,
        customerEmail: email,
        customerPhone: phone,
        customerCompany,
        customerReason,
      });

      if (result.success) {
        if (result.pdfUrl) {
          setBookedPdfUrl(result.pdfUrl);
        }
        
        // Trigger Nexus Task creation via API or separate action if needed
        // For now, it's handled in the onBook server action implementation
        
        setStep(selectedService?.requiresPayment ? 'payment' : 'success');
      } else {
        setError(result.error || 'שגיאה בקביעת התור');
      }
    } catch {
      setError('שגיאה בקביעת התור');
    } finally {
      setIsLoading(false);
    }
  }, [selectedServiceId, selectedSlot, customerName, email, phone, customerCompany, customerReason, selectedDate, selectedService, onBook]);

  // ==========================================
  // RENDER STEP CONTENT
  // ==========================================

  const renderStepContent = () => {
    switch (step) {
      case 'verify':
        return (
          <VerificationStep
            email={email}
            setEmail={setEmail}
            phone={phone}
            setPhone={setPhone}
            otpSent={otpSent}
            otpCode={otpCode}
            setOtpCode={setOtpCode}
            otpAttempts={otpAttempts}
            onSendOTP={handleSendOTP}
            onVerify={handleVerifyOTP}
            isLoading={isLoading}
            error={error}
          />
        );

      case 'select':
        return (
          <SelectionStep
            services={services}
            selectedServiceId={selectedServiceId}
            onSelectService={setSelectedServiceId}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            availableDays={availableDays}
            slotsForDate={slotsForSelectedDate}
            currentMonth={currentMonth}
            onNavigateMonth={(direction) => {
              setCurrentMonth(prev => 
                direction === 'next' 
                  ? new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                  : new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
              );
            }}
            daysInMonth={daysInMonth}
            onContinue={() => setStep('details')}
            onBack={() => setStep('verify')}
          />
        );

      case 'details':
        return (
          <DetailsStep
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerCompany={customerCompany}
            setCustomerCompany={setCustomerCompany}
            customerReason={customerReason}
            setCustomerReason={setCustomerReason}
            requiresReason={selectedService?.requiresPayment || link.requireApproval}
            onContinue={handleBook}
            onBack={() => setStep('select')}
            isLoading={isLoading}
            error={error}
          />
        );

      case 'success':
        return (
          <SuccessStep
            serviceName={selectedService?.name}
            date={selectedDate}
            slot={selectedSlot}
            provider={provider}
            locationType={link.locationType as BookingLocationType}
            locationDetails={link.locationDetails}
            pdfUrl={bookedPdfUrl}
          />
        );

      default:
        return null;
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {provider.avatar ? (
              <img 
                src={provider.avatar} 
                alt={provider.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-indigo-100"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                <User className="w-8 h-8 text-indigo-600" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{link.title}</h1>
              <p className="text-slate-600">{provider.name}</p>
            </div>
          </div>
          {link.description && (
            <p className="mt-4 text-slate-600">{link.description}</p>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {[
              { id: 'verify', label: 'אימות' },
              { id: 'select', label: 'בחירה' },
              { id: 'details', label: 'פרטים' },
              { id: 'success', label: 'אישור' },
            ].map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-2">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${step === s.id 
                      ? 'bg-indigo-600 text-white' 
                      : i < ['verify', 'select', 'details', 'success'].indexOf(step)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }
                  `}>
                    {i < ['verify', 'select', 'details', 'success'].indexOf(step) ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`
                    text-sm font-medium hidden sm:block
                    ${step === s.id ? 'text-indigo-600' : 'text-slate-500'}
                  `}>
                    {s.label}
                  </span>
                </div>
                {i < 3 && (
                  <div className="flex-1 h-0.5 bg-slate-200 mx-2" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* History Toggle */}
        {step !== 'verify' && step !== 'success' && customerHistory.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="mb-4 flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-white px-4 py-2 rounded-lg border border-indigo-100 shadow-sm transition-all"
          >
            <Clock className="w-4 h-4" />
            {showHistory ? 'חזור להזמנה' : `היסטוריית תורים (${customerHistory.length})`}
          </button>
        )}

        {/* Social Proof Banner */}
        {socialProof && step === 'select' && !showHistory && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-3 text-sm text-amber-800">
              <Users className="w-5 h-5" />
              <span>
                <strong>{socialProof.currentlyViewing}</strong> אנשים צופים כעת • 
                <strong className="mx-1">{socialProof.slotsRemainingToday}</strong> משבצות נותרו היום
              </span>
            </div>
            {socialProof.recentlyBooked.length > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs text-amber-700">
                <Sparkles className="w-4 h-4" />
                <span>
                  {socialProof.recentlyBooked[0].name} קבע תור לפני {socialProof.recentlyBooked[0].timeAgo}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          {showHistory ? (
            <HistoryView appointments={customerHistory} onBack={() => setShowHistory(false)} />
          ) : (
            renderStepContent()
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// HISTORY VIEW
// ============================================

function HistoryView({ appointments, onBack }: { appointments: any[]; onBack: () => void }) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">היסטוריית תורים</h2>
        <button onClick={onBack} className="text-sm text-indigo-600 font-medium">סגור</button>
      </div>
      <div className="space-y-4">
        {appointments.map((apt) => (
          <div key={apt.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-slate-900">{apt.service?.name}</div>
                <div className="text-sm text-slate-500 mt-1">
                  {format(new Date(apt.startTime), 'EEEE, d בMMMM yyyy', { locale: he })}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {format(new Date(apt.startTime), 'HH:mm')} - {format(new Date(apt.endTime), 'HH:mm')}
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                apt.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                'bg-slate-200 text-slate-700'
              }`}>
                {apt.status === 'confirmed' ? 'מאושר' :
                 apt.status === 'cancelled' ? 'בוטל' :
                 apt.status === 'completed' ? 'הושלם' : apt.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface VerificationStepProps {
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  otpSent: boolean;
  otpCode: string;
  setOtpCode: (v: string) => void;
  otpAttempts: number;
  onSendOTP: () => void;
  onVerify: () => void;
  isLoading: boolean;
  error: string | null;
}

function VerificationStep({
  email,
  setEmail,
  phone,
  setPhone,
  otpSent,
  otpCode,
  setOtpCode,
  otpAttempts,
  onSendOTP,
  onVerify,
  isLoading,
  error,
}: VerificationStepProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-6">
        <Lock className="w-12 h-12 mx-auto text-indigo-600 mb-3" />
        <h2 className="text-xl font-bold text-slate-900">אימות פרטים</h2>
        <p className="text-slate-600 mt-1">נשלח קוד אימות למייל ולטלפון</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            מייל <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={otpSent}
              className="w-full pr-10 pl-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
              placeholder="your@email.com"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            טלפון <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={otpSent}
              className="w-full pr-10 pl-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
              placeholder="050-1234567"
            />
          </div>
        </div>

        {/* Send OTP Button */}
        {!otpSent && (
          <button
            onClick={onSendOTP}
            disabled={isLoading || !email || !phone}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'שולח...' : 'שלח קוד אימות'}
          </button>
        )}

        {/* OTP Input */}
        {otpSent && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                קוד אימות <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
              />
              {otpAttempts > 0 && (
                <p className="mt-1 text-xs text-rose-600">
                  ניסיון {otpAttempts} מ-3
                </p>
              )}
            </div>

            <button
              onClick={onVerify}
              disabled={isLoading || otpCode.length < 4}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'מאמת...' : 'אמת'}
            </button>

            <button
              onClick={onSendOTP}
              className="w-full py-2 text-indigo-600 text-sm hover:underline"
            >
              שלח קוד חדש
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface SelectionStepProps {
  services: Array<{ id: string; name: string; durationMinutes: number; priceAmount?: number; requiresPayment: boolean }>;
  selectedServiceId: string;
  onSelectService: (id: string) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
  availableDays: number[];
  slotsForDate: TimeSlot[];
  currentMonth: Date;
  onNavigateMonth: (direction: 'next' | 'prev') => void;
  daysInMonth: Date[];
  onContinue: () => void;
  onBack: () => void;
}

function SelectionStep({
  services,
  selectedServiceId,
  onSelectService,
  selectedDate,
  onSelectDate,
  selectedSlot,
  onSelectSlot,
  availableDays,
  slotsForDate,
  currentMonth,
  onNavigateMonth,
  daysInMonth,
  onContinue,
  onBack,
}: SelectionStepProps) {
  const weekDays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  return (
    <div className="p-6 space-y-6">
      {/* Service Selection */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">בחר שירות</h3>
        <div className="grid gap-3">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => onSelectService(service.id)}
              className={`
                p-4 rounded-lg border text-right transition-all
                ${selectedServiceId === service.id
                  ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100'
                  : 'border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-slate-900">{service.name}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    {service.durationMinutes} דקות
                  </div>
                </div>
                {service.priceAmount && (
                  <div className="text-lg font-bold text-indigo-600">
                    ₪{service.priceAmount}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      {selectedServiceId && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-3">בחר תאריך</h3>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            {/* Month Navigation */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border-b border-slate-200">
              <button
                onClick={() => onNavigateMonth('prev')}
                className="p-1 hover:bg-slate-200 rounded"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <span className="font-medium text-slate-900">
                {format(currentMonth, 'MMMM yyyy', { locale: he })}
              </span>
              <button
                onClick={() => onNavigateMonth('next')}
                className="p-1 hover:bg-slate-200 rounded"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
              {weekDays.map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-slate-600">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7">
              {daysInMonth.map((date) => {
                const dayOfWeek = getDay(date);
                const isAvailable = availableDays.includes(dayOfWeek);
                const isPast = date < new Date();
                const isSelected = isSameDay(date, selectedDate);
                const isShabbat = dayOfWeek === 6;

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => isAvailable && !isPast && !isShabbat && onSelectDate(date)}
                    disabled={!isAvailable || isPast || isShabbat}
                    className={`
                      p-2 text-center text-sm transition-colors
                      ${isSelected ? 'bg-indigo-600 text-white' : ''}
                      ${isShabbat ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}
                      ${!isAvailable && !isShabbat ? 'text-slate-300 cursor-not-allowed' : ''}
                      ${isAvailable && !isSelected && !isShabbat && !isPast ? 'hover:bg-slate-100 cursor-pointer' : ''}
                      ${isPast ? 'text-slate-300 cursor-not-allowed' : ''}
                    `}
                  >
                    {format(date, 'd')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Time Slots */}
      {selectedServiceId && selectedDate && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-3">בחר שעה</h3>
          {slotsForDate.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slotsForDate.map((slot, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectSlot(slot)}
                  className={`
                    p-3 rounded-lg border text-center transition-all
                    ${selectedSlot === slot
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100'
                      : 'border-slate-200 hover:border-slate-300'
                    }
                  `}
                >
                  <div className="font-medium text-slate-900">
                    {format(new Date(slot.startTime), 'HH:mm')}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Timer className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>אין מועדים פנויים בתאריך זה</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
        >
          חזור
        </button>
        <button
          onClick={onContinue}
          disabled={!selectedServiceId || !selectedSlot}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          המשך
        </button>
      </div>
    </div>
  );
}

interface DetailsStepProps {
  customerName: string;
  setCustomerName: (v: string) => void;
  customerCompany: string;
  setCustomerCompany: (v: string) => void;
  customerReason: string;
  setCustomerReason: (v: string) => void;
  requiresReason: boolean;
  onContinue: () => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

function DetailsStep({
  customerName,
  setCustomerName,
  customerCompany,
  setCustomerCompany,
  customerReason,
  setCustomerReason,
  requiresReason,
  onContinue,
  onBack,
  isLoading,
  error,
}: DetailsStepProps) {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-slate-900">פרטים אישיים</h2>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            שם מלא <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full pr-10 pl-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="ישראל ישראלי"
            />
          </div>
        </div>

        {/* Company */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            חברה/ארגון
          </label>
          <div className="relative">
            <Building className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={customerCompany}
              onChange={(e) => setCustomerCompany(e.target.value)}
              className="w-full pr-10 pl-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="שם החברה"
            />
          </div>
        </div>

        {/* Reason */}
        {requiresReason && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              מטרת הפגישה <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MessageSquare className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
              <textarea
                value={customerReason}
                onChange={(e) => setCustomerReason(e.target.value)}
                rows={3}
                className="w-full pr-10 pl-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="תיאור קצר של מטרת הפגישה..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
        >
          חזור
        </button>
        <button
          onClick={onContinue}
          disabled={isLoading || !customerName || (requiresReason && !customerReason)}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {isLoading ? 'שומר...' : 'קבע תור'}
        </button>
      </div>
    </div>
  );
}

interface SuccessStepProps {
  serviceName?: string;
  date: Date;
  slot: TimeSlot | null;
  provider: { id: string; name: string; avatar?: string };
  locationType: BookingLocationType;
  locationDetails?: string | null;
  pdfUrl?: string;
}

function SuccessStep({
  serviceName,
  date,
  slot,
  provider,
  locationType,
  locationDetails,
  pdfUrl,
}: SuccessStepProps) {
  const getLocationIcon = () => {
    switch (locationType) {
      case 'zoom':
      case 'meet':
        return Video;
      case 'phone':
        return PhoneIcon;
      default:
        return MapPin;
    }
  };

  const LocationIcon = getLocationIcon();

  return (
    <div className="p-6 text-center">
      <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-2">התור נקבע בהצלחה!</h2>
      <p className="text-slate-600 mb-6">נשלח אישור למייל ולטלפון</p>

      {/* Summary Card */}
      <div className="bg-slate-50 rounded-lg p-4 text-right mb-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <span className="text-slate-700">
              {format(date, 'EEEE, d בMMMM yyyy', { locale: he })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-indigo-600" />
            <span className="text-slate-700">
              {slot ? format(new Date(slot.startTime), 'HH:mm') : ''} - {slot ? format(new Date(slot.endTime), 'HH:mm') : ''}
            </span>
          </div>
          {serviceName && (
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-indigo-600" />
              <span className="text-slate-700">{serviceName}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <LocationIcon className="w-5 h-5 text-indigo-600" />
            <span className="text-slate-700">
              {locationType === 'zoom' && 'פגישת Zoom'}
              {locationType === 'meet' && 'Google Meet'}
              {locationType === 'phone' && 'שיחת טלפון'}
              {locationType === 'address' && (locationDetails || 'פגישה פרונטלית')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-indigo-600" />
            <span className="text-slate-700">{provider.name}</span>
          </div>
        </div>
      </div>

      {/* Add to Calendar */}
      <div className="flex flex-col gap-2">
        <button className="w-full py-3 border border-indigo-200 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50">
          <Calendar className="w-5 h-5 inline ml-2" />
          הוסף ליומן
        </button>
        
        {pdfUrl && (
          <a 
            href={pdfUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            הורד חשבונית
          </a>
        )}
      </div>

      <p className="text-xs text-slate-500 mt-4">
        קיבלת הודעת אישור במייל וב-SMS
      </p>
    </div>
  );
}

export default PublicBookingPage;
