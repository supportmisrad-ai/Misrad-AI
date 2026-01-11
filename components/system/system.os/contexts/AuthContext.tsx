


import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  login: (role: UserRole) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  canAccess: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);

  // Check for persisted session (optional, simpler for this demo to start logged out)
  useEffect(() => {
      const stored = localStorage.getItem('sales_os_user');
      if (stored) {
          setUser(JSON.parse(stored));
      }
  }, []);

  const login = (role: UserRole) => {
      const newUser: UserProfile = {
          id: role === 'admin' ? 'u1' : 'u2',
          name: role === 'admin' ? 'איתמר המנכ"ל' : 'דניאל (סוכן)',
          role: role,
          avatar: role === 'admin' ? 'IT' : 'DA',
          // Added email to resolve errors in App components referencing user.email
          email: role === 'admin' ? 'admin@nexus.os' : 'agent@nexus.os'
      };
      setUser(newUser);
      localStorage.setItem('sales_os_user', JSON.stringify(newUser));
  };

  const logout = () => {
      setUser(null);
      localStorage.removeItem('sales_os_user');
  };

  const switchRole = (role: UserRole) => {
    if (user) {
        const updatedUser = { 
            ...user, 
            role, 
            name: role === 'admin' ? 'איתמר המנכ"ל' : 'דניאל (סוכן)', 
            avatar: role === 'admin' ? 'IT' : 'DA',
            // Ensure email is also updated or maintained
            email: role === 'admin' ? 'admin@nexus.os' : 'agent@nexus.os'
        };
        setUser(updatedUser);
        localStorage.setItem('sales_os_user', JSON.stringify(updatedUser));
    }
  };

  const canAccess = (feature: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    if (user.role === 'agent') {
      // List of restricted features for agents
      const restricted = ['billing', 'settings_team', 'integrations_config', 'delete_campaign'];
      return !restricted.includes(feature);
    }
    
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, switchRole, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};