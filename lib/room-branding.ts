import type { OSModule } from '@/types/os-modules';
import { getOSModule, OS_MODULES } from '@/types/os-modules';
import type { OSModuleKey } from '@/lib/os/modules/types';

export const MISRAD_APP_NAME = 'Misrad';

export const getActiveRoomFromPathname = (pathname: string | null | undefined): OSModule | null => {
  if (!pathname) return null;
  if (pathname.startsWith('/w/')) {
    const parts = pathname.split('/').filter(Boolean);
    const raw = parts[2] || null;
    const allowed = new Set<OSModuleKey>(OS_MODULES.map((m) => m.id as OSModuleKey));
    if (raw && allowed.has(raw as OSModuleKey)) return raw as OSModule;
  }
  if (pathname.startsWith('/social')) return 'social';
  if (pathname.startsWith('/system')) return 'system';
  if (pathname.startsWith('/app')) return 'nexus';
  return null;
};

const SOCIAL_SCREEN_TITLES: Record<string, string> = {
  '/social': 'מרכז שליטה',
  '/social/dashboard': 'מרכז שליטה',
  '/social/clients': 'כל הלקוחות שלי',
  '/social/calendar': 'לוח שידורים',
  '/social/inbox': 'הודעות ותגובות',
  '/social/workspace': 'סביבת עבודה ללקוח',
  '/social/machine': 'פוסט בקליק ✨',
  '/social/campaigns': 'ניהול קמפיינים',
  '/social/analytics': 'נתונים וביצועים',
  '/social/team': 'צוות',
  '/social/collection': 'גבייה',
  '/social/agency-insights': 'תובנות',
  '/social/admin': 'ניהול מערכת',
  '/social/settings': 'הגדרות מערכת',
};

const SYSTEM_SCREEN_TITLES: Record<string, string> = {
  '/system': 'לוח בקרה',
};

const NEXUS_SCREEN_TITLES: Record<string, string> = {
  '/app': 'לוח בקרה',
};

export const getScreenNameFromPathname = (pathname: string | null | undefined): string | null => {
  if (!pathname) return null;

  if (pathname.startsWith('/w/')) {
    const parts = pathname.split('/').filter(Boolean);
    const module = parts[2] || null;
    const rest = parts.length > 3 ? `/${parts.slice(3).join('/')}` : '';
    if (module === 'social') {
      return SOCIAL_SCREEN_TITLES[`/social${rest}`] || null;
    }
  }

  if (pathname.startsWith('/social')) {
    return SOCIAL_SCREEN_TITLES[pathname] || null;
  }

  if (pathname.startsWith('/system')) {
    return SYSTEM_SCREEN_TITLES[pathname] || null;
  }

  if (pathname.startsWith('/app')) {
    return NEXUS_SCREEN_TITLES[pathname] || null;
  }

  return null;
};

export const getRoomName = (room: OSModule | null): string | null => {
  if (!room) return null;
  const module = getOSModule(room);
  if (!module) return null;
  return `${module.name}`;
};

export const getRoomNameHebrew = (room: OSModule | null): string | null => {
  if (!room) return null;
  const module = getOSModule(room);
  if (!module) return null;
  return `${module.nameHebrew}`;
};

export const buildDocumentTitle = (args: {
  pathname?: string | null;
  roomName?: string | null;
  screenName?: string | null;
  appName?: string;
}): string => {
  const appName = args.appName || MISRAD_APP_NAME;

  const roomName = args.roomName || getRoomName(getActiveRoomFromPathname(args.pathname));
  const screenName = args.screenName ?? getScreenNameFromPathname(args.pathname);

  if (roomName && screenName) return `${roomName} | ${screenName} | ${appName}`;
  if (roomName) return `${roomName} | ${appName}`;
  return appName;
};
