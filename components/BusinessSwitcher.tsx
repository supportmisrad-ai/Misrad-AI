'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Building2, ChevronDown, Check, Search, Plus, Star, Pin } from 'lucide-react';
import { Tenant } from '../types';
import { extractData } from '@/lib/shared/api-types';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeletons';
import { useAuth } from '@clerk/nextjs';

interface BusinessSwitcherProps {
    currentTenantId?: string;
    currentTenantName?: string;
}
type WorkspaceItem = { 
    id: string; 
    slug: string; 
    name: string;
    logo?: string;
    subscription_plan?: string;
    subscription_status?: string;
    created_at?: string;
    membersCount?: number;
    owner?: { email?: string };
};

export const BusinessSwitcher: React.FC<BusinessSwitcherProps> = ({ 
    currentTenantId,
    currentTenantName
}) => {
    const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();
    const lastFetchAtRef = useRef<number>(0);

    const [isOpen, setIsOpen] = useState(false);
    const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
    const [businesses, setBusinesses] = useState<Tenant[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [pinnedOrgId, setPinnedOrgId] = useState<string | null>(null);
    const [pinToast, setPinToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

    // Load favorites and pinned org from localStorage on client mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = localStorage.getItem('misrad_favorite_orgs');
            if (raw) {
                const parsed = JSON.parse(raw) as string[];
                if (Array.isArray(parsed)) {
                    setFavoriteIds(new Set(parsed));
                }
            }
        } catch {
            // ignore
        }
        try {
            const pinned = localStorage.getItem('misrad_pinned_org');
            if (pinned) {
                setPinnedOrgId(pinned);
            }
        } catch {
            // ignore
        }
    }, []);

    const toggleFavorite = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setFavoriteIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            try { localStorage.setItem('misrad_favorite_orgs', JSON.stringify([...next])); } catch {}
            return next;
        });
    }, []);

    const togglePin = useCallback((id: string, orgName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setPinnedOrgId((prev) => {
            if (prev === id) {
                // Unpin
                try { localStorage.removeItem('misrad_pinned_org'); } catch {}
                // Also remove cookie
                try { document.cookie = 'misrad_pinned_org=; path=/; max-age=0'; } catch {}
                setPinToast({ message: `הוסרה הצמדה מ-${orgName}`, visible: true });
                return null;
            } else {
                // Pin this one (replaces any previous)
                try { localStorage.setItem('misrad_pinned_org', id); } catch {}
                // Also set cookie for server-side reading (1 year expiry)
                try { document.cookie = `misrad_pinned_org=${encodeURIComponent(id)}; path=/; max-age=31536000; SameSite=Lax`; } catch {}
                setPinToast({ message: `${orgName} ייפתח אוטומטית בכניסה הבאה. לחץ שוב להסרה.`, visible: true });
                return id;
            }
        });
    }, []);

    // Auto-hide pin toast after 5 seconds
    useEffect(() => {
        if (!pinToast.visible) return;
        const timer = setTimeout(() => {
            setPinToast((prev) => ({ ...prev, visible: false }));
        }, 5000);
        return () => clearTimeout(timer);
    }, [pinToast.visible]);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Get current workspace slug from window location - defined early to avoid hoisting issues
    const getCurrentSubdomain = (): string | null => {
        if (typeof window === 'undefined') return null;
        const path = window.location.pathname;
        
        // Extract orgSlug from /w/[orgSlug]/... path
        const pathParts = path.split('/').filter(Boolean);
        if (pathParts[0] === 'w' && pathParts[1]) {
            return decodeURIComponent(pathParts[1]);
        }
        
        return null;
    };

    // Fetch accessible businesses
    useEffect(() => {
        if (typeof document === 'undefined') return;
        setPortalRoot(document.body);
    }, []);

    const fetchBusinesses = async ({ silent = false }: { silent?: boolean } = {}) => {
        if (!isClerkLoaded || !isSignedIn) {
            return;
        }

        const now = Date.now();
        if (now - lastFetchAtRef.current < 1500) return;
        lastFetchAtRef.current = now;

        if (!silent) {
            setIsLoading(true);
        }

        try {
            const response = await fetch('/api/workspaces', { cache: 'no-store', credentials: 'include' });
            if (!response.ok) {
                setBusinesses([]);
                return;
            }
            const raw = await response.json().catch(() => ({}));
            const payload = extractData<{ workspaces?: WorkspaceItem[] }>(raw);
            const workspaces = payload?.workspaces || [];
            
            // DEBUG: Check for duplicates in API response
            const seenIds = new Set<string>();
            const duplicates: string[] = [];
            for (const w of workspaces) {
                if (seenIds.has(w.id)) {
                    duplicates.push(w.id);
                }
                seenIds.add(w.id);
            }
            if (duplicates.length > 0) {
                console.error('[BusinessSwitcher] Duplicate workspaces in API response:', duplicates);
            }
            // DEBUG: Check for duplicate slugs
            const slugMap = new Map<string, string[]>();
            for (const w of workspaces) {
                const slug = w.slug || 'null';
                if (!slugMap.has(slug)) slugMap.set(slug, []);
                slugMap.get(slug)!.push(w.name);
            }
            for (const [slug, names] of slugMap) {
                if (names.length > 1) {
                    console.error(`[BusinessSwitcher] Duplicate slug "${slug}" with names:`, names);
                }
            }
            
            const businesses: Tenant[] = workspaces.map((w: WorkspaceItem): Tenant => ({
                id: w.id,
                name: w.name,
                subdomain: w.slug,
                logo: w.logo,
                plan: w.subscription_plan || 'unknown',
                status: (w.subscription_status === 'trial' ? 'Trial' : 'Active'),
                joinedAt: w.created_at ?? new Date().toISOString(),
                mrr: 0,
                usersCount: w.membersCount || 0,
                modules: [],
                region: 'il-central' as const,
                version: undefined,
                allowedEmails: [],
                requireApproval: false,
                ownerEmail: w.owner?.email || '',
            }));
            setBusinesses(businesses);
        } catch (error) {
            console.error('Error fetching businesses:', error);
            setBusinesses([]);
        } finally {
            setIsLoading(false);
            lastFetchAtRef.current = Date.now();
        }
    };

    useEffect(() => {
        async function loadWorkspaces() {
            try {
                setIsLoading(true);
                const res = await fetch('/api/workspaces', { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to load workspaces');
                const workspaces = await res.json() as Array<{ id: string; slug: string | null; name: string; logo?: string | null }>;

                // Debug: Check for duplicates in API response
                const slugs = workspaces.map(w => w.slug);
                const duplicateSlugs = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);
                console.log('[BusinessSwitcher] Received workspaces:', workspaces);
                console.log('[BusinessSwitcher] All slugs:', slugs);
                console.log('[BusinessSwitcher] Current subdomain:', getCurrentSubdomain());
                
                if (duplicateSlugs.length > 0) {
                    console.error('[BusinessSwitcher] DETECTED DUPLICATE SLUGS IN API DATA:', duplicateSlugs);
                }

                // Check which ones would be marked active
                const activeItems = workspaces.filter(w => w.slug === getCurrentSubdomain());
                console.log('[BusinessSwitcher] Workspaces matching current subdomain:', activeItems.map(w => w.name));
                
                if (activeItems.length > 1) {
                    console.error('[BusinessSwitcher] CRITICAL: Multiple workspaces match the current subdomain!', activeItems);
                }
            } catch (err) {
                console.error('[BusinessSwitcher] Failed to load workspaces:', err);
            } finally {
                setIsLoading(false);
            }
        }
        loadWorkspaces();
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const isStale = Date.now() - lastFetchAtRef.current > 2 * 60 * 1000;
        if (businesses.length === 0 || isStale) {
            fetchBusinesses();
        }
    }, [isOpen, businesses.length]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!isClerkLoaded || !isSignedIn) return;
        if (businesses.length > 0) return;

        let cancelled = false;
        const run = () => {
            if (cancelled) return;
            fetchBusinesses({ silent: true });
        };

        const w = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
        if (typeof w.requestIdleCallback === 'function') {
            const id = w.requestIdleCallback(run, { timeout: 1200 });
            return () => {
                cancelled = true;
                try {
                    w.cancelIdleCallback?.(id);
                } catch {
                }
            };
        }

        const t = window.setTimeout(run, 250);
        return () => {
            cancelled = true;
            window.clearTimeout(t);
        };
    }, [businesses.length, isClerkLoaded, isSignedIn]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node | null;
            const path = (event.composedPath?.() ?? []) as EventTarget[];

            const isInside = (el: HTMLElement | null) => {
                if (!el) return false;
                if (target && el.contains(target)) return true;
                return path.length > 0 ? path.includes(el) : false;
            };

            if (isInside(dropdownRef.current) || isInside(menuRef.current)) {
                return;
            }

            setIsOpen(false);
            setSearchQuery('');
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const handleSwitchBusiness = (tenant: Tenant) => {
        if (tenant.subdomain) {
            // Navigate to the workspace
            const path = window.location.pathname;
            const search = window.location.search;
            
            // Extract current module from path if we're in a workspace
            const pathParts = path.split('/').filter(Boolean);
            let targetPath = `/w/${encodeURIComponent(tenant.subdomain)}`;
            
            // Try to preserve the current module if it exists
            if (pathParts[0] === 'w' && pathParts[1]) {
                const currentModule = pathParts[2];
                if (currentModule) {
                    targetPath += `/${currentModule}`;
                }
            } else {
                // If not in a workspace, go to lobby
                targetPath += '/lobby';
            }
            
            window.location.href = targetPath + search;
        }
    };

    const filteredBusinesses = businesses
        .filter(business => business.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            const aFav = favoriteIds.has(a.id) ? 1 : 0;
            const bFav = favoriteIds.has(b.id) ? 1 : 0;
            return bFav - aFav;
        });

    const currentSubdomain = getCurrentSubdomain();
    // Use ONLY subdomain for current business - prevents mismatch when id prop is stale
    const currentBusiness = businesses.find(b => b.subdomain === currentSubdomain);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);

    const computeDropdownPosition = (buttonRect: DOMRect) => {
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const dropdownHeight = 400; // Estimated max height
        const dropdownWidth = 320; // Fixed width

        // Position below the button by default
        let top = buttonRect.bottom + 8;
        let left = buttonRect.left;
        let placement: 'top' | 'bottom' = 'bottom';

        // Check if dropdown would go below the viewport
        if (top + dropdownHeight > viewportHeight) {
            // Try to position above the button
            top = buttonRect.top - dropdownHeight - 8;
            placement = 'top';
        }

        // Ensure dropdown doesn't go off the right edge
        if (left + dropdownWidth > viewportWidth) {
            left = viewportWidth - dropdownWidth - 8;
        }

        // Ensure dropdown doesn't go off the left edge
        if (left < 8) {
            left = 8;
        }

        return { top, left, placement };
    };

    useEffect(() => {
        if (!isOpen) {
            setDropdownPosition(null);
            setSearchQuery('');
        }
    }, [isOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                ref={buttonRef}
                type="button"
                onClick={(e) => {
                    if (!isOpen) {
                        const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                        setDropdownPosition(computeDropdownPosition(rect));
                        setIsOpen(true);
                        return;
                    }
                    setIsOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors group w-full"
                aria-label="החלף עסק"
            >
                <Building2 size={16} className="text-gray-500 group-hover:text-gray-700" />
                <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
                    {currentBusiness?.name || currentTenantName || 'בחר עסק'}
                </span>
                <ChevronDown 
                    size={14} 
                    className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''} ml-auto`} 
                />
            </button>

            {portalRoot &&
                createPortal(
                    <AnimatePresence>
                        {isOpen && dropdownPosition ? (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
                                    onClick={() => setIsOpen(false)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, y: dropdownPosition.placement === 'top' ? 10 : -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: dropdownPosition.placement === 'top' ? 10 : -10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    ref={menuRef}
                                    style={{
                                        position: 'fixed',
                                        top: dropdownPosition.top,
                                        left: Math.max(8, dropdownPosition.left),
                                        width: '320px',
                                        zIndex: 70,
                                    }}
                                    className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
                                >
                                {/* Header */}
                                <div className="p-4 border-b border-gray-100">
                                    <h3 className="text-sm font-bold text-gray-900 mb-3">החלף עסק</h3>
                                    
                                    {/* Search */}
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="חפש עסק..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pr-3 pl-9 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-nexus-primary/30"
                                        />
                                    </div>
                                </div>

                                {/* Business List */}
                                <div className="max-h-96 overflow-y-auto">
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Skeleton className="w-8 h-8 rounded-full" />
                                        </div>
                                    ) : filteredBusinesses.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-gray-500">
                                            {searchQuery ? 'לא נמצאו תוצאות' : 'אין עסקים זמינים'}
                                        </div>
                                    ) : (
                                        <div className="p-2">
                                            {filteredBusinesses.map((business) => {
                                                // Use ONLY subdomain for active check - prevents duplicate selections
                                                // when id and subdomain refer to different orgs
                                                const isActive = business.subdomain === currentSubdomain;
                                                return (
                                                    <div
                                                        key={business.id}
                                                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-right transition-colors ${
                                                            isActive
                                                                ? 'bg-blue-50 text-blue-700'
                                                                : 'hover:bg-gray-50 text-gray-700'
                                                        }`}
                                                    >
                                                        {/* Pin Button */}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => togglePin(business.id, business.name, e)}
                                                            className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 transition-colors"
                                                            aria-label={pinnedOrgId === business.id ? 'הסר הצמדה' : 'הצמד לכניסה אוטומטית'}
                                                            title={pinnedOrgId === business.id ? 'לחץ להסרת הצמדה' : 'הצמד - ייפתח אוטומטית בכניסה הבאה'}
                                                        >
                                                            <Pin
                                                                size={14}
                                                                className={pinnedOrgId === business.id ? 'text-blue-500 fill-blue-500' : 'text-gray-300'}
                                                            />
                                                        </button>

                                                        {/* Favorite Star */}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => toggleFavorite(business.id, e)}
                                                            className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 transition-colors"
                                                            aria-label={favoriteIds.has(business.id) ? 'הסר מהמועדפים' : 'הוסף למועדפים'}
                                                        >
                                                            <Star
                                                                size={14}
                                                                className={favoriteIds.has(business.id) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
                                                            />
                                                        </button>

                                                        {/* Clickable row for switching */}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                handleSwitchBusiness(business);
                                                                setIsOpen(false);
                                                            }}
                                                            className="flex items-center gap-3 flex-1 min-w-0"
                                                        >
                                                            {/* Logo or Icon */}
                                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                                                {business.logo ? (
                                                                    <img 
                                                                        src={business.logo} 
                                                                        alt={business.name}
                                                                        className="w-full h-full object-cover rounded-lg"
                                                                    />
                                                                ) : (
                                                                    <Building2 size={18} className="text-white" />
                                                                )}
                                                            </div>

                                                            {/* Business Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-sm truncate">
                                                                        {business.name}
                                                                    </span>
                                                                    {isActive && (
                                                                        <Check size={14} className="text-blue-600 flex-shrink-0" />
                                                                    )}
                                                                </div>
                                                                <span className="text-xs text-gray-500 truncate block">
                                                                    /w/{business.subdomain}
                                                                </span>
                                                            </div>

                                                            {isActive && (
                                                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                                    <Check size={14} className="text-blue-600" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Pin Toast */}
                                {pinToast.visible && (
                                    <div className="mx-3 mb-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-300">
                                        {pinToast.message}
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="p-3 border-t border-gray-100 bg-white">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOpen(false);
                                            setSearchQuery('');
                                            window.location.href = '/support?topic=add-business';
                                        }}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-100 hover:border-gray-300 transition-all"
                                    >
                                        <Plus size={16} />
                                        <span>הוסף עסק</span>
                                    </button>
                                </div>
                                </motion.div>
                            </>
                        ) : null}
                    </AnimatePresence>,
                    portalRoot
                )}
        </div>
    );
};
