'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type AccountShellUser = {
  name: string;
  email?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
};

export type AccountShellSection = {
  id: string;
  label: string;
  icon?: LucideIcon;
  groupLabel?: string | null;
  content: React.ReactNode;
};

export default function AccountShell({
  title = 'החשבון שלי',
  subtitle,
  user,
  activeSectionId,
  onSectionChangeAction,
  sections,
  headerActions,
}: {
  title?: string;
  subtitle?: string;
  user: AccountShellUser;
  activeSectionId: string;
  onSectionChangeAction: (id: string) => void;
  sections: AccountShellSection[];
  headerActions?: React.ReactNode;
}) {
  const active = sections.find((s) => s.id === activeSectionId) || sections[0];

  return (
    <div className="max-w-5xl mx-auto w-full pb-16 md:pb-20 px-4 md:px-0">
      <div className="bg-white rounded-[2.5rem] border border-gray-200/60 shadow-xl shadow-gray-200/40 overflow-hidden">
        <div className="h-40 md:h-48 w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none" />
        </div>

        <div className="px-6 md:px-10 pb-8">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 -mt-10 md:-mt-12 relative">
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-[1.5rem] border-[4px] border-white shadow-2xl bg-white overflow-hidden">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700 font-black text-2xl bg-slate-50">
                    {(user.name || 'U').charAt(0)}
                  </div>
                )}
              </div>

              <div className="pb-2">
                <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight" suppressHydrationWarning>
                  {user.name}
                </div>
                <div className="text-xs md:text-sm text-slate-500 font-medium" suppressHydrationWarning>
                  {subtitle || user.email || ''}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              {headerActions}
            </div>
          </div>

          <div className="mt-8 flex flex-col lg:flex-row gap-8">
            <div className="w-full lg:w-80 shrink-0">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</div>
                </div>
                <div className="p-2 space-y-1">
                  {(() => {
                    const items: React.ReactNode[] = [];
                    let lastGroup: string | null | undefined = null;

                    sections.forEach((s) => {
                      const group = s.groupLabel ?? null;
                      if (group && group !== lastGroup) {
                        items.push(
                          <div key={`group-${group}`} className="px-4 pt-3 pb-1 text-[11px] font-black text-slate-500">
                            {group}
                          </div>
                        );
                        lastGroup = group;
                      } else if (!group) {
                        lastGroup = null;
                      }

                      const Icon = s.icon;
                      const isActive = s.id === active?.id;
                      items.push(
                        <button
                          key={s.id}
                          onClick={() => onSectionChangeAction(s.id)}
                          type="button"
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-right group ${
                            isActive
                              ? 'bg-rose-50 text-slate-900 shadow-sm ring-1 ring-rose-100'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`p-2 rounded-lg transition-colors ${
                              isActive
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm'
                            }`}
                          >
                            {Icon ? <Icon size={18} /> : null}
                          </div>
                          <div className="font-bold text-sm">{s.label}</div>
                        </button>
                      );
                    });

                    return items;
                  })()}
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="text-lg md:text-xl font-bold text-slate-900">{active?.label}</h2>
                </div>
                <div className="p-6 md:p-8">{active?.content}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
