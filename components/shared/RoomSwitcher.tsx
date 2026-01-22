'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LayoutGrid, Lock, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { OS_MODULES, type OSModule } from '@/types/os-modules';
import { OSModuleIcon } from '@/components/shared/OSModuleIcon';

type OSRoomId = OSModule;

const DEFAULT_ROOMS: Record<OSRoomId, boolean> = {
  social: true,
  nexus: true,
  system: true,
  finance: false,
  client: false,
  operations: false,
};

const ROOM_META: Array<{ id: OSRoomId; title: string; gradient: string }> = OS_MODULES.map((m) => ({
  id: m.id,
  title: m.name,
  gradient: m.gradient,
}));

export function RoomSwitcher({ className = '' }: { className?: string }) {
  const [rooms, setRooms] = useState<Record<OSRoomId, boolean>>(DEFAULT_ROOMS);
  const [isOpen, setIsOpen] = useState(false);
  const [lockedRoom, setLockedRoom] = useState<OSRoomId | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const response = await fetch('/api/os/rooms', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (data?.rooms) {
          setRooms((prev) => ({ ...prev, ...data.rooms }));
        }
      } catch {
        // ignore
      }
    };

    loadRooms();
  }, []);

  const navigateTo = (route: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = route;
    }
  };

  const getOrgSlugFromPathname = (p: string | null): string | null => {
    if (!p) return null;
    if (!p.startsWith('/w/')) return null;
    const parts = p.split('/').filter(Boolean);
    return parts[1] ? String(parts[1]) : null;
  };

  const getVillaRoute = (roomId: OSRoomId): string => {
    const orgSlug = getOrgSlugFromPathname(pathname);
    if (!orgSlug) return '/';
    const base = `/w/${encodeURIComponent(String(orgSlug))}`;
    if (roomId === 'nexus') return `${base}/nexus`;
    if (roomId === 'system') return `${base}/system`;
    if (roomId === 'social') return `${base}/social`;
    if (roomId === 'finance') return `${base}/finance`;
    if (roomId === 'operations') return `${base}/operations`;
    return `${base}/client`;
  };

  const currentRoom: OSRoomId | null = (() => {
    if (!pathname) return null;
    if (pathname.startsWith('/w/')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts[2] === 'social') return 'social';
      if (parts[2] === 'system') return 'system';
      if (parts[2] === 'finance') return 'finance';
      if (parts[2] === 'client') return 'client';
      if (parts[2] === 'nexus') return 'nexus';
      if (parts[2] === 'operations') return 'operations';
    }
    return null;
  })();

  const visibleRooms = ROOM_META.filter((room) => room.id !== currentRoom);

  return (
    <>
      <div className={`relative ${className}`}>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen((v) => !v)}
          className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/60 backdrop-blur-2xl border border-white/40 text-slate-700 hover:bg-white/80 hover:text-slate-900 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
          aria-label="מעבר בין חדרים"
          title="מעבר בין חדרים"
        >
          <LayoutGrid size={20} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                onClick={() => setIsOpen(false)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -6 }}
                transition={{ duration: 0.2, type: 'spring', stiffness: 350, damping: 30 }}
                className="fixed z-50 bg-white/70 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/60 overflow-hidden"
                style={{
                  top: 90,
                  left: 12,
                  width: 340,
                  maxWidth: 'calc(100vw - 24px)',
                }}
              >
                <div className="p-4 border-b border-white/60 flex items-center justify-between bg-white/40 backdrop-blur-xl">
                  <div>
                    <div className="font-black text-slate-900 text-sm">מעבר בין חדרים</div>
                    <div className="text-xs text-slate-500 mt-0.5">בחר חדר להיכנס אליו</div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    aria-label="סגור"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-5 gap-2">
                    {visibleRooms.map((room) => {
                      const enabled = !!rooms[room.id];
                      return (
                        <button
                          key={room.id}
                          onClick={() => {
                            setIsOpen(false);
                            if (enabled) {
                              navigateTo(getVillaRoute(room.id));
                              return;
                            }
                            setLockedRoom(room.id);
                          }}
                          className={`relative h-14 rounded-2xl flex items-center justify-center transition-all border overflow-hidden ${
                            enabled
                              ? `bg-gradient-to-br ${room.gradient} text-white border-white/20 shadow-[0_10px_25px_-10px_rgba(0,0,0,0.35)]`
                              : 'bg-slate-100/60 text-slate-400 border-white/60'
                          }`}
                          title={room.title}
                        >
                          <span className="relative z-10 flex flex-col items-center justify-center gap-1">
                            <span className="w-7 h-7 rounded-xl bg-white/15 border border-white/15 flex items-center justify-center">
                              <OSModuleIcon moduleKey={room.id} size={16} className="text-white" />
                            </span>
                            <span className="text-[10px] font-black leading-none">{room.title}</span>
                          </span>
                          {!enabled && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-white border border-slate-200 rounded-full flex items-center justify-center">
                              <Lock size={12} className="text-slate-500" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {lockedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setLockedRoom(null)}>
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Lock className="text-slate-600" size={18} />
              </div>
              <div>
                <div className="font-black text-slate-900">החדר הזה עדיין נעול</div>
                <div className="text-xs text-slate-500">רוצה לפתוח אותו בחבילה שלך?</div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                className="flex-1 h-11 rounded-xl bg-slate-900 text-white font-black"
                onClick={() => {
                  setLockedRoom(null);
                  navigateTo('/subscribe/checkout');
                }}
              >
                שדרג עכשיו
              </button>
              <button
                className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-700 font-black"
                onClick={() => setLockedRoom(null)}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
