'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import type { OSModule } from '@/types/os-modules';
import { getOSModule } from '@/types/os-modules';
import {
  buildDocumentTitle,
  getActiveRoomFromPathname,
  getRoomName,
  getRoomNameHebrew,
  getScreenNameFromPathname,
} from '@/lib/room-branding';

export const useRoomBranding = () => {
  const pathname = usePathname();

  return useMemo(() => {
    const room: OSModule | null = getActiveRoomFromPathname(pathname);
    const module = room ? getOSModule(room) : undefined;

    const roomName = getRoomName(room);
    const roomNameHebrew = getRoomNameHebrew(room);
    const screenName = getScreenNameFromPathname(pathname);

    return {
      pathname,
      room,
      roomName,
      roomNameHebrew,
      screenName,
      gradient: module?.gradient || null,
      RoomIcon: module?.icon || null,
      title: buildDocumentTitle({ pathname }),
    };
  }, [pathname]);
};
