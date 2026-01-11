'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Campaign, ContentItem } from './types';
import { 
    Megaphone, TrendingUp, DollarSign, Users, 
    Play, Pause, Plus, Filter, ArrowUpRight,
    Zap, Activity, Trash2, Edit, Search, Layers, Lock, Globe, MousePointer, 
    Clapperboard, FileInput, Network, Link as LinkIcon, CheckCircle2
} from 'lucide-react';
import NewCampaignModal from './NewCampaignModal';
import PlatformConnectModal from './PlatformConnectModal';
import ContentStudioView from './ContentStudioView';
import FormsView from './FormsView';
import PartnersView from './PartnersView';
import { useAuth } from './contexts/AuthContext';
import { useToast } from './contexts/ToastContext';

interface MarketingViewProps {
  campaigns: Campaign[];
  content?: ContentItem[];
  onUpdateContent?: (item: ContentItem) => void;
  onAddContent?: (item: ContentItem) => void;
  onAddCampaign?: (campaign: Campaign) => void;
  onUpdateCampaign?: (campaign: Campaign) => void;
  onDeleteCampaign?: (id: string) => void;
  initialTab?: 'campaigns' | 'content' | 'forms' | 'partners';
}

const MarketingView: React.FC<MarketingViewProps> = ({ 
    campaigns, content, onUpdateContent, onAddContent, 
    onAddCampaign, onUpdateCampaign, onDeleteCampaign,
    initialTab = 'campaigns'
}) => {
  const { canAccess } = useAuth();
  const { addToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'campaigns' | 'content' | 'forms' | 'partners'>(initialTab);
  
  useEffect(() => {
    setActiveSubTab(initialTab);
  }, [initialTab]);

  // --- Campaign State ---
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Simulated Connected State
  const [connectedPlatforms, setConnectedPlatforms] = useState<Record<string, boolean>>({
      facebook: true,
      google: true,
      tiktok: false,
      linkedin: false
  });

  const handleToggleConnection = (platform: string) => {
      setConnectedPlatforms(prev => {
          const newState = { ...prev, [platform]: !prev[platform] };
          if (newState[platform]) {
              addToast('החיבור בוצע בהצלחה! מסנכרן נתונים...', 'success');
          } else {
              addToast('החיבור נותק.', 'warning');
          }
          return newState;
      });
  };

  // Extract unique platforms dynamically from existing campaigns
  const availablePlatforms = useMemo(() => {
      const platforms = new Set(campaigns.map(c => c.platform));
      return ['all', ...Array.from(platforms)];
  }, [campaigns]);

  // Filter Logic
  const filteredCampaigns = campaigns.filter(c => {
      const matchesPlatform = selectedPlatform === 'all' || c.platform === selectedPlatform;
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesPlatform && matchesSearch;
  });

  // Stats Calculations based on FILTERED view
  const totalSpent = filteredCampaigns.reduce((sum, c) => sum + c.spent, 0);
  const totalLeads = filteredCampaigns.reduce((sum, c) => sum + c.leads, 0);
  const avgCPL = totalLeads > 0 ? totalSpent / totalLeads : 0;
  const avgROAS = filteredCampaigns.length > 0 
    ? filteredCampaigns.reduce((sum, c) => sum + c.roas, 0) / filteredCampaigns.length 
    : 0;

  // Chart Data - Platform Performance
  const platformPerformance = useMemo(() => {
      const data: Record<string, { leads: number, spent: number }> = {};
      campaigns.forEach(c => {
          if (!data[c.platform]) data[c.platform] = { leads: 0, spent: 0 };
          data[c.platform].leads += c.leads;
          data[c.platform].spent += c.spent;
      });
      return Object.keys(data).map(key => ({
          name: translatePlatform(key),
          rawKey: key, 
          leads: data[key].leads,
          cpl: data[key].spent / data[key].leads,
          color: getStringColor(key)
      }));
  }, [campaigns]);

  // Actions
  const toggleStatus = (id: string) => {
      if (!canAccess || !onUpdateCampaign) return;
      const campaign = campaigns.find(c => c.id === id);
      if (campaign) {
          onUpdateCampaign({ ...campaign, status: campaign.status === 'active' ? 'paused' : 'active' });
      }
  };

  const handleDelete = (id: string) => {
      if (!canAccess || !onDeleteCampaign) return;
      if (window.confirm('האם אתה בטוח שברצונך למחוק קמפיין זה?')) {
          onDeleteCampaign(id);
      }
  };

  const handleEdit = () => {
      addToast('עריכת קמפיין אינה זמינה כרגע', 'info');
  };

  const handleOptimize = () => {
      addToast('האופטימיזציה בוצעה בהצלחה! התקציב עודכן.', 'success');
  };

  const handleCreateCampaign = (campaignData: Pick<Campaign, 'name' | 'platform' | 'budget' | 'status'>) => {
      if (!connectedPlatforms[campaignData.platform] && ['facebook', 'google', 'tiktok', 'linkedin'].includes(campaignData.platform)) {
          addToast(`שים לב: ${campaignData.platform} לא מחובר. הקמפיין יווצר כטיוטה מקומית.`, 'warning');
      }
      
      const newCampaign: Campaign = {
          id: `c_${Date.now()}`,
          ...campaignData,
          spent: 0,
          leads: 0,
          cpl: 0,
          roas: 0,
          impressions: 0
      };
      
      if (onAddCampaign) {
          onAddCampaign(newCampaign);
          addToast('קמפיין חדש נוצר בהצלחה!', 'success');
      }
  };

  // Helper for dynamic colors
  function getStringColor(str: string) {
      const colors: Record<string, string> = {
          facebook: '#1877F2',
          google: '#EA4335',
          instagram: '#E1306C',
          tiktok: '#000000',
          linkedin: '#0A66C2',
          youtube: '#FF0000'
      };
      return colors[str.toLowerCase()] || '#E11D48'; // Default to Rose
  }

  function translatePlatform(platform: string) {
      const map: Record<string, string> = {
          facebook: 'פייסבוק',
          google: 'גוגל',
          instagram: 'אינסטגרם',
          tiktok: 'טיקטוק',
          linkedin: 'לינקדאין',
          youtube: 'יוטיוב',
          all: 'הכל'
      };
      return map[platform.toLowerCase()] || platform;
  }

  const getPlatformIcon = (platform: string) => {
      const p = platform.toLowerCase();
      if (p.includes('facebook')) return <Globe size={14} className="text-[#1877F2]" />;
      if (p.includes('google')) return <Search size={14} className="text-[#EA4335]" />;
      if (p.includes('instagram')) return <Activity size={14} className="text-[#E1306C]" />;
      if (p.includes('tiktok')) return <span className="font-black text-[10px]">TK</span>;
      if (p.includes('linkedin')) return <Users size={14} className="text-[#0A66C2]" />;
      return <Globe size={14} className="text-slate-500" />;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
        {/* Sub Navigation - Reduced prominence since main nav handles primary selection */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-1 sticky top-0 z-30 shadow-sm md:hidden">
            <div className="max-w-[1920px] mx-auto flex gap-6 overflow-x-auto no-scrollbar">
                {[
                    { id: 'campaigns', label: 'קמפיינים', icon: Megaphone },
                    { id: 'content', label: 'תוכן', icon: Clapperboard },
                    { id: 'forms', label: 'טפסים', icon: FileInput },
                    { id: 'partners', label: 'שותפים', icon: Network },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id as any)}
                        className={`flex items-center gap-2 py-3 px-1 border-b-2 transition-all whitespace-nowrap text-xs font-bold ${
                            activeSubTab === tab.id 
                            ? 'border-primary text-primary-dark' 
                            : 'border-transparent text-slate-500'
                        }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>

        {/* --- CAMPAIGNS VIEW --- */}
        {activeSubTab === 'campaigns' && (
            <div className="p-4 md:p-8 animate-fade-in space-y-8 pb-20 max-w-[1920px] mx-auto w-full">
            
            {/* Header with New Campaign Button */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">קמפיינים</h2>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowConnectModal(true)}
                        className="bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800 px-4 py-2 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2 text-sm"
                    >
                        <LinkIcon size={16} />
                        חיבור פלטפורמות
                    </button>
                    <button 
                        onClick={() => setShowNewCampaignModal(true)}
                        className="bg-onyx-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-onyx-900/20 hover:bg-black transition-all flex items-center gap-2 hover:-translate-y-0.5 text-sm"
                    >
                        <Plus size={18} />
                        קמפיין חדש
                    </button>
                </div>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-slate-900 p-6 rounded-3xl shadow-xl text-white flex flex-col justify-between h-36 relative overflow-hidden group border border-slate-700">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-emerald-500/30 transition-colors"></div>
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><TrendingUp size={12} /> יחס המרה</p>
                            <h3 className="text-4xl font-bold tracking-tight">x{avgROAS.toFixed(2)}</h3>
                        </div>
                    </div>
                    <div className="relative z-10 w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-4">
                        <div className={`h-full rounded-full ${avgROAS > 3 ? 'bg-emerald-500' : avgROAS > 1.5 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${Math.min(avgROAS * 20, 100)}%`}}></div>
                    </div>
                </div>

                <div className="ui-card p-6 flex flex-col justify-between h-36 relative overflow-hidden group hover:border-slate-300">
                    <div className="flex justify-between items-start">
                        <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl"><DollarSign size={20} /></div>
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">הוצאה</span>
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold text-slate-800">₪{totalSpent.toLocaleString()}</h3>
                    </div>
                </div>

                <div className="ui-card p-6 flex flex-col justify-between h-36 relative overflow-hidden group hover:border-rose-300">
                    <div className="flex justify-between items-start">
                        <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl"><Users size={20} /></div>
                    </div>
                    <div>
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">סה"כ לידים</div>
                        <h3 className="text-3xl font-bold text-slate-800">{totalLeads}</h3>
                    </div>
                </div>

                <div className="ui-card p-6 flex flex-col justify-between h-36 relative overflow-hidden group hover:border-amber-300">
                    <div className="flex justify-between items-start">
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><MousePointer size={20} /></div>
                    </div>
                    <div>
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">עלות ליד</div>
                        <h3 className="text-3xl font-bold text-slate-800">₪{avgCPL.toFixed(0)}</h3>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 ui-card overflow-hidden flex flex-col min-h-[500px]">
                    <div className="p-6 border-b border-slate-100 space-y-4 bg-slate-50/50">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                <Layers size={18} className="text-primary" />
                                ניהול קמפיינים פעיל
                            </h3>
                            <div className="relative w-full md:w-64">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="חיפוש קמפיין..." 
                                    className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {availablePlatforms.map(platform => (
                                <button
                                    key={platform}
                                    onClick={() => setSelectedPlatform(platform)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border flex items-center gap-2 ${
                                        selectedPlatform === platform 
                                        ? 'bg-primary text-white border-primary shadow-md' 
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                                    }`}
                                >
                                    {getPlatformIcon(platform)}
                                    {translatePlatform(platform)}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="hidden md:block overflow-x-auto flex-1">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">סטטוס</th>
                                    <th className="px-6 py-4">שם הקמפיין</th>
                                    <th className="px-6 py-4">הוצאה</th>
                                    <th className="px-6 py-4">לידים</th>
                                    <th className="px-6 py-4">CPL</th>
                                    <th className="px-6 py-4">ROAS</th>
                                    <th className="px-6 py-4 text-center">פעולות</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCampaigns.map((camp) => (
                                    <tr key={camp.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className={`w-2.5 h-2.5 rounded-full ${camp.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-700">{camp.name}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">₪{camp.spent.toLocaleString()}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{camp.leads}</td>
                                        <td className="px-6 py-4 font-mono font-bold text-slate-600">₪{camp.cpl.toFixed(1)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${camp.roas >= 4 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                x{camp.roas}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => toggleStatus(camp.id)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
                                                    {camp.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                                                </button>
                                                <button onClick={handleEdit} className="p-2 text-slate-400 hover:text-primary rounded-lg transition-colors"><Edit size={16} /></button>
                                                <button onClick={() => handleDelete(camp.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-colors cursor-pointer" onClick={() => setShowConnectModal(true)}>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <LinkIcon size={18} className="text-indigo-500" />
                            חיבורים פעילים
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(connectedPlatforms).map(([key, isConnected]) => (
                                <div key={key} className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold border transition-colors ${isConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                    <span className="capitalize">{key}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-rose-600 to-slate-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full"></div>
                        <div className="flex items-center gap-2 mb-4 relative z-10">
                            <Zap className="text-yellow-300 fill-yellow-300" size={18} />
                            <h3 className="font-bold">המלצת מערכת</h3>
                        </div>
                        <p className="text-white/90 text-sm leading-relaxed mb-4 font-medium">
                            זיהיתי שעלות הליד בפייסבוק נמוכה ב-30% מהממוצע. מומלץ להסיט 20% מהתקציב לשם.
                        </p>
                        <button onClick={handleOptimize} className="w-full bg-white text-rose-700 py-2.5 rounded-xl text-xs font-bold hover:bg-rose-50 transition-colors">בצע אופטימיזציה אוטומטית</button>
                    </div>
                </div>
            </div>

            {showNewCampaignModal && <NewCampaignModal onClose={() => setShowNewCampaignModal(false)} onSubmit={handleCreateCampaign} />}
            {showConnectModal && <PlatformConnectModal onClose={() => setShowConnectModal(false)} connectedPlatforms={connectedPlatforms} onToggleConnection={handleToggleConnection} />}
            </div>
        )}

        {/* --- CONTENT STUDIO VIEW --- */}
        {activeSubTab === 'content' && <ContentStudioView content={content} onUpdateContent={onUpdateContent} onAddContent={onAddContent} />}

        {/* --- FORMS VIEW --- */}
        {activeSubTab === 'forms' && <FormsView />}

        {/* --- PARTNERS VIEW --- */}
        {activeSubTab === 'partners' && <PartnersView />}
    </div>
  );
};

export default MarketingView;
