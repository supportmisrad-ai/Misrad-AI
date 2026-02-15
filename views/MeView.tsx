'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { User as UserIcon, Settings, Shield, Bell, LogOut, CreditCard, X, Camera, Activity, Clock, MapPin, MapPinned, Timer, ChevronDown, Crown, Zap, Flame, Wallet, Trophy, TrendingUp, Calendar, CalendarDays, CheckCircle, XCircle, Lock, AlertCircle, Target } from 'lucide-react';
import { useData } from '../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useClerk } from '@clerk/nextjs';
import { HoldButton } from '../components/HoldButton';
import { LeadStatus, Status, type Lead, type Task, type TimeEntry } from '../types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getNexusBasePath, getWorkspaceOrgSlugFromPathname, toNexusPath } from '@/lib/os/nexus-routing';
import { encodeWorkspaceOrgSlug, parseWorkspaceRoute } from '@/lib/os/social-routing';
import { extractData, extractError } from '@/lib/shared/api-types';
import NexusCard from '@/components/shared/NexusCard';
import { useWorkspaceSystemIdentity } from '@/hooks/useWorkspaceSystemIdentity';

import SystemSettingsDrawerContent from '@/components/me/module-settings/SystemSettingsDrawerContent';
import SocialSettingsDrawerContent from '@/components/me/module-settings/SocialSettingsDrawerContent';
import ClientSettingsDrawerContent from '@/components/me/module-settings/ClientSettingsDrawerContent';
import FinanceSettingsDrawerContent from '@/components/me/module-settings/FinanceSettingsDrawerContent';

// Imported Settings Components
import { PersonalSettings } from '../components/me/PersonalSettings';
import { NotificationSettings } from '../components/me/NotificationSettings';
import { SecuritySettings } from '../components/me/SecuritySettings';
import { BillingSettings } from '../components/me/BillingSettings';
import { Avatar } from '../components/Avatar';
import { LeaveRequestModal } from '../components/nexus/team/LeaveRequestModal';
import { EventRequestModal } from '../components/nexus/team/EventRequestModal';

type MeModuleCard = {
  title: string;
  subtitle?: string | null;
  href: string;
  iconId?: 'settings' | 'target' | 'trending_up' | 'user';
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : '';
}

function getObjectProp(obj: Record<string, unknown> | null, key: string): Record<string, unknown> | null {
  return asObject(obj?.[key]);
}

function getNumberProp(obj: Record<string, unknown> | null, key: string): number | null {
  const v = obj?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).filter(Boolean);
}

type LeaveRequestStatus = 'approved' | 'rejected' | 'pending' | string;
type LeaveRequest = {
  id: string;
  start_date: string;
  end_date: string | null;
  status: LeaveRequestStatus;
  reason: string | null;
  metadata: { isUrgent?: boolean } | null;
};

function coerceLeaveRequest(value: unknown): LeaveRequest {
  const obj = asObject(value) ?? {};
  const meta = asObject(obj.metadata);
  return {
    id: String(obj.id ?? ''),
    start_date: String(obj.start_date ?? ''),
    end_date: obj.end_date == null ? null : String(obj.end_date),
    status: String(obj.status ?? 'pending'),
    reason: obj.reason == null ? null : String(obj.reason),
    metadata: meta ? { ...(typeof meta.isUrgent === 'boolean' ? { isUrgent: meta.isUrgent } : {}) } : null,
  };
}

type AttendanceStatus = 'attending' | 'not_attending';
type AttendanceRow = { userId: string; status: AttendanceStatus | null };

function coerceAttendanceRow(value: unknown): AttendanceRow {
  const obj = asObject(value) ?? {};
  const userId = String(obj.user_id ?? obj.userId ?? '');
  const statusRaw = obj.status;
  const status = statusRaw === 'attending' || statusRaw === 'not_attending' ? statusRaw : null;
  return { userId, status };
}

type TeamEvent = {
  id: string;
  title: string;
  start_date: string;
  required_attendees: string[];
  optional_attendees: string[];
};

function coerceTeamEvent(value: unknown): TeamEvent {
  const obj = asObject(value) ?? {};
  return {
    id: String(obj.id ?? ''),
    title: String(obj.title ?? ''),
    start_date: String(obj.start_date ?? ''),
    required_attendees: coerceStringArray(obj.required_attendees),
    optional_attendees: coerceStringArray(obj.optional_attendees),
  };
}

export const MeView: React.FC<{
  children?: React.ReactNode;
  basePathOverride?: string;
  moduleCards?: MeModuleCard[];
}> = ({
  children,
  basePathOverride,
  moduleCards,
}) => {
  const { currentUser, logout, tasks, activeShift, clockIn, clockOut, timeEntries, leads, addToast, users } = useData();
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const workspaceInfo = parseWorkspaceRoute(pathname);
  const orgSlug = workspaceInfo.orgSlug;
  const basePath = basePathOverride || getNexusBasePath(pathname);

  const { identity: systemIdentity } = useWorkspaceSystemIdentity(orgSlug, {
    name: currentUser?.name,
    role: currentUser?.role,
    avatarUrl: currentUser?.avatar,
  });

  const needsProfileCompletion = Boolean(systemIdentity?.needsProfileCompletion);

  const resolvedModuleCards = useMemo(() => {
    const list = Array.isArray(moduleCards) ? moduleCards : [];
    return list
      .filter((c) => c && typeof c.href === 'string' && c.href.trim().length > 0 && typeof c.title === 'string')
      .filter((c) => c.title !== 'הגדרות מערכת' && !c.href.includes('drawer=system'));
  }, [moduleCards]);

  const resolveModuleCardIcon = (iconId: MeModuleCard['iconId']) => {
    switch (iconId) {
      case 'settings':
        return Settings;
      case 'target':
        return Target;
      case 'trending_up':
        return TrendingUp;
      case 'user':
        return UserIcon;
      default:
        return null;
    }
  };
  const navigate = useCallback(
      (path: string, opts?: { replace?: boolean }) => {
          const target = toNexusPath(basePath, path);
          if (opts?.replace) {
              router.replace(target);
          } else {
              router.push(target);
          }
      },
      [basePath, router]
  );

  const openProfileEditor = () => {
    if (needsProfileCompletion) {
      const target = `${toNexusPath(basePath, '/me')}?edit=profile`;
      router.push(target);
      setActiveSettingModal('personal');
      return;
    }
    setActiveSettingModal('personal');
  };
  const [activeSettingModal, setActiveSettingModal] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(true); // Start with history tab open
  const [showLeaveRequestModal, setShowLeaveRequestModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [myLeaveRequests, setMyLeaveRequests] = useState<LeaveRequest[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<TeamEvent[]>([]);
  const [cachedLeaveRequests, setCachedLeaveRequests] = useState<LeaveRequest[]>([]);
  const [cachedEvents, setCachedEvents] = useState<TeamEvent[]>([]);
  const [isLoadingLeaveRequests, setIsLoadingLeaveRequests] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [eventRSVPStatus, setEventRSVPStatus] = useState<Record<string, string>>({});

  const [hasNexusEntitlement, setHasNexusEntitlement] = useState<boolean | null>(null);

  const [activeModuleSettingsDrawer, setActiveModuleSettingsDrawer] = useState<
    'system' | 'social' | 'client' | 'finance' | null
  >(null);

  const currentInsightsModule = useMemo(() => {
      const mod = workspaceInfo.module;
      if (mod === 'system' || mod === 'client' || mod === 'finance' || mod === 'social') {
          return mod;
      }
      return null;
  }, [workspaceInfo.module]);

  const [meInsightsLoading, setMeInsightsLoading] = useState(false);
  const [meInsightsData, setMeInsightsData] = useState<unknown>(null);

  const meInsightsObj = useMemo(() => asObject(meInsightsData), [meInsightsData]);
  const hotLeadsTotal = useMemo(() => {
    const hotLeadsObj = getObjectProp(meInsightsObj, 'hotLeads');
    return getNumberProp(hotLeadsObj, 'totalLeads');
  }, [meInsightsObj]);
  const commitmentsCount = useMemo(() => {
    const commitmentsObj = getObjectProp(meInsightsObj, 'commitments');
    return getNumberProp(commitmentsObj, 'count');
  }, [meInsightsObj]);
  const expectedMonthlyRevenue = useMemo(() => getNumberProp(meInsightsObj, 'expectedMonthlyRevenue'), [meInsightsObj]);

  useEffect(() => {
      if (!orgSlug || !currentInsightsModule) {
          setMeInsightsData(null);
          setMeInsightsLoading(false);
          return;
      }

      const controller = new AbortController();
      setMeInsightsLoading(true);

      (async () => {
          try {
              const res = await fetch(
                  `/api/workspaces/${encodeWorkspaceOrgSlug(orgSlug)}/me-insights?module=${encodeURIComponent(currentInsightsModule)}`,
                  { cache: 'no-store', signal: controller.signal }
              );
              if (!res.ok) {
                  setMeInsightsData(null);
                  return;
              }
              const data = await res.json().catch(() => null);
              setMeInsightsData(data);
          } catch {
              setMeInsightsData(null);
          } finally {
              setMeInsightsLoading(false);
          }
      })();

      return () => controller.abort();
  }, [orgSlug, currentInsightsModule]);

  useEffect(() => {
      const loadEntitlements = async () => {
          if (!orgSlug) {
              setHasNexusEntitlement(null);
              return;
          }
          try {
              const res = await fetch(`/api/workspaces/${encodeWorkspaceOrgSlug(orgSlug)}/entitlements`, { cache: 'no-store' });
              if (!res.ok) {
                  setHasNexusEntitlement(false);
                  return;
              }
              const data = await res.json().catch(() => ({}));
              setHasNexusEntitlement(Boolean(data?.entitlements?.nexus));
          } catch {
              setHasNexusEntitlement(false);
          }
      };

      loadEntitlements();
  }, [orgSlug]);

  const getOrgHeaderValue = () => {
      if (typeof window === 'undefined') return null;
      return getWorkspaceOrgSlugFromPathname(window.location.pathname) || null;
  };


  // Handle RSVP for events
  const handleEventRSVP = async (eventId: string, status: 'attending' | 'not_attending') => {
      try {
          const orgId = getOrgHeaderValue();
          const response = await fetch(`/api/team-events/${eventId}/attendance`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(orgId ? { 'x-org-id': orgId } : {}) },
              body: JSON.stringify({ status })
          });

          if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              const errorMsg = extractError(errorData);
              throw new Error(errorMsg || 'שגיאה בשמירת אישור הגעה');
          }

          setEventRSVPStatus(prev => ({ ...prev, [eventId]: status }));
          addToast(status === 'attending' ? 'אישור הגעה נשמר' : 'אישור אי-הגעה נשמר', 'success');
          
          // Reload events to refresh the list
          const loadEvents = async () => {
              try {
                  const orgId = getOrgHeaderValue();
                  const response = await fetch('/api/team-events?status=scheduled', {
                      headers: orgId ? { 'x-org-id': orgId } : undefined
                  });
                  if (response.ok) {
                      const data = await response.json().catch(() => ({}));
                      const payload = extractData<{ events?: unknown[] }>(data);
                      const now = new Date();
                      const upcoming = (payload?.events || [])
                          .map((e) => coerceTeamEvent(e))
                          .filter((e) => {
                              const eventDate = new Date(e.start_date);
                              return !Number.isNaN(eventDate.getTime()) && eventDate >= now;
                          })
                          .slice(0, 3);
                      setUpcomingEvents(upcoming);
                  }
              } catch (error) {
                  console.error('Error reloading events:', error);
              }
          };
          loadEvents();
      } catch (error: unknown) {
          addToast(getErrorMessage(error) || 'שגיאה בשמירת אישור הגעה', 'error');
      }
  };
  
  // Timer State
  const [elapsed, setElapsed] = useState('00:00:00');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Stats Calculation
  const myTasks = (tasks as Task[]).filter((t) => t.assigneeIds?.includes(currentUser.id) || t.assigneeId === currentUser.id);
  const completedTasks = myTasks.filter((t) => t.status === Status.DONE).length;
  const activeTasksCount = myTasks.filter((t) => t.status !== Status.DONE && t.status !== Status.CANCELED).length;
  const monthlyEfficiency = myTasks.length ? Math.round((completedTasks / myTasks.length) * 100) : null;

  // Personal Time Entries
  const myHistory = timeEntries
      .filter((entry: TimeEntry) => entry.userId === currentUser.id)
      .sort((a: TimeEntry, b: TimeEntry) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  // --- Daily Stats Calculation ---
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysEntries = timeEntries.filter((e: TimeEntry) => e.userId === currentUser.id && e.date === todayStr);
  
  // Sum finished shifts
  const finishedMinutes = todaysEntries.reduce((acc: number, curr: TimeEntry) => acc + (curr.durationMinutes || 0), 0);
  
  // Add active shift duration
  const activeShiftDuration = activeShift ? (currentTime.getTime() - new Date(activeShift.startTime).getTime()) / 60000 : 0;
  const totalTodayMinutes = Math.floor(finishedMinutes + activeShiftDuration);
  const hours = Math.floor(totalTodayMinutes / 60);
  const minutes = Math.floor(totalTodayMinutes % 60);
  const totalTodayLabel = hours > 0 
    ? `${hours}ש׳ ${minutes > 0 ? `${minutes}דק׳` : ''}`.trim()
    : minutes > 0 
    ? `${minutes}דק׳`
    : '0דק׳';

  // Last Activity Label
  const lastEntry = myHistory[0];
  const lastActivityLabel = lastEntry 
      ? (lastEntry.endTime ? `יציאה ב-${new Date(lastEntry.endTime).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}` : `כניסה ב-${new Date(lastEntry.startTime).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}`)
      : '--:--';

  // --- Gamification / Incentives Calculation ---
  // 1. Task Bonus
  const bonusPerTask = currentUser.bonusPerTask || 0;
  const taskBonusTotal = completedTasks * bonusPerTask;

  // 2. Sales Commission
  const commissionPct = currentUser.commissionPct || 0;
  const salesRevenue = (leads as Lead[])
      .filter((l) => l.status === LeadStatus.WON)
      .reduce((sum: number, l) => sum + (typeof l.value === 'number' ? l.value : 0), 0);
  const commissionTotal = currentUser.role.includes('מכירות') ? (salesRevenue * (commissionPct / 100)) : 0;

  // 3. Accumulated Rewards (Manager Approved)
  const oneOffBonuses = currentUser.accumulatedBonus || 0;

  const currentMonthBonus = taskBonusTotal + commissionTotal + oneOffBonuses;
  const streak = currentUser.streakDays || 0;

  const didOpenProfileFromUrlRef = useRef(false);

  // Check if we should open profile edit modal from URL
  useEffect(() => {
      const openProfile = searchParams?.get('edit') === 'profile' || (typeof window !== 'undefined' && window.location.hash === '#edit-profile');
      if (!openProfile) {
          didOpenProfileFromUrlRef.current = false;
          return;
      }

      if (didOpenProfileFromUrlRef.current) return;
      didOpenProfileFromUrlRef.current = true;
      if (openProfile) {
          setActiveSettingModal('personal');
          // Clean up URL after opening modal
          if (typeof window !== 'undefined') {
              setTimeout(() => {
                  navigate('/me', { replace: true });
              }, 100);
          }
      }
  }, [searchParams, navigate]);

  // Load leave requests and events with cache
  useEffect(() => {
      const loadMyData = async () => {
          // Show cached data immediately if available
          if (cachedLeaveRequests.length > 0) {
              setMyLeaveRequests(cachedLeaveRequests);
          }
          if (cachedEvents.length > 0) {
              setUpcomingEvents(cachedEvents);
          }
          
          setIsRefreshing(true);
          
          // Load my leave requests
          setIsLoadingLeaveRequests(true);
          try {
              const orgId = getOrgHeaderValue();
              const response = await fetch('/api/leave-requests?employee_id=' + encodeURIComponent(String(currentUser.id)), {
                  headers: orgId ? { 'x-org-id': orgId } : undefined
              });
              if (response.ok) {
                  const data = await response.json().catch(() => ({}));
                  const payload = extractData<{ requests?: unknown[] }>(data);
                  const newRequests = (payload?.requests || []).map((r) => coerceLeaveRequest(r));
                  setMyLeaveRequests(newRequests);
                  setCachedLeaveRequests(newRequests);
              }
          } catch (error) {
              console.error('Error loading leave requests:', error);
              // Keep cached data on error
              if (cachedLeaveRequests.length === 0) {
                  setMyLeaveRequests([]);
              }
          } finally {
              setIsLoadingLeaveRequests(false);
          }

          // Load upcoming events
          setIsLoadingEvents(true);
          try {
              const orgId = getOrgHeaderValue();
              const response = await fetch('/api/team-events?status=scheduled', {
                  headers: orgId ? { 'x-org-id': orgId } : undefined
              });
              if (response.ok) {
                  const data = await response.json().catch(() => ({}));
                  const payload = extractData<{ events?: unknown[] }>(data);
                  const now = new Date();
                  const upcoming = (payload?.events || [])
                      .map((e) => coerceTeamEvent(e))
                      .filter((e) => {
                          const eventDate = new Date(e.start_date);
                          return !Number.isNaN(eventDate.getTime()) && eventDate >= now;
                      })
                      .slice(0, 3); // Show only next 3
                  setUpcomingEvents(upcoming);
                  setCachedEvents(upcoming);
                  
                  // Load RSVP status for events where user is invited
                  upcoming.forEach(async (event) => {
                      const isInvited = 
                          event.required_attendees.includes(currentUser.id) ||
                          event.optional_attendees.includes(currentUser.id);
                      if (isInvited) {
                          try {
                                  const orgId = getOrgHeaderValue();
                                  const rsvpResponse = await fetch(`/api/team-events/${event.id}/attendance`, {
                                      headers: orgId ? { 'x-org-id': orgId } : undefined
                                  });
                              if (rsvpResponse.ok) {
                                  const rsvpData = await rsvpResponse.json().catch(() => ({}));
                                  const rsvpPayload = extractData<{ attendance?: unknown[] }>(rsvpData);
                                  const attendanceRows = (rsvpPayload?.attendance || []).map((a) => coerceAttendanceRow(a));
                                  const myAttendance = attendanceRows.find((a) => a.userId === currentUser.id);
                                  if (myAttendance?.status) {
                                      setEventRSVPStatus(prev => ({ ...prev, [event.id]: myAttendance.status as string }));
                                  }
                              }
                          } catch (error) {
                              console.error('Error loading RSVP status:', error);
                          }
                      }
                  });
              }
          } catch (error) {
              console.error('Error loading events:', error);
              // Keep cached data on error
              if (cachedEvents.length === 0) {
                  setUpcomingEvents([]);
              }
          } finally {
              setIsLoadingEvents(false);
              setIsRefreshing(false);
          }
      };
      loadMyData();
  }, [currentUser.id]);

  // Update active shift elapsed time
  useEffect(() => {
      const interval = setInterval(() => {
          setCurrentTime(new Date()); // Triggers re-render for total calculations
          
          if (activeShift) {
              const start = new Date(activeShift.startTime).getTime();
              const now = new Date().getTime();
              const diff = now - start;
              
              const hours = Math.floor(diff / (1000 * 60 * 60));
              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((diff % (1000 * 60)) / 1000);
              
              setElapsed(
                  `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
              );
          } else {
              setElapsed('00:00:00');
          }
      }, 1000);
      return () => clearInterval(interval);
  }, [activeShift]);

  const handleLogout = async () => {
      // עדכון מצב פנימי של האפליקציה (אם עדיין נדרש ל-DataContext)
      try {
          logout?.();
      } catch (e) {
          // מתעלמים משגיאות לוגיות פנימיות כאן
      }

      // התנתקות אמיתית מ-Clerk והפניה למסך ההתחברות
      await signOut();
      if (typeof window !== 'undefined') {
          window.location.href = '/login';
      }
  };

  const closeModal = () => {
      setActiveSettingModal(null);
      if (typeof window === 'undefined') return;
      const shouldClear = new URLSearchParams(window.location.search).get('edit') === 'profile' || window.location.hash === '#edit-profile';
      if (shouldClear) {
          navigate('/me', { replace: true });
      }
  };

  const closeModuleSettingsDrawer = () => setActiveModuleSettingsDrawer(null);

  const getDrawerFromHref = (href: string): 'system' | 'social' | 'client' | 'finance' | null => {
    try {
      const url = href.startsWith('http') ? new URL(href) : new URL(href, window.location.origin);
      const drawer = url.searchParams.get('drawer');
      if (drawer === 'system' || drawer === 'social' || drawer === 'client' || drawer === 'finance') return drawer;
      return null;
    } catch {
      return null;
    }
  };

  const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (isoString: string) => new Date(isoString).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const getMapUrl = (lat?: number, lng?: number) => {
      if (typeof lat !== 'number' || typeof lng !== 'number') return null;
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  };

  // Settings Modal Content Generator
  const renderModalContent = () => {
      switch(activeSettingModal) {
          case 'personal': return <PersonalSettings onClose={closeModal} />;
          case 'notifications': return <NotificationSettings onClose={closeModal} />;
          case 'security': return <SecuritySettings />;
          case 'billing': return <BillingSettings />;
          default: return null;
      }
  };

  return (
    <div className="max-w-5xl mx-auto w-full pb-16 md:pb-20 px-4 md:px-0">
      
      <AnimatePresence>
          {activeSettingModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={closeModal}
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="settings-modal-title"
                    className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden"
                  >
                      <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                          <h3 id="settings-modal-title" className="text-xl font-bold text-gray-900">
                              {activeSettingModal === 'personal' && 'עריכת פרופיל'}
                              {activeSettingModal === 'notifications' && 'הגדרות התראות'}
                              {activeSettingModal === 'security' && 'פרטיות ואבטחה'}
                              {activeSettingModal === 'billing' && 'חיוב ומנוי'}
                          </h3>
                          <button onClick={closeModal} className="text-gray-600 hover:text-black p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="סגור חלון הגדרות"><X size={20} /></button>
                      </div>
                      <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                          {renderModalContent()}
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      <AnimatePresence>
        {activeModuleSettingsDrawer ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
              onClick={closeModuleSettingsDrawer}
            />
            <motion.aside
              initial={{ x: 520 }}
              animate={{ x: 0 }}
              exit={{ x: 520 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed top-0 right-0 z-[111] h-[100dvh] w-full sm:w-[520px] bg-white shadow-2xl border-l border-slate-200 flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="הגדרות מערכת"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-lg font-black text-slate-900 truncate">
                    {activeModuleSettingsDrawer === 'system'
                      ? 'הגדרות מערכת'
                      : activeModuleSettingsDrawer === 'social'
                        ? 'הגדרות סושיאל'
                        : activeModuleSettingsDrawer === 'client'
                          ? 'הגדרות לקוחות'
                          : 'הגדרות פיננסיות'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeModuleSettingsDrawer}
                  className="p-2 rounded-full hover:bg-white border border-slate-200 text-slate-700"
                  aria-label="סגור"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 md:p-8 overflow-y-auto flex-1">
                {activeModuleSettingsDrawer === 'system' ? (
                  <SystemSettingsDrawerContent />
                ) : activeModuleSettingsDrawer === 'social' ? (
                  <SocialSettingsDrawerContent />
                ) : activeModuleSettingsDrawer === 'client' ? (
                  <ClientSettingsDrawerContent />
                ) : activeModuleSettingsDrawer === 'finance' ? (
                  <FinanceSettingsDrawerContent />
                ) : null}
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="flex flex-col gap-4">
          
          {/* Main Profile Card */}
          <div className="bg-white rounded-[2.5rem] border border-gray-200/60 shadow-xl shadow-gray-200/40 relative overflow-visible">
              
              {/* Premium Header Background */}
              <div className="h-56 w-full rounded-t-[2.5rem] bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/50 to-transparent pointer-events-none"></div>
              </div>
              
              {/* Content Wrapper */}
              <div className="px-4 md:px-8 pb-8">
                  {/* Top Row: Avatar & Actions */}
                  <div className="flex flex-col md:flex-row items-center md:items-start justify-between relative gap-4 md:gap-0">
                      
                      {/* Avatar - Negative Margin to Overlap */}
                      <div className="-mt-16 md:-mt-20 relative z-10">
                          <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] border-[6px] border-white shadow-2xl bg-white p-1 overflow-hidden relative group">
                              <Avatar 
                                  src={currentUser.avatar} 
                                  alt={currentUser.name} 
                                  name={currentUser.name}
                                  size="xl"
                                  className="w-full h-full rounded-[1.7rem]"
                              />
                              {/* Hidden Admin Access Button - Only for Super Admin */}
                              {currentUser.isSuperAdmin && (
                                  <button
                                      onClick={() => {
                                        const orgSlug = getWorkspaceOrgSlugFromPathname(window.location.pathname);
                                        if (orgSlug) {
                                          const returnTo = `${window.location.pathname}${window.location.search || ''}`;
                                          router.push(`/app/admin?returnTo=${encodeURIComponent(returnTo)}`);
                                        }
                                      }}
                                      className="absolute bottom-2 left-2 w-8 h-8 bg-indigo-600/90 hover:bg-indigo-700 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg border border-indigo-500/50 z-20"
                                      title="גישה למנהל-על"
                                  >
                                      <Lock size={14} className="text-white" />
                                  </button>
                              )}
                          </div>
                      </div>

                      {/* Actions Toolbar - Aligned to bottom of banner visually, then wraps */}
                      <div className="flex gap-2 md:gap-3 mt-0 md:mt-4 md:mb-0 w-full md:w-auto justify-center md:justify-end relative z-50">
                          <button 
                            onClick={openProfileEditor} 
                            className="flex-1 md:flex-none px-4 md:px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs md:text-sm hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                            aria-label="ערוך פרופיל"
                          >
                              ערוך פרופיל
                          </button>
                          <button 
                            onClick={handleLogout} 
                            className="flex-1 md:flex-none px-4 md:px-5 py-2.5 rounded-xl bg-red-50 text-red-700 font-bold text-xs md:text-sm hover:bg-red-100 transition-colors border border-red-100 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                          >
                              <LogOut size={16} /> התנתק
                          </button>
                      </div>
                  </div>

                  {needsProfileCompletion ? (
                      <div className="mt-4">
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 md:px-4 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs md:text-sm">
                                  <AlertCircle size={18} className="text-amber-700 flex-shrink-0" />
                                  <span>השלם פרופיל כדי להמשיך בצורה חלקה</span>
                              </div>
                              <button
                                  type="button"
                                  onClick={openProfileEditor}
                                  className="w-full md:w-auto px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs md:text-sm hover:bg-amber-700 transition-colors flex-shrink-0"
                              >
                                  השלם פרופיל
                              </button>
                          </div>
                      </div>
                  ) : null}

                  {/* Text Block - Explicitly Below Avatar */}
                  <div className="mt-4 text-center md:text-right">
                       <div className="flex items-center justify-center md:justify-start gap-2 md:gap-3 mb-1">
                           <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 leading-tight tracking-tight">{currentUser.name}</h1>
                           {currentUser.role.includes('מנכ') && <Crown size={20} className="md:w-6 md:h-6 text-yellow-500 fill-yellow-500" />}
                       </div>
                       
                       <div className="flex items-center justify-center md:justify-start gap-3 md:gap-4 text-gray-500 font-medium text-sm md:text-base mb-4 md:mb-6 flex-wrap">
                            <span>{currentUser.role}</span>
                            {currentUser.phone && (
                                <>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span className="flex items-center gap-1 text-gray-500 text-xs md:text-sm dir-ltr">{currentUser.phone}</span>
                                </>
                            )}
                       </div>

                       {currentUser.bio && (
                           <p className="text-gray-600 text-xs md:text-sm max-w-2xl mb-4 md:mb-6 leading-relaxed bg-gray-50 p-3 md:p-4 rounded-xl border border-gray-100 text-center md:text-right mx-auto md:mx-0 md:inline-block">
                               {currentUser.bio}
                           </p>
                       )}

                       {(() => {
                           // Hidden: demo-like badges until backed by real data.
                           return null;
                       })()}
                  </div>

                  {/* Stats Grid - Enhanced */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-100">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all group cursor-default">
                          <div className="text-3xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{completedTasks}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">משימות הושלמו</div>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all group cursor-default">
                          <div className="text-3xl font-black text-slate-900 group-hover:text-orange-500 transition-colors">{activeTasksCount}</div>
                          <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-1">משימות פעילות</div>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all group cursor-default">
                          <div className="text-3xl font-black text-slate-900 group-hover:text-purple-600 transition-colors">{monthlyEfficiency === null ? '—' : `${monthlyEfficiency}%`}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">יעילות חודשית</div>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all group cursor-default">
                          <div className="text-3xl font-black text-slate-900 text-green-600 flex items-center justify-center gap-2">
                              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-400"></div>
                              מחובר
                          </div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">סטטוס מערכת</div>
                      </div>
                  </div>

                  {orgSlug && currentInsightsModule && currentInsightsModule !== 'social' ? (
                      <div className="mt-8 min-h-[152px]">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                              {meInsightsLoading ? (
                                  <NexusCard title="טוען נתונים" subtitle={null} metric={null} metricLabel={null} className="min-h-[132px] opacity-70" />
                              ) : currentInsightsModule === 'system' ? (
                                  <NexusCard
                                      title="לידים חמים"
                                      subtitle={null}
                                      icon={Target}
                                      metric={hotLeadsTotal}
                                      metricLabel="לידים"
                                      onClickAction={() => router.push(`/w/${encodeWorkspaceOrgSlug(orgSlug)}/system`)}
                                      className="min-h-[132px]"
                                  />
                              ) : currentInsightsModule === 'client' ? (
                                  <NexusCard
                                      title="התחייבויות"
                                      subtitle={null}
                                      icon={CheckCircle}
                                      metric={commitmentsCount}
                                      metricLabel={null}
                                      onClickAction={() => router.push(`/w/${encodeWorkspaceOrgSlug(orgSlug)}/client`)}
                                      className="min-h-[132px]"
                                  />
                              ) : currentInsightsModule === 'finance' ? (
                                  <NexusCard
                                      title="צפי הכנסות"
                                      subtitle={null}
                                      icon={Wallet}
                                      metric={
                                          typeof expectedMonthlyRevenue === 'number'
                                              ? `₪${Number(expectedMonthlyRevenue).toLocaleString()}`
                                              : null
                                      }
                                      metricLabel={null}
                                      onClickAction={() => router.push(`/w/${encodeWorkspaceOrgSlug(orgSlug)}/finance`)}
                                      className="min-h-[132px]"
                                  />
                              ) : null}
                          </div>
                      </div>
                  ) : null}
              </div>
          </div>

          {(() => {
              // Hidden: demo-like wallet/gamification card until backed by real payroll/commission data.
              return null;
          })()}

          {/* UNIFIED ATTENDANCE PANEL - Consolidated "One Box" */}
          {hasNexusEntitlement ? (
          <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                  
                  {/* Left: Info & Timer */}
                  <div className="flex-1 text-center md:text-right w-full">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center justify-center md:justify-start gap-2 mb-2">
                          <Clock size={20} className="text-blue-600" />
                          שעון נוכחות
                          {activeShift && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full animate-pulse border border-green-200">פעיל</span>}
                      </h3>
                      
                      <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6 mb-6">
                          <div className="font-mono text-4xl md:text-5xl font-black text-gray-900 tracking-tight tabular-nums">
                              {elapsed}
                          </div>
                      </div>
                      
                      {/* Integrated Stats Row */}
                      <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-8 border-t border-gray-100 pt-6 w-full">
                          <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl text-blue-600 border border-blue-100"><Timer size={18} /></div>
                              <div className="text-right">
                                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-0.5">סה״כ היום</div>
                                  <div className="font-black text-gray-900 text-base tracking-tight">{totalTodayLabel}</div>
                              </div>
                          </div>
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-50 rounded-xl text-gray-500"><MapPinned size={18} /></div>
                              <div className="text-right">
                                  {(() => {
                                      // Hidden: demo-like "מיקום" until backed by real data.
                                      return null;
                                  })()}
                              </div>
                          </div>
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-50 rounded-xl text-gray-500"><Activity size={18} /></div>
                              <div className="text-right">
                                  <div className="text-[10px] text-gray-600 font-bold uppercase tracking-wide">פעילות אחרונה</div>
                                  <div className="font-bold text-gray-900 text-sm">{String(lastActivityLabel ?? '').replace('כניסה ב-', '').replace('יציאה ב-', '')}</div>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Right: Hold Button */}
                  <div className="shrink-0 relative">
                       <div className="absolute inset-0 bg-blue-50/50 rounded-full blur-3xl transform scale-150 pointer-events-none"></div>
                       <HoldButton 
                          isActive={!!activeShift} 
                          onComplete={activeShift ? clockOut : clockIn} 
                          label={activeShift ? 'יציאה' : 'כניסה'} 
                          size="normal"
                      />
                  </div>
              </div>

              {/* Tabs: History & Leave Requests */}
              <div className="border-t border-gray-100 bg-gray-50/30">
                  <div className="flex border-b border-gray-200">
                  <button 
                          onClick={() => setShowHistory(true)}
                          className={`flex-1 p-3 text-xs font-bold transition-colors ${
                              showHistory 
                                  ? 'text-gray-900 border-b-2 border-gray-900 bg-white' 
                                  : 'text-gray-500 hover:text-gray-700'
                          }`}
                  >
                          היסטוריית נוכחות
                  </button>
                  <button 
                          onClick={() => setShowHistory(false)}
                          className={`flex-1 p-3 text-xs font-bold transition-colors ${
                              !showHistory 
                                  ? 'text-gray-900 border-b-2 border-gray-900 bg-white' 
                                  : 'text-gray-500 hover:text-gray-700'
                          }`}
                      >
                          בקשות חופש
                  </button>
                  </div>
                  
                  <AnimatePresence mode="wait">
                      {showHistory ? (
                          <motion.div
                              key="history"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                          >
                              <div className="p-4 overflow-x-auto">
                                  <table className="w-full text-sm text-right">
                                      <thead className="text-gray-600 font-bold text-[10px] uppercase tracking-wider border-b border-gray-200/50">
                                          <tr>
                                              <th className="px-4 py-2">תאריך</th>
                                              <th className="px-4 py-2">כניסה</th>
                                              <th className="px-4 py-2">מיקום כניסה</th>
                                              <th className="px-4 py-2">יציאה</th>
                                              <th className="px-4 py-2">מיקום יציאה</th>
                                              <th className="px-4 py-2">סה״כ</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                          {myHistory.slice(0, 5).map((entry: TimeEntry) => (
                                              (() => {
                                                  const startMapUrl = getMapUrl(entry?.startLat, entry?.startLng);
                                                  const endMapUrl = getMapUrl(entry?.endLat, entry?.endLng);
                                                  return (
                                              <tr key={entry.id} className="text-gray-600 hover:bg-white transition-colors">
                                                  <td className="px-4 py-3 font-bold text-gray-900">{formatDate(entry.startTime)}</td>
                                                  <td className="px-4 py-3 font-mono text-xs">{formatTime(entry.startTime)}</td>
                                                  <td className="px-4 py-3 text-xs">
                                                      {startMapUrl ? (
                                                          <a href={startMapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold">
                                                              <MapPin size={14} /> הצג
                                                          </a>
                                                      ) : (
                                                          <span className="text-gray-400">-</span>
                                                      )}
                                                  </td>
                                                  <td className="px-4 py-3 font-mono text-xs">{entry.endTime ? formatTime(entry.endTime) : '-'}</td>
                                                  <td className="px-4 py-3 text-xs">
                                                      {endMapUrl ? (
                                                          <a href={endMapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold">
                                                              <MapPin size={14} /> הצג
                                                          </a>
                                                      ) : (
                                                          <span className="text-gray-400">-</span>
                                                      )}
                                                  </td>
                                                  <td className="px-4 py-3 font-bold">{entry.durationMinutes ? `${Math.floor(entry.durationMinutes / 60)}:${(entry.durationMinutes % 60).toString().padStart(2, '0')}` : '-'}</td>
                                              </tr>
                                                  );
                                              })()
                                          ))}
                                          {myHistory.length === 0 && (
                                              <tr><td colSpan={6} className="p-6 text-center text-gray-600 text-xs">אין נתונים להצגה</td></tr>
                                          )}
                                      </tbody>
                                  </table>
                              </div>
                          </motion.div>
                      ) : (
                          <motion.div
                              key="leave-requests"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                          >
                              <div className="p-4">
                                  {isLoadingLeaveRequests ? (
                                      <div className="text-center py-8 text-gray-400 text-sm">טוען...</div>
                                  ) : myLeaveRequests.length === 0 ? (
                                      <div className="text-center py-8">
                                          <CalendarDays size={48} className="mx-auto mb-3 text-gray-300" />
                                          <p className="text-gray-600 text-sm mb-4">אין בקשות חופש</p>
                          <button
                              onClick={() => setShowLeaveRequestModal(true)}
                                              className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
                          >
                              בקש חופש
                          </button>
                      </div>
                      ) : (
                                      <div className="space-y-3">
                              {myLeaveRequests.slice(0, 3).map((req) => (
                                              <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                                                  <div className="flex items-center justify-between mb-2">
                                                      <div className="flex items-center gap-2 flex-wrap">
                                                          <CalendarDays size={16} className="text-blue-600" />
                                                          <span className="text-sm font-bold text-gray-900">
                                                              {new Date(req.start_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}
                                                              {req.end_date && req.end_date !== req.start_date && ` - ${new Date(req.end_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}`}
                                                          </span>
                                                          {req.metadata?.isUrgent && (
                                                              <span className="text-xs font-bold px-2 py-1 rounded-lg bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                                                                  <AlertCircle size={12} />
                                                                  דחוף
                                                              </span>
                                                          )}
                                          </div>
                                                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                                                          req.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-200' :
                                                          req.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-200' :
                                                          'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                      }`}>
                                                          {req.status === 'approved' ? 'אושר' : req.status === 'rejected' ? 'נדחה' : 'ממתין'}
                                      </span>
                                                  </div>
                                                  {req.reason && (
                                                      <p className="text-xs text-gray-600 mt-1">{req.reason}</p>
                                                  )}
                                  </div>
                              ))}
                                          <button
                                              onClick={() => setShowLeaveRequestModal(true)}
                                              className="w-full bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors mt-3"
                                          >
                                              בקש חופש
                                          </button>
                          </div>
                      )}
                              </div>
                          </motion.div>
                      )}
                  </AnimatePresence>
                  </div>
              </div>

          ) : null}

          {/* Team Events Section */}
              <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-6 md:p-8">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
                          <Calendar size={20} className="text-purple-600" />
                          אירועים קרובים
                      </h3>
                      {isLoadingEvents ? (
                          <div className="text-center py-4 text-gray-600 text-sm">טוען...</div>
                      ) : upcomingEvents.length === 0 ? (
                          <div className="text-center py-4 text-gray-600 text-sm">אין אירועים קרובים</div>
                      ) : (
                          <div className="space-y-2">
                              {upcomingEvents.map((event) => {
                                  const isInvited = 
                                      event.required_attendees.includes(currentUser.id) ||
                                      event.optional_attendees.includes(currentUser.id);
                                  const rsvpStatus = eventRSVPStatus[event.id];
                                  
                                  return (
                                      <div key={event.id} className="p-3 bg-gray-50 rounded-xl">
                                          <div className="text-sm font-bold text-gray-900 mb-1">{event.title}</div>
                                          <div className="text-xs text-gray-500 mb-2">
                                              {new Date(event.start_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                          </div>
                                          {isInvited && (
                                              <div className="flex items-center gap-2 mt-2">
                                                  {rsvpStatus === 'attending' ? (
                                                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-bold flex items-center gap-1">
                                                          <CheckCircle size={12} />
                                                          אני מגיע
                                                      </span>
                                                  ) : rsvpStatus === 'not_attending' ? (
                                                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-bold flex items-center gap-1">
                                                          <XCircle size={12} />
                                                          אני לא מגיע
                                                      </span>
                                                  ) : (
                                                      <>
                                                          <button
                                                              onClick={() => handleEventRSVP(event.id, 'attending')}
                                                              className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-bold hover:bg-green-100 transition-all flex items-center gap-1"
                                                          >
                                                              <CheckCircle size={12} />
                                                              מגיע
                                                          </button>
                                                          <button
                                                              onClick={() => handleEventRSVP(event.id, 'not_attending')}
                                                              className="px-2 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-1"
                                                          >
                                                              <XCircle size={12} />
                                                              לא מגיע
                                                          </button>
                                                      </>
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                  );
                              })}
                          </div>
                      )}
              </div>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
              <button 
                onClick={openProfileEditor}
                className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all text-center md:text-right group relative overflow-hidden flex flex-col items-center md:items-start"
                aria-label="פתח הגדרות פרטים אישיים"
              >
                  <div className="absolute top-0 right-0 w-1 h-full bg-blue-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300 hidden md:block"></div>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-2 md:mb-4 group-hover:scale-110 transition-transform shadow-sm">
                      <UserIcon size={18} className="md:w-6 md:h-6" />
                  </div>
                  <h3 className="text-[10px] md:text-lg font-bold text-gray-900">פרטים אישיים</h3>
                  <p className="text-[10px] md:text-sm text-gray-500 mt-1 hidden md:block">ערוך את פרטי הפרופיל, תמונה ופרטי קשר.</p>
              </button>

              <button 
                onClick={() => setActiveSettingModal('notifications')}
                className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all text-center md:text-right group relative overflow-hidden flex flex-col items-center md:items-start"
                aria-label="פתח הגדרות התראות ועדכונים"
              >
                  <div className="absolute top-0 right-0 w-1 h-full bg-purple-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300 hidden md:block"></div>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-50 text-purple-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-2 md:mb-4 group-hover:scale-110 transition-transform shadow-sm">
                      <Bell size={18} className="md:w-6 md:h-6" />
                  </div>
                  <h3 className="text-[10px] md:text-lg font-bold text-gray-900">התראות ועדכונים</h3>
                  <p className="text-[10px] md:text-sm text-gray-500 mt-1 hidden md:block">נהל את אופן קבלת ההודעות מהמערכת.</p>
              </button>

              <button 
                onClick={() => setActiveSettingModal('security')}
                className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all text-center md:text-right group relative overflow-hidden flex flex-col items-center md:items-start"
                aria-label="פתח הגדרות אבטחה ופרטיות"
              >
                  <div className="absolute top-0 right-0 w-1 h-full bg-orange-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300 hidden md:block"></div>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-50 text-orange-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-2 md:mb-4 group-hover:scale-110 transition-transform shadow-sm">
                      <Shield size={18} className="md:w-6 md:h-6" />
                  </div>
                  <h3 className="text-[10px] md:text-lg font-bold text-gray-900">אבטחה ופרטיות</h3>
                  <p className="text-[10px] md:text-sm text-gray-500 mt-1 hidden md:block">שינוי סיסמה, אימות דו-שלבי וניהול גישות.</p>
              </button>

              <button 
                onClick={() => setActiveSettingModal('billing')}
                className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all text-center md:text-right group relative overflow-hidden flex flex-col items-center md:items-start"
                aria-label="פתח הגדרות חיוב ומנויים"
              >
                  <div className="absolute top-0 right-0 w-1 h-full bg-green-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300 hidden md:block"></div>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-green-50 text-green-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-2 md:mb-4 group-hover:scale-110 transition-transform shadow-sm">
                      <CreditCard size={18} className="md:w-6 md:h-6" />
                  </div>
                  <h3 className="text-[10px] md:text-lg font-bold text-gray-900">חיוב ומנויים</h3>
                  <p className="text-[10px] md:text-sm text-gray-500 mt-1 hidden md:block">צפה בחשבוניות, שדרג חבילה ועדכן אמצעי תשלום.</p>
              </button>

              {/* Hidden Admin Access Card - Only for Super Admin - Moved to end */}
              {currentUser.isSuperAdmin && (
                  <button 
                    onClick={() => {
                      const orgSlug = getWorkspaceOrgSlugFromPathname(window.location.pathname);
                      if (orgSlug) {
                        const returnTo = `${window.location.pathname}${window.location.search || ''}`;
                        router.push(`/app/admin?returnTo=${encodeURIComponent(returnTo)}`);
                      }
                    }}
                    className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3 md:p-6 rounded-xl md:rounded-2xl border-2 border-indigo-200/50 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all text-center md:text-right group relative overflow-hidden flex flex-col items-center md:items-start"
                    title="גישה למנהל-על (נסתר)"
                  >
                      <div className="absolute top-0 right-0 w-1 h-full bg-indigo-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300 hidden md:block"></div>
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-100 text-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-2 md:mb-4 group-hover:scale-110 transition-transform shadow-sm">
                          <Shield size={18} className="md:w-6 md:h-6" />
                      </div>
                      <h3 className="text-[10px] md:text-lg font-bold text-gray-900">ניהול-על</h3>
                      <p className="text-[10px] md:text-sm text-gray-500 mt-1 hidden md:block">גישה למסך ניהול המערכת (SaaS Admin)</p>
                  </button>
              )}
          </div>

          {resolvedModuleCards.length ? (
            <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4 mt-6">
              {resolvedModuleCards.map((card, idx) => {
                const Icon = resolveModuleCardIcon(card.iconId);
                return (
                  <button
                    key={`${card.href}:${idx}`}
                    type="button"
                    onClick={() => {
                      const drawer = getDrawerFromHref(card.href);
                      if (drawer) {
                        setActiveModuleSettingsDrawer(drawer);
                        return;
                      }
                      router.push(card.href);
                    }}
                    className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all text-center md:text-right group relative overflow-hidden flex flex-col items-center md:items-start"
                    aria-label={card.title}
                  >
                    <div className="absolute top-0 right-0 w-1 h-full bg-slate-900 scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300 hidden md:block"></div>
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 text-slate-700 rounded-xl md:rounded-2xl flex items-center justify-center mb-2 md:mb-4 group-hover:scale-110 transition-transform shadow-sm">
                      {Icon ? <Icon size={18} className="md:w-6 md:h-6" /> : null}
                    </div>
                    <h3 className="text-[10px] md:text-lg font-bold text-gray-900">{card.title}</h3>
                    {card.subtitle ? (
                      <p className="text-[10px] md:text-sm text-gray-500 mt-1 hidden md:block">{card.subtitle}</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {children ? (
            <div className="mt-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">הגדרות אישיות למודול</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
              </div>
              {children}
            </div>
          ) : null}

          <div className="text-center text-xs text-gray-600 mt-4">
              Misrad v2.5.0 • <span className="underline cursor-pointer hover:text-gray-800">תנאי שימוש</span> • <span className="underline cursor-pointer hover:text-gray-800">מדיניות פרטיות</span>
          </div>

      </div>

      {/* Leave Request Modal */}
      <AnimatePresence>
          {showLeaveRequestModal && (
              <LeaveRequestModal
                  request={null}
                  onClose={() => setShowLeaveRequestModal(false)}
                  onSuccess={() => {
                      setShowLeaveRequestModal(false);
                      // Reload data
                      const loadData = async () => {
                          const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
                          const response = await fetch('/api/leave-requests?employee_id=' + encodeURIComponent(String(currentUser.id)), {
                              headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
                          });
                          if (response.ok) {
                              const data = await response.json().catch(() => ({}));
                              const payload = extractData<{ requests?: unknown[] }>(data);
                              setMyLeaveRequests((payload?.requests || []).map((r) => coerceLeaveRequest(r)));
                          }
                      };
                      loadData();
                      addToast('בקשת חופש נוצרה בהצלחה', 'success');
                  }}
                  addToast={addToast}
                  users={users || []}
                  canCreateForOthers={false}
              />
          )}
      </AnimatePresence>

      {/* Event Modal */}
      <AnimatePresence>
          {showEventModal && (
              <EventRequestModal
                  event={null}
                  onClose={() => setShowEventModal(false)}
                  onSuccess={() => {
                      setShowEventModal(false);
                      // Reload events
                      const loadEvents = async () => {
                          const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
                          const response = await fetch('/api/team-events?status=scheduled', {
                              headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
                          });
                          if (response.ok) {
                              const data = await response.json().catch(() => ({}));
                              const payload = extractData<{ events?: unknown[] }>(data);
                              const now = new Date();
                              const upcoming = (payload?.events || [])
                                  .map((e) => coerceTeamEvent(e))
                                  .filter((e) => {
                                      const eventDate = new Date(e.start_date);
                                      return !Number.isNaN(eventDate.getTime()) && eventDate >= now;
                                  })
                                  .slice(0, 3);
                              setUpcomingEvents(upcoming);
                          }
                      };
                      loadEvents();
                      addToast('אירוע נוצר בהצלחה', 'success');
                  }}
                  addToast={addToast}
              />
          )}
      </AnimatePresence>
    </div>
  );
};
