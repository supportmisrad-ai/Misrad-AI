'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { OS_MODULES, type OSModule } from '@/types/os-modules';
import { useOSModule } from '@/contexts/OSModuleContext';
import { OSModuleIcon } from '@/components/shared/OSModuleIcon';

interface OSNavigationButtonsProps {
  currentModule?: OSModule;
  className?: string;
  compact?: boolean;
}

/**
 * Navigation buttons for switching between OS modules
 * Designed to be placed at the bottom of Sidebar
 * Small, elegant buttons like in Nexus module
 */
export const OSNavigationButtons: React.FC<OSNavigationButtonsProps> = ({
  currentModule,
  className = '',
  compact = false
}) => {
  const { purchasedModules } = useOSModule();

  const shouldOpenInNewTab = (): boolean => {
    if (typeof window === 'undefined') return false;
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      (window.navigator as any)?.standalone ||
      Boolean((window as any)?.Capacitor?.isNativePlatform?.());
    return !isStandalone;
  };

  const resolveVillaRoute = (route: string): string => {
    if (!route.includes('[orgSlug]')) return route;
    if (typeof window === 'undefined') return '/';
    const pathname = window.location.pathname || '';
    if (!pathname.startsWith('/w/')) return '/';
    const parts = pathname.split('/').filter(Boolean);
    const orgSlug = parts[1] ? String(parts[1]) : '';
    if (!orgSlug) return '/';
    return route.replace('[orgSlug]', encodeURIComponent(orgSlug));
  };

  const handleModuleClick = (moduleId: OSModule) => {
    const module = OS_MODULES.find(m => m.id === moduleId);
    if (module && typeof window !== 'undefined') {
      const href = resolveVillaRoute(module.route);
      if (shouldOpenInNewTab()) {
        window.open(href, '_blank', 'noopener,noreferrer');
        return;
      }
      window.location.href = href;
    }
  };

  // Filter to show only purchased modules AND exclude current module
  const availableModules = OS_MODULES.filter(m => 
    purchasedModules.some(pm => pm.id === m.id) && m.id !== currentModule
  );

  if (compact) {
    return (
      <div className={`flex flex-wrap gap-1.5 ${className}`}>
        {availableModules.map((module) => {
          const isCurrent = currentModule === module.id;
          return (
            <motion.button
              key={module.id}
              onClick={() => handleModuleClick(module.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                w-9 h-9 rounded-lg flex items-center justify-center transition-all
                ${isCurrent 
                  ? `bg-gradient-to-br ${module.gradient} text-white shadow-lg shadow-${module.color.split('-')[1]}-500/30` 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                }
              `}
              title={module.nameHebrew}
            >
              <OSModuleIcon moduleKey={module.id} size={16} strokeWidth={isCurrent ? 2.5 : 2} />
            </motion.button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="px-2 py-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
          מעבר בין מערכות
        </p>
      </div>
      {availableModules.map((module, index) => {
        const isCurrent = currentModule === module.id;
        return (
          <motion.button
            key={module.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleModuleClick(module.id)}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative
              ${isCurrent 
                ? `bg-gradient-to-r ${module.gradient} text-white shadow-lg` 
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'
              }
            `}
            title={module.description}
          >
            {/* Current indicator dot */}
            {isCurrent && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-2 top-2 w-2 h-2 bg-white rounded-full"
              />
            )}
            
            {/* Icon */}
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all
              ${isCurrent 
                ? 'bg-white/20' 
                : `bg-gradient-to-br ${module.gradient} text-white shadow-sm`
              }
            `}>
              <OSModuleIcon moduleKey={module.id} size={20} strokeWidth={isCurrent ? 2.5 : 2} className={isCurrent ? 'text-white' : 'text-white'} />
            </div>
            
            {/* Text */}
            <div className="flex-1 text-right min-w-0">
              <div className={`
                text-sm font-bold
                ${isCurrent ? 'text-white' : 'text-slate-900'}
              `}>
                {module.nameHebrew}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

export default OSNavigationButtons;

