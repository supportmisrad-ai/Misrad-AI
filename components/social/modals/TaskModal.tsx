'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { SocialTask } from '@/types/social';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

export default function TaskModal() {
  const { 
    isTaskModalOpen, 
    setIsTaskModalOpen, 
    editingTask,
    setEditingTask,
    clients,
    team,
    tasks,
    setTasks,
    addToast 
  } = useApp();
  useBackButtonClose(isTaskModalOpen, () => setIsTaskModalOpen(false));

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [type, setType] = useState<'approval' | 'message' | 'creative' | 'general' | 'payment'>('general');
  const [isSaving, setIsSaving] = useState(false);
  
  // Dropdown states
  const [openDropdown, setOpenDropdown] = useState<'client' | 'assigned' | 'priority' | 'type' | null>(null);
  const dropdownRefs = {
    client: useRef<HTMLDivElement>(null),
    assigned: useRef<HTMLDivElement>(null),
    priority: useRef<HTMLDivElement>(null),
    type: useRef<HTMLDivElement>(null),
  };

  // Refs for form fields
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const clientDropdownRef = useRef<HTMLButtonElement>(null);
  const assignedDropdownRef = useRef<HTMLButtonElement>(null);
  const priorityDropdownRef = useRef<HTMLButtonElement>(null);
  const typeDropdownRef = useRef<HTMLButtonElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  // Handle Enter key to move to next field
  const handleKeyDown = (e: React.KeyboardEvent, nextField?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement | null>, onEnter?: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (onEnter) {
        onEnter();
      } else if (nextField?.current) {
        if (nextField.current instanceof HTMLButtonElement) {
          if (!nextField.current.disabled) {
            nextField.current.click();
          }
        } else {
          nextField.current.focus();
        }
      }
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const ref = dropdownRefs[openDropdown];
        if (ref.current && !ref.current.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setClientId(editingTask.clientId || '');
      setAssignedTo(editingTask.assignedTo || '');
      setPriority(editingTask.priority);
      setType(editingTask.type);
    } else {
      setTitle('');
      setDescription('');
      setClientId('');
      setAssignedTo('');
      setPriority('medium');
      setType('general');
    }
  }, [editingTask, isTaskModalOpen]);

  if (!isTaskModalOpen) return null;

  const handleSave = () => {
    if (!title) {
      addToast('נא למלא כותרת', 'error');
      return;
    }

    setIsSaving(true);
    setTimeout(() => {
      if (editingTask) {
        setTasks(prev => prev.map(t => 
          t.id === editingTask.id 
            ? { ...t, title, description, clientId, assignedTo, priority, type } as SocialTask
            : t
        ));
        addToast('המשימה עודכנה בהצלחה');
      } else {
        const newTask: SocialTask = {
          id: `t-${Date.now()}`,
          clientId: clientId || undefined,
          assignedTo: assignedTo || undefined,
          title,
          description,
          dueDate: 'היום',
          priority,
          status: 'todo',
          type
        };
        setTasks(prev => [newTask, ...prev]);
        addToast('משימה חדשה נוספה לרשימה');
      }
      setIsSaving(false);
      handleClose();
    }, 500);
  };

  const handleClose = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-start sm:items-center justify-center p-0 sm:p-2 md:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" onClick={handleClose}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-none sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col min-h-screen sm:min-h-0 max-h-screen sm:max-h-[95vh] my-0 sm:my-4"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <div className="p-8 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-2xl font-black">{editingTask ? 'ערוך משימה' : 'משימה חדשה'}</h2>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <X size={24}/>
          </button>
        </div>

        <div className="p-10 flex-1 overflow-y-auto overflow-x-visible">
          <div className="flex flex-col gap-6">
            <div>
              <label className="block text-sm font-black text-slate-400 mb-2">כותרת *</label>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, descriptionRef)}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:ring-4 ring-blue-50"
                placeholder="כותרת המשימה"
              />
            </div>

            <div>
              <label className="block text-sm font-black text-slate-400 mb-2">תיאור</label>
              <textarea
                ref={descriptionRef}
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={(e) => {
                  // Allow Shift+Enter for new line, Enter alone moves to next field
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    clientDropdownRef.current?.focus();
                  }
                }}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 h-32"
                placeholder="תיאור המשימה"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* לקוח Dropdown */}
              <div className="relative" ref={dropdownRefs.client}>
                <label className="block text-sm font-black text-slate-400 mb-2">לקוח</label>
                <button
                  ref={clientDropdownRef}
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'client' ? null : 'client')}
                  onKeyDown={(e) => handleKeyDown(e, assignedDropdownRef)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:ring-4 ring-blue-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
                >
                  <span className={clientId ? 'text-slate-900' : 'text-slate-400'}>
                    {clientId ? clients.find(c => c.id === clientId)?.companyName || 'בחר לקוח' : 'בחר לקוח'}
                  </span>
                  <ChevronDown size={20} className={`text-slate-400 transition-transform ${openDropdown === 'client' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openDropdown === 'client' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 z-[300] max-h-60 overflow-y-auto"
                    >
                      <button
                        onClick={() => {
                          setClientId('');
                          setOpenDropdown(null);
                        }}
                        className={`w-full px-6 py-3 text-right font-black text-sm transition-colors ${
                          !clientId ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        בחר לקוח
                      </button>
                  {clients.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setClientId(c.id);
                            setOpenDropdown(null);
                          }}
                          className={`w-full px-6 py-3 text-right font-black text-sm transition-colors border-t border-slate-100 ${
                            clientId === c.id ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {c.companyName}
                        </button>
                  ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* מוקצה ל Dropdown */}
              <div className="relative" ref={dropdownRefs.assigned}>
                <label className="block text-sm font-black text-slate-400 mb-2">מוקצה ל</label>
                <button
                  ref={assignedDropdownRef}
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'assigned' ? null : 'assigned')}
                  onKeyDown={(e) => handleKeyDown(e, priorityDropdownRef)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:ring-4 ring-blue-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
                >
                  <span className={assignedTo ? 'text-slate-900' : 'text-slate-400'}>
                    {assignedTo ? team.find(m => m.id === assignedTo)?.name || 'בחר חבר צוות' : 'בחר חבר צוות'}
                  </span>
                  <ChevronDown size={20} className={`text-slate-400 transition-transform ${openDropdown === 'assigned' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openDropdown === 'assigned' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 z-[300] max-h-60 overflow-y-auto"
                    >
                      <button
                        onClick={() => {
                          setAssignedTo('');
                          setOpenDropdown(null);
                        }}
                        className={`w-full px-6 py-3 text-right font-black text-sm transition-colors ${
                          !assignedTo ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        בחר חבר צוות
                      </button>
                  {team.map(m => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setAssignedTo(m.id);
                            setOpenDropdown(null);
                          }}
                          className={`w-full px-6 py-3 text-right font-black text-sm transition-colors border-t border-slate-100 ${
                            assignedTo === m.id ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {m.name}
                        </button>
                  ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* עדיפות Dropdown */}
              <div className="relative" ref={dropdownRefs.priority}>
                <label className="block text-sm font-black text-slate-400 mb-2">עדיפות</label>
                <button
                  ref={priorityDropdownRef}
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'priority' ? null : 'priority')}
                  onKeyDown={(e) => handleKeyDown(e, typeDropdownRef)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:ring-4 ring-blue-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
                >
                  <span className="text-slate-900">
                    {priority === 'low' ? 'נמוכה' : priority === 'medium' ? 'בינונית' : 'גבוהה'}
                  </span>
                  <ChevronDown size={20} className={`text-slate-400 transition-transform ${openDropdown === 'priority' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openDropdown === 'priority' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full mb-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 z-[300]"
                    >
                      {(['low', 'medium', 'high'] as const).map(p => (
                        <button
                          key={p}
                          onClick={() => {
                            setPriority(p);
                            setOpenDropdown(null);
                          }}
                          className={`w-full px-6 py-3 text-right font-black text-sm transition-colors border-b border-slate-100 last:border-0 ${
                            priority === p ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {p === 'low' ? 'נמוכה' : p === 'medium' ? 'בינונית' : 'גבוהה'}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* סוג Dropdown */}
              <div className="relative" ref={dropdownRefs.type}>
                <label className="block text-sm font-black text-slate-400 mb-2">סוג</label>
                <button
                  ref={typeDropdownRef}
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
                  onKeyDown={(e) => handleKeyDown(e, saveButtonRef)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:ring-4 ring-blue-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
                >
                  <span className="text-slate-900">
                    {type === 'general' ? 'כללי' : 
                     type === 'approval' ? 'אישור' : 
                     type === 'message' ? 'הודעה' : 
                     type === 'creative' ? 'קריאייטיב' : 'תשלום'}
                  </span>
                  <ChevronDown size={20} className={`text-slate-400 transition-transform ${openDropdown === 'type' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openDropdown === 'type' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full mb-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 z-[300] max-h-60 overflow-y-auto"
                    >
                      {([
                        { value: 'general', label: 'כללי' },
                        { value: 'approval', label: 'אישור' },
                        { value: 'message', label: 'הודעה' },
                        { value: 'creative', label: 'קריאייטיב' },
                        { value: 'payment', label: 'תשלום' }
                      ] as const).map((t, index) => (
                        <button
                          key={t.value}
                          onClick={() => {
                            setType(t.value);
                            setOpenDropdown(null);
                          }}
                          className={`w-full px-6 py-3 text-right font-black text-sm transition-colors ${
                            index > 0 ? 'border-t border-slate-100' : ''
                          } ${
                            type === t.value ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-200 flex gap-4">
          <button
            onClick={handleClose}
            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black"
          >
            ביטול
          </button>
          <button
            ref={saveButtonRef}
            onClick={handleSave}
            disabled={!title || isSaving}
            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isSaving ? (
              <>שומר...</>
            ) : (
              <>
                <Save size={20} />
                שמור
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

