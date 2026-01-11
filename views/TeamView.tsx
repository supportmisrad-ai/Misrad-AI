'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useSecureAPI } from '../hooks/useSecureAPI';
import { Status, User, RoleDefinition } from '../types';
import { Settings, UserPlus, Trophy, X, Shield, Building2, Users, Lock, Calendar, CalendarDays, BarChart3, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNexusNavigation } from '@/lib/os/nexus-routing';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { CustomSelect } from '../components/CustomSelect';
import { TeamMemberModal } from '../components/nexus/team/TeamMemberModal';
import { BonusConfirmationModal } from '../components/nexus/team/BonusConfirmationModal';
import { TaskAssignmentModal } from '../components/nexus/team/TaskAssignmentModal';
import { TeamMemberCard } from '../components/nexus/team/TeamMemberCard';
import { UnassignedTasksSidebar } from '../components/nexus/team/UnassignedTasksSidebar';
import { EmployeeInvitationsPanel } from '../components/nexus/EmployeeInvitationsPanel';
import { TeamEventsPanel } from '../components/nexus/team/TeamEventsPanel';
import { LeaveRequestsPanel } from '../components/nexus/team/LeaveRequestsPanel';

// Helper to check if a task is "active" (contributes to workload)
const isActiveTask = (status: string) => 
    status !== Status.DONE && status !== Status.CANCELED && status !== Status.BACKLOG;

export const TeamView: React.FC = () => {
  const { tasks, updateTask, openCreateTask, addUser, updateUser, removeUser, switchUser, roleDefinitions, currentUser, hasPermission, addNotification, addToast, departments, users: allUsers } = useData();
  const { fetchUsers, isLoading: isLoadingUsers, updateUserAPI, setUserManagerAPI, fetchRoles } = useSecureAPI();
  const [users, setUsers] = useState<User[]>(allUsers || []);
  const [availableRoles, setAvailableRoles] = useState<RoleDefinition[]>(roleDefinitions || []);
  const [cachedUsers, setCachedUsers] = useState<User[]>(() => {
      // Prefer context users over localStorage cache
      if (allUsers && allUsers.length > 0) {
          return allUsers;
      }
      if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('team_cached_users');
          return stored ? JSON.parse(stored) : [];
      }
      return [];
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLoadingRef = useRef(false);
  const lastAllUsersRef = useRef<User[] | null>(null);
  const { navigate } = useNexusNavigation();
  
  // HIERARCHY LOGIC
  // Super Admin: system admin, sees everything across all tenants
  const isSuperAdmin = currentUser.isSuperAdmin === true;
  // Tenant Admin: CEO/Admin within their tenant, sees everything within their tenant
  const isTenantAdmin = !isSuperAdmin && (currentUser.role === 'מנכ״ל' || currentUser.role === 'אדמין');
  // Combined: sees all users/tasks within their scope (Super Admin sees all tenants, Tenant Admin sees their tenant)
  const isGlobalAdmin = isSuperAdmin || isTenantAdmin;
  const myDepartment = currentUser.department;
  const canApproveBonus = hasPermission('view_financials');

  // Filter State (For Global Admin only)
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [showHeadsOnly, setShowHeadsOnly] = useState(false);

  // Modal State
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  
  // Delete Modal State
  const [userToDelete, setUserToDelete] = useState<{id: string, name: string} | null>(null);

  // Dropdown Menu State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // AI Recommendation State
  const [rewardRecommendation, setRewardRecommendation] = useState<any | null>(null);
  
  // NEW STATES
  const [isBonusConfirmOpen, setIsBonusConfirmOpen] = useState(false);
  const [assigningToUserId, setAssigningToUserId] = useState<string | null>(null);
  
  // TABS STATE
  const [activeTab, setActiveTab] = useState<'workload' | 'invitations' | 'events' | 'leave'>('workload');

  // Load roles from API to ensure we have all roles
  useEffect(() => {
      const loadRoles = async () => {
          try {
              const roles = await fetchRoles();
              if (roles && roles.length > 0) {
                  setAvailableRoles(roles);
              } else if (roleDefinitions && roleDefinitions.length > 0) {
                  // Fallback to context roles
                  setAvailableRoles(roleDefinitions);
              }
          } catch (error) {
              // If fetch fails (e.g., no permission), use context roles
              console.warn('[TeamView] Could not load roles from API, using context roles');
              if (roleDefinitions && roleDefinitions.length > 0) {
                  setAvailableRoles(roleDefinitions);
              }
          }
      };
      
      // Use context roles immediately, then try to refresh from API
      if (roleDefinitions && roleDefinitions.length > 0) {
          setAvailableRoles(roleDefinitions);
      }
      loadRoles();
  }, [roleDefinitions, fetchRoles]);

  // Sync users from context when allUsers changes
  useEffect(() => {
      if (allUsers && allUsers.length > 0) {
          // Check if allUsers actually changed by comparing IDs and content
          const currentIds = allUsers.map((u: any) => u.id).sort().join(',');
          const lastIds = lastAllUsersRef.current?.map((u: any) => u.id).sort().join(',') || '';
          
          // Also check if any user data changed (for edits)
          let hasChanges = false;
          if (lastAllUsersRef.current) {
              // Check if IDs changed (new/removed users)
              if (currentIds !== lastIds) {
                  hasChanges = true;
              } else {
                  // Check if any user data changed (edits)
                  for (const user of allUsers) {
                      const lastUser = lastAllUsersRef.current.find((u: any) => u.id === user.id);
                      if (!lastUser) {
                          hasChanges = true;
                          break;
                      }
                      // Compare key fields that might change
                      if (user.name !== lastUser.name || 
                          user.role !== lastUser.role || 
                          user.department !== lastUser.department ||
                          user.capacity !== lastUser.capacity) {
                          hasChanges = true;
                          break;
                      }
                  }
              }
          } else {
              hasChanges = true; // First load
          }
          
          if (hasChanges) {
              setUsers(allUsers);
              setCachedUsers(allUsers);
              lastAllUsersRef.current = allUsers;
          }
      } else if (allUsers && allUsers.length === 0 && lastAllUsersRef.current) {
          // Clear if allUsers becomes empty
          setUsers([]);
          setCachedUsers([]);
          lastAllUsersRef.current = null;
      }
  }, [allUsers]);

  // Load users from secure API when department filter changes
  useEffect(() => {
      // Skip if already loading
      if (isLoadingRef.current) return;
      
      // If we have context users and no filter, use them
      if (allUsers && allUsers.length > 0 && selectedDepartment === 'All') {
          return; // Use context data, no need to fetch
      }
      
      const loadUsers = async () => {
          // Prevent multiple simultaneous loads
          if (isLoadingRef.current) return;
          isLoadingRef.current = true;
          setIsRefreshing(true);
          
          try {
              const fetchedUsers = await fetchUsers({
                  department: selectedDepartment !== 'All' ? selectedDepartment : undefined
              });
              const newUsers = fetchedUsers || [];
              
              setUsers(newUsers);
              setCachedUsers(newUsers);
              
              // Persist to localStorage
              if (typeof window !== 'undefined') {
                  localStorage.setItem('team_cached_users', JSON.stringify(newUsers));
              }
          } catch (error) {
              console.error('Failed to load users:', error);
              // Keep existing users on error
          } finally {
              setIsRefreshing(false);
              isLoadingRef.current = false;
          }
      };
      
      loadUsers();
  }, [selectedDepartment, fetchUsers]); // Only depend on selectedDepartment and fetchUsers

  // Close menu when clicking outside
  useEffect(() => {
      if (typeof document === 'undefined') return;
      
      const handleClickOutside = () => setActiveMenuId(null);
      if (activeMenuId) {
          document.addEventListener('click', handleClickOutside);
      }
      return () => {
          if (typeof document !== 'undefined') {
              document.removeEventListener('click', handleClickOutside);
          }
      };
  }, [activeMenuId]);

  // Simulate AI Scan for Rewards
  useEffect(() => {
      const bestUser = users.find(u => u.pendingReward);
      if (bestUser && !rewardRecommendation) {
          setTimeout(() => {
              setRewardRecommendation({
                  userId: bestUser.id,
                  userName: bestUser.name,
                  avatar: bestUser.avatar,
                  reason: bestUser.pendingReward?.reason,
                  amount: bestUser.pendingReward?.suggestedBonus,
                  type: bestUser.pendingReward?.type
              });
          }, 1000);
      }
  }, [users]);
  
  // --- Smart Filtering Logic ---
  const visibleUsers = users.filter(user => {
      // 0. Heads Only Filter
      if (showHeadsOnly) {
          const isHead = user.role.includes('מנהל') || user.role.includes('ראש') || user.role.includes('VP') || user.role.includes('מנכ') || user.role.includes('סמנכ');
          if (!isHead) return false;
      }

      // 1. If Global Admin: Show based on dropdown filter
      if (isGlobalAdmin) {
          if (selectedDepartment !== 'All') {
              return user.department === selectedDepartment;
          }
          return true;
      }
      
      // 2. If Department Manager: Show ONLY their department
      if (hasPermission('manage_team')) {
          return user.department === myDepartment || user.id === currentUser.id;
      }

      // 3. Regular Employee: Show only themselves
      return user.id === currentUser.id;
  });

  // Unassigned tasks created by current user
  const myUnassignedTasks = tasks.filter((t: any) => 
      (!t.assigneeIds || t.assigneeIds.length === 0) && 
      t.creatorId === currentUser.id &&
      t.status !== Status.DONE && 
      t.status !== Status.CANCELED
  );

  const getWorkloadData = (user: User) => {
    const activeTasks = tasks.filter((t: any) => 
        (t.assigneeIds?.includes(user.id)) && isActiveTask(t.status)
    );
    const count = activeTasks.length;
    const maxCapacity = user.capacity || 5; 
    const percentage = Math.min((count / maxCapacity) * 100, 100);
    const streak = user.streakDays || 0;
    
    // Performance vs Role Average (Mock calculation)
    const roleAvg = 70; // Arbitrary 70% efficiency
    const userEfficiency = Math.min(100, Math.round((activeTasks.filter((t: any) => t.status === Status.DONE).length / (user.targets?.tasksMonth || 1)) * 100) || 75);
    const performanceDiff = userEfficiency - roleAvg;

    let statusColor = 'bg-green-500';
    if (percentage >= 100) statusColor = 'bg-red-500';
    else if (percentage >= 75) statusColor = 'bg-orange-500';
    else if (percentage >= 50) statusColor = 'bg-yellow-500';

    return { activeTasks, count, percentage, statusColor, maxCapacity, streak, performanceDiff };
  };

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, userId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      const task = tasks.find((t: any) => t.id === taskId);
      if (task) {
          const currentAssignees = task.assigneeIds || [];
          if (!currentAssignees.includes(userId)) {
              updateTask(taskId, { 
                  assigneeIds: [...currentAssignees, userId],
                  status: task.status === Status.BACKLOG ? Status.TODO : task.status
              });
              addToast(`המשימה הוקצתה בהצלחה`, 'success');
          }
      }
    }
  };

  // --- Handlers ---

  const openAddModal = () => {
      setEditingUser(undefined);
      setModalMode('add');
      setIsMemberModalOpen(true);
  };

  const openEditModal = (user: User) => {
      // Check if user can edit this user
      const editCheck = canEditUser(user);
      if (!editCheck.canEdit) {
          addToast(editCheck.tooltip, 'error');
          return;
      }
      setEditingUser(user);
      setModalMode('edit');
      setIsMemberModalOpen(true);
  };

  const handleSaveMember = async (formData: any) => {
      if (!formData.name) return;

      try {
          if (modalMode === 'add') {
              // Validate email for new users
              if (!formData.email || !formData.email.trim()) {
                  addToast('נא להזין כתובת אימייל', 'error');
                  return;
              }

              // Create user via API
              const response = await fetch('/api/users', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      name: formData.name,
                      email: formData.email,
                      role: formData.role,
                      department: formData.department,
                      capacity: Number(formData.capacity),
                      paymentType: formData.paymentType,
                      hourlyRate: Number(formData.hourlyRate),
                      monthlySalary: Number(formData.monthlySalary),
                      commissionPct: Number(formData.commissionPct),
                      bonusPerTask: Number(formData.bonusPerTask)
                  })
              });

              if (!response.ok) {
                  let error;
                  try {
                      const errorText = await response.text();
                      error = errorText ? JSON.parse(errorText) : { error: 'Unknown error' };
                  } catch {
                      error = { error: 'Unknown error' };
                  }
                  throw new Error(error.error || 'שגיאה ביצירת המשתמש');
              }

              let result;
              try {
                  const resultText = await response.text();
                  result = resultText ? JSON.parse(resultText) : {};
              } catch (e) {
                  console.error('Error parsing response:', e);
                  throw new Error('שגיאה בקריאת תגובת השרת');
              }
              const newUser = result.user;
              
              // Send invitation email
              try {
                  const inviteResponse = await fetch('/api/users/invite', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          email: formData.email,
                          userId: newUser.id,
                          userName: formData.name,
                          department: formData.department,
                          role: formData.role
                      })
                  });

                  if (inviteResponse.ok) {
                      let inviteData;
                      try {
                          const inviteText = await inviteResponse.text();
                          inviteData = inviteText ? JSON.parse(inviteText) : { emailSent: false };
                      } catch (e) {
                          console.error('Error parsing invite response:', e);
                          inviteData = { emailSent: false };
                      }
                      if (inviteData.emailSent) {
                          addToast(`העובד נוסף והזמנה נשלחה למייל ${formData.email}`, 'success');
                      } else {
                          addToast('העובד נוסף, אך שליחת ההזמנה נכשלה', 'warning');
                      }
                  } else {
                      addToast('העובד נוסף, אך שליחת ההזמנה נכשלה', 'warning');
                  }
              } catch (inviteError) {
                  console.error('Error sending invitation:', inviteError);
                  addToast('העובד נוסף, אך שליחת ההזמנה נכשלה', 'warning');
              }

              // Update context
              addUser(newUser);
          } else if (editingUser) {
              // Update user via API
              await updateUserAPI(editingUser.id, {
                  name: formData.name,
                  role: formData.role,
                  department: formData.department,
                  capacity: Number(formData.capacity),
                  paymentType: formData.paymentType,
                  hourlyRate: Number(formData.hourlyRate),
                  monthlySalary: Number(formData.monthlySalary),
                  commissionPct: Number(formData.commissionPct),
                  bonusPerTask: Number(formData.bonusPerTask)
              });
              
              // Update context - this will trigger useEffect to sync local state
              // The context update will automatically sync to TeamView via useEffect
              updateUser(editingUser.id, {
                  name: formData.name,
                  role: formData.role,
                  department: formData.department,
                  capacity: Number(formData.capacity),
                  paymentType: formData.paymentType,
                  hourlyRate: Number(formData.hourlyRate),
                  monthlySalary: Number(formData.monthlySalary),
                  commissionPct: Number(formData.commissionPct),
                  bonusPerTask: Number(formData.bonusPerTask)
              });
              
              // Refresh local state from API to ensure consistency
              // This is a backup in case context doesn't update immediately
              try {
                  const fetchedUsers = await fetchUsers({
                      department: selectedDepartment !== 'All' ? selectedDepartment : undefined
                  });
                  if (fetchedUsers && fetchedUsers.length > 0) {
                      setUsers(fetchedUsers);
                      setCachedUsers(fetchedUsers);
                  }
              } catch (error) {
                  console.error('Failed to refresh users:', error);
                  // Context update should be enough - useEffect will sync
              }
              
              addToast('פרטי העובד עודכנו בהצלחה', 'success');
          }
          setIsMemberModalOpen(false);
      } catch (error: any) {
          console.error('Error saving member:', error);
          addToast(error.message || 'שגיאה בשמירת הפרטים', 'error');
      }
  };

  const handleDeleteClick = (userId: string, userName: string) => {
      setUserToDelete({ id: userId, name: userName });
      setActiveMenuId(null);
  };

  const confirmDelete = () => {
      if (userToDelete) {
          removeUser(userToDelete.id);
          setUserToDelete(null);
      }
  };

  const handleSwitchUser = (e: React.MouseEvent, userId: string) => {
      e.stopPropagation();
      switchUser(userId);
      navigate('/');
  };

  const handleBonusClick = () => {
      setIsBonusConfirmOpen(true);
  };

  const approveReward = () => {
      if (rewardRecommendation) {
          const user = users.find(u => u.id === rewardRecommendation.userId);
          const currentAccumulated = user?.accumulatedBonus || 0;
          
          addNotification({
              recipientId: rewardRecommendation.userId,
              type: 'reward',
              text: `🎉 קיבלת בונוס של ${rewardRecommendation.amount}₪! ${rewardRecommendation.reason}`,
              actorName: 'Nexus AI'
          });
          
          updateUser(rewardRecommendation.userId, { 
              pendingReward: undefined,
              accumulatedBonus: currentAccumulated + rewardRecommendation.amount
          });
          
          setRewardRecommendation(null);
          setIsBonusConfirmOpen(false);
          addToast('הבונוס אושר והתווסף לארנק העובד', 'success');
      }
  };

  const dismissReward = () => {
      if (rewardRecommendation) {
          updateUser(rewardRecommendation.userId, { pendingReward: undefined });
          setRewardRecommendation(null);
      }
  };

  const handleAssignNew = () => {
      openCreateTask({ assigneeId: assigningToUserId! });
      setAssigningToUserId(null);
  }

  const handleAssignExisting = (taskId: string) => {
      if (assigningToUserId) {
          const task = tasks.find((t: any) => t.id === taskId);
          const currentAssignees = task?.assigneeIds || [];
          if (!currentAssignees.includes(assigningToUserId)) {
              updateTask(taskId, {
                  assigneeIds: [...currentAssignees, assigningToUserId],
                  status: task?.status === Status.BACKLOG ? Status.TODO : task?.status
              });
              addToast('המשימה שויכה בהצלחה', 'success');
          }
          setAssigningToUserId(null);
      }
  };

  // Permissions Check
  const canManageTeam = hasPermission('manage_team');
  const canSwitchUser = isGlobalAdmin;
  
  // Check if user can edit a specific user (only Admin can edit CEO, only Super Admin can edit Admin)
  const canEditUser = (targetUser: User) => {
      if (!canManageTeam) return { canEdit: false, tooltip: '' };
      
      const ceoRoles = ['מנכ״ל', 'מנכ"ל', 'מנכל'];
      const adminRoles = ['אדמין'];
      const isTargetCEO = ceoRoles.includes(targetUser.role);
      const isTargetAdmin = adminRoles.includes(targetUser.role);
      const isCurrentUserAdmin = currentUser.role === 'אדמין' || currentUser.isSuperAdmin;
      const isCurrentUserSuperAdmin = currentUser.isSuperAdmin;
      
      // If target is CEO, only Admin can edit
      if (isTargetCEO && !isCurrentUserAdmin) {
          return { canEdit: false, tooltip: 'רק אדמין יכול לערוך מנכ״ל' };
      }
      
      // If target is Admin, only Super Admin can edit
      if (isTargetAdmin && !isCurrentUserSuperAdmin) {
          return { canEdit: false, tooltip: 'רק סופר אדמין יכול לערוך אדמין' };
      }
      
      return { canEdit: true, tooltip: '' };
  }; 

  return (
    <div className="w-full flex gap-4 md:gap-6 h-auto md:h-[calc(100vh-140px)] overflow-visible md:overflow-hidden pb-12 md:pb-0" style={{ touchAction: 'pan-y' }}>
      <DeleteConfirmationModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={confirmDelete}
        title="הסרת עובד"
        description="המשתמש יועבר לארכיון (סל המיחזור). ניתן לשחזר אותו משם."
        itemName={userToDelete?.name}
        isHardDelete={false}
      />

      <BonusConfirmationModal
        isOpen={isBonusConfirmOpen}
        onClose={() => setIsBonusConfirmOpen(false)}
        recommendation={rewardRecommendation}
        onConfirm={approveReward}
      />

      <TaskAssignmentModal
        isOpen={!!assigningToUserId}
        onClose={() => setAssigningToUserId(null)}
        userName={users.find((u) => u.id === assigningToUserId)?.name.split(" ")[0] || ""}
        unassignedTasks={myUnassignedTasks}
        onAssignNew={handleAssignNew}
        onAssignExisting={handleAssignExisting}
      />

      <TeamMemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        mode={modalMode}
        initialData={editingUser}
        onSave={handleSaveMember}
        roleDefinitions={availableRoles.length > 0 ? availableRoles : roleDefinitions}
        departments={departments}
        isGlobalAdmin={isGlobalAdmin}
        myDepartment={myDepartment}
      />

      <div className="flex-1 flex flex-col overflow-visible md:overflow-hidden max-w-7xl mx-auto w-full">
        {/* Header - Mobile Optimized */}
        <div className="pt-4 md:pt-6 pb-4 md:pb-6 border-b border-gray-100 shrink-0">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4 md:mb-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                  ניהול צוות
                </h1>
                {isRefreshing && (
                  <div className="flex items-center gap-2 px-2 md:px-3 py-1 bg-blue-50 border border-blue-200 rounded-full">
                    <RefreshCw size={12} className="md:w-3.5 md:h-3.5 text-blue-600 animate-spin" />
                    <span className="text-[10px] md:text-xs font-bold text-blue-700">מתעדכן...</span>
                  </div>
                )}
              </div>
              <p className="text-gray-500 text-xs md:text-sm">
                {isGlobalAdmin
                  ? 'מבט-על למנכ"ל: כל המחלקות, כל העובדים.'
                  : `אזור ניהול ממוקד למחלקת ${myDepartment}.`}
              </p>
            </div>
          </div>
          
          {/* Tabs - Mobile Optimized */}
          <div className="flex gap-1 md:gap-2 border-b border-gray-200 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setActiveTab('workload')}
              className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-bold transition-all border-b-2 whitespace-nowrap shrink-0 active:scale-95 ${
                activeTab === 'workload'
                  ? 'text-gray-900 border-gray-900'
                  : 'text-gray-500 border-transparent active:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-1.5 md:gap-2">
                <BarChart3 size={14} className="md:w-4 md:h-4" />
                <span className="hidden sm:inline">ניהול עומסים</span><span className="sm:hidden">עומסים</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-bold transition-all border-b-2 whitespace-nowrap shrink-0 active:scale-95 ${
                activeTab === 'invitations'
                  ? 'text-gray-900 border-gray-900'
                  : 'text-gray-500 border-transparent active:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-1.5 md:gap-2">
                <UserPlus size={14} className="md:w-4 md:h-4" />
                <span className="hidden sm:inline">הזמנת עובדים</span><span className="sm:hidden">הזמנות</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-bold transition-all border-b-2 whitespace-nowrap shrink-0 active:scale-95 ${
                activeTab === 'events'
                  ? 'text-gray-900 border-gray-900'
                  : 'text-gray-500 border-transparent active:text-gray-700'
              }`}
              aria-label="אירועי צוות"
            >
              <div className="flex items-center gap-1.5 md:gap-2">
                <Calendar size={14} className="md:w-4 md:h-4" />
                <span className="hidden sm:inline">אירועי צוות</span><span className="sm:hidden">אירועים</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('leave')}
              className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-bold transition-all border-b-2 whitespace-nowrap shrink-0 active:scale-95 ${
                activeTab === 'leave'
                  ? 'text-gray-900 border-gray-900'
                  : 'text-gray-500 border-transparent active:text-gray-700'
              }`}
              aria-label="בקשות חופש"
            >
              <div className="flex items-center gap-1.5 md:gap-2">
                <CalendarDays size={14} className="md:w-4 md:h-4" />
                <span className="hidden sm:inline">בקשות חופש</span><span className="sm:hidden">חופש</span>
              </div>
            </button>
          </div>
        </div>

        {/* Filters & Actions Bar - Mobile Optimized */}
          {activeTab === 'workload' && (
          <div className="px-0 py-3 md:py-4 border-b border-gray-100 bg-gray-50/30 shrink-0">
            <div className="flex flex-col gap-3">
              {/* Filters Row */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              {/* Global Admin Filter */}
              {isGlobalAdmin && (
                  <div className="relative z-10 w-full md:w-48">
                  <CustomSelect
                    value={selectedDepartment}
                    onChange={setSelectedDepartment}
                    options={[
                      { value: "All", label: "כל המחלקות", icon: <Building2 size={14} /> },
                      ...departments.map((d: any) => ({
                        value: d,
                        label: d,
                        icon: <div className="w-2 h-2 rounded-full bg-gray-400" />,
                      })),
                    ]}
                    className="text-sm font-bold shadow-sm"
                  />
                </div>
              )}

              {/* Show Heads Only Toggle */}
              {isGlobalAdmin && (
                <button
                  onClick={() => setShowHeadsOnly(!showHeadsOnly)}
                    className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all border shrink-0 w-full md:w-auto justify-center active:scale-95 ${
                    showHeadsOnly
                      ? "bg-black text-white border-gray-200 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 active:border-gray-300 shadow-sm"
                  }`}
                >
                    <Shield size={14} className="md:w-4 md:h-4 shrink-0" /> 
                  <span>ראשי מחלקות</span>
                </button>
              )}

                <div className="flex-1 hidden md:block" />
              </div>

              {/* Actions Row */}
              <div className="flex gap-2 w-full">
              <button
                onClick={() => navigate('/settings?tab=team')}
                  className="bg-white border border-gray-200 text-gray-600 active:text-black active:border-gray-300 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-sm flex items-center gap-1.5 md:gap-2 transition-all shrink-0 flex-1 md:flex-none justify-center active:scale-95"
                title="הגדרות צוות"
              >
                  <Settings size={14} className="md:w-[18px] md:h-[18px]" />
                <span className="hidden sm:inline">הגדרות</span>
              </button>

              {canManageTeam && (
                <button
                  onClick={openAddModal}
                    className="bg-black text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-lg flex items-center gap-1.5 md:gap-2 hover:bg-gray-800 active:scale-95 transition-all shrink-0 flex-1 md:flex-none justify-center"
                >
                    <UserPlus size={14} className="md:w-[18px] md:h-[18px]" />
                  <span>הוסף עובד</span>
                </button>
              )}
              </div>
            </div>
            </div>
          )}

        {/* Tab Content */}
        <div className="flex-1 overflow-visible md:overflow-hidden min-h-0 pt-6">
          {activeTab === 'workload' && (
            <>
              {/* AI Reward Recommendation (Gamification) - Mobile Optimized */}
              <AnimatePresence>
                {rewardRecommendation && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 p-4 md:p-5 rounded-2xl md:rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 shadow-sm mb-4 md:mb-6 shrink-0"
                  >
                    <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                      <div className="w-9 h-9 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-yellow-500 shrink-0">
                        <Trophy size={18} className="md:w-5 md:h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-purple-900 text-xs md:text-sm leading-tight">
                          המלצת Nexus AI: לפנק את {rewardRecommendation.userName}
                        </h4>
                        <p className="text-[10px] md:text-xs text-purple-700 mt-0.5 line-clamp-2">{rewardRecommendation.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                      <div className="text-right">
                        <span className="block text-[9px] md:text-[10px] font-bold text-purple-400 uppercase">בונוס מוצע</span>
                        <span className="text-base md:text-lg font-black text-purple-900">₪{rewardRecommendation.amount}</span>
                      </div>
                      {canApproveBonus ? (
                        <button
                          onClick={handleBonusClick}
                          className="bg-purple-600 text-white px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-bold hover:bg-purple-700 active:scale-95 transition-all shadow-sm"
                        >
                          אשר בונוס
                        </button>
                      ) : (
                        <div className="bg-gray-200 text-gray-500 px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-bold cursor-not-allowed flex items-center gap-1">
                          <Lock size={10} className="md:w-3 md:h-3" /> <span className="hidden sm:inline">מוגבל למנהלים</span><span className="sm:hidden">מוגבל</span>
                        </div>
                      )}
                      <button
                        onClick={dismissReward}
                        className="p-1.5 md:p-2 text-purple-400 active:text-purple-600 active:bg-purple-100 rounded-lg transition-all active:scale-95"
                      >
                        <X size={14} className="md:w-4 md:h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 overflow-visible md:overflow-hidden min-h-0">
                {/* Team Grid - Main Content */}
                <div className="flex-1 overflow-y-auto no-scrollbar pb-12 md:pb-10 min-w-0">
                  {visibleUsers.length === 0 ? (
                    <div className="text-center py-12 md:py-20 bg-white rounded-2xl md:rounded-xl border border-dashed border-gray-200 text-gray-600">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users size={32} className="md:w-12 md:h-12 text-gray-400" />
                      </div>
                      <h3 className="text-base md:text-lg font-black text-gray-900 mb-2">לא נמצאו עובדים להצגה</h3>
                      <p className="text-sm md:text-base text-gray-500 mb-4">
                        {isGlobalAdmin && selectedDepartment !== "All" 
                          ? "נסה לשנות את פילטר המחלקה."
                          : "התחל על ידי הוספת עובד חדש לצוות."}
                      </p>
                      {canManageTeam && (
                        <button
                          onClick={openAddModal}
                          className="bg-black text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-gray-800 active:scale-95 transition-all mx-auto"
                        >
                          <UserPlus size={18} /> הוסף עובד ראשון
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 md:gap-6">
                    {visibleUsers.map((user) => {
                      const workloadData = getWorkloadData(user);
                      const isOverloaded = workloadData.percentage >= 100;
                      const isMenuOpen = activeMenuId === user.id;
                      const editCheck = canEditUser(user);

                      return (
                          <TeamMemberCard
                            key={user.id}
                            user={user}
                            workloadData={workloadData}
                            isOverloaded={isOverloaded}
                            isMenuOpen={isMenuOpen}
                            canManageTeam={canManageTeam}
                            canEditUser={editCheck.canEdit}
                            editTooltip={editCheck.tooltip}
                            canSwitchUser={canSwitchUser}
                            isCurrentUser={user.id === currentUser.id}
                            onToggleMenu={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(isMenuOpen ? null : user.id);
                            }}
                            onEdit={() => {
                              openEditModal(user);
                              setActiveMenuId(null);
                            }}
                            onDelete={(e) => {
                              handleDeleteClick(user.id, user.name);
                            }}
                            onSwitchUser={(e) => handleSwitchUser(e, user.id)}
                            onAssignClick={() => setAssigningToUserId(user.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, user.id)}
                          />
                      );
                    })}
                    </div>
                  )}
                </div>

                {/* Unassigned Tasks Sidebar (Right Sidebar) - Hidden on mobile */}
                <div className="hidden md:block shrink-0">
                  <UnassignedTasksSidebar tasks={myUnassignedTasks} onDragStart={handleDragStart} />
                </div>
              </div>
            </>
          )}

          {activeTab === 'invitations' && (
            <div className="h-full overflow-y-auto pb-4 md:pb-10">
              <EmployeeInvitationsPanel addToast={addToast} />
            </div>
          )}

          {activeTab === 'events' && (
            <div className="h-full overflow-y-auto pb-4 md:pb-10">
              <TeamEventsPanel addToast={addToast} currentUser={currentUser} users={allUsers || users} />
            </div>
          )}

          {activeTab === 'leave' && (
            <div className="h-full overflow-y-auto pb-4 md:pb-10">
              <LeaveRequestsPanel addToast={addToast} currentUser={currentUser} users={allUsers || users} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};