
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardView } from './views/DashboardView'; 
import { TasksView } from './views/TasksView';
import { TeamView } from './views/TeamView';
import { CalendarView } from './views/CalendarView';
import { MeView } from './views/MeView';
import { SettingsView } from './views/SettingsView';
import { AssetsView } from './views/AssetsView';
import { GuestView } from './views/GuestView';
import { LoginView } from './views/LoginView';
import { ClientsView } from './views/ClientsView';
import { IntelligenceView } from './views/IntelligenceView';
import { ReportsView } from './views/ReportsView';
import { SaaSAdminView } from './views/SaaSAdminView'; 
import { RecycleBinView } from './views/RecycleBinView'; 
import { NotFoundView, AccessDeniedView } from './views/SystemViews'; 
import { DataProvider, useData } from './context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { PermissionId } from './types';
import { ScreenGuard } from './components/ScreenGuard';

// Public Pages
import { PrivacyView, TermsView, SecurityView, AboutView, ContactView, BlogView, CareersView } from './views/PublicPages';

// Sales OS Imports
import { SalesLayout } from './views/SalesLayout';
import { SalesDashboard } from './views/SalesDashboard';
import { SalesPipeline } from './views/SalesPipeline';
import { SalesTargets } from './views/SalesTargets';

interface RouteWrapperProps {
  children?: React.ReactNode;
}

// Wrapper to protect routes (Authentication only)
const ProtectedRoute = ({ children }: RouteWrapperProps) => {
  const data = useData() as { isAuthenticated?: boolean };
  if (!data.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Permission Route Wrapper
const PermissionRoute = ({ children, permission }: { children?: React.ReactNode; permission: PermissionId }) => {
    const data = useData() as { isAuthenticated?: boolean; hasPermission?: (p: string) => boolean };
    const { isAuthenticated, hasPermission } = data;
    
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    
    if (!hasPermission || !hasPermission(permission)) {
        return <Layout><AccessDeniedView /></Layout>; 
    }
    
    return <>{children}</>;
};

// Super Admin Route
const SuperAdminRoute = ({ children }: RouteWrapperProps) => {
    const data = useData() as { isAuthenticated?: boolean; currentUser?: { isSuperAdmin?: boolean } };
    const { isAuthenticated, currentUser } = data;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    
    if (!currentUser?.isSuperAdmin) {
        return <Layout><AccessDeniedView /></Layout>;
    }
    return <>{children}</>;
};

const PublicRoute = ({ children }: RouteWrapperProps) => {
    const data = useData() as { isAuthenticated?: boolean };
    const { isAuthenticated } = data;
    if (isAuthenticated) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
};

const SplashScreen = () => (
    <motion.div 
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center text-white"
    >
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 animate-pulse">
            <div className="w-6 h-6 bg-black rounded-full" />
        </div>
        <h1 className="text-2xl font-bold tracking-widest mb-2">MISRAD AI</h1>
        <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
            <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="h-full bg-white"
            />
        </div>
        <p className="text-xs text-gray-500 mt-4 font-mono">INITIALIZING SYSTEM...</p>
    </motion.div>
);

const AppContent: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            <AnimatePresence>
                {isLoading && <SplashScreen key="splash" />}
            </AnimatePresence>
            
            {!isLoading && (
                <Router>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<PublicRoute><LoginView /></PublicRoute>} />
                        <Route path="/guest/:taskId" element={<GuestView />} />
                        
                        {/* New Public Content Pages */}
                        <Route path="/privacy" element={<PrivacyView />} />
                        <Route path="/terms" element={<TermsView />} />
                        <Route path="/security" element={<SecurityView />} />
                        <Route path="/about" element={<AboutView />} />
                        <Route path="/contact" element={<ContactView />} />
                        <Route path="/blog" element={<BlogView />} />
                        <Route path="/careers" element={<CareersView />} />

                        {/* --- Open to All Authenticated Users (Guarded by ScreenGuard) --- */}
                        <Route path="/" element={<ProtectedRoute><Layout><ScreenGuard id="dashboard"><DashboardView /></ScreenGuard></Layout></ProtectedRoute>} />
                        <Route path="/brain" element={<ProtectedRoute><Layout><ScreenGuard id="brain"><IntelligenceView /></ScreenGuard></Layout></ProtectedRoute>} />
                        <Route path="/tasks" element={<ProtectedRoute><Layout><ScreenGuard id="tasks"><TasksView /></ScreenGuard></Layout></ProtectedRoute>} />
                        <Route path="/calendar" element={<ProtectedRoute><Layout><ScreenGuard id="calendar"><CalendarView /></ScreenGuard></Layout></ProtectedRoute>} />
                        <Route path="/me" element={<ProtectedRoute><Layout><MeView /></Layout></ProtectedRoute>} />
                        <Route path="/settings" element={<ProtectedRoute><Layout><SettingsView /></Layout></ProtectedRoute>} />
                        <Route path="/trash" element={<ProtectedRoute><Layout><ScreenGuard id="trash"><RecycleBinView /></ScreenGuard></Layout></ProtectedRoute>} />
                        
                        <Route path="/reports" element={<ProtectedRoute><Layout><ScreenGuard id="reports"><ReportsView /></ScreenGuard></Layout></ProtectedRoute>} />

                        {/* --- Restricted Areas (Guarded by ScreenGuard AND Permission) --- */}
                        <Route path="/clients" element={<PermissionRoute permission="view_crm"><Layout><ScreenGuard id="clients"><ClientsView /></ScreenGuard></Layout></PermissionRoute>} />
                        <Route path="/assets" element={<PermissionRoute permission="view_assets"><Layout><ScreenGuard id="assets"><AssetsView /></ScreenGuard></Layout></PermissionRoute>} />
                        <Route path="/team" element={<PermissionRoute permission="manage_team"><Layout><ScreenGuard id="team"><TeamView /></ScreenGuard></Layout></PermissionRoute>} />

                        {/* --- Sales OS (External System Simulation) --- */}
                        <Route path="/sales" element={<ProtectedRoute><SalesLayout><SalesDashboard /></SalesLayout></ProtectedRoute>} />
                        <Route path="/sales/pipeline" element={<ProtectedRoute><SalesLayout><SalesPipeline /></SalesLayout></ProtectedRoute>} />
                        <Route path="/sales/targets" element={<ProtectedRoute><SalesLayout><SalesTargets /></SalesLayout></ProtectedRoute>} />

                        {/* --- SaaS Admin (Super User) --- */}
                        <Route path="/admin" element={<SuperAdminRoute><SaaSAdminView /></SuperAdminRoute>} />

                        {/* 404 Route */}
                        <Route path="*" element={<ProtectedRoute><Layout><NotFoundView /></Layout></ProtectedRoute>} />
                    </Routes>
                </Router>
            )}
        </>
    );
}

const App: React.FC = () => {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
};

export default App;
