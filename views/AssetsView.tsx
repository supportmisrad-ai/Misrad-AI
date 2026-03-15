
import React, { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import { FileText, Link, Lock, Search, ExternalLink, Copy, File as FileIcon, Check, Trash2, Edit2, Plus, Eye, EyeOff, Shield, Key, X, Upload, Briefcase, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Asset } from '../types';
import { CustomSelect } from '../components/CustomSelect';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

export const AssetsView: React.FC = () => {
  const { assets, addAsset, deleteAsset, updateAsset, clients } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'credentials' | 'files'>('all');
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<{id: string, name: string} | null>(null);
  
  // Form State
  const [formType, setFormType] = useState<'link' | 'credential' | 'file'>('link');
  const [formTitle, setFormTitle] = useState('');
  const [formValue, setFormValue] = useState(''); // URL or Password
  const [formTags, setFormTags] = useState('');
  const [selectedClientId, setSelectedClientId] = useState(''); // Link to client
  const [fileName, setFileName] = useState(''); // Visual only for file mock

  const [isShaking, setIsShaking] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const filteredAssets = assets.filter((a: Asset) => {
      const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.tags.some((t: string) => t.includes(searchTerm));
      if (!matchesSearch) return false;
      
      if (activeTab === 'credentials') return a.type === 'credential';
      if (activeTab === 'files') return a.type !== 'credential';
      return true; // 'all' or 'drive' (handled separately)
  });

  const togglePasswordReveal = (id: string) => {
      const newSet = new Set(revealedPasswords);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setRevealedPasswords(newSet);
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
  };

  const getIcon = (type: string) => {
      switch(type) {
          case 'link': return <Link size={20} className="text-blue-500" />;
          case 'credential': return <Key size={20} className="text-amber-500" />;
          default: return <FileText size={20} className="text-gray-500" />;
      }
  };

  const openAddModal = () => {
      setEditingAsset(null);
      setFormTitle('');
      setFormValue('');
      setFormTags('');
      setSelectedClientId('');
      setFormType('link');
      setFileName('');
      setIsShaking(false);
      setIsModalOpen(true);
  };

  const openEditModal = (asset: Asset) => {
      setEditingAsset(asset);
      setFormTitle(asset.title);
      setFormValue(asset.value);
      setFormTags(asset.tags.join(', '));
      setFormType(asset.type as 'link' | 'credential' | 'file');
      
      // Try to find if a tag matches a client name or if clientId is set
      const clientByTag = clients.find((c) => asset.tags.includes((c as unknown as Record<string, unknown>).companyName as string));
      setSelectedClientId(asset.clientId || (clientByTag ? clientByTag.id : ''));
      
      setIsShaking(false);
      setIsModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
      e.stopPropagation();
      setAssetToDelete({ id, name });
  };

  const confirmDelete = () => {
      if (assetToDelete) {
          deleteAsset(assetToDelete.id);
          setAssetToDelete(null);
      }
  };

  const handleSave = () => {
      if (!formTitle.trim()) {
          setIsShaking(true);
          titleInputRef.current?.focus();
          setTimeout(() => setIsShaking(false), 400);
          return;
      }
      
      if (!formValue.trim() && formType !== 'file') return;
      if (formType === 'file' && !fileName) return;

      const finalValue = formType === 'file' ? fileName : formValue;
      const tagsArray = formTags.split(',').map(t => t.trim()).filter(Boolean);
      
      // Auto-add client name tag if selected
      if (selectedClientId) {
          const client = clients.find((c) => (c as unknown as Record<string, unknown>).id === selectedClientId);
          if (client && !tagsArray.includes(client.companyName)) {
              tagsArray.push(client.companyName);
          }
      }

      if (editingAsset) {
          updateAsset(editingAsset.id, {
              title: formTitle,
              value: finalValue,
              tags: tagsArray,
              type: formType,
              clientId: selectedClientId || undefined
          });
      } else {
          const newAsset: Asset = {
              id: `AST-${Date.now()}`,
              title: formTitle,
              type: formType,
              value: finalValue,
              tags: tagsArray.length > 0 ? tagsArray : ['General'],
              clientId: selectedClientId || undefined
          };
          addAsset(newAsset);
      }
      setIsModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setFileName(e.target.files[0].name);
          setFormValue(URL.createObjectURL(e.target.files[0])); // Mock URL
      }
  };

  return (
    <div className="max-w-7xl mx-auto w-full pb-16 md:pb-20 px-2 md:px-0">
      
      <DeleteConfirmationModal 
          isOpen={!!assetToDelete}
          onClose={() => setAssetToDelete(null)}
          onConfirm={confirmDelete}
          title="מחיקת נכס"
          description="הנכס יועבר לסל המיחזור ויהיה זמין לשחזור ב-30 הימים הקרובים."
          itemName={assetToDelete?.name}
          isHardDelete={false}
      />

      {/* Add/Edit Asset Modal */}
      <AnimatePresence>
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={e => e.stopPropagation()}
                    className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-visible flex flex-col"
                >
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                        <h3 className="font-bold text-lg text-gray-900">{editingAsset ? 'עריכת נכס' : 'הוספת נכס חדש'}</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                        {/* Type Selection */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            {[
                                { id: 'link', label: 'קישור', icon: Link },
                                { id: 'credential', label: 'סיסמה', icon: Key },
                                { id: 'file', label: 'קובץ', icon: Upload },
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setFormType(t.id as 'link' | 'credential' | 'file')}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                        formType === t.id 
                                        ? 'border-gray-200 bg-gray-900 text-white shadow-md' 
                                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                                    }`}
                                >
                                    <t.icon size={20} />
                                    <span className="text-xs font-bold">{t.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">שם הנכס</label>
                            <input 
                                ref={titleInputRef}
                                value={formTitle}
                                onChange={(e) => { setFormTitle(e.target.value); setIsShaking(false); }}
                                className={`w-full p-3 bg-gray-50 border rounded-xl outline-none transition-all font-medium ${isShaking ? 'border-red-500 ring-2 ring-red-200 animate-shake' : 'border-gray-200 focus:border-gray-400'}`}
                                placeholder={formType === 'credential' ? 'לדוגמה: כהן טכנולוגיות' : 'לדוגמה: מצגת משקיעים'}
                                autoFocus
                            />
                        </div>

                        {/* Value Input based on Type */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                {formType === 'link' ? 'כתובת URL' : formType === 'credential' ? 'שם משתמש / סיסמה' : 'העלאת קובץ'}
                            </label>
                            
                            {formType === 'file' ? (
                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors relative cursor-pointer group">
                                    <input 
                                        type="file" 
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                                        onChange={handleFileUpload}
                                    />
                                    {fileName ? (
                                        <div className="flex items-center justify-center gap-2 text-green-600 font-bold">
                                            <FileText size={18} /> {fileName}
                                        </div>
                                    ) : (
                                        <div className="text-gray-400 flex flex-col items-center gap-2 group-hover:text-gray-600">
                                            <Upload size={24} />
                                            <span className="text-sm">לחץ לבחירת קובץ</span>
                                        </div>
                                    )}
                                </div>
                            ) : formType === 'credential' ? (
                                <div className="relative">
                                    <input 
                                        value={formValue}
                                        onChange={(e) => setFormValue(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gray-400 font-mono text-sm"
                                        placeholder="user: admin | pass: 123456"
                                    />
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>
                            ) : (
                                <div className="relative">
                                    <input 
                                        value={formValue}
                                        onChange={(e) => setFormValue(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gray-400 dir-ltr text-right"
                                        placeholder="https://example.com"
                                    />
                                    <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>
                            )}
                        </div>

                        {/* Client Linking */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">שיוך ללקוח (אופציונלי)</label>
                            <div className="relative z-50">
                                <CustomSelect 
                                    value={selectedClientId}
                                    onChange={setSelectedClientId}
                                    options={[
                                        { value: '', label: '-- ללא שיוך --' },
                                        ...clients.map((client) => { const cl = client as unknown as Record<string, unknown>; return { value: String(cl.id ?? ''), label: String(cl.companyName ?? '') }; })
                                    ]}
                                    className="text-sm"
                                />
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">תגיות נוספות (מופרדות בפסיק)</label>
                            <input 
                                value={formTags}
                                onChange={(e) => setFormTags(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gray-400 text-sm"
                                placeholder="שיווק, כספים, כללי..."
                            />
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                        <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
                            ביטול
                        </button>
                        <button onClick={handleSave} className="px-8 py-2.5 text-sm font-bold text-white bg-black hover:bg-gray-800 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2">
                            <Check size={16} /> שמור לכספת
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Header - Standardized */}
      <div className="pt-4 md:pt-6 pb-3 md:pb-4 border-b border-gray-100 shrink-0">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 md:gap-6 mb-3 md:mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">נכסים דיגיטליים</h1>
            <p className="text-gray-500 text-xs md:text-sm mt-1">ניהול מרכזי של קבצים, קישורים וסיסמאות ארגוניות.</p>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3 flex-wrap w-full md:w-auto">
            <div className="relative flex-1 md:flex-none md:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 md:w-4 md:h-4" />
                <input 
                    type="text" 
                    placeholder="חיפוש בכספת..." 
                    className="pl-3 md:pl-4 pr-9 md:pr-10 py-2 md:py-2.5 bg-white border border-gray-200 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-gray-900/5 shadow-sm text-xs md:text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button 
                onClick={openAddModal}
                className="bg-black text-white px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-lg hover:bg-gray-800 transition-colors flex items-center gap-1.5 md:gap-2 w-full md:w-auto justify-center"
            >
                <Plus size={14} className="md:w-[18px] md:h-[18px]" /> <span>הוסף חדש</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 mb-4 md:mb-8 overflow-x-auto no-scrollbar -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="flex gap-1 min-w-max">
              {[
                  { id: 'all', label: 'כל הנכסים' },
                  { id: 'credentials', label: 'סיסמאות וגישות' },
                  { id: 'files', label: 'קבצים וקישורים' },
              ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'all' | 'credentials' | 'files')}
                    className={`px-3 md:px-6 py-2 md:py-2.5 md:py-3 text-[11px] md:text-sm font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                        activeTab === tab.id 
                        ? 'border-gray-300 text-black' 
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                      {tab.label}
                  </button>
              ))}
          </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {filteredAssets.map((asset: Asset) => (
                  <div 
                    key={asset.id}
                    className="bg-white p-4 md:p-5 rounded-xl md:rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all group flex flex-col"
                  >
                          <div className="flex justify-between items-start mb-3 md:mb-4">
                              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center border ${
                                  asset.type === 'credential' ? 'bg-amber-50 border-amber-100' : 
                                  asset.type === 'link' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'
                              }`}> 
                                  {getIcon(asset.type)}
                              </div>
                              <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => openEditModal(asset)}
                                    className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                                    aria-label={`ערוך נכס ${asset.title}`}
                                  >
                                    <Edit2 size={14} className="md:w-4 md:h-4" />
                                  </button>
                                  <button 
                                    onClick={(e) => handleDeleteClick(e, asset.id, asset.title)} 
                                    className="p-1.5 md:p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                                    aria-label={`מחק נכס ${asset.title}`}
                                  >
                                      <Trash2 size={14} className="md:w-4 md:h-4" />
                                  </button>
                              </div>
                          </div>
                          
                          <h3 className="font-bold text-gray-900 text-sm md:text-base mb-1">{asset.title}</h3>
                          <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4 md:mb-6">
                              {asset.tags.map((tag: string) => (
                                  <span key={tag} className="text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 bg-gray-50 text-gray-500 border border-gray-100 rounded-md font-medium">
                                      #{tag}
                                  </span>
                              ))}
                          </div>

                          <div className="mt-auto pt-3 md:pt-4 border-t border-gray-50">
                              {asset.type === 'credential' ? (
                                  <div className="bg-gray-50 rounded-lg md:rounded-xl p-2.5 md:p-3 flex items-center justify-between group/field">
                                      <code className="text-[10px] md:text-xs text-gray-600 font-mono truncate max-w-[120px] md:max-w-[150px]">
                                          {revealedPasswords.has(asset.id) ? asset.value : '••••••••••••'}
                                      </code>
                                      <div className="flex gap-1.5 md:gap-2">
                                          <button onClick={() => togglePasswordReveal(asset.id)} className="text-gray-400 hover:text-gray-600">
                                              {revealedPasswords.has(asset.id) ? <EyeOff size={12} className="md:w-3.5 md:h-3.5" /> : <Eye size={12} className="md:w-3.5 md:h-3.5" />}
                                          </button>
                                          <button onClick={() => copyToClipboard(asset.value)} className="text-gray-400 hover:text-blue-600">
                                              <Copy size={12} className="md:w-3.5 md:h-3.5" />
                                          </button>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="flex gap-2 md:gap-3">
                                      <button 
                                        onClick={() => copyToClipboard(asset.value)}
                                        className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold transition-colors flex items-center justify-center gap-1.5 md:gap-2"
                                      >
                                          <Copy size={12} className="md:w-3.5 md:h-3.5" /> העתק
                                      </button>
                                      <a 
                                        href={asset.value} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold transition-colors flex items-center justify-center gap-1.5 md:gap-2"
                                      >
                                          פתח <ExternalLink size={12} className="md:w-3.5 md:h-3.5" />
                                      </a>
                                  </div>
                              )}
                          </div>
                      </div>
                  ))}

                  {/* Empty State / Add New */}
                  <button 
                    onClick={openAddModal}
                    className="border-2 border-dashed border-gray-200 rounded-xl md:rounded-2xl flex flex-col items-center justify-center p-4 md:p-6 text-gray-600 hover:text-gray-800 hover:border-gray-300 hover:bg-gray-50 transition-all min-h-[200px] md:min-h-[250px] group"
                  >
                      <Plus size={26} className="text-gray-300 group-hover:text-gray-400 transition-colors mb-3" />
                      <div className="font-bold text-sm">הוסף נכס</div>
                      <div className="text-xs text-gray-400 mt-1">קישור / קובץ / סיסמה</div>
                  </button>
              </div>
          </div>
    </div>
  );
};
