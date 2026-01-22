'use client';

import React, { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import type { Client } from '@/components/client-portal/types';
import { ClientStatus } from '@/components/client-portal/types';

export function ClientsMap({
  clients,
  onSelectClientAction,
}: {
  clients: Client[];
  onSelectClientAction: (clientId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'PENDING'>('ALL');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return clients.filter((c) => {
      if (status === 'ACTIVE' && c.status !== (ClientStatus as any).ACTIVE) return false;
      if (status === 'PENDING' && c.status === (ClientStatus as any).ACTIVE) return false;

      if (!q) return true;
      return (c.name || '').toLowerCase().includes(q);
    });
  }, [clients, search, status]);

  return (
    <div className="glass-card p-8 rounded-2xl flex flex-col min-h-[400px]">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <h3 className="text-xl font-display font-semibold">מפת הלקוחות</h3>

          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-72">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש לפי שם..."
                className="w-full pr-9 pl-3 py-2.5 bg-white/50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 outline-none focus:border-nexus-primary/30"
              />
            </div>

            <div className="flex-1 sm:flex-none sm:w-44">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full py-2.5 px-3 bg-white/50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 outline-none focus:border-nexus-primary/30"
              >
                <option value="ALL">כל הסטטוסים</option>
                <option value="ACTIVE">פעיל</option>
                <option value="PENDING">בהמתנה</option>
              </select>
            </div>
          </div>
        </div>

        <div className="text-xs text-nexus-muted font-medium">{filtered.length} לקוחות</div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((client) => {
            const isActive = client.status === (ClientStatus as any).ACTIVE;
            const statusLabel = isActive ? 'פעיל' : 'בהמתנה';
            const statusClass = isActive
              ? 'bg-signal-success/10 text-signal-success border-signal-success/20'
              : 'bg-signal-warning/10 text-signal-warning border-signal-warning/20';

            return (
              <button
                key={client.id}
                type="button"
                onClick={() => onSelectClientAction(String(client.id))}
                className="text-right rounded-2xl p-5 bg-white/5 backdrop-blur-md border border-white/10 shadow-sm hover:bg-white/10 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-white/50 border border-gray-200 flex items-center justify-center font-black text-gray-800">
                      {(client as any).logoInitials || client.name?.slice(0, 2) || 'CL'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 truncate">{client.name}</div>
                      <div
                        className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold mt-1 ${statusClass}`}
                      >
                        {statusLabel}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-nexus-primary/30 hover:bg-white/70 transition-all">
                    <span>כניסה ללקוח</span>
                    <ArrowRight size={16} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
