
import React, { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import { FileText, Link, Lock, Search, ExternalLink, Copy, HardDrive, FileSpreadsheet, File as FileIcon, Image as ImageIcon, Folder, FileQuestion, Cloud, Loader2, Check, Trash2, Edit2, Plus, Eye, EyeOff, Shield, Key, X, Upload, Briefcase, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Asset } from '../types';
import { CustomSelect } from '../components/CustomSelect';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

export const AssetsView: React.FC = () => {
  const { assets, isDriveConnected, driveFiles, isConnectingDrive, connectGoogleDrive, addAsset, deleteAsset, updateAsset, clients } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'credentials' | 'files' | 'drive'>('all');
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

  const filteredAssets = assets.filter(a => {
      const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.tags.some(t => t.includes(searchTerm));
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
      setFormType(asset.type as any);
      
      // Try to find if a tag matches a client name or if clientId is set
      const clientByTag = clients.find(c => asset.tags.includes(c.companyName));
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
      let tagsArray = formTags.split(',').map(t => t.trim()).filter(Boolean);
      
      // Auto-add client name tag if selected
      if (selectedClientId) {
          const client = clients.find(c => c.id === selectedClientId);
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

  const getDriveFileIcon = (mimeType: string) => {
      switch(mimeType) {
          case 'document': return <FileText className="text-blue-500" size={24} />;
          case 'spreadsheet': return <FileSpreadsheet className="text-green-500" size={24} />;
          case 'presentation': return <FileText className="text-orange-500" size={24} />;
          case 'pdf': return <FileText className="text-red-500" size={24} />;
          case 'image': return <ImageIcon className="text-purple-500" size={24} />;
          case 'folder': return <Folder className="text-gray-400 fill-gray-100" size={24} />;
          default: return <FileQuestion className="text-gray-400" size={24} />;
      }
  };

  return (
    <div className="max-w-7xl mx-auto w-full pb-20 px-4 md:px-0">
      
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

                    <div className="p-6 space-y-6">
                        {/* Type Selection */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { id: 'link', label: 'קישור', icon: Link },
                                { id: 'credential', label: 'סיסמה', icon: Key },
                                { id: 'file', label: 'קובץ', icon: Upload },
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setFormType(t.id as any)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                        formType === t.id 
                                        ? 'border-black bg-gray-900 text-white shadow-md' 
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
                                className={`w-full p-3 bg-gray-50 border rounded-xl outline-none transition-all font-medium ${isShaking ? 'border-red-500 ring-2 ring-red-200 animate-shake' : 'border-gray-200 focus:border-black'}`}
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
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black font-mono text-sm"
                                        placeholder="user: admin | pass: 123456"
                                    />
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>
                            ) : (
                                <div className="relative">
                                    <input 
                                        value={formValue}
                                        onChange={(e) => setFormValue(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black dir-ltr text-right"
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
                                        ...clients.map(client => ({ value: client.id, label: client.companyName }))
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
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black text-sm"
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
           <div className="flex items-center gap-2 text-amber-600 font-bold uppercase tracking-wider text-xs mb-1">
                <Shield size={14} /> כספת ידע
           </div>
           <h1 className="text-3xl font-bold tracking-tight text-gray-900">נכסים דיגיטליים</h1>
           <p className="text-gray-500 text-sm mt-1">ניהול מרכזי של קבצים, קישורים וסיסמאות ארגוניות.</p>
        </div>
        
        <div className="flex gap-3">
            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="חיפוש בכספת..." 
                    className="pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-black/5 shadow-sm text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button 
                onClick={openAddModal}
                className="bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
                <Plus size={18} /> הוסף חדש
            </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto no-scrollbar">
          {[
              { id: 'all', label: 'כל הנכסים' },
              { id: 'credentials', label: 'סיסמאות וגישות' },
              { id: 'files', label: 'קבצים וקישורים' },
              { id: 'drive', label: 'Google Drive' },
          ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id 
                    ? 'border-black text-black' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                  {tab.label}
              </button>
          ))}
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
          
          {/* DRIVE TAB */}
          {activeTab === 'drive' ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {!isDriveConnected ? (
                      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-12 text-center max-w-2xl mx-auto mt-8">
                          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                              <HardDrive size={40} />
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">חיבור ל-Google Drive</h3>
                          <p className="text-gray-500 mb-8 max-w-md mx-auto text-sm leading-relaxed">
                              חבר את חשבון ה-Google Drive העסקי כדי לגשת לכל המסמכים, המצגות והקבצים ישירות מתוך המערכת.
                          </p>
                          <button 
                            onClick={connectGoogleDrive}
                            disabled={isConnectingDrive}
                            className="bg-white border border-gray-300 text-gray-800 font-bold py-3.5 px-8 rounded-xl shadow-sm hover:bg-gray-50 hover:shadow-md transition-all flex items-center gap-3 mx-auto disabled:opacity-70 disabled:cursor-not-allowed"
                          >
                              {isConnectingDrive ? <Loader2 size={20} className="animate-spin" /> : <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" className="w-5 h-5" />}
                              {isConnectingDrive ? 'מתחבר...' : 'התחבר עם Google'}
                          </button>
                      </div>
                  ) : (
                       <div className="space-y-6">
                            <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg shadow-sm border border-blue-50">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-bold text-blue-900">מחובר כ-Nexus Team</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-blue-700">
                                    <Check size={14} /> סנכרון פעיל
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {driveFiles.map(file => (
                                    <motion.a 
                                        key={file.id}
                                        href={file.url}
                                        whileHover={{ y: -4 }}
                                        className="block bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative"
                                        onClick={(e) => e.preventDefault()}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            {getDriveFileIcon(file.mimeType)}
                                            <ExternalLink size={14} className="text-gray-300 group-hover:text-gray-500" />
                                        </div>
                                        <h4 className="text-sm font-bold text-gray-900 truncate mb-1" title={file.name}>{file.name}</h4>
                                        <div className="text-[10px] text-gray-400">{file.modifiedAt}</div>
                                    </motion.a>
                                ))}
                            </div>
                       </div>
                  )}
              </div>
          ) : (
              /* INTERNAL ASSETS GRID */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {filteredAssets.map((asset) => (
                      <div 
                        key={asset.id}
                        className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all group flex flex-col"
                      >
                          <div className="flex justify-between items-start mb-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                                  asset.type === 'credential' ? 'bg-amber-50 border-amber-100' : 
                                  asset.type === 'link' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'
                              }`}>
                                  {getIcon(asset.type)}
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => openEditModal(asset)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"><Edit2 size={16} /></button>
                                  <button 
                                    onClick={(e) => handleDeleteClick(e, asset.id, asset.title)} 
                                    className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                                  >
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          </div>
                          
                          <h3 className="font-bold text-gray-900 mb-1">{asset.title}</h3>
                          <div className="flex flex-wrap gap-2 mb-6">
                              {asset.tags.map(tag => (
                                  <span key={tag} className="text-[10px] px-2 py-0.5 bg-gray-50 text-gray-500 border border-gray-100 rounded-md font-medium">
                                      #{tag}
                                  </span>
                              ))}
                          </div>

                          <div className="mt-auto pt-4 border-t border-gray-50">
                              {asset.type === 'credential' ? (
                                  <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between group/field">
                                      <code className="text-xs text-gray-600 font-mono truncate max-w-[150px]">
                                          {revealedPasswords.has(asset.id) ? asset.value : '••••••••••••'}
                                      </code>
                                      <div className="flex gap-2">
                                          <button onClick={() => togglePasswordReveal(asset.id)} className="text-gray-400 hover:text-gray-600">
                                              {revealedPasswords.has(asset.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                                          </button>
                                          <button onClick={() => copyToClipboard(asset.value)} className="text-gray-400 hover:text-blue-600">
                                              <Copy size={14} />
                                          </button>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="flex gap-3">
                                      <button 
                                        onClick={() => copyToClipboard(asset.value)}
                                        className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                      >
                                          <Copy size={14} /> העתק
                                      </button>
                                      <a 
                                        href={asset.value} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                      >
                                          פתח <ExternalLink size={14} />
                                      </a>
                                  </div>
                              )}
                          </div>
                      </div>
                  ))}

                  {/* Empty State / Add New */}
                  <button 
                    onClick={openAddModal}
                    className="border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-6 text-gray-400 hover:text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all min-h-[250px] group"
                  >
                      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Plus size={24} />
                      </div>
                      <span className="text-sm font-bold">הוסף נכס חדש</span>
                  </button>
              </div>
          )}
      </div>
    </div>
  );
};
