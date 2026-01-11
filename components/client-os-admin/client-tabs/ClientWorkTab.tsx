import React from 'react';
import { Client } from '@/components/client-portal/types';
import { Briefcase, Image, FolderOpen, FileText, Download } from 'lucide-react';

interface ClientWorkTabProps {
  client: Client;
}

export const ClientWorkTab: React.FC<ClientWorkTabProps> = ({ client }) => {
  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'PDF':
        return <FileText size={20} className="text-red-500" />;
      case 'IMAGE':
        return <Image size={20} className="text-blue-500" />;
      case 'FIGMA':
        return <Briefcase size={20} className="text-purple-500" />;
      default:
        return <FileText size={20} className="text-gray-500" />;
    }
  };

  return (
    <div className="space-y-8 animate-slide-up">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Briefcase size={18} className="text-nexus-primary" /> פרויקטים
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {client.deliverables?.map((del) => (
            <div key={del.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden group hover:shadow-lg transition-all">
              <div className="h-32 bg-gray-100 relative overflow-hidden">
                {del.thumbnailUrl ? (
                  <img src={del.thumbnailUrl} alt={del.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Image size={32} />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] font-bold bg-white/90 backdrop-blur px-2 py-1 rounded shadow-sm text-gray-700">{del.type}</span>
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-bold text-gray-900 mb-1">{del.title}</h4>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{del.description}</p>
                <div className="flex justify-between items-center text-xs text-gray-400 border-t border-gray-100 pt-3">
                  <span>{del.date}</span>
                  <span
                    className={`font-bold ${
                      del.status === 'PUBLISHED'
                        ? 'text-green-600'
                        : del.status === 'APPROVED'
                          ? 'text-blue-600'
                          : 'text-yellow-600'
                    }`}
                  >
                    {del.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FolderOpen size={18} className="text-nexus-accent" /> קבצים
        </h3>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {client.assets?.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-100 rounded-lg">{getAssetIcon(asset.type)}</div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">{asset.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{asset.category}</span>
                    <span>•</span>
                    <span>{asset.date}</span>
                  </div>
                </div>
              </div>
              <button className="text-gray-400 hover:text-nexus-primary p-2">
                <Download size={18} />
              </button>
            </div>
          ))}
          {client.assets.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">אין קבצים</div>}
        </div>
      </div>
    </div>
  );
};
