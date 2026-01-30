'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import type { OSModule } from '@/types/os-modules';
import { modulesRegistry } from '@/lib/os/modules/registry';
import {
  buildDocumentTitle,
  getActiveRoomFromPathname,
  getRoomName,
  getScreenNameFromPathname,
} from '@/lib/room-branding';

export const useRoomBranding = () => {
  const pathname = usePathname();

  return useMemo(() => {
    const room: OSModule | null = getActiveRoomFromPathname(pathname);

    const roomIconName = room ? String(modulesRegistry[room].iconName || '') : null;
    const roomGradient = room ? (modulesRegistry[room]?.theme?.gradient || null) : null;

    const roomName = getRoomName(room);
    const screenName = getScreenNameFromPathname(pathname);

    return {
      pathname,
      room,
      roomName,
      screenName,
      gradient: roomGradient,
      roomIconName: roomIconName && roomIconName.length > 0 ? roomIconName : null,
      title: buildDocumentTitle({ pathname }),
    };
  }, [pathname]);
};
