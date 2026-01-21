'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OSModule, OSModuleInfo, getOSModule } from '../types/os-modules';
import { useAuth } from '@clerk/nextjs';
import { getUserPurchasedModules } from '../lib/user-subscription';

interface OSModuleContextType {
  currentModule: OSModule | null;
  setCurrentModule: (module: OSModule | null) => void;
  purchasedModules: OSModuleInfo[];
  getModuleInfo: (module: OSModule) => OSModuleInfo | undefined;
}

const OSModuleContext = createContext<OSModuleContextType | undefined>(undefined);

export const useOSModule = () => {
  const context = useContext(OSModuleContext);
  if (!context) {
    throw new Error('useOSModule must be used within OSModuleProvider');
  }
  return context;
};

interface OSModuleProviderProps {
  children: ReactNode;
  initialModule?: OSModule;
}

export const OSModuleProvider: React.FC<OSModuleProviderProps> = ({ 
  children, 
  initialModule 
}) => {
  const { userId, isLoaded: isClerkLoaded } = useAuth();
  const [currentModule, setCurrentModule] = useState<OSModule | null>(initialModule || null);
  const [isMounted, setIsMounted] = useState(false);
  const [purchasedModules, setPurchasedModules] = useState<OSModuleInfo[]>([]);

  // Load purchased modules from API/DB
  useEffect(() => {
    if (isClerkLoaded && userId) {
      getUserPurchasedModules(userId).then(modules => {
        const modulesInfo = modules
          .map(id => getOSModule(id))
          .filter((m): m is OSModuleInfo => m !== undefined && m.purchased);
        setPurchasedModules(modulesInfo);
      }).catch(error => {
        console.error('Error loading purchased modules:', error);
        // Fallback: show all purchased modules from OS_MODULES
        const allPurchased = [
          getOSModule('system'),
          getOSModule('nexus'),
          getOSModule('social'),
          getOSModule('finance'),
          getOSModule('client'),
          getOSModule('operations')
        ].filter((m): m is OSModuleInfo => m !== undefined && m.purchased);
        setPurchasedModules(allPurchased);
      });
    } else if (isClerkLoaded && !userId) {
      // No user - show all purchased modules from OS_MODULES (for demo)
      const allPurchased = [
        getOSModule('system'),
        getOSModule('nexus'),
        getOSModule('social'),
        getOSModule('finance'),
        getOSModule('client'),
        getOSModule('operations')
      ].filter((m): m is OSModuleInfo => m !== undefined && m.purchased);
      setPurchasedModules(allPurchased);
    }
  }, [isClerkLoaded, userId]);

  // Load from sessionStorage on mount (client-side only)
  useEffect(() => {
    setIsMounted(true);
    if (initialModule) {
      return;
    }
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('current_os_module');
      if (saved && purchasedModules.some(m => m.id === saved)) {
        setCurrentModule(saved as OSModule);
      } else if (purchasedModules.length > 0) {
        // Default to first purchased module
        setCurrentModule(purchasedModules[0].id);
      }
    }
  }, [initialModule, purchasedModules]);

  // Save to sessionStorage when module changes
  useEffect(() => {
    if (!isMounted) return;
    if (typeof window !== 'undefined') {
      if (currentModule && purchasedModules.some(m => m.id === currentModule)) {
        sessionStorage.setItem('current_os_module', currentModule);
      } else {
        sessionStorage.removeItem('current_os_module');
      }
    }
  }, [currentModule, isMounted, purchasedModules]);

  const getModuleInfo = (module: OSModule): OSModuleInfo | undefined => {
    return getOSModule(module);
  };

  const value: OSModuleContextType = {
    currentModule,
    setCurrentModule,
    purchasedModules,
    getModuleInfo
  };

  return (
    <OSModuleContext.Provider value={value}>
      {children}
    </OSModuleContext.Provider>
  );
};

