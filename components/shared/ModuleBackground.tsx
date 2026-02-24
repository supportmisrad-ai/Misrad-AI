import React from 'react';

/**
 * Decorative animated background blobs for each module.
 * Renders 3 soft, blurred circles that float with the `animate-blob` keyframe.
 * Colors are derived from each module's palette so the effect feels native.
 *
 * Usage: place as a direct child of the module's outermost wrapper (position: relative).
 * The component is `fixed inset-0` with `pointer-events-none` so it never blocks interaction.
 */

type ModuleKey = 'nexus' | 'system' | 'social' | 'finance' | 'client' | 'operations';

interface BlobColors {
  a: string;
  b: string;
  c: string;
}

const MODULE_BLOB_COLORS: Record<ModuleKey, BlobColors> = {
  nexus: {
    a: 'bg-purple-200/40',
    b: 'bg-blue-200/40',
    c: 'bg-pink-200/40',
  },
  system: {
    a: 'bg-rose-200/40',
    b: 'bg-red-100/40',
    c: 'bg-pink-200/40',
  },
  social: {
    a: 'bg-violet-200/40',
    b: 'bg-purple-200/40',
    c: 'bg-fuchsia-200/40',
  },
  finance: {
    a: 'bg-emerald-200/40',
    b: 'bg-teal-200/40',
    c: 'bg-green-200/40',
  },
  client: {
    a: 'bg-amber-200/40',
    b: 'bg-yellow-100/40',
    c: 'bg-orange-200/40',
  },
  operations: {
    a: 'bg-sky-200/40',
    b: 'bg-cyan-200/40',
    c: 'bg-blue-200/40',
  },
};

export function ModuleBackground({ moduleKey }: { moduleKey: string }) {
  const colors = MODULE_BLOB_COLORS[moduleKey as ModuleKey] ?? MODULE_BLOB_COLORS.nexus;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 hidden md:block" aria-hidden="true">
      <div
        className={`absolute top-[-10%] right-[-5%] w-[320px] h-[320px] ${colors.a} rounded-full blur-[120px] opacity-40 gpu-blur`}
      />
      <div
        className={`absolute top-[5%] left-[-10%] w-[260px] h-[260px] ${colors.b} rounded-full blur-[120px] opacity-30 gpu-blur`}
      />
      <div
        className={`absolute bottom-[-10%] left-[20%] w-[300px] h-[300px] ${colors.c} rounded-full blur-[120px] opacity-30 gpu-blur`}
      />
    </div>
  );
}
