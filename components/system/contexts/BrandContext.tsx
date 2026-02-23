'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { safeBrowserUrl } from '@/lib/shared/safe-browser-url';

interface BrandContextType {
  brandName: string;
  brandLogo: string | null;
  setBrandName: (name: string) => void;
  setBrandLogo: (logo: string | null) => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{
  children: ReactNode;
  initialBrandName?: string;
  initialBrandLogo?: string | null;
}> = ({ children, initialBrandName, initialBrandLogo }) => {
  const [brandName, setBrandName] = useState(initialBrandName || 'System');
  const [brandLogo, setBrandLogo] = useState<string | null>(
    typeof initialBrandLogo === 'string' ? safeBrowserUrl(initialBrandLogo) : null
  );

  const isProbablyTokenOrId = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return true;
    if (trimmed.length > 40) return true;
    if (/^[A-Za-z0-9_-]{25,}$/.test(trimmed)) return true;
    if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed)) return true;
    return false;
  };

  useEffect(() => {
    if (initialBrandName && isProbablyTokenOrId(initialBrandName)) {
      setBrandName('System');
    }
  }, [initialBrandName]);

  const updateBrandName = (name: string) => {
    setBrandName(name);
  };

  const updateBrandLogo = (logo: string | null) => {
    setBrandLogo(safeBrowserUrl(logo));
  };

  return (
    <BrandContext.Provider value={{ brandName, brandLogo, setBrandName: updateBrandName, setBrandLogo: updateBrandLogo }}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
};

