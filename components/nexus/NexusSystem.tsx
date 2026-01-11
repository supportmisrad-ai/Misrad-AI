'use client';

import React from 'react';
import { DataProvider } from '../../context/DataContext';
import { getModuleDefinition } from '../../lib/os/modules/registry';
import { Layout } from '../Layout';
import { ScreenGuard } from '../ScreenGuard';
import { DashboardView } from '../../views/DashboardView';

export function NexusSystem() {
  const def = getModuleDefinition('nexus');

  const style = {
    '--os-accent': def.theme.accent,
    '--os-bg': def.theme.background,
  } as React.CSSProperties;

  return (
    <div style={style} data-module={def.key} className="min-h-screen bg-[var(--os-bg)] text-slate-900" dir="rtl">
      <DataProvider>
        <Layout>
          <ScreenGuard id="dashboard">
            <DashboardView />
          </ScreenGuard>
        </Layout>
      </DataProvider>
    </div>
  );
}
