'use client';

import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Shield, LayoutGrid, Lock, BrainCircuit, Rocket, Database, LogOut, UserCheck, Code, Link2, Package, LifeBuoy, Sparkles, Globe, ExternalLink, Video, Image as ImageIcon, Building2, Moon, Server, Zap, Users, FileText, ChevronRight, UserPlus, Search, Filter, MessageSquare, ShieldCheck } from 'lucide-react';
import { Tenant, GeneratedReport, ModuleId, SystemScreenStatus, Product } from '../types';
import { UpdatesTab } from '../components/settings/UpdatesTab';
import { DataTab } from '../components/settings/SystemTabs';
import { useNexusNavigation } from '@/lib/os/nexus-routing';
import { useSearchParams } from 'next/navigation';

// New Components
import { TenantsPanel } from '../components/saas/TenantsPanel';
import { SystemControlPanel } from '../components/saas/SystemControlPanel';
import { NexusControlPanel } from '../components/saas/NexusControlPanel';
import { SystemOSControlPanel } from '../components/saas/SystemOSControlPanel';
import { IntelligencePanel } from '../components/saas/IntelligencePanel';
import { AddTenantModal } from '../components/saas/AddTenantModal';
import { ModuleManagementModal } from '../components/saas/ModuleManagementModal';
import { ReportDetailModal } from '../components/saas/ReportDetailModal';
import { UserApprovalsPanel } from '../components/saas/UserApprovalsPanel';
import { GlobalUsersPanel } from '../components/saas/GlobalUsersPanel';
import { VersionManagementPanel } from '../components/saas/VersionManagementPanel';
import { InvitationLinksPanel } from '../components/saas/InvitationLinksPanel';
import { ComprehensivePricingPanel } from '../components/saas/ComprehensivePricingPanel';
import { SupportTicketsPanel } from '../components/saas/SupportTicketsPanel';
import { FeatureRequestsPanel } from '../components/saas/FeatureRequestsPanel';
import { LandingPageVideosPanel } from '../components/saas/LandingPageVideosPanel';
import { LandingPageLogoPanel } from '../components/saas/LandingPageLogoPanel';
import { PartnersLogosPanel } from '../components/saas/PartnersLogosPanel';
import { FounderImagePanel } from '../components/saas/FounderImagePanel';
import { AnnouncementsPanel } from '../components/saas/AnnouncementsPanel';
import { LandingPaymentLinksPanel } from '../components/saas/LandingPaymentLinksPanel';
import { getWorkspaceOrgIdFromPathname } from '@/lib/os/nexus-routing';

type SystemType = 'global' | 'nexus' | 'system' | 'client' | 'landing' | 'social' | null;
type GlobalTab = 'control' | 'versions' | 'data' | 'updates' | 'approvals' | 'users' | 'announcements';
type NexusTab = 'control' | 'tenants' | 'intelligence' | 'invitations' | 'announcements';
type SystemOSTab = 'control' | 'announcements';
type ClientTab = 'support' | 'features' | 'announcements';
type LandingTab = 'pricing' | 'payment_links' | 'videos' | 'logo' | 'partners' | 'founder' | 'announcements';

export const SaaSAdminView: React.FC = () => {
    const { tenants, addTenant, updateTenant, deleteTenant, products, feedbacks, systemReports, markReportRead, addToast, switchToTenantConfig, organization, updateSystemFlag, userApprovalRequests, approveUserRequest, rejectUserRequest, addAllowedEmail, removeAllowedEmail, currentUser, availableVersions, updateTenantVersion } = useData();
    const [selectedSystem, setSelectedSystem] = useState<SystemType>(null);
    const [globalTab, setGlobalTab] = useState<GlobalTab>('control');
    const [nexusTab, setNexusTab] = useState<NexusTab>('tenants');
    const [systemOSTab, setSystemOSTab] = useState<SystemOSTab>('control');
    const [clientTab, setClientTab] = useState<ClientTab>('support');
    const [landingTab, setLandingTab] = useState<LandingTab>('pricing');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoadingTenants, setIsLoadingTenants] = useState(false);
    
    // Modal States
    const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
    const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null);
    
    const { navigate } = useNexusNavigation();
    const searchParams = useSearchParams();

    const getReturnToPath = () => {
        try {
            const param = searchParams?.get('returnTo');
            if (param && param.startsWith('/')) return param;
        } catch {
            // ignore
        }
        try {
            const stored = sessionStorage.getItem('saas_admin_return_to');
            if (stored && stored.startsWith('/')) return stored;
        } catch {
            // ignore
        }
        return '/';
    };
    
    // Load tenants from API on mount
    useEffect(() => {
        const loadTenants = async () => {
            if (!currentUser?.isSuperAdmin) return; // Only super admins can see tenants
            
            setIsLoadingTenants(true);
            try {
                const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
                const response = await fetch('/api/tenants', {
                    headers: orgId ? { 'x-org-id': orgId } : undefined
                });
                if (!response.ok) {
                    if (response.status === 401) {
                        addToast('אינך מורשה לראות tenants', 'error');
                        return;
                    }
                    throw new Error('Failed to load tenants');
                }
                const data = await response.json();
                const loadedTenants = data.tenants || [];
                
                // Update local state with loaded tenants
                // Add tenants that don't exist yet
                loadedTenants.forEach((tenant: Tenant) => {
                    const existing = tenants.find((t: Tenant) => t.id === tenant.id);
                    if (!existing) {
                        addTenant(tenant);
                    }
                });
            } catch (error: any) {
                console.error('[SaaSAdmin] Error loading tenants:', error);
                addToast(error.message || 'שגיאה בטעינת tenants', 'error');
            } finally {
                setIsLoadingTenants(false);
            }
        };
        
        if (currentUser?.isSuperAdmin) {
            loadTenants();
        }
    }, [currentUser?.isSuperAdmin, currentUser?.id]); // Load when super admin status is known
    
    // Stats
    const totalMRR = tenants.filter((t: Tenant) => t.status === 'Active').reduce((acc: number, t: Tenant) => acc + t.mrr, 0);
    const activeTenants = tenants.filter((t: Tenant) => t.status === 'Active').length;
    const trialTenants = tenants.filter((t: Tenant) => t.status === 'Trial').length;
    const totalUsers = tenants.reduce((acc: number, t: Tenant) => acc + t.usersCount, 0);

    const filteredTenants = tenants.filter((t: Tenant) => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddTenant = async (tenantData: Omit<Tenant, 'id' | 'joinedAt' | 'logo' | 'modules' | 'status' | 'usersCount' | 'mrr'> & { modules?: ModuleId[] }, mrr: number) => {
        setIsAddTenantOpen(false);
        addToast(`מקים סביבת עבודה ב-${tenantData.region}...`, 'info');

        try {
            // Get modules from plan if not provided, or use default
            let tenantModules: ModuleId[] = tenantData.modules || ['crm', 'team'];
            if (!tenantData.modules) {
                const selectedProduct = products.find((p: Product) => p.name === tenantData.plan);
                if (selectedProduct?.modules) {
                    tenantModules = selectedProduct.modules;
                }
            }

            // Import useSecureAPI dynamically (since this is a component, we need to use it differently)
            // For now, we'll call the API directly
            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch('/api/tenants', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(orgId ? { 'x-org-id': orgId } : {}),
                },
                body: JSON.stringify({
                    ...tenantData,
                    mrr,
                    status: 'Provisioning',
                    modules: tenantModules,
                    logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(tenantData.name)}&background=6366f1&color=fff`
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'שגיאה ביצירת tenant');
            }

            const data = await response.json();
            const newTenant = data.tenant;

            // Add to local state
            addTenant(newTenant);
            addToast(`הלקוח ${tenantData.name} הוקם בהצלחה!`, 'success');

            // Simulate provisioning delay (optional - can be removed if not needed)
            setTimeout(async () => {
                try {
                    await handleUpdateTenant(newTenant.id, { status: 'Active' });
                } catch (error) {
                    // Error already handled in handleUpdateTenant
                }
            }, 3500);

        } catch (error: any) {
            console.error('[SaaSAdmin] Error creating tenant:', error);
            addToast(error.message || 'שגיאה ביצירת tenant', 'error');
            setIsAddTenantOpen(true); // Reopen modal on error
        }
    };

    const handleUpdateTenant = async (id: string, updates: Partial<Tenant>) => {
        try {
            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/tenants/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(orgId ? { 'x-org-id': orgId } : {}),
                },
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'שגיאה בעדכון tenant');
            }

            const data = await response.json();
            const updatedTenant = data.tenant;

            // Update local state only if API call succeeded
            updateTenant(id, updatedTenant);
            addToast('Tenant עודכן בהצלחה!', 'success');
        } catch (error: any) {
            console.error('[SaaSAdmin] Error updating tenant:', error);
            addToast(error.message || 'שגיאה בעדכון tenant', 'error');
            throw error; // Re-throw to allow caller to handle
        }
    };

    const toggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'Active' ? 'Churned' : 'Active';
        try {
            await handleUpdateTenant(id, { status: newStatus as any });
        } catch (error) {
            // Error already handled in handleUpdateTenant
        }
    };

    const handleDeleteTenant = async (id: string) => {
        const tenant = tenants.find((t: Tenant) => t.id === id);
        const tenantName = tenant?.name || 'Tenant';
        
        // Confirm deletion
        if (!confirm(`האם אתה בטוח שברצונך למחוק את ${tenantName}? פעולה זו אינה הפיכה.`)) {
            return;
        }

        try {
            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/tenants/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(orgId ? { 'x-org-id': orgId } : {}),
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'שגיאה במחיקת tenant');
            }

            const data = await response.json();

            // Remove from local state only if API call succeeded
            deleteTenant(id);
            addToast(`Tenant ${tenantName} נמחק בהצלחה!`, 'success');
        } catch (error: any) {
            console.error('[SaaSAdmin] Error deleting tenant:', error);
            addToast(error.message || 'שגיאה במחיקת tenant', 'error');
        }
    };

    const handleEditModules = (tenant: Tenant) => {
        setEditingTenant(tenant);
        setIsModuleModalOpen(true);
    };

    const toggleTenantModule = (moduleId: ModuleId) => {
        if (!editingTenant) return;
        const currentModules = editingTenant.modules || [];
        let newModules: ModuleId[];
        
        if (currentModules.includes(moduleId)) {
            newModules = currentModules.filter(m => m !== moduleId);
        } else {
            newModules = [...currentModules, moduleId];
        }
        
        updateTenant(editingTenant.id, { modules: newModules });
        setEditingTenant({ ...editingTenant, modules: newModules });
    };

    const handleSimulateTenant = (tenant: Tenant) => {
        switchToTenantConfig(tenant.modules);
        addToast(`התחזות ל-${tenant.name} פעילה. המודולים עודכנו.`, 'success');
        navigate('/');
    };

    const handleDownloadReport = (report: GeneratedReport) => {
        try {
            if (typeof document === 'undefined') return;
            const element = document.createElement('a');
            const file = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
            element.href = URL.createObjectURL(file);
            element.download = `Nexus_Report_${report.period}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(element);
            element.click();
            element.remove();
            URL.revokeObjectURL(element.href);
            addToast('הדוח ירד למחשב', 'success');
        } catch (error) {
            console.error('[SaaSAdmin] Error downloading report:', error);
            addToast('שגיאה בהורדת הדוח', 'error');
        }
    };

    const handleGenerateManualReport = (period: 'Quarterly' | 'Annual') => {
        addToast(`מפיק דוח ${period === 'Quarterly' ? 'רבעוני' : 'שנתי'}... (סימולציה)`, 'info');
    };

    const handleViewReport = (report: GeneratedReport) => {
        markReportRead(report.id);
        setSelectedReport(report);
    };

    const getSocialAdminUrl = () => {
        if (typeof window === 'undefined') return '/social/admin?mode=super';
        const orgSlug = getWorkspaceOrgIdFromPathname(window.location.pathname);
        if (orgSlug) return `/w/${encodeURIComponent(orgSlug)}/social/admin?mode=super`;
        return '/social/admin?mode=super';
    };

    const socialAdminUrl = getSocialAdminUrl();

    return (
        <div className="flex h-screen w-full bg-gradient-to-br from-[#0a0a0a] via-[#0f0f1a] to-[#0a0a0a] text-slate-200 font-sans relative overflow-hidden" dir="rtl">
            {/* Animated Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 -right-1/4 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 -left-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-blue-500/3 rounded-full blur-3xl"></div>
            </div>
            
            {/* Modals */}
            <AnimatePresence>
                {isModuleModalOpen && editingTenant && (
                    <ModuleManagementModal 
                        tenant={editingTenant} 
                        onClose={() => setIsModuleModalOpen(false)} 
                        onToggle={toggleTenantModule} 
                    />
                )}
                
                {selectedReport && (
                    <ReportDetailModal 
                        report={selectedReport} 
                        onClose={() => setSelectedReport(null)} 
                        onDownload={handleDownloadReport} 
                    />
                )}

                {isAddTenantOpen && (
                    <AddTenantModal 
                        onClose={() => setIsAddTenantOpen(false)}
                        onAdd={handleAddTenant}
                        products={products}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar - Premium Glassmorphic */}
            <aside className="w-64 border-l border-white/10 bg-gradient-to-b from-black/60 via-black/40 to-black/60 backdrop-blur-3xl flex flex-col h-screen relative z-20 shrink-0 shadow-2xl shadow-black/50 overflow-hidden">
                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none"></div>
                
                {/* Header - Fixed at top */}
                <div className="pt-6 pb-4 px-2 shrink-0 relative z-10">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider text-xs mb-2">
                        <div className="p-1.5 bg-indigo-500/20 rounded-lg backdrop-blur-sm border border-indigo-500/30">
                            <Shield size={12} />
                        </div>
                        ניהול-על
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
                        ענן משרד
                    </h1>
                    <div className="mt-2 h-0.5 w-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
                </div>

                {/* Navigation - Scrollable with hidden scrollbar */}
                <nav className="space-y-2 flex-1 overflow-y-auto min-h-0 px-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {/* Global Button */}
                    <button 
                        onClick={() => setSelectedSystem(selectedSystem === 'global' ? null : 'global')} 
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                            selectedSystem === 'global' 
                                ? 'text-white bg-emerald-600/80 border border-emerald-500/50' 
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/50 border border-transparent'
                        }`}
                    >
                        <Globe size={18} /> 
                        <span className="flex-1 text-right">גלובלי</span>
                        <ChevronRight size={14} className={`transition-transform duration-200 ${selectedSystem === 'global' ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Global Submenu */}
                    {selectedSystem === 'global' && (
                        <div className="space-y-1 pr-4 pt-2">
                            {[
                                { id: 'control' as GlobalTab, label: 'בקרת מערכת', icon: Lock },
                                { id: 'users' as GlobalTab, label: 'ניהול משתמשים', icon: Users },
                                { id: 'announcements' as GlobalTab, label: 'הודעות מערכת', icon: MessageSquare },
                                { id: 'versions' as GlobalTab, label: 'ניהול גרסאות', icon: Code },
                                { id: 'data' as GlobalTab, label: 'ניהול נתונים', icon: Database },
                                { id: 'updates' as GlobalTab, label: 'מרכז עדכונים', icon: Rocket },
                                { id: 'approvals' as GlobalTab, label: 'אישורי משתמשים', icon: UserCheck },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button 
                                        key={item.id}
                                        onClick={() => setGlobalTab(item.id)} 
                                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                                            globalTab === item.id 
                                                ? 'text-emerald-300 bg-emerald-600/20 border border-emerald-500/30' 
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border border-transparent'
                                        }`}
                                    >
                                        <Icon size={14} /> 
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Nexus OS Button */}
                    <button 
                        onClick={() => setSelectedSystem(selectedSystem === 'nexus' ? null : 'nexus')} 
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                            selectedSystem === 'nexus' 
                                ? 'text-white bg-indigo-600/80 border border-indigo-500/50' 
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/50 border border-transparent'
                        }`}
                    >
                        <Zap size={18} /> 
                        <span className="flex-1 text-right">מערכת Nexus</span>
                        <ChevronRight size={14} className={`transition-transform duration-200 ${selectedSystem === 'nexus' ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Social OS Button */}
                    <button
                        onClick={() => setSelectedSystem(selectedSystem === 'social' ? null : 'social')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                            selectedSystem === 'social'
                                ? 'text-white bg-blue-600/80 border border-blue-500/50'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/50 border border-transparent'
                        }`}
                    >
                        <ShieldCheck size={18} />
                        <span className="flex-1 text-right">מערכת Social</span>
                    </button>

                    {/* Nexus Submenu */}
                    {selectedSystem === 'nexus' && (
                        <div className="space-y-1 pr-4 pt-2">
                            {[
                                { id: 'control' as NexusTab, label: 'בקרת מערכת', icon: Lock },
                                { id: 'tenants' as NexusTab, label: 'ניהול לקוחות', icon: LayoutGrid },
                                { id: 'intelligence' as NexusTab, label: 'דוחות ובינה', icon: BrainCircuit },
                                { id: 'invitations' as NexusTab, label: 'קישורים חד פעמיים', icon: Link2 },
                                { id: 'announcements' as NexusTab, label: 'הודעות מערכת', icon: MessageSquare },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button 
                                        key={item.id}
                                        onClick={() => setNexusTab(item.id)} 
                                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                                            nexusTab === item.id 
                                                ? 'text-indigo-300 bg-indigo-600/20 border border-indigo-500/30' 
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border border-transparent'
                                        }`}
                                    >
                                        <Icon size={14} /> 
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => {
                                    const url = getSocialAdminUrl();
                                    window.location.href = url;
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition-colors text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border border-transparent"
                            >
                                <ShieldCheck size={14} />
                                <span>ניהול מערכת סושיאל</span>
                            </button>
                        </div>
                    )}

                    {/* System OS Button */}
                    <button 
                        onClick={() => setSelectedSystem(selectedSystem === 'system' ? null : 'system')} 
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                            selectedSystem === 'system' 
                                ? 'text-white bg-red-600/80 border border-red-500/50' 
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/50 border border-transparent'
                        }`}
                    >
                        <Server size={18} /> 
                        <span className="flex-1 text-right">מערכת System</span>
                        <ChevronRight size={14} className={`transition-transform duration-200 ${selectedSystem === 'system' ? 'rotate-90' : ''}`} />
                    </button>

                    {/* System OS Submenu */}
                    {selectedSystem === 'system' && (
                        <div className="space-y-1 pr-4 pt-2">
                            {[
                                { id: 'control' as SystemOSTab, label: 'בקרת מערכת', icon: Lock },
                                { id: 'announcements' as SystemOSTab, label: 'הודעות מערכת', icon: MessageSquare },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button 
                                        key={item.id}
                                        onClick={() => setSystemOSTab(item.id)} 
                                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                                            systemOSTab === item.id 
                                                ? 'text-red-300 bg-red-600/20 border border-red-500/30' 
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border border-transparent'
                                        }`}
                                    >
                                        <Icon size={14} /> 
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Client OS Button */}
                    <button 
                        onClick={() => setSelectedSystem(selectedSystem === 'client' ? null : 'client')} 
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                            selectedSystem === 'client' 
                                ? 'text-white bg-purple-600/80 border border-purple-500/50' 
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/50 border border-transparent'
                        }`}
                    >
                        <Users size={18} /> 
                        <span className="flex-1 text-right">מערכת Client</span>
                        <ChevronRight size={14} className={`transition-transform duration-200 ${selectedSystem === 'client' ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Client Submenu */}
                    {selectedSystem === 'client' && (
                        <div className="space-y-1 pr-4 pt-2">
                            {[
                                { id: 'support' as ClientTab, label: 'קריאות תמיכה', icon: LifeBuoy },
                                { id: 'features' as ClientTab, label: 'בקשות פיצ\'רים', icon: Sparkles },
                                { id: 'announcements' as ClientTab, label: 'הודעות מערכת', icon: MessageSquare },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button 
                                        key={item.id}
                                        onClick={() => setClientTab(item.id)} 
                                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                                            clientTab === item.id 
                                                ? 'text-purple-300 bg-purple-600/20 border border-purple-500/30' 
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border border-transparent'
                                        }`}
                                    >
                                        <Icon size={14} /> 
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Landing Pages Button */}
                    <button 
                        onClick={() => setSelectedSystem(selectedSystem === 'landing' ? null : 'landing')} 
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                            selectedSystem === 'landing' 
                                ? 'text-white bg-amber-600/80 border border-amber-500/50' 
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/50 border border-transparent'
                        }`}
                    >
                        <FileText size={18} /> 
                        <span className="flex-1 text-right">דפי נחיתה</span>
                        <ChevronRight size={14} className={`transition-transform duration-200 ${selectedSystem === 'landing' ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Landing Submenu */}
                    {selectedSystem === 'landing' && (
                        <div className="space-y-1 pr-4 pt-2">
                            {[
                                { id: 'pricing' as LandingTab, label: 'חבילות דפי הנחיתה', icon: Package },
                                { id: 'payment_links' as LandingTab, label: 'תשלום / קישורי סליקה', icon: ExternalLink },
                                { id: 'videos' as LandingTab, label: 'סרטוני דף הנחיתה', icon: Video },
                                { id: 'logo' as LandingTab, label: 'לוגו דף הנחיתה', icon: ImageIcon },
                                { id: 'partners' as LandingTab, label: 'לוגואים של שותפים', icon: Building2 },
                                { id: 'founder' as LandingTab, label: 'תמונת המייסד', icon: UserCheck },
                                { id: 'announcements' as LandingTab, label: 'הודעות מערכת', icon: MessageSquare },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button 
                                        key={item.id}
                                        onClick={() => setLandingTab(item.id)} 
                                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                                            landingTab === item.id 
                                                ? 'text-amber-300 bg-amber-600/20 border border-amber-500/30' 
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border border-transparent'
                                        }`}
                                    >
                                        <Icon size={14} /> 
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </nav>

                {/* Footer - Fixed at bottom */}
                <div className="mt-auto border-t border-white/10 pt-6 pb-6 relative z-10 space-y-2 shrink-0 px-2 bg-gradient-to-t from-black/60 to-transparent">
                    <a 
                        href="/shabbat" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-gradient-to-r hover:from-yellow-500/20 hover:to-amber-500/20 hover:backdrop-blur-md transition-all duration-500 border border-transparent hover:border-yellow-500/30 hover:shadow-lg hover:scale-[1.02] group"
                    >
                        <Moon size={18} className="relative z-10 group-hover:text-yellow-400 transition-colors" /> 
                        <span className="relative z-10">מצב שבת</span>
                        <ExternalLink size={14} className="mr-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <a 
                        href="/" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-gradient-to-r hover:from-indigo-500/20 hover:to-purple-500/20 hover:backdrop-blur-md transition-all duration-500 border border-transparent hover:border-indigo-500/30 hover:shadow-lg hover:scale-[1.02] group"
                    >
                        <Globe size={18} className="relative z-10 group-hover:text-indigo-400 transition-colors" /> 
                        <span className="relative z-10">דף הבית השיווקי</span>
                        <ExternalLink size={14} className="mr-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <button onClick={() => navigate(getReturnToPath())} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-gradient-to-r hover:from-slate-800/50 hover:to-slate-700/50 hover:backdrop-blur-md transition-all duration-500 border border-transparent hover:border-white/10 hover:shadow-lg hover:scale-[1.02]">
                        <LogOut size={18} className="rotate-180" /> חזרה לאפליקציה
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-8 relative z-10">
                {!selectedSystem ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-center justify-center h-full"
                    >
                        <div className="text-center max-w-2xl">
                            <div className="mb-6">
                                <Shield size={64} className="mx-auto text-indigo-400/50 mb-4" />
                            </div>
                            <h1 className="text-5xl font-black text-white tracking-tight mb-4 bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
                                מערכת ניהול-על
                            </h1>
                            <p className="text-slate-400 text-xl mb-8">
                                בחר מערכת מהתפריט כדי להתחיל לנהל
                            </p>
                            <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
                                <div 
                                    onClick={() => setSelectedSystem('global')}
                                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center cursor-pointer hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all hover:scale-105"
                                >
                                    <Globe size={24} className="mx-auto mb-2 text-emerald-400" />
                                    <p className="text-sm font-bold text-emerald-300">גלובלי</p>
                                </div>
                                <div 
                                    onClick={() => setSelectedSystem('nexus')}
                                    className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-center cursor-pointer hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all hover:scale-105"
                                >
                                    <Zap size={24} className="mx-auto mb-2 text-indigo-400" />
                                    <p className="text-sm font-bold text-indigo-300">Nexus</p>
                                </div>
                                <div 
                                    onClick={() => setSelectedSystem('social')}
                                    className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center cursor-pointer hover:bg-blue-500/20 hover:border-blue-500/40 transition-all hover:scale-105"
                                >
                                    <ShieldCheck size={24} className="mx-auto mb-2 text-blue-400" />
                                    <p className="text-sm font-bold text-blue-300">Social</p>
                                </div>
                                <div 
                                    onClick={() => setSelectedSystem('system')}
                                    className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center cursor-pointer hover:bg-red-500/20 hover:border-red-500/40 transition-all hover:scale-105"
                                >
                                    <Server size={24} className="mx-auto mb-2 text-red-400" />
                                    <p className="text-sm font-bold text-red-300">System</p>
                                </div>
                                <div 
                                    onClick={() => setSelectedSystem('client')}
                                    className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center cursor-pointer hover:bg-purple-500/20 hover:border-purple-500/40 transition-all hover:scale-105"
                                >
                                    <Users size={24} className="mx-auto mb-2 text-purple-400" />
                                    <p className="text-sm font-bold text-purple-300">Client</p>
                                </div>
                                <div 
                                    onClick={() => setSelectedSystem('landing')}
                                    className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center cursor-pointer hover:bg-amber-500/20 hover:border-amber-500/40 transition-all hover:scale-105 col-span-2"
                                >
                                    <FileText size={24} className="mx-auto mb-2 text-amber-400" />
                                    <p className="text-sm font-bold text-amber-300">Landing</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <>
                        {/* Global Content */}
                        {selectedSystem === 'global' && (
                            <>
                                {globalTab === 'control' && (
                                    <SystemControlPanel 
                                        organization={organization}
                                        updateSystemFlag={updateSystemFlag}
                                    />
                                )}

                                {globalTab === 'versions' && (
                                    <VersionManagementPanel
                                        tenants={tenants}
                                        availableVersions={availableVersions || ['2.5.0', '2.6.0', '2.6.0-beta', '2.7.0-alpha']}
                                        onUpdateVersion={updateTenantVersion}
                                        onRollback={(tenantId, version) => updateTenantVersion(tenantId, version)}
                                    />
                                )}

                                {globalTab === 'data' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                                        <div className="mb-8">
                                            <h1 className="text-4xl font-black text-white tracking-tight mb-2 bg-gradient-to-r from-white via-emerald-200 to-teal-200 bg-clip-text text-transparent">
                                                ניהול נתונים וגיבוי
                                            </h1>
                                            <p className="text-slate-400 text-lg">ייצוא נתונים מערכתי (System Dump) ושחזור מאסון.</p>
                                        </div>
                                        <div className="bg-black/20 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 text-white shadow-2xl">
                                            <DataTab />
                                        </div>
                                    </motion.div>
                                )}

                                {globalTab === 'updates' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                                        <div className="mb-8">
                                            <h1 className="text-4xl font-black text-white tracking-tight mb-2 bg-gradient-to-r from-white via-emerald-200 to-teal-200 bg-clip-text text-transparent">
                                                מרכז העדכונים
                                            </h1>
                                            <p className="text-slate-400 text-lg">פרסם ונהל את ה-Change Log עבור כל משתמשי הפלטפורמה.</p>
                                        </div>
                                        <div className="bg-black/20 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 text-white shadow-2xl">
                                            <UpdatesTab readOnly={false} />
                                        </div>
                                    </motion.div>
                                )}

                                {globalTab === 'users' && (
                                    <GlobalUsersPanel
                                        tenants={tenants}
                                        addToast={addToast}
                                    />
                                )}

                                {globalTab === 'announcements' && (
                                    <AnnouncementsPanel
                                        currentUser={currentUser}
                                        addToast={addToast}
                                    />
                                )}

                                {globalTab === 'approvals' && (
                                    <UserApprovalsPanel
                                        approvalRequests={userApprovalRequests || []}
                                        tenants={tenants}
                                        onApprove={approveUserRequest}
                                        onReject={rejectUserRequest}
                                        onAddAllowedEmail={addAllowedEmail}
                                        onRemoveAllowedEmail={removeAllowedEmail}
                                        currentUserId={currentUser?.id || ''}
                                    />
                                )}
                            </>
                        )}

                        {/* System OS Content */}
                        {selectedSystem === 'system' && (
                            <>
                                {systemOSTab === 'control' && (
                                    <SystemOSControlPanel 
                                        organization={organization}
                                        updateSystemFlag={updateSystemFlag}
                                    />
                                )}

                                {systemOSTab === 'announcements' && (
                                    <AnnouncementsPanel
                                        currentUser={currentUser}
                                        addToast={addToast}
                                    />
                                )}
                            </>
                        )}

                        {/* Social OS Content */}
                        {selectedSystem === 'social' && (
                            <div className="w-full h-[calc(100vh-4rem)] bg-black/20 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                                <iframe
                                    key={socialAdminUrl}
                                    src={socialAdminUrl}
                                    className="w-full h-full border-0"
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                        )}

                        {/* Nexus OS Content */}
                        {selectedSystem === 'nexus' && (
                            <>
                                {nexusTab === 'control' && (
                                    <NexusControlPanel 
                                        organization={organization}
                                        updateSystemFlag={updateSystemFlag}
                                    />
                                )}

                                {nexusTab === 'tenants' && (
                                    <TenantsPanel 
                                        tenants={tenants}
                                        totalMRR={totalMRR}
                                        activeTenants={activeTenants}
                                        trialTenants={trialTenants}
                                        totalUsers={totalUsers}
                                        filteredTenants={filteredTenants}
                                        searchTerm={searchTerm}
                                        setSearchTerm={setSearchTerm}
                                        onAddClick={() => setIsAddTenantOpen(true)}
                                        onSimulate={handleSimulateTenant}
                                        onEditModules={handleEditModules}
                                        onToggleStatus={toggleStatus}
                                    />
                                )}

                                {nexusTab === 'intelligence' && (
                                    <IntelligencePanel 
                                        systemReports={systemReports}
                                        feedbacks={feedbacks}
                                        onViewReport={handleViewReport}
                                        onGenerateReport={handleGenerateManualReport}
                                    />
                                )}

                                {nexusTab === 'invitations' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                                        <div className="bg-black/20 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 text-white shadow-2xl">
                                            <InvitationLinksPanel 
                                                addToast={addToast}
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                {nexusTab === 'announcements' && (
                                    <AnnouncementsPanel
                                        currentUser={currentUser}
                                        addToast={addToast}
                                    />
                                )}
                            </>
                        )}

                        {/* Client OS Content */}
                        {selectedSystem === 'client' && (
                            <>
                                {clientTab === 'support' && (
                                    <SupportTicketsPanel 
                                        addToast={addToast}
                                    />
                                )}

                                {clientTab === 'features' && (
                                    <FeatureRequestsPanel 
                                        addToast={addToast}
                                    />
                                )}

                                {clientTab === 'announcements' && (
                                    <AnnouncementsPanel
                                        currentUser={currentUser}
                                        addToast={addToast}
                                    />
                                )}
                            </>
                        )}

                        {/* Landing Pages Content */}
                        {selectedSystem === 'landing' && (
                            <>
                                {landingTab === 'pricing' && (
                                    <ComprehensivePricingPanel />
                                )}

                                {landingTab === 'payment_links' && (
                                    <LandingPaymentLinksPanel />
                                )}

                                {landingTab === 'videos' && (
                                    <LandingPageVideosPanel />
                                )}

                                {landingTab === 'logo' && (
                                    <LandingPageLogoPanel />
                                )}

                                {landingTab === 'partners' && (
                                    <PartnersLogosPanel />
                                )}

                                {landingTab === 'founder' && (
                                    <FounderImagePanel />
                                )}

                                {landingTab === 'announcements' && (
                                    <AnnouncementsPanel
                                        currentUser={currentUser}
                                        addToast={addToast}
                                    />
                                )}
                            </>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};
