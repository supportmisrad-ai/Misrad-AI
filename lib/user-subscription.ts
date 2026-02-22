import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * User Subscription & Purchased Modules
 * 
 * This module handles checking which OS modules a user has purchased.
 * In production, this should fetch from your database/subscription service.
 */

import { DEFAULT_OS_MODULE_PRIORITY, isOSModuleKey } from '@/lib/os/modules/registry';
import { OSModule, OS_MODULES } from '../types/os-modules';


function getErrorName(error: unknown): string {
  if (error instanceof Error) return error.name;
  const obj = asObject(error);
  const name = obj?.name;
  return typeof name === 'string' ? name : '';
}


function resolveOrgSlug(orgSlug?: string | null): string | null {
  if (orgSlug) return String(orgSlug);
  if (typeof window === 'undefined') return null;

  const pathname = window.location?.pathname || '';
  const marker = '/w/';
  const idx = pathname.indexOf(marker);
  if (idx === -1) return null;

  const rest = pathname.slice(idx + marker.length);
  const raw = rest.split('/')[0] || '';
  if (!raw) return null;

  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Get purchased modules for a user
 * 
 * Fetches the purchased OS modules from the database via API.
 * The API checks the user's tenant subscription and returns available modules.
 * 
 * @param userId - Clerk user ID (used for authentication, not directly in query)
 * @param orgSlug - Optional org slug to use for resolving organization context
 * @returns Array of purchased OS modules
 */
export async function getUserPurchasedModules(userId: string, orgSlug?: string | null): Promise<OSModule[]> {
  try {
    const resolvedOrgSlug = resolveOrgSlug(orgSlug);
    if (!resolvedOrgSlug) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Subscription] Development mode: Missing org context, returning all modules as fallback');
        return DEFAULT_OS_MODULE_PRIORITY;
      }
      return [];
    }

    // Call API to get modules from database (based on user's tenant)
    const response = await fetch('/api/subscription/modules', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-org-id': resolvedOrgSlug,
      },
      // Credentials are automatically included via Clerk session
      // Add cache control to prevent stale data
      cache: 'no-store',
    });

    if (!response.ok) {
      // Only log non-network errors (network errors are common in dev)
      if (response.status !== 0 && response.status !== 500) {
        let body = '';
        try {
          body = await response.text();
        } catch {
          body = '';
        }
        console.error('[Subscription] Failed to fetch modules:', response.status, response.statusText, body);
      }
      // Fallback to empty array on error (user won't see any modules)
      // In development, return all modules for testing
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Subscription] Development mode: API error, returning all modules as fallback');
        return DEFAULT_OS_MODULE_PRIORITY;
      }
      return [];
    }

    const data = await response.json();
    const modules = data.modules || [];
    
    // Validate that all returned modules are valid OSModule types
    const validModules: OSModule[] = modules.filter((m: unknown): m is OSModule => isOSModuleKey(m));

    return validModules;
  } catch (error: unknown) {
    // Handle network errors gracefully (common in development)
    const name = getErrorName(error);
    const message = getErrorMessage(error);
    const isNetworkError = name === 'TypeError' && (message.includes('fetch') || message.includes('Failed to fetch'));
    
    if (isNetworkError) {
      // Network errors are common in dev - don't spam console
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Subscription] Development mode: Network error, returning all modules as fallback');
        return DEFAULT_OS_MODULE_PRIORITY;
      }
      // In production, silently return empty array
      return [];
    }
    
    // Log other errors
    console.error('[Subscription] Error fetching purchased modules:', error);
    
    // Fallback: return empty array on error
    // In development, you might want to return all modules for testing
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Subscription] Development mode: Returning all modules as fallback');
      return DEFAULT_OS_MODULE_PRIORITY;
    }
    return [];
  }
}

/**
 * Get the first available OS module for a user
 * Priority order:
 * 1. Nexus (if purchased) - default/main module
 * 2. System OS (if purchased)
 * 3. Social (if purchased)
 * 4. Finance OS (if purchased)
 * 5. Client OS (if purchased)
 * 
 * @param purchasedModules - Array of purchased module IDs
 * @returns First available OS module route, or null if none
 */
export function getFirstAvailableOSRoute(purchasedModules: OSModule[]): string | null {
  const priorityOrder: OSModule[] = DEFAULT_OS_MODULE_PRIORITY;
  
  for (const moduleId of priorityOrder) {
    if (purchasedModules.includes(moduleId)) {
      const moduleDef = OS_MODULES.find(m => m.id === moduleId);
      const route = moduleDef?.route || null;
      if (!route) return null;
      if (route.includes('[orgSlug]')) return null;
      return route;
    }
  }
  
  return null;
}

/**
 * Check if user has access to a specific OS module
 * 
 * @param userId - Clerk user ID
 * @param moduleId - OS module ID to check
 * @returns true if user has access, false otherwise
 */
export async function hasAccessToModule(userId: string, moduleId: OSModule): Promise<boolean> {
  const purchasedModules = await getUserPurchasedModules(userId);
  return purchasedModules.includes(moduleId);
}

