/**
 * Booking System Type Definitions
 * MISRAD AI - Appointment Scheduling System
 * 
 * @module types/booking
 * @description Type definitions for the complete booking system
 */

// ============================================
// ENUMS (TypeScript equivalents)
// ============================================

export type BookingAppointmentStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show';

export type BookingLocationType = 
  | 'zoom' 
  | 'meet' 
  | 'phone' 
  | 'address';

export type BookingReminderType = 
  | 'email' 
  | 'sms' 
  | 'whatsapp';

export type BookingReminderStatus = 
  | 'pending' 
  | 'sent' 
  | 'failed';

export type BookingPaymentStatus = 
  | 'pending' 
  | 'completed' 
  | 'failed' 
  | 'refunded';

export type BookingWaitlistStatus = 
  | 'active' 
  | 'notified' 
  | 'converted' 
  | 'expired';

export type BookingWaitlistUrgency = 
  | 'low' 
  | 'normal' 
  | 'high' 
  | 'urgent';

export type AvailabilityType = 
  | 'weekly' 
  | 'override' 
  | 'blocked';

export type CalendarSyncProvider = 
  | 'google' 
  | 'outlook' 
  | 'apple';

export type CalendarSyncDirection = 
  | 'to_external' 
  | 'from_external' 
  | 'bidirectional';

// ============================================
// CORE ENTITIES
// ============================================

/**
 * נותן שירות (יומן)
 */
export interface BookingProvider {
  id: string;
  organizationId: string;
  userId?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  isActive: boolean;
  bufferMinutes: number;
  maxDailyAppointments: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  services?: BookingProviderService[];
  availabilities?: BookingAvailability[];
  appointments?: BookingAppointment[];
  links?: BookingLink[];
}

/**
 * סוג תור (שירות)
 */
export interface BookingService {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  color: string;
  durationMinutes: number;
  bufferAfterMinutes: number;
  priceAmount?: Decimal | null;
  currency: string;
  requiresPayment: boolean;
  requiresApproval: boolean;
  requiresReason: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  providers?: BookingProviderService[];
  links?: BookingLinkService[];
}

/**
 * קשר Provider-Service
 */
export interface BookingProviderService {
  id: string;
  providerId: string;
  serviceId: string;
  customDuration?: number | null;
  customPrice?: Decimal | null;
  isActive: boolean;
  
  // Relations
  provider?: BookingProvider;
  service?: BookingService;
}

/**
 * זמינות (חלונות זמן)
 */
export interface BookingAvailability {
  id: string;
  organizationId: string;
  providerId: string;
  type: AvailabilityType;
  dayOfWeek?: number | null;
  specificDate?: Date | null;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  timezone: string;
  isAvailable: boolean;
  reason?: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  provider?: BookingProvider;
}

/**
 * לינק ציבורי לקביעת תור
 */
export interface BookingLink {
  id: string;
  organizationId: string;
  providerId: string;
  slug: string;
  title: string;
  description?: string | null;
  availableDays: number[]; // 0-6 (ראשון-שבת)
  minNoticeHours: number;
  maxBookingDays: number;
  allowCancellations: boolean;
  cancellationDeadlineHours: number;
  requirePayment: boolean;
  paymentAmount?: Decimal | null;
  requireApproval: boolean;
  locationType: BookingLocationType;
  locationDetails?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  provider?: BookingProvider;
  services?: BookingLinkService[];
  appointments?: BookingAppointment[];
}

/**
 * קשר Link-Service
 */
export interface BookingLinkService {
  id: string;
  linkId: string;
  serviceId: string;
  
  // Relations
  link?: BookingLink;
  service?: BookingService;
}

/**
 * תור שנקבע
 */
export interface BookingAppointment {
  id: string;
  organizationId: string;
  linkId: string;
  providerId: string;
  serviceId: string;
  
  // Customer details
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  customerCompany?: string | null;
  customerReason?: string | null;
  
  // Timing
  startTime: Date;
  endTime: Date;
  timezone: string;
  
  // Location
  locationType: BookingLocationType;
  locationDetails?: string | null;
  meetingUrl?: string | null;
  
  // Status
  status: BookingAppointmentStatus;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  
  // Cancellation
  cancelledAt?: Date | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  
  // Admin
  adminNotes?: string | null;
  attended?: boolean | null;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  link?: BookingLink;
  provider?: BookingProvider;
  service?: BookingService;
  payment?: BookingPayment;
  reminders?: BookingReminder[];
}

/**
 * תשלום
 */
export interface BookingPayment {
  id: string;
  appointmentId: string;
  organizationId: string;
  amount: Decimal;
  currency: string;
  status: BookingPaymentStatus;
  chargeId?: string | null;
  invoiceId?: string | null;
  provider: string;
  transactionId?: string | null;
  receiptUrl?: string | null;
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  appointment?: BookingAppointment;
}

/**
 * תזכורת
 */
export interface BookingReminder {
  id: string;
  appointmentId: string;
  scheduledFor: Date;
  type: BookingReminderType;
  template: string;
  status: BookingReminderStatus;
  sentAt?: Date | null;
  error?: string | null;
  createdAt: Date;
  
  // Relations
  appointment?: BookingAppointment;
}

/**
 * אימות OTP
 */
export interface BookingVerification {
  id: string;
  linkId: string;
  phone: string;
  email: string;
  otpCode: string;
  expiresAt: Date;
  verifiedAt?: Date | null;
  attempts: number;
  isVerified: boolean;
  createdAt: Date;
  
  // Relations
  link?: BookingLink;
}

/**
 * רשימת המתנה
 */
export interface BookingWaitlist {
  id: string;
  linkId: string;
  organizationId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  preferredDays: number[];
  preferredTimes: string[];
  urgency: BookingWaitlistUrgency;
  status: BookingWaitlistStatus;
  position: number;
  convertedToAppointmentId?: string | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  link?: BookingLink;
}

/**
 * סנכרון יומן חיצוני
 */
export interface BookingCalendarSync {
  id: string;
  organizationId: string;
  providerId: string;
  provider: CalendarSyncProvider;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  syncDirection: CalendarSyncDirection;
  calendarId?: string | null;
  lastSyncedAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  providerRef?: BookingProvider;
}

/**
 * מטמון תאריכים עבריים
 */
export interface BookingHebrewDateCache {
  id: string;
  gregorianDate: Date;
  hebrewDate: string;
  hebrewShort: string;
  parasha?: string | null;
  isHoliday: boolean;
  holidayName?: string | null;
  isShabbat: boolean;
  candleLighting?: string | null;
  havdalah?: string | null;
  createdAt: Date;
}

// ============================================
// DTOs (Data Transfer Objects)
// ============================================

/**
 * DTO ליצירת Provider
 */
export interface CreateBookingProviderDTO {
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  bufferMinutes?: number;
  maxDailyAppointments?: number;
}

/**
 * DTO לעדכון Provider
 */
export interface UpdateBookingProviderDTO {
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  isActive?: boolean;
  bufferMinutes?: number;
  maxDailyAppointments?: number;
}

/**
 * DTO ליצירת Service
 */
export interface CreateBookingServiceDTO {
  name: string;
  description?: string;
  color?: string;
  durationMinutes: number;
  bufferAfterMinutes?: number;
  priceAmount?: number;
  currency?: string;
  requiresPayment?: boolean;
  requiresApproval?: boolean;
  requiresReason?: boolean;
}

/**
 * DTO לעדכון Service
 */
export interface UpdateBookingServiceDTO {
  name?: string;
  description?: string;
  color?: string;
  durationMinutes?: number;
  bufferAfterMinutes?: number;
  priceAmount?: number;
  requiresPayment?: boolean;
  requiresApproval?: boolean;
  requiresReason?: boolean;
  isActive?: boolean;
}

/**
 * DTO ליצירת Availability
 */
export interface CreateBookingAvailabilityDTO {
  type: AvailabilityType;
  dayOfWeek?: number;
  specificDate?: Date;
  startTime: string;
  endTime: string;
  timezone?: string;
  isAvailable?: boolean;
  reason?: string;
}

/**
 * DTO ליצירת Link
 */
export interface CreateBookingLinkDTO {
  slug: string;
  title: string;
  description?: string;
  providerId: string;
  serviceIds: string[];
  availableDays: number[];
  minNoticeHours?: number;
  maxBookingDays?: number;
  allowCancellations?: boolean;
  cancellationDeadlineHours?: number;
  requirePayment?: boolean;
  paymentAmount?: number;
  requireApproval?: boolean;
  locationType: BookingLocationType;
  locationDetails?: string;
}

/**
 * DTO לעדכון Link
 */
export interface UpdateBookingLinkDTO {
  title?: string;
  description?: string;
  serviceIds?: string[];
  availableDays?: number[];
  minNoticeHours?: number;
  maxBookingDays?: number;
  allowCancellations?: boolean;
  cancellationDeadlineHours?: number;
  requirePayment?: boolean;
  paymentAmount?: number;
  requireApproval?: boolean;
  locationType?: BookingLocationType;
  locationDetails?: string;
  isActive?: boolean;
}

/**
 * DTO ליצירת תור
 */
export interface CreateBookingAppointmentDTO {
  linkId: string;
  providerId: string;
  serviceId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerCompany?: string;
  customerReason?: string;
  startTime: Date;
  endTime: Date;
  timezone?: string;
  locationType: BookingLocationType;
  locationDetails?: string;
  meetingUrl?: string;
}

/**
 * DTO לעדכון תור
 */
export interface UpdateBookingAppointmentDTO {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerCompany?: string;
  customerReason?: string;
  startTime?: Date;
  endTime?: Date;
  locationType?: BookingLocationType;
  locationDetails?: string;
  status?: BookingAppointmentStatus;
  adminNotes?: string;
  attended?: boolean;
}

/**
 * DTO לאימות OTP
 */
export interface BookingVerificationDTO {
  linkId: string;
  phone: string;
  email: string;
  otpCode?: string;
}

/**
 * DTO לרשימת המתנה
 */
export interface CreateBookingWaitlistDTO {
  linkId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  preferredDays: number[];
  preferredTimes: string[];
  urgency?: BookingWaitlistUrgency;
}

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * תשובה סטנדרטית
 */
export interface BookingResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * תשובה עם pagination
 */
export interface BookingPaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
  error?: string;
}

/**
 * תוצאת זמינות
 */
export interface AvailabilityResult {
  success: boolean;
  slots: TimeSlot[];
  error?: string;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * חלון זמן פנוי
 */
export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  duration: number;
  isAvailable: boolean;
  reason?: string;
}

/**
 * הגדרת Buffer דינמי
 */
export interface BufferRule {
  locationBufferMap: Record<BookingLocationType, number>;
  conditionalRules: BufferConditionalRule[];
}

export interface BufferConditionalRule {
  condition: 'sameLocationAsPrevious' | 'highPriorityClient' | 'backToBackMeetings';
  reduction?: number;
  minimumBuffer?: number;
}

/**
 * נתוני Social Proof
 */
export interface SocialProofData {
  currentlyViewing: number;
  recentlyBooked: {
    customerName: string;
    timeAgo: string;
    avatar?: string;
  }[];
  slotsRemainingToday: number;
  nextAvailableSlot: Date;
  lastSlotWarning: boolean;
}

/**
 * זמני שבת
 */
export interface ShabbatTimes {
  date: Date;
  candleLighting: string;
  havdalah: string;
  parasha: string;
}

/**
 * נתוני תזכורת
 */
export interface ReminderSchedule {
  confirmation: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    includeICS: boolean;
  };
  reminders: {
    '24h': { email: boolean; sms: boolean; whatsapp: boolean };
    '1h': { email: boolean; sms: boolean; whatsapp: boolean };
  };
  followUp: {
    enabled: boolean;
    delay: '1h' | 'morning_after';
    type: 'thank_you' | 'summary' | 'feedback_request';
  };
}

// ============================================
// VIEW MODELS (For UI)
// ============================================

/**
 * תצוגת יומן
 */
export interface CalendarViewModel {
  date: Date;
  hebrewDate?: string;
  isHoliday: boolean;
  isShabbat: boolean;
  holidayName?: string;
  appointments: CalendarAppointmentView[];
  availableSlots: TimeSlot[];
}

/**
 * תצוגת תור ביומן
 */
export interface CalendarAppointmentView {
  id: string;
  title: string;
  customerName: string;
  serviceName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: BookingAppointmentStatus;
  locationType: BookingLocationType;
  hasPayment: boolean;
  needsApproval: boolean;
  color: string;
}

/**
 * תצוגת Provider עם סטטיסטיקה
 */
export interface ProviderWithStats extends BookingProvider {
  totalAppointments: number;
  upcomingAppointments: number;
  todayAppointments: number;
  completionRate: number;
}

/**
 * תצוגת Link עם סטטיסטיקה
 */
export interface LinkWithStats extends BookingLink {
  totalBookings: number;
  recentBookings: number;
  conversionRate: number;
}

// ============================================
// FORM TYPES
// ============================================

/**
 * טופס קביעת תור ציבורי
 */
export interface PublicBookingForm {
  // Step 1: Verification
  email: string;
  phone: string;
  otpCode?: string;
  
  // Step 2: Selection
  selectedDate: Date;
  selectedSlot: TimeSlot;
  serviceId: string;
  
  // Step 3: Details
  customerName: string;
  customerCompany?: string;
  customerReason?: string;
  
  // Step 4: Confirmation
  agreeToTerms: boolean;
}

/**
 * טופס הגדרות Provider
 */
export interface ProviderSettingsForm {
  bufferMinutes: number;
  maxDailyAppointments: number;
  defaultLocationType: BookingLocationType;
  defaultLocationDetails?: string;
  reminderSettings: ReminderSchedule;
}

// ============================================
// EXTERNAL INTEGRATIONS
// ============================================

/**
 * אירוע ביומן חיצוני
 */
export interface ExternalCalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  location?: string;
  isBusy: boolean;
}

/**
 * תוצאת סנכרון
 */
export interface CalendarSyncResult {
  success: boolean;
  syncedEvents: number;
  failedEvents: number;
  errors?: string[];
}

// ============================================
// ERROR TYPES
// ============================================

export type BookingErrorCode =
  | 'SLOT_NOT_AVAILABLE'
  | 'DOUBLE_BOOKING'
  | 'INVALID_TIME'
  | 'PAST_DATE'
  | 'OUTSIDE_AVAILABILITY'
  | 'PAYMENT_REQUIRED'
  | 'PAYMENT_FAILED'
  | 'VERIFICATION_REQUIRED'
  | 'VERIFICATION_EXPIRED'
  | 'VERIFICATION_FAILED'
  | 'CANCELLATION_NOT_ALLOWED'
  | 'CANCELLATION_DEADLINE_PASSED'
  | 'APPROVAL_REQUIRED'
  | 'LINK_NOT_ACTIVE'
  | 'SERVICE_NOT_AVAILABLE'
  | 'PROVIDER_NOT_AVAILABLE'
  | 'MAX_DAILY_APPOINTMENTS_REACHED'
  | 'INVALID_OTP'
  | 'OTP_EXPIRED'
  | 'TOO_MANY_ATTEMPTS'
  | 'SHABBAT_NOT_ALLOWED'
  | 'HOLIDAY_NOT_ALLOWED';

export interface BookingError {
  code: BookingErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================
// Decimal type helper (for Prisma Decimal)
// ============================================

import { Decimal } from '@prisma/client/runtime/library';

export { Decimal };
