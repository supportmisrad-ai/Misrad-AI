'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { SettingsSubView } from '@/contexts/AppContext';

type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

export type SocialUIContextValue = {
  settingsSubView: SettingsSubView;
  setSettingsSubView: (view: SettingsSubView) => void;

  isSidebarOpen: boolean;
  setIsSidebarOpen: (value: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (value: boolean) => void;
  isNotificationCenterOpen: boolean;
  setIsNotificationCenterOpen: (value: boolean) => void;
  isTourActive: boolean;
  setIsTourActive: (value: boolean) => void;
  isHelpModalOpen: boolean;
  setIsHelpModalOpen: (value: boolean) => void;

  isClientMode: boolean;
  setIsClientMode: (value: boolean) => void;
  isOnboardingMode: boolean;
  setIsOnboardingMode: (value: boolean) => void;
  isTeamManagementEnabled: boolean;
  setIsTeamManagementEnabled: (value: boolean) => void;

  isAddClientModalOpen: boolean;
  setIsAddClientModalOpen: (value: boolean) => void;
  isInviteModalOpen: boolean;
  setIsInviteModalOpen: (value: boolean) => void;
  isCampaignWizardOpen: boolean;
  setIsCampaignWizardOpen: (value: boolean) => void;
  isReportModalOpen: boolean;
  setIsReportModalOpen: (value: boolean) => void;
  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (value: boolean) => void;
  isTaskModalOpen: boolean;
  setIsTaskModalOpen: (value: boolean) => void;

  toasts: Toast[];
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
};

const SocialUIContext = createContext<SocialUIContextValue | undefined>(undefined);

export function SocialUIProvider({ children }: { children: React.ReactNode }) {
  const app = useApp();

  const value = useMemo<SocialUIContextValue>(
    () => ({
      settingsSubView: app.settingsSubView,
      setSettingsSubView: app.setSettingsSubView,

      isSidebarOpen: app.isSidebarOpen,
      setIsSidebarOpen: app.setIsSidebarOpen,
      isCommandPaletteOpen: app.isCommandPaletteOpen,
      setIsCommandPaletteOpen: app.setIsCommandPaletteOpen,
      isNotificationCenterOpen: app.isNotificationCenterOpen,
      setIsNotificationCenterOpen: app.setIsNotificationCenterOpen,
      isTourActive: app.isTourActive,
      setIsTourActive: app.setIsTourActive,
      isHelpModalOpen: app.isHelpModalOpen,
      setIsHelpModalOpen: app.setIsHelpModalOpen,

      isClientMode: app.isClientMode,
      setIsClientMode: app.setIsClientMode,
      isOnboardingMode: app.isOnboardingMode,
      setIsOnboardingMode: app.setIsOnboardingMode,
      isTeamManagementEnabled: app.isTeamManagementEnabled,
      setIsTeamManagementEnabled: app.setIsTeamManagementEnabled,

      isAddClientModalOpen: app.isAddClientModalOpen,
      setIsAddClientModalOpen: app.setIsAddClientModalOpen,
      isInviteModalOpen: app.isInviteModalOpen,
      setIsInviteModalOpen: app.setIsInviteModalOpen,
      isCampaignWizardOpen: app.isCampaignWizardOpen,
      setIsCampaignWizardOpen: app.setIsCampaignWizardOpen,
      isReportModalOpen: app.isReportModalOpen,
      setIsReportModalOpen: app.setIsReportModalOpen,
      isPaymentModalOpen: app.isPaymentModalOpen,
      setIsPaymentModalOpen: app.setIsPaymentModalOpen,
      isTaskModalOpen: app.isTaskModalOpen,
      setIsTaskModalOpen: app.setIsTaskModalOpen,

      toasts: app.toasts as any,
      setToasts: app.setToasts as any,
      addToast: app.addToast,
    }),
    [
      app.addToast,
      app.isAddClientModalOpen,
      app.isCampaignWizardOpen,
      app.isClientMode,
      app.isCommandPaletteOpen,
      app.isHelpModalOpen,
      app.isInviteModalOpen,
      app.isNotificationCenterOpen,
      app.isOnboardingMode,
      app.isPaymentModalOpen,
      app.isReportModalOpen,
      app.isSidebarOpen,
      app.isTaskModalOpen,
      app.isTeamManagementEnabled,
      app.isTourActive,
      app.setIsAddClientModalOpen,
      app.setIsCampaignWizardOpen,
      app.setIsClientMode,
      app.setIsCommandPaletteOpen,
      app.setIsHelpModalOpen,
      app.setIsInviteModalOpen,
      app.setIsNotificationCenterOpen,
      app.setIsOnboardingMode,
      app.setIsPaymentModalOpen,
      app.setIsReportModalOpen,
      app.setIsSidebarOpen,
      app.setIsTaskModalOpen,
      app.setIsTeamManagementEnabled,
      app.setIsTourActive,
      app.setSettingsSubView,
      app.settingsSubView,
      app.toasts,
      app.setToasts,
    ]
  );

  return <SocialUIContext.Provider value={value}>{children}</SocialUIContext.Provider>;
}

export function useSocialUI() {
  const ctx = useContext(SocialUIContext);
  if (!ctx) throw new Error('useSocialUI must be used within SocialUIProvider');
  return ctx;
}
