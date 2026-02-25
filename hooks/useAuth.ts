'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { User, TimeEntry, RoleDefinition, PermissionId, ChangeRequest } from '../types';
import { DEFAULT_ROLE_DEFINITIONS } from '../constants';

import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { isCeoRole } from '@/lib/constants/roles';
import { getNexusMe, listNexusTimeEntries, listNexusUsers, updateNexusPresenceHeartbeat } from '@/app/actions/nexus';
import { punchIn, punchOut, updateEntryLocation } from '@/app/actions/attendance';
import { getAttendanceCache, setAttendanceCache } from '@/lib/attendance-cache';

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const ATTENDANCE_BROADCAST_CHANNEL = 'NEXUS_ATTENDANCE_V1';

function broadcastAttendanceUpdate(orgSlug: string, entryId: string | null, startTime: string | null) {
    if (typeof window === 'undefined') return;
    try {
        const bc = new BroadcastChannel(ATTENDANCE_BROADCAST_CHANNEL);
        bc.postMessage({ orgSlug, entryId, startTime });
        bc.close();
    } catch { /* ignore */ }
}
const PRESENCE_REQUEST_TIMEOUT_MS = 5_000; // Reduced from 8-15s to 5s
const PRESENCE_HEARTBEAT_INTERVAL_MS = 90_000; // Increased from 30s to 90s (less aggressive)

type ToastKind = 'success' | 'error' | 'info' | 'warning';

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
    if (Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function normalizeRoleName(value: unknown): string {
    return String(value ?? '').replace(/["״]/g, '״');
}

function getClerkIsSuperAdmin(clerkUser: unknown): boolean | undefined {
    const userObj = asObject(clerkUser);
    const publicMeta = asObject(userObj?.publicMetadata);
    if (typeof publicMeta?.isSuperAdmin === 'boolean') return publicMeta.isSuperAdmin;
    const unsafeMeta = asObject(userObj?.unsafeMetadata);
    if (typeof unsafeMeta?.isSuperAdmin === 'boolean') return unsafeMeta.isSuperAdmin;
    return undefined;
}

function getClerkRole(clerkUser: unknown): string | undefined {
    const userObj = asObject(clerkUser);
    const publicMeta = asObject(userObj?.publicMetadata);
    const role = publicMeta?.role;
    return typeof role === 'string' && role.trim() ? role : undefined;
}

function getUnknownProp(obj: unknown, key: string): unknown {
    const o = asObject(obj);
    return o ? o[key] : undefined;
}

function toIsoDateOnly(d: Date): string {
    return d.toISOString().slice(0, 10);
}

export const useAuth = (
    addToast: (msg: string, type?: ToastKind) => void,
    initialCurrentUser?: User
) => {
    let clerkUser: ReturnType<typeof useUser>['user'] = null;
    let isClerkLoaded = false;
    try {
        const clerk = useUser();
        clerkUser = clerk.user;
        isClerkLoaded = clerk.isLoaded;
    } catch {
        clerkUser = null;
        isClerkLoaded = true;
    }

    const [users, setUsers] = useState<User[]>([]);
    const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinition[]>(DEFAULT_ROLE_DEFINITIONS);

    const getInitialUser = (): User => {
        if (initialCurrentUser) {
            return initialCurrentUser;
        }
        // If Clerk user is already loaded, use its metadata
        const clerkObj = asObject(clerkUser);
        const firstName = typeof clerkObj?.firstName === 'string' ? clerkObj.firstName : '';
        const lastName = typeof clerkObj?.lastName === 'string' ? clerkObj.lastName : '';
        const imageUrl = typeof clerkObj?.imageUrl === 'string' ? clerkObj.imageUrl : '';
        const primaryEmailObj = asObject(clerkObj?.primaryEmailAddress);
        const primaryEmail = typeof primaryEmailObj?.emailAddress === 'string' ? primaryEmailObj.emailAddress : '';
        const clerkRole = getClerkRole(clerkUser);
        const clerkIsSuperAdmin = getClerkIsSuperAdmin(clerkUser);

        if (clerkObj && asObject(clerkObj.publicMetadata)) {
            return {
                id: '',
                name: firstName && lastName
                    ? `${firstName} ${lastName}`.trim()
                    : firstName || lastName || '',
                email: primaryEmail || '',
                role: clerkRole || 'עובד',
                avatar: imageUrl || '',
                online: false,
                capacity: 0,
                isSuperAdmin: clerkIsSuperAdmin || false,
                isTenantAdmin: false, // Will be updated when API call completes
                organizationId: null,
                tenantId: null, // Will be updated when API call completes
                billingInfo: undefined,
                notificationPreferences: {
                    emailNewTask: true,
                    browserPush: true,
                    morningBrief: true,
                    soundEffects: false,
                    marketing: true,
                    pushBehavior: 'vibrate_sound',
                    pushCategories: {
                        alerts: true,
                        tasks: true,
                        events: true,
                        system: true,
                        marketing: false,
                    },
                }
            };
        }
        // Default fallback
        return {
            id: '',
            name: '',
            email: '',
            role: 'עובד',
            avatar: '',
            online: false,
            capacity: 0,
            isTenantAdmin: false,
            organizationId: null,
            tenantId: null,
            billingInfo: undefined,
            notificationPreferences: {
                emailNewTask: true,
                browserPush: true,
                morningBrief: true,
                soundEffects: false,
                marketing: true,
                pushBehavior: 'vibrate_sound',
                pushCategories: {
                    alerts: true,
                    tasks: true,
                    events: true,
                    system: true,
                    marketing: false,
                },
            }
        };
    };

    const [currentUser, setCurrentUser] = useState<User>(getInitialUser());
    const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialCurrentUser?.id));
    const [isLoadingCurrentUser, setIsLoadingCurrentUser] = useState(false);

    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [trashUsers, setTrashUsers] = useState<User[]>([]);
    const [trashTimeEntries, setTrashTimeEntries] = useState<TimeEntry[]>([]);
    const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);

    const clerkUserId = asObject(clerkUser)?.id;
    const pathname = usePathname();
    const orgSlug = useMemo(() => {
        return getWorkspaceOrgSlugFromPathname(pathname);
    }, [pathname]);

    const activeShift = useMemo(() => {
        const found = timeEntries.find(t => t.userId === currentUser.id && !t.endTime) || null;
        // Keep module-level cache in sync so other components get instant state on mount
        if (orgSlug) {
            if (found) {
                setAttendanceCache(orgSlug, { entryId: found.id, startTime: found.startTime });
            } else {
                setAttendanceCache(orgSlug, null);
            }
        }
        return found;
    }, [timeEntries, currentUser.id, orgSlug]);

    const refreshTimeEntriesRetryRef = useRef(0);
    const refreshTimeEntries = useCallback(async () => {
        if (!orgSlug) return;
        try {
            const now = new Date();
            const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
            const res = await listNexusTimeEntries({
                orgId: orgSlug,
                dateFrom: toIsoDateOnly(startOfMonth),
                dateTo: toIsoDateOnly(now),
                page: 1,
                pageSize: 200,
            });
            if (Array.isArray(res?.timeEntries)) {
                setTimeEntries(res.timeEntries);
                refreshTimeEntriesRetryRef.current = 0;
            }
        } catch (err) {
            console.warn('[useAuth] refreshTimeEntries failed:', err instanceof Error ? err.message : err);
            // Retry up to 2 times with increasing delay
            if (refreshTimeEntriesRetryRef.current < 2) {
                refreshTimeEntriesRetryRef.current += 1;
                const delay = refreshTimeEntriesRetryRef.current * 3000;
                setTimeout(() => { void refreshTimeEntries(); }, delay);
            }
        }
    }, [orgSlug]);

    const getLocation = useCallback(async (): Promise<{ lat: number; lng: number; accuracy: number; city?: string }> => {
        if (typeof window === 'undefined') {
            throw new Error('המיקום אינו זמין');
        }
        if (!('geolocation' in navigator)) {
            throw new Error('הדפדפן אינו תומך במיקום GPS');
        }

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 60000,
                });
            });

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;

            // Reverse geocoding to get city name in Hebrew
            let city: string | undefined;
            try {
                const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=he`;
                const geocodeRes = await Promise.race([
                    fetch(geocodeUrl, { headers: { 'User-Agent': 'MisradAI-Attendance/1.0' } }),
                    new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
                ]);
                if (geocodeRes.ok) {
                    const geocodeData = await geocodeRes.json();
                    city = geocodeData?.address?.city || geocodeData?.address?.town || geocodeData?.address?.village || undefined;
                }
            } catch {
                // Silently fail geocoding - not critical
            }

            return { lat, lng, accuracy, city };
        } catch (error: unknown) {
            // Map GPS errors to Hebrew
            const err = error as { code?: number; message?: string };
            if (err?.code === 1) { // PERMISSION_DENIED
                throw new Error('נדרשת הרשאת מיקום. אנא אפשר גישה למיקום בהגדרות הדפדפן.');
            } else if (err?.code === 2) { // POSITION_UNAVAILABLE
                throw new Error('לא ניתן לקבל את המיקום. ודא שה-GPS מופעל.');
            } else if (err?.code === 3) { // TIMEOUT
                throw new Error('פג הזמן בקבלת המיקום. אנא נסה שוב.');
            } else {
                throw new Error('שגיאה בקבלת המיקום. ודא שהמיקום מופעל.');
            }
        }
    }, []);

    const presenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const presenceInFlightRef = useRef(false);
    const presenceGuardStateRef = useRef<string>('');
    const presenceFailureCountRef = useRef(0);
    const presenceSuccessCountRef = useRef(0);
    const stopAllActivityRef = useRef(false);

    const sendPresenceHeartbeat = useCallback(async () => {
        if (typeof window === 'undefined') return;

        // CRITICAL: Stop all SquareActivity if unauthorized (401) - silent stop
        if (stopAllActivityRef.current) {
            return;
        }

        const visibilityState = typeof document !== 'undefined' ? document.visibilityState : null;
        if (!orgSlug || !isClerkLoaded || !clerkUserId || visibilityState === 'hidden') {
            // Silently skip if prerequisites not met - no logging spam
            return;
        }

        // Additional guard: skip heartbeat on public pages like landing/login
        if (typeof window !== 'undefined') {
            const p = window.location.pathname;
            if (p === '/' || p === '/login' || p.startsWith('/login?')) {
                return;
            }
        }

        if (presenceInFlightRef.current) {
            // Silently skip if already in flight
            return;
        }
        presenceInFlightRef.current = true;

        let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
        let heartbeatPromise: Promise<unknown> | null = null;

        try {
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutHandle = setTimeout(() => {
                    reject(new Error(`Presence heartbeat timeout after ${PRESENCE_REQUEST_TIMEOUT_MS}ms`));
                }, PRESENCE_REQUEST_TIMEOUT_MS);
            });
            heartbeatPromise = updateNexusPresenceHeartbeat({ orgId: orgSlug });
            const result = await Promise.race([heartbeatPromise, timeoutPromise]);
            // Reduced logging
            presenceFailureCountRef.current = 0;
            presenceSuccessCountRef.current += 1;
            if (presenceSuccessCountRef.current === 1) {
                console.info('[Presence] heartbeat successful', { orgSlug });
            }
            // Only update state if it changed (prevent unnecessary re-renders)
            setCurrentUser((prev) => (prev.online ? prev : { ...prev, online: true }));
        } catch (error) {
            const isTimeout = error instanceof Error && error.message.includes('Presence heartbeat timeout');
            if (isTimeout) {
                void heartbeatPromise?.catch(() => null);
            }

            // CRITICAL: Detect 401/Unauthorized and stop all SquareActivity permanently
            const errorMsg = String(error instanceof Error ? error.message : error).toLowerCase();
            const errorObj = asObject(error);
            const status = typeof errorObj?.status === 'number' ? errorObj.status : 0;

            // 429 Too Many Requests — back off aggressively without logging
            if (status === 429 || errorMsg.includes('429') || errorMsg.includes('too many requests')) {
                presenceFailureCountRef.current += 4; // Increase backoff much faster to avoid cascade
                return;
            }

            if (status === 401 || errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
                // Silent stop on 401 - no console spam
                if (!stopAllActivityRef.current) {
                    console.info('[Presence] Unauthorized detected - stopping heartbeat');
                    stopAllActivityRef.current = true;
                }
                setCurrentUser((prev) => (prev.online ? { ...prev, online: false } : prev)); // Only update if changed
                return; // Stop immediately without rescheduling
            }

            // Reduced logging for non-401 errors (skip timeout errors - they're expected in dev)
            presenceFailureCountRef.current += 1;
            if (!isTimeout && presenceFailureCountRef.current <= 2) {
                console.warn('[Presence] heartbeat error', error);
            }
        } finally {
            try {
                if (timeoutHandle) clearTimeout(timeoutHandle);
            } catch {
                // ignore
            }
            presenceInFlightRef.current = false;
        }
    }, [orgSlug, isClerkLoaded, clerkUserId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!orgSlug) return;

        let cancelled = false;

        const clearScheduled = () => {
            if (presenceTimeoutRef.current) {
                clearTimeout(presenceTimeoutRef.current);
                presenceTimeoutRef.current = null;
            }
        };

        const scheduleNext = (delayMs: number) => {
            clearScheduled();
            presenceTimeoutRef.current = setTimeout(() => {
                void tick();
            }, delayMs);
        };

        const computeDelayMs = () => {
            const base = PRESENCE_HEARTBEAT_INTERVAL_MS;
            const backoff = Math.min(5 * 60_000, base * Math.pow(2, presenceFailureCountRef.current));
            return Math.max(base, backoff);
        };

        const tick = async () => {
            if (cancelled) return;
            if (stopAllActivityRef.current) {
                return; // Permanently stop the loop - silent
            }
            await sendPresenceHeartbeat();
            if (cancelled) return;
            if (stopAllActivityRef.current) return; // Check again after heartbeat

            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                scheduleNext(60_000);
                return;
            }

            scheduleNext(computeDelayMs());
        };

        void tick();

        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                presenceFailureCountRef.current = 0;
                void tick();
            }
        };

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', onVisibility);
        }

        return () => {
            cancelled = true;
            clearScheduled();
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', onVisibility);
            }
        };
    }, [orgSlug, isClerkLoaded, sendPresenceHeartbeat]);

    useEffect(() => {
        if (!orgSlug) return;
        if (!isClerkLoaded) return;
        void refreshTimeEntries();
    }, [orgSlug, isClerkLoaded, refreshTimeEntries]);

    // Re-fetch time entries when currentUser.id becomes available (resolves race condition)
    const currentUserIdRef = useRef(currentUser.id);
    useEffect(() => {
        if (currentUser.id && currentUser.id !== currentUserIdRef.current) {
            currentUserIdRef.current = currentUser.id;
            void refreshTimeEntries();
        }
    }, [currentUser.id, refreshTimeEntries]);

    // Listen to BroadcastChannel from AttendanceMiniStatus for instant sync
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!orgSlug) return;
        try {
            const bc = new BroadcastChannel(ATTENDANCE_BROADCAST_CHANNEL);
            const handler = (ev: MessageEvent) => {
                const data = ev?.data;
                if (!data || data.orgSlug !== orgSlug) return;

                // Immediate optimistic update so dashboard feels instant
                if (data.entryId === null || data.startTime === null) {
                    // Clock-out broadcast → mark current user's active shift as ended
                    setTimeEntries(prev => prev.map(t =>
                        t.userId === currentUser.id && !t.endTime
                            ? { ...t, endTime: new Date().toISOString(), durationMinutes: Math.round((Date.now() - new Date(t.startTime).getTime()) / 60000) }
                            : t
                    ));
                } else if (data.entryId && data.startTime) {
                    // Clock-in broadcast → add optimistic entry if not already present
                    setTimeEntries(prev => {
                        if (prev.some(t => t.id === data.entryId)) return prev;
                        return [{
                            id: String(data.entryId),
                            userId: currentUser.id,
                            date: String(data.startTime).slice(0, 10),
                            startTime: String(data.startTime),
                        }, ...prev];
                    });
                }

                // Delayed refresh for eventual consistency — wait for any in-flight
                // GPS + API calls to complete before hitting the server, otherwise we
                // may fetch stale data that reverts the optimistic update above.
                setTimeout(() => void refreshTimeEntries(), 2_000);
            };
            bc.addEventListener('message', handler);
            return () => {
                bc.removeEventListener('message', handler);
                bc.close();
            };
        } catch {
            return undefined;
        }
    }, [orgSlug, currentUser.id, refreshTimeEntries]);

    const meQuery = useQuery({
        queryKey: ['nexus', 'me', orgSlug],
        queryFn: async () => {
            if (!orgSlug) {
                throw new Error('Missing orgSlug');
            }
            // Check if unauthorized - stop immediately
            if (stopAllActivityRef.current) {
                throw new Error('Queries disabled due to unauthorized state');
            }
            return getNexusMe({ orgId: orgSlug });
        },
        enabled: Boolean(
            isClerkLoaded &&
            clerkUser &&
            clerkUserId && // Ensure Clerk user ID exists
            orgSlug &&
            !(initialCurrentUser?.id && isUUID(String(initialCurrentUser.id))) &&
            !stopAllActivityRef.current
        ),
        staleTime: 5_000,
        refetchInterval: () => {
            if (stopAllActivityRef.current) return false; // Stop polling if unauthorized
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
            return 60_000; // Reduced from 90s to 60s for fresher data
        },
        retry: (failureCount, error) => {
            // Detect 401 and stop retries
            const errorObj = asObject(error);
            const status = typeof errorObj?.status === 'number' ? errorObj.status : 0;
            const errorMsg = String(error instanceof Error ? error.message : error).toLowerCase();
            if (status === 401 || errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
                if (!stopAllActivityRef.current) {
                    console.info('[Query:me] Unauthorized - stopping all queries');
                    stopAllActivityRef.current = true;
                }
                return false; // Don't retry on 401
            }
            return failureCount < 1;
        },
    });

    const usersQuery = useQuery({
        queryKey: ['nexus', 'users', orgSlug],
        queryFn: async () => {
            if (!orgSlug) {
                throw new Error('Missing orgSlug');
            }
            // Check if unauthorized - stop immediately
            if (stopAllActivityRef.current) {
                throw new Error('Queries disabled due to unauthorized state');
            }
            return listNexusUsers({ orgId: orgSlug });
        },
        enabled: Boolean(
            isClerkLoaded &&
            clerkUser &&
            clerkUserId && // Ensure Clerk user ID exists
            orgSlug &&
            !stopAllActivityRef.current
        ),
        staleTime: 5_000,
        refetchInterval: () => {
            if (stopAllActivityRef.current) return false; // Stop polling if unauthorized
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
            return 60_000; // Reduced from 90s to 60s for fresher data
        },
        retry: (failureCount, error) => {
            // Detect 401 and stop retries
            const errorObj = asObject(error);
            const status = typeof errorObj?.status === 'number' ? errorObj.status : 0;
            const errorMsg = String(error instanceof Error ? error.message : error).toLowerCase();
            if (status === 401 || errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
                if (!stopAllActivityRef.current) {
                    console.info('[Query:users] Unauthorized - stopping all queries');
                    stopAllActivityRef.current = true;
                }
                return false; // Don't retry on 401
            }
            return failureCount < 1;
        },
    });

    useEffect(() => {
        if (!isClerkLoaded) return;

        if (!clerkUser) {
            setIsAuthenticated(false);
            setIsLoadingCurrentUser(false);
            return;
        }

        if (!orgSlug) {
            setIsAuthenticated(Boolean(clerkUser));
            setIsLoadingCurrentUser(false);
            return;
        }

        if (initialCurrentUser?.id && isUUID(String(initialCurrentUser.id))) {
            setIsAuthenticated(true);
            setIsLoadingCurrentUser(false);
            return;
        }

        setIsLoadingCurrentUser(Boolean(meQuery.isFetching));
    }, [isClerkLoaded, clerkUserId, orgSlug, meQuery.isFetching, initialCurrentUser?.id]);

    useEffect(() => {
        const data = meQuery.data;
        if (!data?.user) return;

        const clerkIsSuperAdmin = getClerkIsSuperAdmin(clerkUser);

        const userObj = asObject(data.user);
        const organizationIdFromUser = typeof userObj?.organizationId === 'string' ? userObj.organizationId : null;

        const userWithDefaults = {
            ...data.user,
            isSuperAdmin: Boolean(
                data.user?.isSuperAdmin ??
                clerkIsSuperAdmin ??
                currentUser?.isSuperAdmin
            ),
            isTenantAdmin: Boolean(data.isTenantAdmin),
            organizationId: organizationIdFromUser,
            tenantId: organizationIdFromUser,
            billingInfo: data.user.billingInfo || undefined,
            notificationPreferences: data.user.notificationPreferences || {
                emailNewTask: true,
                browserPush: true,
                morningBrief: true,
                soundEffects: false,
                marketing: true,
                pushBehavior: 'vibrate_sound',
                pushCategories: {
                    alerts: true,
                    tasks: true,
                    events: true,
                    system: true,
                    marketing: false,
                },
            }
        };

        setCurrentUser(userWithDefaults);
        setIsAuthenticated(true);

        setUsers(prev => {
            const existingIndex = prev.findIndex(u => u.id === data.user!.id);
            if (existingIndex >= 0) {
                return prev.map((u, i) => i === existingIndex ? { ...userWithDefaults, online: true } : u);
            }
            return [...prev, { ...userWithDefaults, online: true }];
        });
    }, [meQuery.data, clerkUserId]);

    useEffect(() => {
        const nextUsers = usersQuery.data?.users;
        if (Array.isArray(nextUsers)) {
            setUsers(nextUsers);
        }
    }, [usersQuery.data]);

    const login = useCallback((userId: string) => {
        const user = users.find(u => u.id === userId);
        if (user) {
            const userWithBilling = {
                ...user,
                billingInfo: {
                    last4Digits: '1234',
                    cardType: 'Visa',
                    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                    planName: 'Basic'
                }
            };
            setCurrentUser(userWithBilling);
            const updated = users.map(u => ({
                ...u,
                online: u.id === userId ? true : u.online
            }));
            setUsers(updated);
            setIsAuthenticated(true);
            setIsLoadingCurrentUser(false);
            addToast(`התחברת בהצלחה בתור ${user.name}`, 'success');
            return true;
        } else {
            addToast('משתמש לא קיים', 'error');
            return false;
        }
    }, [users, addToast]);

    const logout = useCallback(() => {
        setIsAuthenticated(false);
        setIsLoadingCurrentUser(false);
        setUsers(prev => prev.map(u => ({ ...u, online: false })));
        setCurrentUser(getInitialUser());
    }, []);

    const switchUser = useCallback((userId: string) => {
        login(userId);
    }, [login]);

    const hasPermission = useCallback(
        (permission: PermissionId): boolean => {
            // Super admins have all permissions
            if (currentUser.isSuperAdmin === true) {
                return true;
            }

            // Special case: CEO (מנכ״ל) has all permissions - handle both Unicode variants
            if (isCeoRole(currentUser.role)) {
                return true;
            }

            // Check role permissions - normalize role name for comparison
            // Normalize both role names to handle Unicode quote variations (" vs ״)
            const normalizedRole = normalizeRoleName(currentUser.role);
            const role = roleDefinitions.find(r => {
                const normalizedDefRole = normalizeRoleName(r.name);
                return normalizedDefRole === normalizedRole; // Only check normalized comparison
            });

            if (role && role.permissions) {
                return role.permissions.includes(permission);
            }

            return false;
        },
        [currentUser.isSuperAdmin, currentUser.role, roleDefinitions]
    );

    const addUser = (user: User) => {
        setUsers(prev => [...prev, user]);
        addToast('משתמש נוסף למערכת', 'success');
    };

    const updateUser = (id: string, updates: Partial<User>) => {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
        if (id === currentUser.id) {
            setCurrentUser(prev => ({ ...prev, ...updates }));
        }
    };

    const removeUser = (id: string) => {
        const user = users.find(u => u.id === id);
        if (user) {
            setTrashUsers(prev => [user, ...prev]);
            setUsers(prev => prev.filter(u => u.id !== id));
            addToast('משתמש הועבר לארכיון (סל המיחזור)', 'info');
        }
    };

    const restoreUser = (id: string) => {
        const user = trashUsers.find(u => u.id === id);
        if (user) {
            setUsers(prev => [...prev, user]);
            setTrashUsers(prev => prev.filter(u => u.id !== id));
            addToast('משתמש שוחזר בהצלחה', 'success');
        }
    };

    const permanentlyDeleteUser = (id: string) => {
        setTrashUsers(prev => prev.filter(u => u.id !== id));
        addToast('משתמש נמחק לצמיתות', 'warning');
    };

    const clockIn = () => {
        if (!orgSlug) { addToast('חסר ארגון פעיל', 'error'); return; }

        // START GPS IMMEDIATELY — runs in parallel with server call
        const gpsPromise = getLocation().catch(() => null);

        // OPTIMISTIC: immediately show active shift so clock starts counting
        const optimisticId = `optimistic-${Date.now()}`;
        const optimisticStart = new Date().toISOString();
        const optimisticEntry: TimeEntry = {
            id: optimisticId,
            userId: currentUser.id,
            date: optimisticStart.slice(0, 10),
            startTime: optimisticStart,
        };
        const prevEntries = timeEntries;
        setTimeEntries(prev => [optimisticEntry, ...prev]);
        broadcastAttendanceUpdate(orgSlug, optimisticId, optimisticStart);

        const timeStr = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        addToast(`נכנסת למשמרת ב-${timeStr}. עבודה נעימה!`, 'success');

        const capturedOrgSlug = orgSlug;

        // Server call + GPS update (GPS already acquiring in parallel)
        void (async () => {
            try {
                const res = await punchIn(capturedOrgSlug, undefined, { lat: 0, lng: 0, accuracy: 0 });

                await refreshTimeEntries();

                const entryId = res?.activeShift?.id;
                if (entryId && res?.activeShift?.startTime) {
                    broadcastAttendanceUpdate(capturedOrgSlug, entryId, new Date(res.activeShift.startTime).toISOString());
                }
                if (res?.alreadyActive) {
                    addToast('כבר יש משמרת פעילה.', 'info');
                }

                // GPS was acquiring in parallel — use result now
                if (entryId) {
                    const location = await gpsPromise;
                    if (location && (location.lat !== 0 || location.lng !== 0)) {
                        try {
                            await updateEntryLocation(capturedOrgSlug, entryId, 'start', location);
                        } catch (updErr) {
                            console.warn('[Attendance] updateEntryLocation failed (clockIn):', updErr instanceof Error ? updErr.message : updErr);
                        }
                    } else {
                        console.warn('[Attendance] GPS unavailable for clockIn — entry saved without location');
                    }
                }
            } catch (e: unknown) {
                // ROLLBACK optimistic entry — only on actual server failure
                setTimeEntries(prevEntries);
                broadcastAttendanceUpdate(capturedOrgSlug, null, null);
                const msg = String(e instanceof Error ? e.message : e);
                addToast(msg || 'שגיאה בכניסה למשמרת', 'error');
            }
        })();
    };

    const clockOut = () => {
        if (!orgSlug) { addToast('חסר ארגון פעיל', 'error'); return; }
        if (!activeShift) { addToast('אין משמרת פעילה לסגירה.', 'info'); return; }

        // START GPS IMMEDIATELY — runs in parallel with server call
        const gpsPromise = getLocation().catch(() => null);

        // OPTIMISTIC: immediately mark shift as ended so clock stops
        const prevEntries = timeEntries;
        const capturedShift = activeShift;
        const nowIso = new Date().toISOString();
        setTimeEntries(prev => prev.map(t =>
            t.id === capturedShift.id
                ? { ...t, endTime: nowIso, durationMinutes: Math.round((Date.now() - new Date(t.startTime).getTime()) / 60000) }
                : t
        ));
        broadcastAttendanceUpdate(orgSlug, null, null);

        const outTimeStr = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        addToast(`יצאת ממשמרת ב-${outTimeStr}. תודה!`, 'info');

        const capturedOrgSlug = orgSlug;

        // Server call + GPS update (GPS already acquiring in parallel)
        void (async () => {
            try {
                const res = await punchOut(capturedOrgSlug, undefined, { lat: 0, lng: 0, accuracy: 0 });

                await refreshTimeEntries();

                if (res?.noActiveShift) {
                    addToast('אין משמרת פעילה לסגירה.', 'info');
                }

                // Confirm clock-out broadcast after server success
                broadcastAttendanceUpdate(capturedOrgSlug, null, null);

                // GPS was acquiring in parallel — use result now
                const closedEntryId = res?.entryId || capturedShift.id;
                if (closedEntryId) {
                    const location = await gpsPromise;
                    if (location && (location.lat !== 0 || location.lng !== 0)) {
                        try {
                            await updateEntryLocation(capturedOrgSlug, closedEntryId, 'end', location);
                        } catch (updErr) {
                            console.warn('[Attendance] updateEntryLocation failed (clockOut):', updErr instanceof Error ? updErr.message : updErr);
                        }
                    } else {
                        console.warn('[Attendance] GPS unavailable for clockOut — entry saved without location');
                    }
                }
            } catch (e: unknown) {
                // ROLLBACK — restore active shift
                setTimeEntries(prevEntries);
                broadcastAttendanceUpdate(capturedOrgSlug, capturedShift.id, capturedShift.startTime);
                const msg = String(e instanceof Error ? e.message : e);
                addToast(msg || 'שגיאה ביציאה ממשמרת — המשמרת עדיין פעילה', 'error');
            }
        })();
    };

    const addManualTimeEntry = (entry: TimeEntry) => {
        let durationMinutes = 0;
        if (entry.endTime) {
            const start = new Date(entry.startTime).getTime();
            const end = new Date(entry.endTime).getTime();
            durationMinutes = Math.round((end - start) / 60000);
        }

        const newEntry = { ...entry, durationMinutes };
        setTimeEntries(prev => [newEntry, ...prev]);
        addToast('דיווח שעות ידני נוסף בהצלחה', 'success');
    };

    const updateTimeEntry = (id: string, updates: Partial<TimeEntry>) => {
        setTimeEntries(prev => prev.map(t => {
            if (t.id === id) {
                const updatedEntry = { ...t, ...updates };
                
                // Recalculate duration if times changed
                if (updatedEntry.endTime) {
                    const start = new Date(updatedEntry.startTime).getTime();
                    const end = new Date(updatedEntry.endTime).getTime();
                    updatedEntry.durationMinutes = Math.round((end - start) / 60000);
                } else {
                    updatedEntry.durationMinutes = undefined;
                }
                
                return updatedEntry;
            }
            return t;
        }));
        addToast('דיווח השעות עודכן', 'success');
    };

    const deleteTimeEntry = (id: string, reason?: string) => {
        const entry = timeEntries.find(t => t.id === id);
        if (entry) {
            const voidedEntry = { 
                ...entry, 
                voidReason: reason || 'No reason provided',
                voidedBy: currentUser.name,
                voidedAt: new Date().toISOString()
            };
            
            setTrashTimeEntries(prev => [voidedEntry, ...prev]);
            setTimeEntries(prev => prev.filter(t => t.id !== id));
            addToast('דיווח שעות בוטל והועבר לארכיון', 'info');
        }
    };

    const restoreTimeEntry = (id: string) => {
        const entry = trashTimeEntries.find(t => t.id === id);
        if (entry) {
            setTimeEntries(prev => [...prev, entry]);
            setTrashTimeEntries(prev => prev.filter(t => t.id !== id));
            addToast('דיווח שעות שוחזר בהצלחה', 'success');
        }
    };

    const permanentlyDeleteTimeEntry = (id: string) => {
        setTrashTimeEntries(prev => prev.filter(t => t.id !== id));
        addToast('דיווח שעות נמחק לצמיתות', 'warning');
    };

    const deleteRole = (name: string) => {
        setRoleDefinitions(prev => prev.filter(r => r.name !== name));
        addToast('תפקיד נמחק', 'info');
    };

    const requestNameChange = (newName: string) => {
        const request: ChangeRequest = {
            id: `req-${Date.now()}`,
            userId: currentUser.id,
            userName: currentUser.name,
            requestedName: newName,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        setChangeRequests(prev => [...prev, request]);
        addToast('בקשת שינוי שם נשלחה לאישור', 'success');
    };

    const approveNameChange = (requestId: string) => {
        const request = changeRequests.find(r => r.id === requestId);
        if (request) {
            updateUser(request.userId, { name: request.requestedName });
            setChangeRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'approved' } : r));
            addToast('שינוי השם אושר', 'success');
        }
    };

    const rejectNameChange = (requestId: string) => {
        setChangeRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r));
        addToast('שינוי השם נדחה', 'info');
    };

    return {
        users, roleDefinitions, currentUser, isAuthenticated, isLoadingCurrentUser, timeEntries, trashUsers, trashTimeEntries,
        activeShift, changeRequests,
        login, logout, switchUser, hasPermission, addUser, updateUser, removeUser, restoreUser,
        permanentlyDeleteUser, clockIn, clockOut,
        addManualTimeEntry, updateTimeEntry, deleteTimeEntry, restoreTimeEntry, permanentlyDeleteTimeEntry,
        setRoleDefinitions, deleteRole, requestNameChange, approveNameChange, rejectNameChange
    };
};