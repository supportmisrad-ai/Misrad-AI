
import React, { useState } from 'react';
import { X, CircleCheckBig, CircleAlert, Globe, Layout, Smartphone, Video } from 'lucide-react';

interface PlatformConnectModalProps {
  onClose: () => void;
  connectedPlatforms: Record<string, boolean>;
  onToggleConnection: (platform: string) => void;
}

// Simple Icon component for Google
const SearchIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
);

const PLATFORMS = [
    { id: 'facebook', name: 'Meta Ads (Facebook/Instagram)', icon: Globe, color: 'bg-blue-600' },
    { id: 'google', name: 'Google Ads & YouTube', icon: SearchIcon, color: 'bg-red-500' },
    { id: 'tiktok', name: 'TikTok for Business', icon: Smartphone, color: 'bg-black' },
    { id: 'linkedin', name: 'LinkedIn Campaign Manager', icon: Layout, color: 'bg-blue-700' },
];

const PlatformConnectModal: React.FC<PlatformConnectModalProps> = ({ onClose, connectedPlatforms, onToggleConnection }) => {
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const handleToggle = (id: string) => {
      if (connectedPlatforms[id]) {
          // Disconnect immediately
          onToggleConnection(id);
      } else {
          // Simulate connection delay
          setConnectingId(id);
          setTimeout(() => {
              onToggleConnection(id);
              setConnectingId(null);
          }, 1500);
      }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden ring-1 ring-slate-900/5 transform transition-all animate-scale-in" 
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
             <div>
                 <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                     <Video size={20} className="text-indigo-600" />
                     חיבור ערוצי שיווק
                 </h3>
                 <p className="text-sm text-slate-500 font-medium mt-1">ניהול הרשאות וגישה לחשבונות מודעות</p>
             </div>
             <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full border border-slate-200 hover:bg-slate-100 transition-colors">
                 <X size={20} />
             </button>
        </div>
        
        <div className="p-6 space-y-4">
            {PLATFORMS.map(platform => {
                const isConnected = connectedPlatforms[platform.id];
                const isConnecting = connectingId === platform.id;
                const Icon = platform.icon;

                return (
                    <div key={platform.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-slate-200 bg-white hover:shadow-sm transition-all group">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md ${platform.color}`}>
                                <Icon size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">{platform.name}</h4>
                                <div className="flex items-center gap-1.5 mt-1">
                                    {isConnected ? (
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <CircleCheckBig size={10} /> מחובר ומסנכרן
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <CircleAlert size={10} /> לא מחובר
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => handleToggle(platform.id)}
                            disabled={isConnecting}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-w-[100px] flex items-center justify-center ${
                                isConnected 
                                ? 'bg-white border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-100' 
                                : 'bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-900/10'
                            }`}
                        >
                            {isConnecting ? 'מחבר...' : isConnected ? 'התנתק' : 'חבר חשבון'}
                        </button>
                    </div>
                );
            })}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
                החיבור מתבצע בצורה מאובטחת בתקן OAuth 2.0. איננו שומרים את הסיסמאות שלך.
            </p>
        </div>
      </div>
    </div>
  );
};

export default PlatformConnectModal;
