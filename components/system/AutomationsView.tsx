'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Bot, Zap, Plus, Save, Trash2, Workflow, CheckCircle2, 
    ArrowRight, AlertCircle, Clock, CheckSquare, FileText, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './contexts/ToastContext';
import { Lead, Task, PipelineStage } from './types';
import { STAGES } from './constants';
import useLocalStorage from './hooks/useLocalStorage';

interface SimpleAutomation {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    type: 'lead_created' | 'status_changed';
    status?: PipelineStage; // Only if type is 'status_changed'
  };
  action: {
    type: 'create_task' | 'add_note';
    taskTitle?: string;
    taskDueDays?: number;
    taskPriority?: 'low' | 'medium' | 'high' | 'critical';
    noteText?: string;
  };
  stats: {
    runs: number;
    lastRun: Date | null;
  };
}

interface AutomationsViewProps {
  leads: Lead[];
  onAddTask: (task: Task) => void;
  onAddActivity: (leadId: string, activity: any) => void;
  onStatusChange?: (leadId: string, newStatus: PipelineStage) => void;
}

const AutomationsView: React.FC<AutomationsViewProps> = ({ 
  leads, 
  onAddTask, 
  onAddActivity,
  onStatusChange 
}) => {
  const { addToast } = useToast();
  const [automations, setAutomations] = useLocalStorage<SimpleAutomation[]>('automations_v1', []);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<SimpleAutomation, 'id' | 'stats'>>({
    name: '',
    enabled: true,
    trigger: {
      type: 'lead_created'
    },
    action: {
      type: 'create_task',
      taskTitle: '',
      taskDueDays: 1,
      taskPriority: 'medium'
    }
  });

  // Dropdown states
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target as Node)) {
        setIsPriorityDropdownOpen(false);
      }
    };

    if (isStatusDropdownOpen || isPriorityDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isStatusDropdownOpen, isPriorityDropdownOpen]);

  // Track previous leads to detect changes
  const prevLeadsRef = useRef<Map<string, { status: PipelineStage; createdAt: number }>>(new Map());
  const initializedRef = useRef(false);

  // Initialize on mount - skip existing leads to avoid false positives
  useEffect(() => {
    if (!initializedRef.current && leads.length > 0) {
      // Initialize with current leads - these are "old" leads, don't trigger automations
      prevLeadsRef.current = new Map(
        leads.map(l => [l.id, { status: l.status, createdAt: l.createdAt.getTime() }])
      );
      initializedRef.current = true;
    } else if (leads.length === 0) {
      initializedRef.current = true;
    }
  }, []);

  // Execute automations when leads change (only after initialization)
  useEffect(() => {
    if (!onAddTask || !onAddActivity || !initializedRef.current) return;

    const currentLeadsMap = new Map(
      leads.map(l => [l.id, { status: l.status, createdAt: l.createdAt.getTime() }])
    );

    automations.filter(a => a.enabled).forEach(automation => {
      leads.forEach(lead => {
        const prevLead = prevLeadsRef.current.get(lead.id);
        const currentLead = currentLeadsMap.get(lead.id);

        if (!prevLead && currentLead) {
          // New lead detected - check if automation should run
          // Only run if lead was created very recently (within last 60 seconds) to handle page reloads
          if (automation.trigger.type === 'lead_created') {
            const now = Date.now();
            const created = lead.createdAt.getTime();
            const secondsDiff = (now - created) / 1000;
            if (secondsDiff >= 0 && secondsDiff < 60) {
              executeAutomation(automation, lead);
            }
          }
        } else if (prevLead && currentLead) {
          // Existing lead - check for status change
          if (automation.trigger.type === 'status_changed' && 
              automation.trigger.status && 
              prevLead.status !== currentLead.status &&
              currentLead.status === automation.trigger.status) {
            executeAutomation(automation, lead);
          }
        }
      });
    });

    // Update ref after processing
    prevLeadsRef.current = currentLeadsMap;
  }, [leads, automations, onAddTask, onAddActivity]);

  const executeAutomation = (automation: SimpleAutomation, lead: Lead) => {
    if (!onAddTask || !onAddActivity) return;
    
    // Prevent duplicate runs using localStorage key with trigger type
    const triggerSuffix = automation.trigger.type === 'lead_created' 
      ? 'created' 
      : `${automation.trigger.type}_${automation.trigger.status}`;
    const runKey = `automation_${automation.id}_lead_${lead.id}_${triggerSuffix}`;
    
    try {
      const lastRun = localStorage.getItem(runKey);
      if (lastRun) {
        // Check if this is a very recent run (within last 5 seconds) to prevent rapid duplicates
        const lastRunTime = parseInt(lastRun);
        if (Date.now() - lastRunTime < 5000) {
          return; // Already ran very recently for this lead/trigger combination
        }
      }
      
      if (automation.action.type === 'create_task') {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (automation.action.taskDueDays || 1));
        
        onAddTask({
          id: `task_${Date.now()}_${automation.id}`,
          title: automation.action.taskTitle || 'משימה אוטומטית',
          assigneeId: lead.assignedAgentId || 'u1',
          dueDate,
          priority: automation.action.taskPriority || 'medium',
          status: 'todo',
          tags: ['אוטומטי', lead.name]
        });
      } else if (automation.action.type === 'add_note') {
        onAddActivity(lead.id, {
          id: `note_${Date.now()}_${automation.id}`,
          type: 'system',
          content: automation.action.noteText || 'הערה אוטומטית',
          timestamp: new Date()
        });
      }

      // Update stats (use functional update to avoid dependency issues)
      setAutomations(prev => prev.map(a => 
        a.id === automation.id 
          ? { 
              ...a, 
              stats: { 
                runs: (a.stats.runs || 0) + 1, 
                lastRun: new Date() 
              } 
            }
          : a
      ));

      // Mark as run with timestamp
      localStorage.setItem(runKey, Date.now().toString());
      
    } catch (error) {
      console.error('Automation execution failed:', error);
    }
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      addToast('יש להזין שם לאוטומציה', 'error');
      return;
    }

    if (!formData.action.taskTitle?.trim() && formData.action.type === 'create_task') {
      addToast('יש להזין כותרת למשימה', 'error');
      return;
    }

    if (!formData.action.noteText?.trim() && formData.action.type === 'add_note') {
      addToast('יש להזין טקסט להערה', 'error');
      return;
    }

    if (editingId) {
      setAutomations(prev => prev.map(a => 
        a.id === editingId 
          ? { ...a, ...formData }
          : a
      ));
      addToast('האוטומציה עודכנה', 'success');
    } else {
      const newAutomation: SimpleAutomation = {
        id: `auto_${Date.now()}`,
        ...formData,
        stats: { runs: 0, lastRun: null }
      };
      setAutomations(prev => [...prev, newAutomation]);
      addToast('אוטומציה חדשה נוצרה!', 'success');
    }

    setIsCreating(false);
    setEditingId(null);
    resetForm();
  };

  const handleEdit = (automation: SimpleAutomation) => {
    setFormData({
      name: automation.name,
      enabled: automation.enabled,
      trigger: automation.trigger,
      action: automation.action
    });
    setEditingId(automation.id);
    setIsCreating(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק את האוטומציה?')) {
      setAutomations(prev => prev.filter(a => a.id !== id));
      addToast('האוטומציה נמחקה', 'success');
    }
  };

  const handleToggle = (id: string) => {
    setAutomations(prev => prev.map(a => 
      a.id === id ? { ...a, enabled: !a.enabled } : a
    ));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      enabled: true,
      trigger: { type: 'lead_created' },
      action: {
        type: 'create_task',
        taskTitle: '',
        taskDueDays: 1,
        taskPriority: 'medium'
      }
    });
    setEditingId(null);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    resetForm();
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 flex items-center gap-3">
            <Workflow className="text-indigo-600" size={32} />
            טייס אוטומטי
          </h2>
          <p className="text-slate-500 font-medium mt-2 text-lg">
            הגדר פעולות אוטומטיות שיפעלו במערכת שלך
          </p>
        </div>
        
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-nexus-gradient hover:opacity-90 text-white px-6 py-3 rounded-2xl font-bold shadow-lg transition-all flex items-center gap-2"
          >
            <Plus size={18} /> צור אוטומציה חדשה
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 md:p-8 mb-8">
          <h3 className="text-xl font-black text-slate-800 mb-6">
            {editingId ? 'ערוך אוטומציה' : 'אוטומציה חדשה'}
          </h3>

          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="text-sm font-bold text-slate-700 mb-2 block">
                שם האוטומציה
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="לדוגמה: מעקב אוטומטי ללידים חדשים"
                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
              />
            </div>

            {/* Trigger */}
            <div>
              <label className="text-sm font-bold text-slate-700 mb-3 block flex items-center gap-2">
                <Zap size={16} className="text-amber-500" />
                מתי זה קורה? (תנאי)
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="radio"
                    name="trigger"
                    checked={formData.trigger.type === 'lead_created'}
                    onChange={() => setFormData({ 
                      ...formData, 
                      trigger: { type: 'lead_created' } 
                    })}
                    className="w-4 h-4 text-primary"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-slate-800">ליד נפתח</div>
                    <div className="text-xs text-slate-500">כאשר נפתח ליד במערכת</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="radio"
                    name="trigger"
                    checked={formData.trigger.type === 'status_changed'}
                    onChange={() => setFormData({ 
                      ...formData, 
                      trigger: { type: 'status_changed', status: 'won' } 
                    })}
                    className="w-4 h-4 text-primary"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-slate-800">סטטוס שונה</div>
                    <div className="text-xs text-slate-500">כאשר משנים את סטטוס הליד</div>
                  </div>
                </label>

                {formData.trigger.type === 'status_changed' && (
                  <div className="mr-8 mt-2 relative" ref={statusDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                      className={`w-full flex items-center justify-between bg-white border rounded-xl px-4 py-3 shadow-sm hover:border-primary transition-all text-right ${
                        isStatusDropdownOpen 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="font-bold text-slate-800 text-sm">
                        {STAGES.find(s => s.id === (formData.trigger.status || 'won'))?.label || 'בחר סטטוס'}
                      </span>
                      <ChevronDown 
                        size={18} 
                        className={`text-slate-300 transition-transform duration-300 shrink-0 ${
                          isStatusDropdownOpen ? 'rotate-180 text-primary' : ''
                        }`} 
                      />
                    </button>

                    <AnimatePresence>
                      {isStatusDropdownOpen && (
                        <>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40"
                            onClick={() => setIsStatusDropdownOpen(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 origin-top overflow-hidden ring-1 ring-slate-900/5"
                          >
                            {STAGES.map((stage) => (
                              <button
                                key={stage.id}
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    trigger: { 
                                      type: 'status_changed', 
                                      status: stage.id as PipelineStage 
                                    }
                                  });
                                  setIsStatusDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-all text-right border-b border-slate-50 last:border-b-0 ${
                                  formData.trigger.status === stage.id ? 'bg-primary/5' : ''
                                }`}
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <div 
                                    className={`w-3 h-3 rounded-full ${
                                      formData.trigger.status === stage.id 
                                        ? `${stage.accent} border-2 ${String((stage as any)?.accent ?? '').replace('bg-', 'border-')}`
                                        : 'border-2 border-slate-300 bg-transparent'
                                    }`}
                                  />
                                  <span className="font-bold text-slate-800 text-sm">{stage.label}</span>
                                </div>
                                {formData.trigger.status === stage.id && (
                                  <CheckCircle2 size={18} className="text-primary shrink-0" />
                                )}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* Action */}
            <div>
              <label className="text-sm font-bold text-slate-700 mb-3 block flex items-center gap-2">
                <CheckSquare size={16} className="text-primary" />
                מה לעשות? (פעולה)
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="radio"
                    name="action"
                    checked={formData.action.type === 'create_task'}
                    onChange={() => setFormData({
                      ...formData,
                      action: {
                        type: 'create_task',
                        taskTitle: formData.action.taskTitle || 'מעקב לליד',
                        taskDueDays: formData.action.taskDueDays || 1,
                        taskPriority: formData.action.taskPriority || 'medium'
                      }
                    })}
                    className="w-4 h-4 text-primary"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-slate-800">צור משימה</div>
                    <div className="text-xs text-slate-500">יצירת משימה חדשה</div>
                  </div>
                </label>

                {formData.action.type === 'create_task' && (
                  <div className="mr-8 space-y-4 bg-white p-4 rounded-xl border border-primary/20">
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">כותרת המשימה</label>
                      <input
                        type="text"
                        value={formData.action.taskTitle || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          action: { ...formData.action, taskTitle: e.target.value }
                        })}
                        placeholder="לדוגמה: להגיע לליד"
                        className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">יעד (ימים)</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.action.taskDueDays || 1}
                          onChange={(e) => setFormData({
                            ...formData,
                            action: { ...formData.action, taskDueDays: parseInt(e.target.value) || 1 }
                          })}
                          className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="relative" ref={priorityDropdownRef}>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">עדיפות</label>
                        <button
                          type="button"
                          onClick={() => setIsPriorityDropdownOpen(!isPriorityDropdownOpen)}
                          className={`w-full flex items-center justify-between bg-white border rounded-lg px-3 py-2.5 shadow-sm hover:border-primary transition-all text-right text-sm ${
                            isPriorityDropdownOpen 
                              ? 'border-primary ring-2 ring-primary/20' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="font-bold text-slate-800">
                            {formData.action.taskPriority === 'low' ? 'נמוכה' :
                             formData.action.taskPriority === 'medium' ? 'בינונית' :
                             formData.action.taskPriority === 'high' ? 'גבוהה' :
                             formData.action.taskPriority === 'critical' ? 'קריטית' : 'בינונית'}
                          </span>
                          <ChevronDown 
                            size={16} 
                            className={`text-slate-300 transition-transform duration-300 shrink-0 ${
                              isPriorityDropdownOpen ? 'rotate-180 text-primary' : ''
                            }`} 
                          />
                        </button>

                        <AnimatePresence>
                          {isPriorityDropdownOpen && (
                            <>
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-40"
                                onClick={() => setIsPriorityDropdownOpen(false)}
                              />
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 origin-top overflow-hidden ring-1 ring-slate-900/5"
                              >
                                {[
                                  { value: 'low', label: 'נמוכה', color: 'text-slate-600' },
                                  { value: 'medium', label: 'בינונית', color: 'text-blue-600' },
                                  { value: 'high', label: 'גבוהה', color: 'text-amber-600' },
                                  { value: 'critical', label: 'קריטית', color: 'text-red-600' }
                                ].map((priority) => (
                                  <button
                                    key={priority.value}
                                    type="button"
                                    onClick={() => {
                                      setFormData({
                                        ...formData,
                                        action: { ...formData.action, taskPriority: priority.value as any }
                                      });
                                      setIsPriorityDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-all text-right border-b border-slate-50 last:border-b-0 ${
                                      formData.action.taskPriority === priority.value ? 'bg-primary/5' : ''
                                    }`}
                                  >
                                    <span className={`font-bold text-sm ${priority.color}`}>
                                      {priority.label}
                                    </span>
                                    {formData.action.taskPriority === priority.value && (
                                      <CheckCircle2 size={18} className="text-primary shrink-0" />
                                    )}
                                  </button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="radio"
                    name="action"
                    checked={formData.action.type === 'add_note'}
                    onChange={() => setFormData({
                      ...formData,
                      action: {
                        type: 'add_note',
                        noteText: formData.action.noteText || 'הערה אוטומטית'
                      }
                    })}
                    className="w-4 h-4 text-primary"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-slate-800">הוסף הערה</div>
                    <div className="text-xs text-slate-500">הוספת הערה אוטומטית לליד</div>
                  </div>
                </label>

                {formData.action.type === 'add_note' && (
                  <div className="mr-8 mt-2">
                    <textarea
                      value={formData.action.noteText || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        action: { ...formData.action, noteText: e.target.value }
                      })}
                      placeholder="הטקסט שיופיע בהערה האוטומטית"
                      rows={3}
                      className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-3 bg-nexus-gradient text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {editingId ? 'שמור שינויים' : 'צור אוטומציה'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Automations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {automations.map(automation => (
          <div
            key={automation.id}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg hover:shadow-xl transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-2xl ${automation.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                <Bot size={24} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(automation.id)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${
                    automation.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    automation.enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}></div>
                </button>
              </div>
            </div>

            <h3 className="font-black text-slate-800 text-lg mb-2">{automation.name}</h3>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                <span className="text-slate-600 font-medium">
                  {automation.trigger.type === 'lead_created' 
                    ? 'ליד נפתח'
                    : `סטטוס שונה ל-${STAGES.find(s => s.id === automation.trigger.status)?.label}`
                  }
                </span>
              </div>
              <ArrowRight size={16} className="text-slate-300 mr-4" />
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span className="text-slate-600 font-medium">
                  {automation.action.type === 'create_task'
                    ? `צור משימה: ${automation.action.taskTitle}`
                    : `הוסף הערה: ${automation.action.noteText?.substring(0, 30)}...`
                  }
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <Clock size={12} /> {automation.stats.runs} ביצועים
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(automation)}
                  className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <FileText size={16} />
                </button>
                <button
                  onClick={() => handleDelete(automation.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {automations.length === 0 && !isCreating && (
          <div className="col-span-full text-center py-12">
            <Bot size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium mb-2">אין אוטומציות מוגדרות</p>
            <p className="text-sm text-slate-400">צור אוטומציה ראשונה כדי שהמערכת תעבוד בשבילך</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutomationsView;
