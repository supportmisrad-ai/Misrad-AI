'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useSecureAPI } from '../hooks/useSecureAPI';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Status, User, RoleDefinition } from '../types';
import { Settings, UserPlus, Trophy, X, Shield, Building2, Users, Lock, Calendar, CalendarDays, BarChart3, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getWorkspaceOrgSlugFromPathname, useNexusNavigation, useNexusSoloMode } from '@/lib/os/nexus-routing';
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
import { Skeleton } from '@/components/ui/skeletons';
import { isAdminRole, isCeoRole, isTenantAdminRole } from '@/lib/constants/roles';
import { createNexusUser, deleteNexusUser, listNexusUsers, sendNexusUserInvitation, updateNexusUser } from '@/app/actions/nexus';

// Helper to check if a task is "active" (contributes to workload)
const isActiveTask = (status: string) => 
    status !== Status.DONE && status !== Status.CANCELED && status !== Status.BACKLOG;

export const TeamView: React.FC = () => {
  const { tasks, updateTask, openCreateTask, addUser, updateUser, removeUser, switchUser, roleDefinitions, currentUser, hasPermission, addNotification, addToast, departments, users: allUsers } = useData();
  const { fetchRoles } = useSecureAPI();
  const queryClient = useQueryClient();
  const [users, setUsers] = useState<User[]>(allUsers || []);
  const [availableRoles, setAvailableRoles] = useState<RoleDefinition[]>(roleDefinitions || []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastAllUsersRef = useRef<User[] | null>(null);
  const handledNewEmployeeRef = useRef(false);
  const { navigate, pathname } = useNexusNavigation();
  const orgSlug = useMemo(() => getWorkspaceOrgSlugFromPathname(pathname), [pathname]);
  const teamSize = Array.isArray(allUsers) ? allUsers.length : (Array.isArray(users) ? users.length : null);
  const { isSoloMode } = useNexusSoloMode(orgSlug, teamSize);

  // HIERARCHY LOGIC
  // Super Admin: system admin, sees everything across all tenants
  const isSuperAdmin = currentUser.isSuperAdmin === true;
  // Tenant Admin: CEO/Admin within their tenant, sees everything within their tenant
  const isTenantAdmin = !isSuperAdmin && isTenantAdminRole(currentUser.role);
  // Combined: sees all users/tasks within their scope (Super Admin sees all tenants, Tenant Admin sees their tenant)
  const isGlobalAdmin = isSuperAdmin || isTenantAdmin;
  const myDepartment = currentUser.department;
  const canApproveBonus = hasPermission('view_financials');

  // Filter State (For Global Admin only)
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [showHeadsOnly, setShowHeadsOnly] = useState(false);

  const usersQuery = useQuery({
      queryKey: ['nexus', 'users', orgSlug, selectedDepartment],
      queryFn: async () => {
          return listNexusUsers({
              orgId: orgSlug as string,
              department: selectedDepartment !== 'All' ? selectedDepartment : undefined,
              page: 1,
              pageSize: 200,
          });
      },
      enabled: Boolean(orgSlug),
      staleTime: 30_000,
      refetchInterval: 60_000,
      retry: 1,
  });

  const createUserMutation = useMutation({
      mutationFn: async (input: Omit<User, 'id'>) => {
          if (!orgSlug) throw new Error('Missing orgSlug');
          return createNexusUser({ orgId: orgSlug, input });
      },
  });

  const updateUserMutation = useMutation({
      mutationFn: async (params: { userId: string; updates: Partial<User> }) => {
          if (!orgSlug) throw new Error('Missing orgSlug');
          return updateNexusUser({ orgId: orgSlug, userId: params.userId, updates: params.updates });
      },
  });

  const deleteUserMutation = useMutation({
      mutationFn: async (userId: string) => {
          if (!orgSlug) throw new Error('Missing orgSlug');
          return deleteNexusUser({ orgId: orgSlug, userId });
      },
  });

  const inviteUserMutation = useMutation({
      mutationFn: async (params: { email: string; userId?: string | null; userName?: string | null; department?: string | null; role?: string | null }) => {
          if (!orgSlug) throw new Error('Missing orgSlug');
          return sendNexusUserInvitation({ orgId: orgSlug, ...params });
      },
  });

  // Modal State
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);

  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [rewardRecommendation, setRewardRecommendation] = useState<{ userId: string; userName: string; avatar?: string; reason?: string; amount?: number; type?: string } | null>(null);
  const [isBonusConfirmOpen, setIsBonusConfirmOpen] = useState(false);
  const [assigningToUserId, setAssigningToUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'workload' | 'invitations' | 'events' | 'leave'>('workload');

  useEffect(() => {
      if (typeof window === 'undefined') return;
      if (handledNewEmployeeRef.current) return;
      const url = new URL(window.location.href);
      if (url.searchParams.get('newEmployee') !== '1') return;

      handledNewEmployeeRef.current = true;

      if (isSoloMode) {
          addToast('מצב סולו פעיל — ניהול צוות מוסתר.', 'info');
      } else {
          setEditingUser(undefined);
          setModalMode('add');
          setIsMemberModalOpen(true);
      }

      url.searchParams.delete('newEmployee');
      const nextSearch = url.searchParams.toString();
      window.history.replaceState({}, '', `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`);
  }, [isSoloMode, addToast]);

  useEffect(() => {
      const loadRoles = async () => {
          try {
              const roles = await fetchRoles();
              if (roles && roles.length > 0) {
                  setAvailableRoles(roles);
              } else if (roleDefinitions && roleDefinitions.length > 0) {
                  setAvailableRoles(roleDefinitions);
              }
          } catch {
              if (roleDefinitions && roleDefinitions.length > 0) {
                  setAvailableRoles(roleDefinitions);
              }
          }
      };

      if (roleDefinitions && roleDefinitions.length > 0) {
          setAvailableRoles(roleDefinitions);
      }
      loadRoles();
  }, [roleDefinitions, fetchRoles]);

  useEffect(() => {
      if (allUsers && allUsers.length > 0) {
          const currentIds = allUsers.map((u: User) => u.id).sort().join(',');
          const lastIds = lastAllUsersRef.current?.map((u: User) => u.id).sort().join(',') || '';

          let hasChanges = false;
          if (lastAllUsersRef.current) {
              if (currentIds !== lastIds) {
                  hasChanges = true;
              } else {
                  for (const user of allUsers) {
                      const lastUser = lastAllUsersRef.current.find((u: User) => u.id === user.id);
                      if (!lastUser) {
                          hasChanges = true;
                          break;
                      }
                      if (
                          user.name !== lastUser.name ||
                          user.role !== lastUser.role ||
                          user.department !== lastUser.department ||
                          user.capacity !== lastUser.capacity
                      ) {
                          hasChanges = true;
                          break;
                      }
                  }
              }
          } else {
              hasChanges = true;
          }

          if (hasChanges) {
              setUsers(allUsers);
              lastAllUsersRef.current = allUsers;
          }
      } else if (allUsers && allUsers.length === 0 && lastAllUsersRef.current) {
          setUsers([]);
          lastAllUsersRef.current = null;
      }
  }, [allUsers]);

  useEffect(() => {
      const list = (usersQuery.data as { users?: User[] })?.users;
      if (Array.isArray(list)) {
          setUsers(list);
          lastAllUsersRef.current = list;
      }
  }, [usersQuery.data]);

  useEffect(() => {
      setIsRefreshing(Boolean(usersQuery.isFetching));
  }, [usersQuery.isFetching]);

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

  useEffect(() => {
      const bestUser = users.find((u: User) => u?.pendingReward);
      if (bestUser && !rewardRecommendation) {
          setTimeout(() => {
              setRewardRecommendation({
                  userId: bestUser.id,
                  userName: bestUser.name,
                  avatar: bestUser.avatar,
                  reason: bestUser.pendingReward?.reason,
                  amount: bestUser.pendingReward?.suggestedBonus,
                  type: bestUser.pendingReward?.type,
              });
          }, 1000);
      }
  }, [users, rewardRecommendation]);

  const visibleUsers = users.filter((user: User) => {
      if (showHeadsOnly) {
          const roleStr = String(user.role || '');
          const isHead =
              roleStr.includes('מנהל') ||
              roleStr.includes('ראש') ||
              roleStr.includes('VP') ||
              roleStr.includes('סמנכ') ||
              isCeoRole(user.role) ||
              isAdminRole(user.role);
          if (!isHead) return false;
      }

      if (isGlobalAdmin) {
          if (selectedDepartment !== 'All') {
              return user.department === selectedDepartment;
          }
          return true;
      }

      if (hasPermission('manage_team')) {
          return user.department === myDepartment || user.id === currentUser.id;
      }

      return user.id === currentUser.id;
  });

  const myUnassignedTasks = tasks.filter((t) =>
      (!t.assigneeIds || t.assigneeIds.length === 0) &&
      t.creatorId === currentUser.id &&
      t.status !== Status.DONE &&
      t.status !== Status.CANCELED
  );

  const getWorkloadData = (user: User) => {
      const activeTasks = tasks.filter((t) =>
          (t.assigneeIds?.includes(user.id)) && isActiveTask(t.status)
      );
      const count = activeTasks.length;
      const maxCapacity = user.capacity || 5;
      const percentage = Math.min((count / maxCapacity) * 100, 100);
      const streak = user.streakDays || 0;

      const roleAvg = 70;
      const userEfficiency =
          Math.min(
              100,
              Math.round((activeTasks.filter((t) => t.status === Status.DONE).length / (user.targets?.tasksMonth || 1)) * 100) || 75
          );
      const performanceDiff = userEfficiency - roleAvg;

      let statusColor = 'bg-green-500';
      if (percentage >= 100) statusColor = 'bg-red-500';
      else if (percentage >= 75) statusColor = 'bg-orange-500';
      else if (percentage >= 50) statusColor = 'bg-yellow-500';

      return { activeTasks, count, percentage, statusColor, maxCapacity, streak, performanceDiff };
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
      e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, userId: string) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('taskId');
      if (taskId) {
          const task = tasks.find((t) => t.id === taskId);
          if (task) {
              const currentAssignees = task.assigneeIds || [];
              if (!currentAssignees.includes(userId)) {
                  updateTask(taskId, {
                      assigneeIds: [...currentAssignees, userId],
                      status: task.status === Status.BACKLOG ? Status.TODO : task.status,
                  });
                  addToast(`המשימה הוקצתה בהצלחה`, 'success');
              }
          }
      }
  };

  const canManageTeam = hasPermission('manage_team') && !isSoloMode;
  const canSwitchUser = isGlobalAdmin;

  const canEditUser = (targetUser: User) => {
      if (!canManageTeam) return { canEdit: false, tooltip: '' };

      const isTargetCEO = isCeoRole(targetUser.role);
      const isTargetAdmin = isAdminRole(targetUser.role);
      const isCurrentUserAdmin = isAdminRole(currentUser.role) || currentUser.isSuperAdmin;
      const isCurrentUserSuperAdmin = currentUser.isSuperAdmin;

      if (isTargetCEO && !isCurrentUserAdmin) {
          return { canEdit: false, tooltip: 'רק אדמין יכול לערוך מנכ״ל' };
      }

      if (isTargetAdmin && !isCurrentUserSuperAdmin) {
          return { canEdit: false, tooltip: 'רק סופר אדמין יכול לערוך אדמין' };
      }

      return { canEdit: true, tooltip: '' };
  };

  const openAddModal = () => {
      setEditingUser(undefined);
      setModalMode('add');
      setIsMemberModalOpen(true);
  };

  const openEditModal = (user: User) => {
      const editCheck = canEditUser(user);
      if (!editCheck.canEdit) {
          addToast(editCheck.tooltip, 'error');
          return;
      }
      setEditingUser(user);
      setModalMode('edit');
      setIsMemberModalOpen(true);
  };

  const handleSaveMember = async (formData: Partial<User> & { name: string }) => {
      if (!formData?.name) return;

      try {
          if (modalMode === 'add') {
              if (!formData.email || !String(formData.email).trim()) {
                  addToast('נא להזין כתובת אימייל', 'error');
                  return;
              }

              const newUser = await createUserMutation.mutateAsync({
                  name: formData.name,
                  email: formData.email,
                  role: formData.role,
                  department: formData.department,
                  avatar: '',
                  online: false,
                  capacity: Number(formData.capacity),
                  paymentType: formData.paymentType,
                  hourlyRate: Number(formData.hourlyRate),
                  monthlySalary: Number(formData.monthlySalary),
                  commissionPct: Number(formData.commissionPct),
                  bonusPerTask: Number(formData.bonusPerTask),
                  managerId: formData.managerId || null,
              } as User);

              try {
                  const inviteData = await inviteUserMutation.mutateAsync({
                      email: formData.email,
                      userId: newUser.id,
                      userName: formData.name,
                      department: formData.department,
                      role: formData.role,
                  });
                  if (inviteData.emailSent) {
                      addToast(`העובד נוסף והזמנה נשלחה למייל ${formData.email}`, 'success');
                  } else {
                      addToast('העובד נוסף, אך שליחת ההזמנה נכשלה', 'warning');
                  }
              } catch (inviteError) {
                  console.error('Error sending invitation:', inviteError);
                  addToast('העובד נוסף, אך שליחת ההזמנה נכשלה', 'warning');
              }

              addUser(newUser);
              if (orgSlug) {
                  queryClient.invalidateQueries({ queryKey: ['nexus', 'users', orgSlug] });
              }
          } else if (editingUser) {
              const updated = await updateUserMutation.mutateAsync({
                  userId: editingUser.id,
                  updates: {
                      name: formData.name,
                      role: formData.role,
                      department: formData.department,
                      capacity: Number(formData.capacity),
                      paymentType: formData.paymentType,
                      hourlyRate: Number(formData.hourlyRate),
                      monthlySalary: Number(formData.monthlySalary),
                      commissionPct: Number(formData.commissionPct),
                      bonusPerTask: Number(formData.bonusPerTask),
                      managerId: formData.managerId,
                  },
              });

              updateUser(editingUser.id, updated);
              if (orgSlug) {
                  queryClient.invalidateQueries({ queryKey: ['nexus', 'users', orgSlug] });
              }
              addToast('פרטי העובד עודכנו בהצלחה', 'success');
          }

          setIsMemberModalOpen(false);
      } catch (error: unknown) {
          console.error('Error saving member:', error);
          addToast(error instanceof Error ? error.message : 'שגיאה בשמירת הפרטים', 'error');
      }
  };

  const handleDeleteClick = (userId: string, userName: string) => {
      setUserToDelete({ id: userId, name: userName });
      setActiveMenuId(null);
  };

  const confirmDelete = async () => {
      if (!userToDelete) return;
      try {
          await deleteUserMutation.mutateAsync(userToDelete.id);
          removeUser(userToDelete.id);
          if (orgSlug) {
              queryClient.invalidateQueries({ queryKey: ['nexus', 'users', orgSlug] });
          }
      } catch (error: unknown) {
          addToast(error instanceof Error ? error.message : 'שגיאה במחיקת המשתמש', 'error');
      } finally {
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
              text: `🎉 קיבלת בונוס של ${rewardRecommendation.amount || 0}₪! ${rewardRecommendation.reason}`,
              actorName: 'Nexus AI'
          });
          
          updateUser(rewardRecommendation.userId, { 
              pendingReward: undefined,
              accumulatedBonus: currentAccumulated + (rewardRecommendation.amount || 0)
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
          const task = tasks.find((t) => t.id === taskId);
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

  useEffect(() => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      const tab = url.searchParams.get('tab');
      if (tab === 'leave' || tab === 'events' || tab === 'invitations' || tab === 'workload') {
          setActiveTab(tab);
      }
  }, []);

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
        recommendation={rewardRecommendation as unknown as { amount: number; userName: string } | null}
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
        onSave={handleSaveMember as unknown as (data: unknown) => void}
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
                    <Skeleton className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full" />
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
                      ...departments.map((d: string) => ({
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