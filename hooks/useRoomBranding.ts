'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import type { OSModule } from '@/types/os-modules';
import { getOSModule } from '@/types/os-modules';
import { modulesRegistry } from '@/lib/os/modules/registry';
import { useModuleIconNames } from '@/hooks/useModuleIconNames';
import {
  buildDocumentTitle,
  getActiveRoomFromPathname,
  getRoomName,
  getRoomNameHebrew,
  getScreenNameFromPathname,
} from '@/lib/room-branding';

export const useRoomBranding = () => {
  const pathname = usePathname();
  const { moduleIcons } = useModuleIconNames();

  return useMemo(() => {
    const room: OSModule | null = getActiveRoomFromPathname(pathname);
    const info = room ? getOSModule(room) : undefined;

    const roomIconName = room
      ? String(moduleIcons?.[room] || modulesRegistry[room].iconName || info?.iconName || '')
      : null;

    const roomName = getRoomName(room);
    const roomNameHebrew = getRoomNameHebrew(room);
    const screenName = getScreenNameFromPathname(pathname);

    return {
      pathname,
      room,
      roomName,
      roomNameHebrew,
      screenName,
      gradient: info?.gradient || null,
      roomIconName: roomIconName && roomIconName.length > 0 ? roomIconName : null,
      title: buildDocumentTitle({ pathname }),
    };
  }, [moduleIcons, pathname]);
};
