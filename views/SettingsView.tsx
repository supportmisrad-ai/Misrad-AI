
import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { PermissionId } from '../types';
import { Building2, Users, Kanban, Zap, Copy, Archive, Rocket, Lightbulb, Shield, Database, ShoppingBag, ChevronRight, X, FileClock, Building, Compass, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScreenGuard } from '../components/ScreenGuard';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getNexusBasePath, getWorkspaceOrgSlugFromPathname, useNexusSoloMode } from '@/lib/os/nexus-routing';

// Import Tabs
import { OrganizationTab } from '../components/settings/OrganizationTab';
import { AuditTab, DepartmentsTab } from '../components/settings/SystemTabs';
import { RequestsTab } from '../components/settings/RequestsTab';
import { IntegrationsTab } from '../components/settings/IntegrationsTab';
import { TeamTab } from '../components/settings/TeamTab';
import { ProductsTab } from '../components/settings/ProductsTab';
import { TemplatesTab } from '../components/settings/TemplatesTab';
import { WorkflowTab } from '../components/settings/WorkflowTab';
import { RolesTab } from '../components/settings/RolesTab';
import { UpdatesTab } from '../components/settings/UpdatesTab';
import { DataTab } from '../components/settings/SystemTabs';
import { AiDnaTab } from '@/components/settings/AiDnaTab';

export const SettingsView: React.FC = () => {
  const { hasPermission, startTutorial, organization, addToast, currentUser, users } = useData();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = getNexusBasePath(pathname);

  const orgSlug = useMemo(() => getWorkspaceOrgSlugFromPathname(pathname || ''), [pathname]);
  const { isSoloMode } = useNexusSoloMode(orgSlug, Array.isArray(users) ? users.length : null);
  const [canManageBranding, setCanManageBranding] = useState(false);
  const [isLoadingBrandingAccess, setIsLoadingBrandingAccess] = useState(false);

  const isTeamModuleEnabled = Boolean(organization?.enabledModules?.includes('team'));

  // TABS CONFIGURATION with Screen IDs
  const ALL_TABS: { 
      id: string; 
      label: string; 
      short: string; 
      icon: React.ComponentType<{ size?: number; className?: string }>; 
      color: string; 
      desc: string; 
      requiredPermissions: PermissionId[] | null;
      screenId: string; // Corresponding key in SYSTEM_SCREENS
  }[] = [
        { id: 'organization', label: 'פרופיל ארגון', short: 'ארגון', icon: Building, color: 'text-black', desc: 'לוגו ושם העסק', requiredPermissions: ['manage_system'], screenId: 'settings_organization' }, 
        { id: 'audit', label: 'אירועים', short: 'אירועים', icon: FileClock, color: 'text-slate-600', desc: 'אבטחה ובקרה', requiredPermissions: ['manage_system'], screenId: 'settings_audit' },
        { id: 'updates', label: 'עדכונים', short: 'עדכונים', icon: Rocket, color: 'text-indigo-500', desc: 'היסטוריית גרסאות', requiredPermissions: null, screenId: 'settings_updates' }, 
        { id: 'requests', label: 'בקשות ואישורים', short: 'בקשות', icon: Lightbulb, color: 'text-yellow-500', desc: 'הצעות ובאגים', requiredPermissions: null, screenId: 'settings_requests' }, 
        { id: 'integrations', label: 'אינטגרציות', short: 'חיבורים', icon: Zap, color: 'text-blue-600', desc: 'Google & CRM', requiredPermissions: ['manage_system'], screenId: 'settings_integrations' },
        { id: 'team', label: 'צוות', short: 'צוות', icon: Users, color: 'text-purple-600', desc: 'הרשאות', requiredPermissions: ['manage_team'], screenId: 'settings_team' },

        { id: 'products', label: 'מוצרים', short: 'מוצרים', icon: ShoppingBag, color: 'text-pink-600', desc: 'קטלוג', requiredPermissions: ['manage_system', 'view_financials'], screenId: 'settings_products' },
        { id: 'templates', label: 'תבניות ותהליכים', short: 'תהליכים', icon: Copy, color: 'text-green-600', desc: 'אוטומציה ו-Playbooks', requiredPermissions: ['manage_system'], screenId: 'settings_templates' },
        { id: 'workflow', label: 'שלבי עבודה', short: 'שלבים', icon: Kanban, color: 'text-orange-600', desc: 'סטטוסים', requiredPermissions: ['manage_system'], screenId: 'settings_workflow' },
        { id: 'departments', label: 'מחלקות', short: 'מחלקות', icon: Building2, color: 'text-gray-600', desc: 'מבנה', requiredPermissions: ['manage_system'], screenId: 'settings_departments' },
        { id: 'roles', label: 'תפקידים והרשאות', short: 'תפקידים', icon: Shield, color: 'text-gray-600', desc: 'הגדרות', requiredPermissions: ['manage_system'], screenId: 'settings_roles' }, 
        { id: 'data', label: 'גיבוי ושחזור', short: 'גיבוי', icon: Database, color: 'text-slate-600', desc: 'ייצוא וייבוא', requiredPermissions: ['manage_system'], screenId: 'settings_data' },
        { id: 'ai_dna', label: 'DNA עסקי ל-AI', short: 'DNA', icon: Compass, color: 'text-slate-600', desc: 'טון, יתרונות וקהל יעד', requiredPermissions: ['manage_system'], screenId: 'settings_ai_dna' },
  ];

  const requestedTabFromUrl = searchParams?.get('tab') || 'organization';

  useEffect(() => {
      const loadAccess = async () => {
          if (!orgSlug) {
              setCanManageBranding(false);
              return;
          }
          setIsLoadingBrandingAccess(true);
          try {
              const res = await fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/access`, { cache: 'no-store' });
              if (!res.ok) {
                  setCanManageBranding(false);
                  return;
              }
              const data = await res.json().catch(() => null);
              setCanManageBranding(Boolean(data?.access?.canManageBranding));
          } catch {
              setCanManageBranding(false);
          } finally {
              setIsLoadingBrandingAccess(false);
          }
      };

      loadAccess();
  }, [orgSlug]);

  // Close menu when navigating away from settings page
  useEffect(() => {
      if (typeof window === 'undefined') return;
      
      // Strict check: only keep menu open if we're EXACTLY on /settings
      const isSettingsPage = (pathname || '') === `${basePath}/settings`;
      
      // ALWAYS close when NOT on settings page
      if (!isSettingsPage) {
          setIsMobileMenuOpen(false);
      }
  }, [pathname, basePath]);

  // Allow external navigation (e.g. from MobileMenu) to open the mobile settings grid
  useEffect(() => {
      if (typeof window === 'undefined') return;
      const shouldOpenMenu = searchParams?.get('menu') === '1';
      if (!shouldOpenMenu) return;

      setIsMobileMenuOpen(true);

      // Clean up the URL so refresh/back won't keep reopening the menu
      try {
          const params = new URLSearchParams(searchParams?.toString());
          params.delete('menu');
          const qs = params.toString();
          router.replace(`${basePath}/settings${qs ? `?${qs}` : ''}`, { scroll: false });
      } catch {
          router.replace(`${basePath}/settings`, { scroll: false });
      }
  }, [searchParams, router, basePath]);

  // Filter Tabs based on Permissions AND System Flags
  const TABS = ALL_TABS.filter(tab => {
      // 1. Check System Flag
      const flag = organization.systemFlags?.[tab.screenId];
      if (flag === 'hidden') return false;

      if (isSoloMode && (tab.id === 'team' || tab.id === 'departments' || tab.id === 'roles')) {
          return false;
      }

      if (tab.id === 'organization' && !canManageBranding && !isLoadingBrandingAccess) {
          return false;
      }

      if (!isTeamModuleEnabled && (tab.id === 'team' || tab.id === 'departments' || tab.id === 'roles')) {
          return false;
      }

      // 2. Check Permissions
      if (!tab.requiredPermissions) return true;
      return tab.requiredPermissions.some(p => hasPermission(p as PermissionId));
  });

  const activeTab = useMemo(() => {
    return TABS.find(t => t.id === requestedTabFromUrl) ? requestedTabFromUrl : (TABS[0]?.id || 'organization');
  }, [TABS, requestedTabFromUrl]);

  const activeTabDetails = TABS.find(t => t.id === activeTab);

  const BUSINESS_TAB_IDS = useMemo(() => new Set(['organization']), []);
  const businessTabs = useMemo(() => TABS.filter(t => BUSINESS_TAB_IDS.has(t.id)), [TABS, BUSINESS_TAB_IDS]);
  const systemTabs = useMemo(() => TABS.filter(t => !BUSINESS_TAB_IDS.has(t.id)), [TABS, BUSINESS_TAB_IDS]);

  const handleTabChange = (tabId: string) => {
      setIsMobileMenuOpen(false);
      try {
        const params = new URLSearchParams(searchParams?.toString());
        params.set('tab', tabId);
        router.replace(`${basePath}/settings?${params.toString()}`, { scroll: false });
      } catch {
        router.replace(`${basePath}/settings?tab=${encodeURIComponent(tabId)}`, { scroll: false });
      }

      // Close the "all screens" menu from Layout
      const event = new CustomEvent('closeAllScreensMenu');
      window.dispatchEvent(event);
  };

  const renderActiveTab = () => {
      const currentTab = TABS.find(t => t.id === activeTab);
      if (!currentTab) return null;

      // Wrap content in ScreenGuard
      return (
          <ScreenGuard id={currentTab.screenId}>
              {(() => {
                  switch (activeTab) {
                      case 'organization': return <OrganizationTab />;
                      case 'audit': return <AuditTab />;
                      case 'updates': return <UpdatesTab readOnly={true} />;
                      case 'requests': return <RequestsTab />;
                      case 'integrations': return <IntegrationsTab />;
                      case 'team': return <TeamTab />;
                      case 'products': return <ProductsTab />;
                      case 'templates': return <TemplatesTab />;
                      case 'workflow': return <WorkflowTab />;
                      case 'departments': return <DepartmentsTab />;
                      case 'roles': return <RolesTab />;
                      case 'data': return <DataTab />;
                      case 'ai_dna': return <AiDnaTab />;
                      default: return null;
                  }
              })()}
          </ScreenGuard>
      );
  };

  return (
    <div className="flex flex-col lg:flex-row w-full max-w-7xl mx-auto relative lg:h-[calc(100vh-8rem)] lg:overflow-hidden">
      
      {/* Mobile Header and Sidebar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2 bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 w-full shrink-0">
          <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${activeTab === 'organization' ? 'bg-gray-100 text-gray-900' : `${(activeTabDetails?.color || '').replace('text-', 'bg-').replace('600', '100').replace('500', '100')} ${activeTabDetails?.color || ''}`}`}>
                  {activeTabDetails && <activeTabDetails.icon size={18} />}
              </div>
              <span className="font-bold text-gray-900">{activeTabDetails?.label}</span>
          </div>
          <button 
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsMobileMenuOpen(true);
            }}
            onPointerDown={(e) => {
                e.stopPropagation();
            }}
            className="h-10 w-10 inline-flex items-center justify-center bg-white text-gray-600 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-50 active:scale-95 transition-all touch-manipulation relative z-10"
            aria-label="פתח תפריט הגדרות"
            type="button"
          >
              <LayoutGrid size={18} strokeWidth={1.75} />
          </button>
      </div>

      <AnimatePresence>
          {isMobileMenuOpen && (
              <>
                  {/* Backdrop */}
                  <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={(e) => {
                          if (e.target !== e.currentTarget) return;
                          setIsMobileMenuOpen(false);
                      }}
                      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] lg:hidden"
                  />
                  {/* Menu */}
                  <motion.div 
                      initial={{ opacity: 0, y: '100%' }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: '100%' }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="fixed inset-0 z-[100] bg-white flex flex-col lg:hidden pointer-events-auto"
                      onClickCapture={(e) => e.stopPropagation()}
                      onPointerDownCapture={(e) => e.stopPropagation()}
                  >
                      <div className="p-4 flex justify-between items-center border-b border-gray-100 shrink-0">
                          <h2 className="text-lg font-bold text-gray-900">תפריט ניהול</h2>
                          <button 
                              onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setIsMobileMenuOpen(false);
                              }} 
                              className="p-2 bg-gray-50 rounded-full active:bg-gray-200 transition-colors touch-manipulation" 
                              aria-label="סגור תפריט"
                          >
                              <X size={24} />
                          </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 pb-8 space-y-5">
                          <div className="pb-5 border-b border-gray-200">
                              <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider text-right mb-3">הגדרות העסק</div>
                              <div className="grid grid-cols-2 gap-4">
                                  {businessTabs.map(tab => (
                                      <button
                                          key={tab.id}
                                          onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handleTabChange(tab.id);
                                          }}
                                          className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all touch-manipulation active:scale-95 ${
                                              activeTab === tab.id ? 'bg-black text-white border-gray-200 shadow-lg' : 'bg-gray-50 text-gray-600 border-gray-100 active:bg-white active:border-gray-300'
                                          }`}
                                      >
                                          <tab.icon size={24} className={`mb-2 ${activeTab === tab.id ? 'text-white' : tab.color}`} />
                                          <span className="text-sm font-bold">{tab.short}</span>
                                      </button>
                                  ))}
                              </div>
                          </div>

                          <div>
                              <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider text-right mb-3">הגדרות המערכת</div>
                              <div className="grid grid-cols-2 gap-4">
                                  {systemTabs.map(tab => (
                                      <button
                                          key={tab.id}
                                          onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handleTabChange(tab.id);
                                          }}
                                          className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all touch-manipulation active:scale-95 ${
                                              activeTab === tab.id ? 'bg-black text-white border-gray-200 shadow-lg' : 'bg-gray-50 text-gray-600 border-gray-100 active:bg-white active:border-gray-300'
                                          }`}
                                      >
                                          <tab.icon size={24} className={`mb-2 ${activeTab === tab.id ? 'text-white' : tab.color}`} />
                                          <span className="text-sm font-bold">{tab.short}</span>
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </motion.div>
              </>
          )}
      </AnimatePresence>

      <div className="hidden lg:flex flex-col w-72 h-full border-l border-gray-200 bg-white/50 backdrop-blur-xl shrink-0">
          <div className="pt-6 pb-4 px-6 border-b border-gray-100 shrink-0">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">מרכז שליטה</h1>
            <p className="text-gray-500 text-sm mt-1">הגדרות וניהול מערכת</p>
          </div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 p-2 pt-0">
            <div>
                <div className="px-3 pt-3 pb-2 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">הגדרות העסק</div>
                <div className="space-y-2 pb-4 border-b border-gray-200">
                    {businessTabs.map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`
                                w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all relative overflow-hidden group text-right border
                                ${activeTab === tab.id 
                                ? 'bg-black text-white shadow-lg border-gray-200 scale-[1.02]' 
                                : 'bg-white border-gray-100 text-gray-500 hover:bg-white hover:border-gray-300 hover:text-gray-900 shadow-sm'}
                            `}
                        >
                            <div className={`p-2 rounded-lg ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-50 group-hover:bg-gray-100'} transition-colors shrink-0`}>
                                <tab.icon size={18} className={activeTab === tab.id ? 'text-white' : tab.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-sm">{tab.label}</div>
                            </div>
                            {activeTab === tab.id && <ChevronRight size={16} className="text-white" />}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <div className="px-3 pt-2 pb-2 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">הגדרות המערכת</div>
                <div className="space-y-2">
                    {systemTabs.map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`
                                w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all relative overflow-hidden group text-right border
                                ${activeTab === tab.id 
                                ? 'bg-black text-white shadow-lg border-gray-200 scale-[1.02]' 
                                : 'bg-white border-gray-100 text-gray-500 hover:bg-white hover:border-gray-300 hover:text-gray-900 shadow-sm'}
                            `}
                        >
                            <div className={`p-2 rounded-lg ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-50 group-hover:bg-gray-100'} transition-colors shrink-0`}>
                                <tab.icon size={18} className={activeTab === tab.id ? 'text-white' : tab.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-sm">{tab.label}</div>
                            </div>
                            {activeTab === tab.id && <ChevronRight size={16} className="text-white" />}
                        </button>
                    ))}
                </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200/50 bg-gray-50/50">
                <button 
                    onClick={startTutorial}
                    className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 font-bold py-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm transition-all text-xs"
                >
                    <Compass size={16} /> הפעל הדרכת היכרות
                </button>
          </div>
      </div>

      <div className="flex-1 lg:h-full lg:overflow-y-auto overflow-visible p-4 md:p-8 bg-transparent scroll-smooth no-scrollbar pb-28 lg:pb-0" id="settings-scroll-container">
          <AnimatePresence mode="wait">
            {renderActiveTab()}
          </AnimatePresence>
      </div>
    </div>
  );
};
