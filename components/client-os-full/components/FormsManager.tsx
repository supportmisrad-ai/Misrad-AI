'use client';

import React, { useState } from 'react';
import { FormTemplate, FormField, FormStep, FieldType } from '../types';
import { generateFormTemplate } from '../services/geminiService';
import { GlowButton } from './ui/GlowButton';
import { Eye, Plus, Trash2, GripVertical, CircleCheckBig, Link, FileText, ChevronLeft, Upload, LayoutList, Layers, ChevronRight, X, Copy, Edit2, CirclePlay, Calendar, Settings2, MoreHorizontal, Sparkles, ArrowRight } from 'lucide-react';
import { CustomSelect } from '@/components/CustomSelect';

// --- MOCK TEMPLATES ---
const MOCK_TEMPLATES: FormTemplate[] = [];

export const FormsManager: React.FC = () => {
  const [templates, setTemplates] = useState<FormTemplate[]>(MOCK_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null); // Changed to nullable for mobile
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  
  // AI Generator State
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Editor State
  const activeTemplate = templates.find(t => t.id === selectedTemplateId);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  // Set default selection for Desktop only if not selected
  React.useEffect(() => {
      if (window.innerWidth >= 1024 && !selectedTemplateId && templates.length > 0) {
          setSelectedTemplateId(templates[0].id);
          const firstStep = templates[0].steps?.[0];
          setEditingStepId(firstStep?.id || null);
      }
  }, []);

  // Preview State
  const [previewStepIndex, setPreviewStepIndex] = useState(0);

  // --- ACTIONS ---

  const handleCreateNew = () => {
      const newTemplate: FormTemplate = {
          id: `new-${Date.now()}`,
          title: 'טופס חדש',
          description: '',
          isActive: false,
          category: 'ONBOARDING',
          steps: [{ id: `s-${Date.now()}`, title: 'שלב 1', fields: [] }]
      };
      setTemplates([...templates, newTemplate]);
      setSelectedTemplateId(newTemplate.id);
      setEditingStepId(newTemplate.steps[0].id);
  };

  const handleGenerateAI = async () => {
      if (!aiPrompt.trim()) return;
      setIsGenerating(true);
      try {
          const newTemplate = await generateFormTemplate(aiPrompt);
          const ensuredTemplate: FormTemplate = {
              ...newTemplate,
              steps: Array.isArray(newTemplate.steps) && newTemplate.steps.length > 0
                  ? newTemplate.steps
                  : [{ id: `s-${Date.now()}`, title: 'שלב 1', fields: [] }],
          };
          setTemplates(prev => [ensuredTemplate, ...prev]);
          setSelectedTemplateId(ensuredTemplate.id);
          setEditingStepId(ensuredTemplate.steps[0].id);
          setShowAIGenerator(false);
          setAiPrompt('');
      } catch (e) {
          console.error(e);
      } finally {
          setIsGenerating(false);
      }
  };

  const handleUpdateTemplate = (updates: Partial<FormTemplate>) => {
      setTemplates(prev => prev.map(t => t.id === selectedTemplateId ? { ...t, ...updates } : t));
  };

  const handleAddStep = () => {
      if (!activeTemplate) return;
      const newStep: FormStep = {
          id: `s-${Date.now()}`,
          title: `שלב ${activeTemplate.steps.length + 1}`,
          fields: []
      };
      const updatedSteps = [...activeTemplate.steps, newStep];
      handleUpdateTemplate({ steps: updatedSteps });
      setEditingStepId(newStep.id);
  };

  const handleRemoveStep = (stepId: string) => {
      if (!activeTemplate || activeTemplate.steps.length <= 1) return; // Prevent deleting last step
      const updatedSteps = activeTemplate.steps.filter(s => s.id !== stepId);
      handleUpdateTemplate({ steps: updatedSteps });
      setEditingStepId(updatedSteps[0].id);
  };

  const handleUpdateStep = (stepId: string, updates: Partial<FormStep>) => {
      if (!activeTemplate) return;
      const updatedSteps = activeTemplate.steps.map(s => s.id === stepId ? { ...s, ...updates } : s);
      handleUpdateTemplate({ steps: updatedSteps });
  };

  const handleAddField = (stepId: string) => {
      if (!activeTemplate) return;
      const newField: FormField = {
          id: `f-${Date.now()}`,
          label: 'שאלה חדשה',
          type: 'TEXT',
          required: false,
          placeholder: ''
      };
      
      const updatedSteps = activeTemplate.steps.map(s => {
          if (s.id === stepId) {
              return { ...s, fields: [...s.fields, newField] };
          }
          return s;
      });
      handleUpdateTemplate({ steps: updatedSteps });
  };

  const handleUpdateField = (stepId: string, fieldId: string, updates: Partial<FormField>) => {
      if (!activeTemplate) return;
      const updatedSteps = activeTemplate.steps.map(s => {
          if (s.id === stepId) {
              const updatedFields = s.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f);
              return { ...s, fields: updatedFields };
          }
          return s;
      });
      handleUpdateTemplate({ steps: updatedSteps });
  };

  const handleRemoveField = (stepId: string, fieldId: string) => {
      if (!activeTemplate) return;
      const updatedSteps = activeTemplate.steps.map(s => {
          if (s.id === stepId) {
              return { ...s, fields: s.fields.filter(f => f.id !== fieldId) };
          }
          return s;
      });
      handleUpdateTemplate({ steps: updatedSteps });
  };

  const handleCopyLink = () => {
      setShowShareSuccess(true);
      setTimeout(() => setShowShareSuccess(false), 2000);
  };

  const handleBackToList = () => {
      setSelectedTemplateId(null);
  };

  // --- PREVIEW RENDER ---
  if (isPreviewMode && activeTemplate) {
    const currentStep = activeTemplate.steps[previewStepIndex];
    const progress = ((previewStepIndex + 1) / activeTemplate.steps.length) * 100;

    return (
      <div className="fixed inset-0 z-50 bg-[#FAFAFA] overflow-y-auto animate-fade-in flex flex-col font-sans">
          {/* Top Bar */}
          <div className="w-full bg-white/80 backdrop-blur-md border-b border-gray-200 py-4 px-6 flex justify-between items-center sticky top-0 z-20">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-nexus-primary rounded-lg flex items-center justify-center text-white font-bold font-display shadow-lg shadow-nexus-primary/20">N</div>
              </div>
              <div className="flex items-center gap-4">
                 <span className="text-[10px] font-bold tracking-widest text-nexus-muted bg-gray-100 px-3 py-1 rounded-full border border-gray-200 uppercase">תצוגה מקדימה</span>
                 <button 
                    onClick={() => { setIsPreviewMode(false); setPreviewStepIndex(0); }}
                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-nexus-primary transition-colors bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-200"
                 >
                    <X size={16} /> סגור
                 </button>
              </div>
          </div>

          <div className="flex-1 flex justify-center py-12 px-4">
              <div className="w-full max-w-2xl animate-slide-up">
                  
                  {/* Progress Indicator */}
                  <div className="mb-8 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-nexus-accent transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
                      </div>
                      <span className="text-xs font-bold text-gray-400 font-mono">
                          {previewStepIndex + 1} / {activeTemplate.steps.length}
                      </span>
                  </div>

                  {/* Header */}
                  <div className="mb-10 text-center">
                      <h1 className="text-4xl font-display font-bold text-nexus-primary mb-3 tracking-tight">
                          {previewStepIndex === 0 ? activeTemplate.title : currentStep.title}
                      </h1>
                      <p className="text-lg text-gray-500 font-light max-w-lg mx-auto leading-relaxed">
                          {previewStepIndex === 0 ? activeTemplate.description : currentStep.description}
                      </p>
                  </div>

                  {/* Fields Container */}
                  <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-white p-8 md:p-10 space-y-8 relative overflow-hidden">
                      {/* Decorative gradient */}
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-nexus-primary via-nexus-accent to-nexus-primary opacity-20"></div>

                      {currentStep.fields?.map((field) => (
                          <div key={field.id} className="space-y-3 group">
                              <label className="block text-lg font-medium text-gray-800 flex items-start gap-2">
                                  {field.label} 
                                  {field.required && <span className="text-nexus-accent text-sm mt-1">*</span>}
                              </label>
                              
                              <div className="relative">
                                {field.type === 'TEXT' && (
                                    <input type="text" className="w-full p-4 bg-gray-50 border-gray-200 border rounded-xl focus:bg-white focus:border-nexus-primary focus:ring-4 focus:ring-nexus-primary/5 transition-all outline-none text-gray-900 placeholder-gray-400" placeholder={field.placeholder || 'הקלד את תשובתך כאן...'} />
                                )}
                                
                                {field.type === 'TEXTAREA' && (
                                    <textarea className="w-full p-4 bg-gray-50 border-gray-200 border rounded-xl focus:bg-white focus:border-nexus-primary focus:ring-4 focus:ring-nexus-primary/5 transition-all outline-none text-gray-900 placeholder-gray-400 min-h-[140px] resize-none" placeholder={field.placeholder || 'הקלד את תשובתך כאן...'}></textarea>
                                )}
                                
                                {field.type === 'SELECT' && (
                                    <div className="relative">
                                        <CustomSelect
                                            value=""
                                            onChange={() => {}}
                                            placeholder="בחר אפשרות..."
                                            options={field.options?.map((opt) => ({ value: opt, label: opt })) || []}
                                        />
                                    </div>
                                )}

                                {field.type === 'RADIO' && (
                                    <div className="grid grid-cols-1 gap-3">
                                        {field.options?.map((opt, i) => (
                                            <label key={i} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-nexus-accent/30 transition-all group/radio">
                                                <div className="relative flex items-center justify-center">
                                                    <input type="radio" name={field.id} className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-full checked:border-nexus-accent checked:border-4 transition-all" />
                                                </div>
                                                <span className="text-gray-700 font-medium group-hover/radio:text-gray-900">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                                
                                {field.type === 'DATE' && (
                                    <div className="relative">
                                        <input type="date" className="w-full p-4 pl-12 bg-gray-50 border-gray-200 border rounded-xl focus:bg-white focus:border-nexus-primary focus:ring-4 focus:ring-nexus-primary/5 transition-all outline-none text-gray-900" />
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    </div>
                                )}

                                {field.type === 'UPLOAD' && (
                                    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-10 flex flex-col items-center justify-center text-gray-500 hover:text-nexus-primary hover:bg-nexus-primary/5 hover:border-nexus-primary/30 transition-all cursor-pointer group/upload">
                                        <div className="p-4 bg-white rounded-full shadow-sm mb-3 group-hover/upload:scale-110 transition-transform">
                                            <Upload size={24} className="text-nexus-accent" />
                                        </div>
                                        <span className="text-sm font-medium">לחץ להעלאת קובץ</span>
                                        <span className="text-xs text-gray-400 mt-1">או גרור ושחרר לכאן</span>
                                    </div>
                                )}
                              </div>
                              
                              {field.helperText && (
                                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5 px-1">
                                      <FileText size={12} /> {field.helperText}
                                  </p>
                              )}
                          </div>
                      ))}

                      {/* Navigation Buttons */}
                      <div className="pt-10 mt-6 border-t border-gray-100 flex justify-between items-center">
                         {previewStepIndex > 0 ? (
                             <button 
                                onClick={() => setPreviewStepIndex(prev => prev - 1)}
                                className="px-6 py-3 text-gray-500 font-bold hover:text-gray-800 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-2"
                             >
                                 <ChevronRight size={18} /> חזור
                             </button>
                         ) : <div></div>}

                         {previewStepIndex < activeTemplate.steps.length - 1 ? (
                             <button 
                                onClick={() => setPreviewStepIndex(prev => prev + 1)}
                                className="px-8 py-3.5 bg-nexus-primary text-white font-bold rounded-xl shadow-lg shadow-nexus-primary/20 hover:bg-nexus-accent hover:shadow-nexus-accent/30 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                             >
                                 המשך לשלב הבא <ChevronLeft size={18} />
                             </button>
                         ) : (
                             <button className="px-8 py-3.5 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 hover:bg-green-700 hover:-translate-y-0.5 transition-all flex items-center gap-2">
                                 שלח טופס <CircleCheckBig size={18} />
                             </button>
                         )}
                      </div>
                  </div>
              </div>
          </div>
      </div>
    );
  }

  // --- EDITOR RENDER ---
  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 bg-nexus-bg relative">
      
      {/* AI Generator Modal */}
      {showAIGenerator && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-lg flex flex-col items-center justify-center p-10 animate-fade-in">
              <div className="max-w-2xl w-full text-center">
                  <div className="w-16 h-16 bg-nexus-primary text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow-gold">
                      <Sparkles size={32} />
                  </div>
                  <h2 className="text-3xl font-bold text-nexus-primary mb-2">עזרי ל-AI לבנות לך טופס</h2>
                  <p className="text-gray-500 mb-8">תאר מה אתה צריך, והמערכת תבנה את הכל לבד.</p>
                  
                  <div className="relative">
                      <textarea 
                         value={aiPrompt}
                         onChange={(e) => setAiPrompt(e.target.value)}
                         disabled={isGenerating}
                         className="w-full h-40 p-5 rounded-2xl border border-gray-200 shadow-xl focus:border-nexus-accent focus:ring-4 focus:ring-nexus-accent/10 outline-none text-lg resize-none"
                         placeholder="תאר מה צריך לבנות..."
                      />
                      <div className="flex gap-4 justify-center mt-6">
                          <button onClick={() => setShowAIGenerator(false)} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">ביטול</button>
                          <GlowButton onClick={handleGenerateAI} isLoading={isGenerating} className="px-8">
                             <Sparkles size={18} className="mr-2" /> צור טופס
                          </GlowButton>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Header - Hidden on Mobile when editing to save space */}
      {(!activeTemplate || window.innerWidth >= 1024) && (
        <header className="mb-4 flex justify-end items-end pb-4">
            <div className="hidden lg:flex gap-3">
                {activeTemplate && (
                    <>
                        <button 
                            onClick={() => { setPreviewStepIndex(0); setIsPreviewMode(true); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-nexus-primary hover:text-nexus-primary transition-all font-bold text-sm shadow-sm"
                        >
                            <Eye size={18} /> תראה לי רגע
                        </button>
                        <GlowButton onClick={handleCopyLink} className="bg-nexus-primary">
                            {showShareSuccess ? <CircleCheckBig size={18} /> : <Link size={18} />}
                            {showShareSuccess ? 'הועתק!' : 'קח לינק'}
                        </GlowButton>
                    </>
                )}
            </div>
        </header>
      )}

      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
          
          {/* Sidebar: Templates List */}
          <div className={`
              w-full lg:w-80 flex-shrink-0 flex flex-col gap-4 transition-all duration-300
              ${activeTemplate ? 'hidden lg:flex' : 'flex'}
          `}>
              <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={handleCreateNew}
                    className="py-4 border border-gray-200 bg-white rounded-xl text-gray-600 hover:border-nexus-primary hover:text-nexus-primary transition-all flex flex-col items-center justify-center gap-1 font-bold text-xs"
                >
                    <Plus size={18} /> ידני
                </button>
                <button 
                    onClick={() => setShowAIGenerator(true)}
                    className="py-4 border border-nexus-accent/30 bg-gradient-to-br from-nexus-primary to-slate-900 rounded-xl text-white hover:shadow-lg hover:shadow-nexus-primary/20 transition-all flex flex-col items-center justify-center gap-1 font-bold text-xs relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity"></div>
                    <Sparkles size={18} className="text-nexus-accent" /> שהרובוט יבנה
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar pb-24 lg:pb-10">
                  {templates.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                              <Layers size={24} className="text-gray-300" />
                          </div>
                          <h4 className="text-sm font-bold text-gray-900 mb-1">אין טפסים עדיין</h4>
                          <p className="text-xs text-gray-500 mb-4">צרו טופס חדש או בקשו מה-AI לבנות אחד.</p>
                      </div>
                  )}
                  {templates.map(t => (
                      <div 
                        key={t.id}
                        onClick={() => { setSelectedTemplateId(t.id); setEditingStepId(t.steps[0].id); }}
                        className={`p-5 rounded-xl border transition-all cursor-pointer group relative flex flex-col gap-2
                            ${selectedTemplateId === t.id 
                                ? 'bg-white border-l-4 border-l-nexus-accent border-y-gray-100 border-r-gray-100 shadow-luxury' 
                                : 'bg-white/50 border-transparent hover:bg-white hover:shadow-sm'}
                        `}
                      >
                          <div className="flex justify-between items-start">
                              <span className={`font-bold text-sm truncate ${selectedTemplateId === t.id ? 'text-nexus-primary' : 'text-gray-600'}`}>{t.title}</span>
                              {selectedTemplateId === t.id && <div className="w-2 h-2 rounded-full bg-nexus-accent animate-pulse"></div>}
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                              <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-medium">
                                 <Layers size={10} /> {t.steps.length}
                              </span>
                              <span>•</span>
                              <span className="uppercase tracking-wide font-medium text-[10px]">{t.category}</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* Main Editor Canvas */}
          <div className={`
              flex-1 bg-gray-50/50 rounded-2xl border border-white/60 shadow-inner overflow-hidden backdrop-blur-sm relative flex-col transition-all duration-300
              ${!activeTemplate ? 'hidden lg:flex' : 'flex'}
          `}>
             
             {!activeTemplate ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                     <LayoutList size={64} className="mb-4 opacity-20" />
                     <h3 className="text-xl font-bold text-gray-500">בחר טופס לעריכה</h3>
                 </div>
             ) : (
                 <>
                    {/* Mobile Back Button */}
                    <div className="lg:hidden p-4 border-b border-gray-200/50 flex justify-between items-center bg-white/80">
                        <button 
                            onClick={handleBackToList}
                            className="flex items-center gap-2 text-gray-500 font-bold text-sm"
                        >
                            <ArrowRight size={18} /> חזרה
                        </button>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => { setPreviewStepIndex(0); setIsPreviewMode(true); }}
                                className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600"
                            >
                                <Eye size={18} />
                            </button>
                            <button 
                                onClick={handleCopyLink}
                                className="p-2 bg-nexus-primary text-white rounded-lg"
                            >
                                <Link size={18} />
                            </button>
                        </div>
                    </div>

                    {/* 1. Form Global Header */}
                    <div className="p-4 lg:p-8 border-b border-gray-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                        <div className="space-y-2 max-w-4xl mx-auto">
                            <input 
                                value={activeTemplate.title} 
                                onChange={(e) => handleUpdateTemplate({ title: e.target.value })}
                                className="w-full text-2xl lg:text-3xl font-display font-bold text-nexus-primary border-none outline-none placeholder-gray-300 focus:ring-0 p-0 bg-transparent transition-colors hover:text-nexus-accent focus:text-nexus-primary" 
                                placeholder="כותרת הטופס"
                            />
                            <div className="flex items-center gap-2 group">
                                <Edit2 size={14} className="text-gray-300 group-hover:text-nexus-accent transition-colors" />
                                <textarea 
                                    value={activeTemplate.description}
                                    onChange={(e) => handleUpdateTemplate({ description: e.target.value })}
                                    className="w-full text-sm text-gray-500 border-none outline-none placeholder-gray-400 focus:ring-0 p-0 resize-none bg-transparent font-medium" 
                                    rows={1}
                                    placeholder="הוסף תיאור קצר ללקוח..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. Step Navigator */}
                    <div className="w-full bg-white border-b border-gray-200 px-4 lg:px-6 py-3">
                        <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                            {activeTemplate.steps.map((step, index) => (
                                <button
                                    key={step.id}
                                    onClick={() => setEditingStepId(step.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border
                                        ${editingStepId === step.id 
                                            ? 'bg-nexus-primary text-white border-nexus-primary shadow-lg shadow-nexus-primary/20' 
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                                    `}
                                >
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${editingStepId === step.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{index + 1}</span>
                                    {step.title}
                                    {activeTemplate.steps.length > 1 && editingStepId === step.id && (
                                        <span 
                                            className="ml-1 opacity-60 hover:opacity-100 hover:bg-white/20 rounded-full p-0.5 transition-all"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveStep(step.id); }} 
                                        >
                                            <X size={12} />
                                        </span>
                                    )}
                                </button>
                            ))}
                            <button 
                                onClick={handleAddStep}
                                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-nexus-primary hover:border-nexus-primary hover:bg-nexus-primary/5 transition-all"
                                title="הוסף שלב חדש"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    {/* 3. Active Step Content */}
                    <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-8 custom-scrollbar pb-32">
                        <div className="max-w-3xl mx-auto space-y-6">
                            
                            {/* Step Meta Card */}
                            <div className="bg-white p-4 lg:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col lg:flex-row gap-6 items-start">
                                <div className="flex-1 space-y-4 w-full">
                                    <div>
                                        <label className="text-[10px] font-bold text-nexus-muted uppercase tracking-widest block mb-1.5">כותרת השלב</label>
                                        <input 
                                            value={activeTemplate.steps.find(s => s.id === editingStepId)?.title || ''}
                                            onChange={(e) => handleUpdateStep(editingStepId!, { title: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 font-bold focus:border-nexus-primary focus:bg-white transition-all outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-nexus-muted uppercase tracking-widest block mb-1.5">הסבר נוסף</label>
                                        <input 
                                            value={activeTemplate.steps.find(s => s.id === editingStepId)?.description || ''}
                                            onChange={(e) => handleUpdateStep(editingStepId!, { description: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 focus:border-nexus-primary focus:bg-white transition-all outline-none"
                                            placeholder="הסבר ללקוח מה עליו למלא בשלב זה..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-gray-200 w-full my-6"></div>

                            {/* Fields List */}
                            <div className="space-y-4">
                                {activeTemplate.steps.find(s => s.id === editingStepId)?.fields?.map((field, index) => (
                                    <div key={field.id} className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-nexus-primary/20 transition-all relative overflow-hidden">
                                        
                                        {/* Status Stripe */}
                                        <div className="absolute top-0 right-0 bottom-0 w-1 bg-gray-100 group-hover:bg-nexus-accent transition-colors"></div>

                                        <div className="p-4 lg:p-6 pl-4 lg:pl-16">
                                            <div className="flex items-start gap-4 mb-4">
                                                <span className="text-xs font-mono font-bold text-gray-300 mt-2">0{index + 1}</span>
                                                <div className="flex-1">
                                                    <input 
                                                        value={field.label}
                                                        onChange={(e) => handleUpdateField(editingStepId!, field.id, { label: e.target.value })}
                                                        className="w-full text-lg font-bold text-gray-800 border-none focus:ring-0 p-0 bg-transparent placeholder-gray-300 focus:text-nexus-primary transition-colors"
                                                        placeholder="הקלד את השאלה כאן..."
                                                    />
                                                </div>
                                            </div>

                                            {/* Control Bar */}
                                            <div className="flex flex-col lg:flex-row lg:items-center gap-3 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                                                <CustomSelect
                                                    value={field.type}
                                                    onChange={(val) => handleUpdateField(editingStepId!, field.id, { type: val as FieldType })}
                                                    options={[
                                                        { value: 'TEXT', label: 'טקסט קצר (Input)' },
                                                        { value: 'TEXTAREA', label: 'פסקה (Textarea)' },
                                                        { value: 'SELECT', label: 'דרופדאון (Select)' },
                                                        { value: 'RADIO', label: 'בחירה יחידה (Radio)' },
                                                        { value: 'CHECKBOX', label: 'ריבוי בחירה (Checkbox)' },
                                                        { value: 'DATE', label: 'תאריך (Date)' },
                                                        { value: 'UPLOAD', label: 'העלאת קובץ (Upload)' },
                                                    ]}
                                                />

                                                <div className="hidden lg:block h-4 w-px bg-gray-300 mx-1"></div>
                                                
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${field.required ? 'bg-nexus-primary border-nexus-primary' : 'bg-white border-gray-300'}`}>
                                                        {field.required && <CircleCheckBig size={10} className="text-white" />}
                                                    </div>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={field.required} 
                                                        onChange={(e) => handleUpdateField(editingStepId!, field.id, { required: e.target.checked })}
                                                        className="hidden" 
                                                    />
                                                    <span className="text-xs font-medium text-gray-600">שדה חובה</span>
                                                </label>

                                                <div className="hidden lg:block h-4 w-px bg-gray-300 mx-1"></div>

                                                <div className="flex-1 min-w-[120px]">
                                                    <input 
                                                        value={field.placeholder || ''}
                                                        onChange={(e) => handleUpdateField(editingStepId!, field.id, { placeholder: e.target.value })}
                                                        className="w-full text-xs bg-transparent border-none outline-none placeholder-gray-400 focus:ring-0 p-0"
                                                        placeholder="טקסט עזר..."
                                                    />
                                                </div>
                                            </div>

                                            {/* Conditional Options Editor */}
                                            {(field.type === 'SELECT' || field.type === 'RADIO' || field.type === 'CHECKBOX') && (
                                                <div className="mt-3 pl-2 border-r-2 border-[color:var(--os-accent)]/20">
                                                    <div className="flex items-start gap-2">
                                                        <LayoutList size={14} className="text-[color:var(--os-accent)] mt-1" />
                                                        <div className="flex-1">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">אפשרויות בחירה (מופרדות בפסיק)</label>
                                                            <textarea
                                                                className="w-full text-xs text-gray-700 bg-[color:var(--os-accent)]/5 border border-[color:var(--os-accent)]/20 rounded-lg p-2 outline-none focus:border-[color:var(--os-accent)]/50 resize-none" 
                                                                defaultValue={field.options?.join(', ')}
                                                                onBlur={(e) => handleUpdateField(editingStepId!, field.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                                                                placeholder="כתוב אפשרויות מופרדות בפסיק"
                                                                rows={2}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Floating Actions */}
                                        <div className="absolute left-3 top-3 flex flex-col gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all lg:translate-x-4 lg:group-hover:translate-x-0">
                                            <button 
                                                onClick={() => handleRemoveField(editingStepId!, field.id)} 
                                                className="p-2 bg-white rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 shadow-sm border border-gray-100 transition-colors"
                                                title="מחק שאלה"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <div className="p-2 bg-white rounded-lg text-gray-300 cursor-grab active:cursor-grabbing shadow-sm border border-gray-100 hidden lg:block">
                                                <GripVertical size={16} />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button 
                                    onClick={() => handleAddField(editingStepId!)}
                                    className="w-full py-6 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:text-nexus-primary hover:border-nexus-primary/30 hover:bg-nexus-primary/5 transition-all flex items-center justify-center gap-2 font-medium group"
                                >
                                    <div className="p-2 bg-gray-100 rounded-full group-hover:bg-white group-hover:text-nexus-accent transition-colors">
                                        <Plus size={20} />
                                    </div>
                                    <span>עוד שאלה</span>
                                </button>
                            </div>
                        </div>
                    </div>
                 </>
             )}
          </div>
      </div>
    </div>
  );
};
