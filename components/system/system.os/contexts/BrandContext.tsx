
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface BrandContextType {
  brandName: string;
  brandLogo: string | null;
  setBrandName: (name: string) => void;
  setBrandLogo: (logo: string | null) => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [brandName, setBrandName] = useState('system.OS');
  const [brandLogo, setBrandLogo] = useState<string | null>(null);

  const isProbablyTokenOrId = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return true;
    if (trimmed.length > 40) return true;
    if (/^[A-Za-z0-9_-]{25,}$/.test(trimmed)) return true;
    if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed)) return true;
    return false;
  };

  useEffect(() => {
    const storedName = localStorage.getItem('nexus_brand_name');
    const storedLogo = localStorage.getItem('nexus_brand_logo');
    if (storedName && !isProbablyTokenOrId(storedName)) setBrandName(storedName);
    if (storedLogo) setBrandLogo(storedLogo);
  }, []);

  const updateBrandName = (name: string) => {
    setBrandName(name);
    if (!isProbablyTokenOrId(name)) {
      localStorage.setItem('nexus_brand_name', name);
    }
  };

  const updateBrandLogo = (logo: string | null) => {
    setBrandLogo(logo);
    if (logo) localStorage.setItem('nexus_brand_logo', logo);
    else localStorage.removeItem('nexus_brand_logo');
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