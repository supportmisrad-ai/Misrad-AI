
import React, { useState, useEffect } from 'react';
import { Client, Status, Priority, Asset, Task, Invoice } from '../types';
import { useData } from '../context/DataContext';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';
import { X, Mail, Phone, Calendar, FolderOpen, Plus, ExternalLink, CircleCheckBig, Clock, Briefcase, FileText, Edit2, Save, Trash2, LayoutDashboard, ListTodo, Link, Key, Zap, MessageCircle, MapPin, DollarSign, Upload, Check, ChevronDown, Receipt, Globe, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskItem } from './nexus/TaskItem';
import { CustomSelect } from './CustomSelect';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { CreateInvoiceModal } from './CreateInvoiceModal';

interface ClientDetailModalProps {
  client: Client;
  onClose: () => void;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ client, onClose }) => {
  useBackButtonClose(true, onClose);
  const { tasks, assets, users, openCreateTask, updateClient, deleteClient, addAsset, invoices, generateInvoice, hasPermission } = useData();
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'assets' | 'invoices'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedClient, setEditedClient] = useState<Client>(client);
  
  // Add Asset Local State
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [newAssetTitle, setNewAssetTitle] = useState('');
  const [newAssetValue, setNewAssetValue] = useState('');
  const [newAssetType, setNewAssetType] = useState<'link' | 'credential'>('link');
  
  // Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Invoice Modal
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceDocType, setInvoiceDocType] = useState<'invoice' | 'quote' | 'receipt' | 'invoice_receipt'>('invoice');
  const [isDocTypeDropdownOpen, setIsDocTypeDropdownOpen] = useState(false);

  // Scroll to top on mobile when modal opens
  useEffect(() => {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      if (isMobile) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  }, []);

  // Filter tasks related to this client (Robust Check: ID or Name match)
  const clientTasks: Task[] = tasks.filter((t: Task) => 
      t.clientId === client.id || // Exact match
      t.tags.some(tag => tag.toLowerCase() === client.companyName.toLowerCase()) // Fallback for old tasks
  );

  const activeTasks = clientTasks.filter((t: Task) => t.status !== Status.DONE && t.status !== Status.CANCELED);
  const completedTasks = clientTasks.filter((t: Task) => t.status === Status.DONE);
  const progress = clientTasks.length > 0 ? Math.round((completedTasks.length / clientTasks.length) * 100) : 0;

  // Filter assets related to this client (Robust Check: ID or Name match)
  const clientAssets = assets.filter((a: Asset) => 
      a.clientId === client.id || 
      a.tags.some(tag => tag.toLowerCase() === client.companyName.toLowerCase())
  );

  // Filter Invoices
  const clientInvoices = invoices.filter((inv: Invoice) => inv.clientId === client.id);

  // Mock Financial Data based on package
  const monthlyValue = client.package === 'Premium 1:1' ? 15000 : client.package === 'Mastermind Group' ? 5000 : 2500;

  const handleCreateTask = () => {
      openCreateTask({
          title: '',
          clientId: client.id, // Explicitly link
          tags: [client.companyName], // Visual tag
          description: `משימה עבור הלקוח ${client.companyName}`,
          priority: Priority.MEDIUM
      });
  };

  const handleSave = () => {
      updateClient(client.id, editedClient);
      setIsEditing(false);
  };

  const confirmDelete = () => {
      deleteClient(client.id);
      setIsDeleteModalOpen(false);
      onClose();
  };

  const openSalesOS = () => {
      // Mock jump to Sales OS client view
      window.open(`https://sales-os.demo/clients/${client.id}`, '_blank');
  };

  const handleAddAsset = () => {
      if (!newAssetTitle || !newAssetValue) return;
      
      const newAsset: Asset = {
          id: `AST-${Date.now()}`,
          title: newAssetTitle,
          value: newAssetValue,
          type: newAssetType,
          tags: [client.companyName],
          clientId: client.id
      };
      
      addAsset(newAsset);
      setIsAddingAsset(false);
      setNewAssetTitle('');
      setNewAssetValue('');
  };

  const handleGenerateDocument = (docType: 'invoice' | 'quote' | 'receipt' | 'invoice_receipt' = 'invoice') => {
      setInvoiceDocType(docType);
      setIsDocTypeDropdownOpen(false);
      setIsInvoiceModalOpen(true);
  };

  const handleInvoiceSuccess = (invoiceUrl: string) => {
      if (invoiceUrl) {
          window.open(invoiceUrl, '_blank');
          }
      // Refresh invoices list
      window.location.reload();
  };

  const getAssetIcon = (type: string) => {
      switch(type) {
          case 'link': return <Link size={18} className="text-blue-500" />;
          case 'credential': return <Key size={18} className="text-amber-500" />;
          default: return <FileText size={18} className="text-gray-500" />;
      }
  };

  const getGradient = (pkg: string) => {
      if (pkg.includes('Premium') || pkg.includes('ארגונים') || pkg.includes('Enterprise')) return 'bg-gradient-to-r from-slate-900 via-[#0f172a] to-slate-800'; 
      if (pkg.includes('Mastermind') || pkg.includes('פרו') || pkg.includes('Pro')) return 'bg-gradient-to-r from-indigo-600 to-purple-600'; 
      if (pkg.includes('Digital') || pkg.includes('בסיס') || pkg.includes('Basic')) return 'bg-gradient-to-r from-blue-500 to-cyan-500'; 
      if (pkg.includes('Start') || pkg.includes('צמיחה')) return 'bg-gradient-to-r from-emerald-500 to-teal-500';
      if (pkg.includes('Gold') || pkg.includes('VIP') || pkg.includes('זהב')) return 'bg-gradient-to-r from-amber-500 to-orange-600';
      
      const len = pkg.length;
      if (len % 4 === 0) return 'bg-gradient-to-r from-rose-500 to-pink-600';
      if (len % 4 === 1) return 'bg-gradient-to-r from-violet-600 to-fuchsia-600';
      if (len % 4 === 2) return 'bg-gradient-to-r from-cyan-600 to-blue-600';
      return 'bg-gradient-to-r from-slate-600 to-gray-600'; 
  };

  const sources = [
        { value: 'Google', label: 'גוגל / חיפוש' },
        { value: 'Facebook', label: 'פייסבוק' },
        { value: 'Instagram', label: 'אינסטגרם' },
        { value: 'LinkedIn', label: 'לינקדאין' },
        { value: 'Referral', label: 'המלצה (פה לאוזן)' },
        { value: 'Other', label: 'אחר' }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-0 md:p-6 backdrop-blur-sm" onClick={onClose}>
      
      <DeleteConfirmationModal 
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title="מחיקת לקוח"
          description="כרטיס הלקוח יועבר לסל המיחזור. ניתן לשחזר אותו תוך 30 יום."
          itemName={client.companyName}
          isHardDelete={false}
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full h-full md:h-[90vh] md:max-w-5xl bg-slate-50 md:rounded-3xl shadow-2xl overflow-hidden flex flex-col relative"
      >
        {/* Cover Image */}
        <div className={`h-40 w-full relative flex-shrink-0 ${getGradient(client.package)}`}>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="absolute top-4 left-4 flex gap-3 z-20">
                {/* System.OS Jump Button */}
                <button 
                    onClick={openSalesOS}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-full backdrop-blur-md transition-colors flex items-center gap-2 text-xs font-bold border border-white/20"
                    title="פתח תיק לקוח ב-System"
                >
                    <Zap size={14} /> System
                </button>
                <button 
                    onClick={onClose}
                    className="bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Main Content Container - FIX: Allow scrolling on mobile */}
        <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden relative -mt-12 z-10 px-4 md:px-8 pb-8 gap-8">
            
            {/* Left Sidebar (Profile) */}
            <div className="w-full md:w-80 flex-shrink-0 flex flex-col gap-6">
                
                {/* Profile Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center relative overflow-hidden">
                    <img 
                        src={client.avatar} 
                        alt={client.companyName} 
                        className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg mb-4 bg-white object-cover" 
                    />
                    
                    {isEditing ? (
                        <div className="w-full space-y-3">
                            <input 
                                value={editedClient.companyName}
                                onChange={e => setEditedClient({...editedClient, companyName: e.target.value})}
                                className="text-lg font-bold text-center w-full border-b border-gray-200 focus:border-blue-500 outline-none pb-1"
                                placeholder="שם החברה"
                            />
                             <input 
                                value={editedClient.contactPerson}
                                onChange={e => setEditedClient({...editedClient, contactPerson: e.target.value})}
                                className="text-sm text-center w-full border-b border-gray-200 focus:border-blue-500 outline-none pb-1"
                                placeholder="איש קשר"
                            />
                        </div>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-gray-900">{client.companyName}</h2>
                            <p className="text-sm text-gray-500 font-medium">{client.contactPerson}</p>
                        </>
                    )}

                    <div className="mt-4 flex flex-col md:flex-row flex-wrap justify-center gap-2 w-full">
                        {isEditing ? (
                             <div className="relative w-full">
                                 <CustomSelect 
                                    value={editedClient.status}
                                    onChange={(val) => setEditedClient({...editedClient, status: val as 'Active' | 'Onboarding' | 'Paused'})}
                                    options={[
                                        { value: 'Active', label: 'פעיל', icon: <div className="w-2 h-2 rounded-full bg-green-500" /> },
                                        { value: 'Onboarding', label: 'בתהליך קליטה', icon: <div className="w-2 h-2 rounded-full bg-yellow-500" /> },
                                        { value: 'Paused', label: 'מוקפא', icon: <div className="w-2 h-2 rounded-full bg-gray-400" /> }
                                    ]}
                                    className="text-xs text-left"
                                 />
                             </div>
                        ) : (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                client.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : 
                                client.status === 'Paused' ? 'bg-slate-50 text-slate-600 border-slate-100' :
                                'bg-yellow-50 text-yellow-700 border-yellow-100'
                            }`}>
                                {client.status === 'Active' ? 'לקוח פעיל' : client.status === 'Paused' ? 'מושהה' : 'בתהליך קליטה'}
                            </span>
                        )}
                         <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-100">
                             {client.package}
                         </span>
                    </div>

                    {/* Contact Actions */}
                    <div className="grid grid-cols-4 gap-2 w-full mt-6 border-t border-gray-50 pt-4">
                        <a href={`tel:${client.phone}`} className="flex items-center justify-center p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-green-50 hover:text-green-600 transition-colors">
                            <Phone size={18} />
                        </a>
                        <a href={`mailto:${client.email}`} className="flex items-center justify-center p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors">
                            <Mail size={18} />
                        </a>
                        <a 
                            href={`https://wa.me/${String(client.phone ?? '').replace(/-/g, '').replace(/^0/, '972')}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center justify-center p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-green-100 hover:text-green-700 transition-colors"
                        >
                            <MessageCircle size={18} />
                        </a>
                        {client.assetsFolderUrl && (
                             <a href={client.assetsFolderUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">
                                <FolderOpen size={18} />
                             </a>
                        )}
                    </div>

                    <button 
                        onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                        className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${isEditing ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'text-gray-300 hover:bg-gray-50 hover:text-gray-600'}`}
                    >
                        {isEditing ? <Save size={16} /> : <Edit2 size={16} />}
                    </button>
                </div>

                {/* Details Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">פרטי התקשרות</h3>
                    
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                            <Mail size={16} className="text-gray-400" />
                            {isEditing ? (
                                <input 
                                    value={editedClient.email} 
                                    onChange={e => setEditedClient({...editedClient, email: e.target.value})}
                                    className="border-b border-gray-200 w-full outline-none"
                                />
                            ) : (
                                <span className="text-gray-700 truncate">{client.email}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Phone size={16} className="text-gray-400" />
                             {isEditing ? (
                                <input 
                                    value={editedClient.phone} 
                                    onChange={e => setEditedClient({...editedClient, phone: e.target.value})}
                                    className="border-b border-gray-200 w-full outline-none"
                                />
                            ) : (
                                <span className="text-gray-700 dir-ltr text-right">{client.phone}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Calendar size={16} className="text-gray-400" />
                            <span className="text-gray-700">לקוח מאז: {new Date(client.joinedAt).toLocaleDateString('he-IL')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <MapPin size={16} className="text-gray-400" />
                            <span className="text-gray-700">תל אביב, ישראל</span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm">
                            <Globe size={16} className="text-gray-400" />
                            {isEditing ? (
                                <CustomSelect 
                                    value={editedClient.source || 'Other'}
                                    onChange={(val) => setEditedClient({...editedClient, source: val})}
                                    options={sources}
                                    className="text-xs w-full"
                                />
                            ) : (
                                <span className="text-gray-700">מקור: {client.source || 'לא צוין'}</span>
                            )}
                        </div>
                    </div>

                    {isEditing && (
                        <div className="pt-4 border-t border-gray-100">
                             <button 
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="w-full flex items-center justify-center gap-2 text-red-500 bg-red-50 hover:bg-red-100 py-2 rounded-lg transition-colors text-xs font-bold"
                            >
                                <Trash2 size={14} /> מחק כרטיס לקוח
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Content Area - FIX: Adjust height/overflow for mobile flow */}
            <div className="flex-1 flex flex-col h-auto md:h-full md:overflow-hidden pt-12 md:pt-0">
                
                {/* NEW TABS - SEGMENTED CONTROL STYLE */}
                <div className="flex p-1 bg-gray-100/80 rounded-xl mb-6 self-start overflow-x-auto no-scrollbar w-full max-w-full">
                    <div className="flex gap-1 min-w-max">
                    {[
                        { id: 'overview', label: 'לוח בקרה', icon: LayoutDashboard },
                        { id: 'tasks', label: `משימות (${activeTasks.length})`, icon: ListTodo },
                        { id: 'assets', label: `קבצים (${clientAssets.length})`, icon: FolderOpen },
                        { id: 'invoices', label: `חשבוניות`, icon: Receipt },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'overview' | 'tasks' | 'invoices' | 'assets')}
                            className={`
                                    flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-200 whitespace-nowrap shrink-0
                                ${activeTab === tab.id 
                                    ? 'bg-white shadow-sm text-gray-900 ring-1 ring-black/5' 
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}
                            `}
                        >
                                <tab.icon size={14} className="md:w-4 md:h-4 shrink-0" />
                                <span>{tab.label}</span>
                        </button>
                    ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 md:overflow-y-auto no-scrollbar pb-10">
                    
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-28">
                                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase">
                                        <Briefcase size={14} className="text-blue-500" /> פרויקטים
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900">{clientTasks.length}</div>
                                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-2">
                                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-28">
                                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase">
                                        <DollarSign size={14} className="text-green-500" /> שווי חודשי
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900">₪{monthlyValue.toLocaleString()}</div>
                                    <div className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full w-fit">הכנסה קבועה</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-28">
                                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase">
                                        <Clock size={14} className="text-orange-500" /> שעות עבודה
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {Math.round(
                                          clientTasks.reduce(
                                            (acc: number, t: Task) => acc + (t.timeSpent || 0),
                                            0
                                          ) / 3600
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400">שעות מצטברות החודש</div>
                                </div>
                            </div>

                            {/* Recent Tasks */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-3">משימות אחרונות</h3>
                                <div className="space-y-2">
                                    {clientTasks.slice(0, 3).map((task: Task) => (
                                        <div key={task.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${task.status === Status.DONE ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                                <span className={`text-sm font-medium ${task.status === Status.DONE ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.title}</span>
                                            </div>
                                            <span className="text-xs text-gray-400">{new Date(task.createdAt).toLocaleDateString('he-IL')}</span>
                                        </div>
                                    ))}
                                    {clientTasks.length === 0 && (
                                        <div className="text-center py-6 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                                            עדיין אין פעילות ללקוח זה.
                                        </div>
                                    )}
                                </div>
                            </div>

                             <button 
                                onClick={handleCreateTask}
                                className="w-full py-3 bg-black text-white rounded-xl font-bold text-sm shadow-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={18} /> התחל פרויקט חדש
                            </button>
                        </div>
                    )}

                    {activeTab === 'tasks' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-gray-900">כל המשימות</h3>
                                <button 
                                    onClick={handleCreateTask}
                                    className="text-xs bg-black text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-gray-800"
                                >
                                    <Plus size={14} /> משימה חדשה
                                </button>
                            </div>
                            {clientTasks.length > 0 ? (
                                <div className="space-y-2">
                                    {clientTasks.map((task: Task) => (
                                        <TaskItem key={task.id} task={task} users={users} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                                    <CircleCheckBig size={32} className="mx-auto mb-2 opacity-20" />
                                    <p>אין משימות פתוחות ללקוח זה.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'assets' && (
                        <div className="space-y-4">
                             <div className="flex justify-between items-center">
                                <h3 className="font-bold text-gray-900">קבצים וסיסמאות</h3>
                                <button 
                                    onClick={() => setIsAddingAsset(true)}
                                    className="text-xs bg-black text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-gray-800"
                                >
                                    <Plus size={14} /> הוסף
                                </button>
                            </div>

                            <AnimatePresence>
                                {isAddingAsset && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 overflow-hidden"
                                    >
                                        <div className="flex gap-2 mb-2">
                                            <button 
                                                onClick={() => setNewAssetType('link')}
                                                className={`flex-1 text-xs font-bold py-1.5 rounded-lg border ${newAssetType === 'link' ? 'bg-white border-blue-200 text-blue-600 shadow-sm' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}
                                            >
                                                <Link size={12} className="inline mr-1" /> קישור
                                            </button>
                                            <button 
                                                onClick={() => setNewAssetType('credential')}
                                                className={`flex-1 text-xs font-bold py-1.5 rounded-lg border ${newAssetType === 'credential' ? 'bg-white border-amber-200 text-amber-600 shadow-sm' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}
                                            >
                                                <Key size={12} className="inline mr-1" /> סיסמה
                                            </button>
                                        </div>
                                        <input 
                                            value={newAssetTitle}
                                            onChange={e => setNewAssetTitle(e.target.value)}
                                            placeholder="כותרת (לדוגמה: כניסה לאתר)"
                                            className="w-full text-xs p-2 rounded-lg border border-gray-200 mb-2 focus:border-black outline-none"
                                        />
                                        <input 
                                            value={newAssetValue}
                                            onChange={e => setNewAssetValue(e.target.value)}
                                            placeholder={newAssetType === 'link' ? "https://..." : "user / pass"}
                                            className="w-full text-xs p-2 rounded-lg border border-gray-200 mb-3 focus:border-black outline-none dir-ltr"
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => setIsAddingAsset(false)} className="text-xs text-gray-500 font-bold hover:text-gray-800">ביטול</button>
                                            <button onClick={handleAddAsset} className="text-xs bg-black text-white px-3 py-1.5 rounded-lg font-bold hover:bg-gray-800">שמור</button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                             {clientAssets.length > 0 ? (
                                 <div className="grid grid-cols-2 gap-3">
                                     {clientAssets.map((asset: Asset) => (
                                        <div key={asset.id} className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-300 transition-all group flex flex-col justify-between h-32">
                                            <div className="flex justify-between items-start">
                                                <div className="p-2 bg-gray-50 rounded-lg text-gray-600 border border-gray-100 group-hover:bg-white group-hover:shadow-sm transition-colors">
                                                    {getAssetIcon(asset.type)}
                                                </div>
                                                <a href={asset.value} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-blue-600 transition-colors">
                                                    <ExternalLink size={16} />
                                                </a>
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 text-sm line-clamp-1" title={asset.title}>{asset.title}</div>
                                                <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">{asset.type === 'credential' ? 'סיסמה' : 'קובץ'}</div>
                                            </div>
                                        </div>
                                    ))}
                                 </div>
                             ) : (
                                <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                                    <FolderOpen size={32} className="mx-auto mb-2 opacity-20" />
                                    <p>אין קבצים משויכים ללקוח זה במערכת.</p>
                                </div>
                             )}
                        </div>
                    )}

                    {activeTab === 'invoices' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-gray-900">היסטוריית חיובים</h3>
                                    <p className="text-xs text-gray-500">מסמכים מתוך חשבונית ירוקה</p>
                                </div>
                                {hasPermission('view_financials') && (
                                    <div className="relative">
                                        <div className="flex">
                                            <button
                                                onClick={() => handleGenerateDocument('invoice')}
                                                className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-r-lg font-bold flex items-center gap-1 hover:bg-green-700 transition-colors"
                                            >
                                                <Plus size={14} /> הפק חשבונית
                                            </button>
                                            <button
                                                onClick={() => setIsDocTypeDropdownOpen(!isDocTypeDropdownOpen)}
                                                className="text-xs bg-green-700 text-white px-1.5 py-1.5 rounded-l-lg font-bold hover:bg-green-800 transition-colors border-r border-green-500"
                                            >
                                                <ChevronDown size={12} />
                                            </button>
                                        </div>
                                        {isDocTypeDropdownOpen && (
                                            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 min-w-[180px] py-1">
                                                <button onClick={() => handleGenerateDocument('invoice')} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 text-right">
                                                    <FileText size={13} className="text-green-600" /> חשבונית
                                                </button>
                                                <button onClick={() => handleGenerateDocument('quote')} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 text-right">
                                                    <ClipboardList size={13} className="text-blue-600" /> הצעת מחיר
                                                </button>
                                                <button onClick={() => handleGenerateDocument('receipt')} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 text-right">
                                                    <Receipt size={13} className="text-purple-600" /> קבלה
                                                </button>
                                                <button onClick={() => handleGenerateDocument('invoice_receipt')} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 text-right">
                                                    <FileText size={13} className="text-amber-600" /> חשבונית מס / קבלה
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {clientInvoices.length > 0 ? (
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    {clientInvoices.map((inv: Invoice, idx: number) => (
                                        <div key={inv.id} className={`flex items-center justify-between p-4 ${idx !== clientInvoices.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-gray-50 transition-colors`}>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Receipt size={18} /></div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900">חשבונית מס #{inv.number}</div>
                                                    <div className="text-xs text-gray-500">{new Date(inv.date).toLocaleDateString('he-IL')} • {inv.description}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-gray-900">₪{inv.amount.toLocaleString()}</div>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${inv.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {inv.status === 'Paid' ? 'שולם' : 'ממתין'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                                    <Receipt size={32} className="mx-auto mb-2 opacity-20" />
                                    <p>לא נמצאו חשבוניות ללקוח זה.</p>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

          {/* End Main Content Container */}
        </div>
      </motion.div>

      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSuccess={handleInvoiceSuccess}
        clientName={client.companyName || client.name}
        clientEmail={client.email}
        clientPhone={client.phone}
        defaultAmount={monthlyValue}
        defaultDescription={`שירות ${client.package} - חודש שוטף`}
        defaultDocumentType={invoiceDocType}
      />
    </div>
  );
};
