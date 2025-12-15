
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Shield, LayoutGrid, Lock, BrainCircuit, Rocket, Database, LogOut } from 'lucide-react';
import { Tenant, GeneratedReport, ModuleId, SystemScreenStatus } from '../types';
import { UpdatesTab } from '../components/settings/UpdatesTab';
import { DataTab } from '../components/settings/SystemTabs';
import { useNavigate } from 'react-router-dom';

// New Components
import { TenantsPanel } from '../components/saas/TenantsPanel';
import { SystemControlPanel } from '../components/saas/SystemControlPanel';
import { IntelligencePanel } from '../components/saas/IntelligencePanel';
import { AddTenantModal } from '../components/saas/AddTenantModal';
import { ModuleManagementModal } from '../components/saas/ModuleManagementModal';
import { ReportDetailModal } from '../components/saas/ReportDetailModal';

export const SaaSAdminView: React.FC = () => {
    const { tenants, addTenant, updateTenant, products, feedbacks, systemReports, markReportRead, addToast, switchToTenantConfig, organization, updateSystemFlag } = useData();
    const [activeTab, setActiveTab] = useState<'tenants' | 'updates' | 'data' | 'intelligence' | 'control'>('tenants');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal States
    const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
    const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null);
    
    const navigate = useNavigate();
    
    // Stats
    const totalMRR = tenants.filter(t => t.status === 'Active').reduce((acc, t) => acc + t.mrr, 0);
    const activeTenants = tenants.filter(t => t.status === 'Active').length;
    const trialTenants = tenants.filter(t => t.status === 'Trial').length;
    const totalUsers = tenants.reduce((acc, t) => acc + t.usersCount, 0);

    const filteredTenants = tenants.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddTenant = (tenantData: Omit<Tenant, 'id' | 'joinedAt' | 'logo' | 'modules' | 'status' | 'usersCount' | 'mrr'>, mrr: number) => {
        const tempId = `T-${Date.now()}`;
        
        // 1. Create Tenant in "Provisioning" state
        const newTenant: Tenant = {
            id: tempId,
            ...tenantData,
            status: 'Provisioning', // Start as provisioning
            joinedAt: new Date().toISOString(),
            mrr,
            usersCount: 1,
            logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(tenantData.name)}&background=random`,
            modules: ['crm', 'finance', 'content', 'ai', 'team']
        };
        addTenant(newTenant);
        setIsAddTenantOpen(false);
        addToast(`מקים סביבת עבודה ב-${tenantData.region}...`, 'info');

        // 2. Simulate Backend Provisioning Delay (Creating DB, DNS, etc.)
        setTimeout(() => {
            updateTenant(tempId, { status: 'Active' });
            addToast(`הלקוח ${tenantData.name} הוקם בהצלחה!`, 'success');
        }, 3500); // 3.5 seconds delay
    };

    const toggleStatus = (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'Active' ? 'Churned' : 'Active';
        updateTenant(id, { status: newStatus as any });
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

    const handleViewReport = (report: GeneratedReport) => {
        markReportRead(report.id);
        setSelectedReport(report);
    };

    const handleDownloadReport = (report: GeneratedReport) => {
        const element = document.createElement("a");
        const file = new Blob([JSON.stringify(report, null, 2)], {type: 'application/json'});
        element.href = URL.createObjectURL(file);
        element.download = `Nexus_Report_${report.period}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        addToast('הדוח ירד למחשב', 'success');
    };

    const handleGenerateManualReport = (period: 'Quarterly' | 'Annual') => {
        addToast(`מפיק דוח ${period === 'Quarterly' ? 'רבעוני' : 'שנתי'}... (סימולציה)`, 'info');
    };

    return (
        <div className="flex min-h-screen bg-[#0f172a] text-slate-200 font-sans" dir="rtl">
            
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

            {/* Sidebar */}
            <aside className="w-64 border-l border-slate-800 bg-[#0f172a] flex flex-col p-4 relative z-20 shrink-0">
                <div className="mb-8 px-2">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider text-xs mb-1">
                        <Shield size={14} /> ניהול-על
                    </div>
                    <h1 className="text-xl font-black text-white tracking-tight">ענן Nexus</h1>
                </div>

                <nav className="space-y-1 flex-1">
                    <button onClick={() => setActiveTab('tenants')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'tenants' ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <LayoutGrid size={18} /> ניהול לקוחות
                    </button>
                    <button onClick={() => setActiveTab('control')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'control' ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <Lock size={18} /> בקרת מערכת
                    </button>
                    <button onClick={() => setActiveTab('intelligence')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'intelligence' ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <BrainCircuit size={18} /> דוחות ובינה
                    </button>
                    <button onClick={() => setActiveTab('updates')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'updates' ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <Rocket size={18} /> מרכז עדכונים
                    </button>
                    <button onClick={() => setActiveTab('data')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'data' ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <Database size={18} /> ניהול נתונים
                    </button>
                </nav>

                <div className="mt-auto border-t border-slate-800 pt-4">
                    <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                        <LogOut size={18} className="rotate-180" /> חזרה לאפליקציה
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-8 relative">
                
                {activeTab === 'tenants' && (
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

                {activeTab === 'control' && (
                    <SystemControlPanel 
                        organization={organization}
                        updateSystemFlag={updateSystemFlag}
                    />
                )}

                {activeTab === 'intelligence' && (
                    <IntelligencePanel 
                        systemReports={systemReports}
                        feedbacks={feedbacks}
                        onViewReport={handleViewReport}
                        onGenerateReport={handleGenerateManualReport}
                    />
                )}

                {activeTab === 'updates' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        <div className="mb-8">
                            <h1 className="text-3xl font-black text-white tracking-tight">מרכז העדכונים</h1>
                            <p className="text-slate-400 mt-1">פרסם ונהל את ה-Change Log עבור כל משתמשי הפלטפורמה.</p>
                        </div>
                        <div className="bg-[#f1f5f9] rounded-3xl p-8 text-gray-900 shadow-2xl">
                            <UpdatesTab readOnly={false} />
                        </div>
                    </motion.div>
                )}

                {activeTab === 'data' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        <div className="mb-8">
                            <h1 className="text-3xl font-black text-white tracking-tight">ניהול נתונים וגיבוי</h1>
                            <p className="text-slate-400 mt-1">ייצוא נתונים מערכתי (System Dump) ושחזור מאסון.</p>
                        </div>
                        <div className="bg-[#f1f5f9] rounded-3xl p-8 text-gray-900 shadow-2xl">
                            <DataTab />
                        </div>
                    </motion.div>
                )}

            </div>
        </div>
    );
};
