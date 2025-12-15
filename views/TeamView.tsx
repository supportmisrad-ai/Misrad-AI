import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Status, User } from '../types';
import { Settings, UserPlus, Trophy, X, Shield, Building2, Users, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { CustomSelect } from '../components/CustomSelect';
import { TeamMemberModal } from '../components/team/TeamMemberModal';
import { BonusConfirmationModal } from '../components/team/BonusConfirmationModal';
import { TaskAssignmentModal } from '../components/team/TaskAssignmentModal';
import { TeamMemberCard } from '../components/team/TeamMemberCard';
import { UnassignedTasksSidebar } from '../components/team/UnassignedTasksSidebar';

// Helper to check if a task is "active" (contributes to workload)
const isActiveTask = (status: string) => 
    status !== Status.DONE && status !== Status.CANCELED && status !== Status.BACKLOG;

export const TeamView: React.FC = () => {
  const { tasks, users, updateTask, openCreateTask, addUser, updateUser, removeUser, switchUser, roleDefinitions, currentUser, hasPermission, addNotification, addToast, departments } = useData();
  const navigate = useNavigate();
  
  // HIERARCHY LOGIC
  const isGlobalAdmin = currentUser.isSuperAdmin || currentUser.role === 'מנכ״ל' || currentUser.role === 'אדמין';
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

  // Close menu when clicking outside
  useEffect(() => {
      const handleClickOutside = () => setActiveMenuId(null);
      if (activeMenuId) {
          document.addEventListener('click', handleClickOutside);
      }
      return () => document.removeEventListener('click', handleClickOutside);
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
  const myUnassignedTasks = tasks.filter(t => 
      (!t.assigneeIds || t.assigneeIds.length === 0) && 
      t.creatorId === currentUser.id &&
      t.status !== Status.DONE && 
      t.status !== Status.CANCELED
  );

  const getWorkloadData = (user: User) => {
    const activeTasks = tasks.filter(t => 
        (t.assigneeIds?.includes(user.id)) && isActiveTask(t.status)
    );
    const count = activeTasks.length;
    const maxCapacity = user.capacity || 5; 
    const percentage = Math.min((count / maxCapacity) * 100, 100);
    const streak = user.streakDays || 0;
    
    // Performance vs Role Average (Mock calculation)
    const roleAvg = 70; // Arbitrary 70% efficiency
    const userEfficiency = Math.min(100, Math.round((activeTasks.filter(t => t.status === Status.DONE).length / (user.targets?.tasksMonth || 1)) * 100) || 75);
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
      const task = tasks.find(t => t.id === taskId);
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
      setEditingUser(user);
      setModalMode('edit');
      setIsMemberModalOpen(true);
  };

  const handleSaveMember = (formData: any) => {
      if (!formData.name) return;

      if (modalMode === 'add') {
          const newUser: User = {
              id: `U-${Date.now()}`,
              name: formData.name,
              role: formData.role,
              department: formData.department,
              avatar: formData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random`,
              online: false,
              capacity: Number(formData.capacity),
              paymentType: formData.paymentType,
              hourlyRate: Number(formData.hourlyRate),
              monthlySalary: Number(formData.monthlySalary),
              commissionPct: Number(formData.commissionPct),
              bonusPerTask: Number(formData.bonusPerTask),
              accumulatedBonus: 0
          };
          addUser(newUser);
      } else if (editingUser) {
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
      }
      setIsMemberModalOpen(false);
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
          const task = tasks.find(t => t.id === taskId);
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

  return (
    <div className="w-full flex gap-6 h-[calc(100vh-140px)]">
      
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
          userName={users.find(u => u.id === assigningToUserId)?.name.split(' ')[0] || ''}
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
          roleDefinitions={roleDefinitions}
          departments={departments}
          isGlobalAdmin={isGlobalAdmin}
          myDepartment={myDepartment}
      />

      <div className="flex-1 flex flex-col overflow-hidden max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 shrink-0">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                    {isGlobalAdmin ? 'ניהול עומסים ארגוני' : `ניהול צוות ${myDepartment || ''}`}
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                    {isGlobalAdmin 
                        ? 'מבט-על למנכ"ל: כל המחלקות, כל העובדים.' 
                        : `אזור ניהול ממוקד למחלקת ${myDepartment}.`}
                </p>
            </div>
            <div className="flex gap-2 items-center">
                {/* Global Admin Filter */}
                {isGlobalAdmin && (
                    <div className="relative z-10 w-48">
                        <CustomSelect 
                            value={selectedDepartment}
                            onChange={setSelectedDepartment}
                            options={[
                                { value: 'All', label: 'כל המחלקות', icon: <Building2 size={14} /> },
                                ...departments.map(d => ({ value: d, label: d, icon: <div className="w-2 h-2 rounded-full bg-gray-400" /> }))
                            ]}
                            className="text-sm font-bold shadow-sm"
                        />
                    </div>
                )}

                {/* Show Heads Only Toggle */}
                {isGlobalAdmin && (
                    <button 
                        onClick={() => setShowHeadsOnly(!showHeadsOnly)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${showHeadsOnly ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                    >
                        <Shield size={14} /> ראשי מחלקות
                    </button>
                )}

                <button 
                    onClick={() => navigate('/settings', { state: { initialTab: 'team' } })}
                    className="bg-white border border-gray-200 text-gray-600 hover:text-black hover:border-gray-300 px-3 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-all"
                    title="הגדרות צוות"
                >
                    <Settings size={18} />
                </button>
                
                {canManageTeam && (
                    <button 
                        onClick={openAddModal}
                        className="bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 hover:bg-gray-800 transition-all"
                    >
                        <UserPlus size={18} />
                        <span className="hidden sm:inline">הוסף עובד</span>
                    </button>
                )}
            </div>
        </div>

        {/* AI Reward Recommendation (Gamification) */}
        <AnimatePresence>
            {rewardRecommendation && (
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 p-4 rounded-xl flex items-center justify-between shadow-sm mb-6 shrink-0"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-yellow-500">
                            <Trophy size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-purple-900 text-sm">המלצת Nexus AI: לפנק את {rewardRecommendation.userName}</h4>
                            <p className="text-xs text-purple-700">{rewardRecommendation.reason}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <span className="block text-[10px] font-bold text-purple-400 uppercase">בונוס מוצע</span>
                            <span className="text-lg font-black text-purple-900">₪{rewardRecommendation.amount}</span>
                        </div>
                        {canApproveBonus ? (
                            <button onClick={handleBonusClick} className="bg-purple-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors shadow-sm">
                                אשר בונוס
                            </button>
                        ) : (
                            <div className="bg-gray-200 text-gray-500 px-3 py-2 rounded-lg text-xs font-bold cursor-not-allowed flex items-center gap-1">
                                <Lock size={12} /> מוגבל למנהלים
                            </div>
                        )}
                        <button onClick={dismissReward} className="p-2 text-purple-400 hover:text-purple-600 hover:bg-purple-100 rounded-lg">
                            <X size={16} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
            {/* Team Grid - Main Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                    {visibleUsers.map(user => {
                        const workloadData = getWorkloadData(user);
                        const isOverloaded = workloadData.percentage >= 100;
                        const isMenuOpen = activeMenuId === user.id;

                        return (
                            <TeamMemberCard 
                                key={user.id}
                                user={user}
                                workloadData={workloadData}
                                isOverloaded={isOverloaded}
                                isMenuOpen={isMenuOpen}
                                canManageTeam={canManageTeam}
                                canSwitchUser={canSwitchUser}
                                isCurrentUser={user.id === currentUser.id}
                                onToggleMenu={(e) => { e.stopPropagation(); setActiveMenuId(isMenuOpen ? null : user.id); }}
                                onEdit={() => { openEditModal(user); setActiveMenuId(null); }}
                                onDelete={(e) => { handleDeleteClick(user.id, user.name); }}
                                onSwitchUser={(e) => handleSwitchUser(e, user.id)}
                                onAssignClick={() => setAssigningToUserId(user.id)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, user.id)}
                            />
                        );
                    })}
                </div>
                
                {visibleUsers.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400">
                        <Users size={48} className="mx-auto mb-4 opacity-20" />
                        <p>לא נמצאו עובדים להצגה.</p>
                        {isGlobalAdmin && selectedDepartment !== 'All' && <p className="text-xs">נסה לשנות את פילטר המחלקה.</p>}
                    </div>
                )}
            </div>

            {/* Unassigned Tasks Sidebar (Right Sidebar) */}
            <UnassignedTasksSidebar 
                tasks={myUnassignedTasks} 
                onDragStart={handleDragStart} 
            />
        </div>
    </div>
  );
};