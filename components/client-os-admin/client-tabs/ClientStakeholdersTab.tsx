import React from 'react';
import { Client, StakeholderRole } from '@/components/client-portal/types';
import { Users, Crown, UserCheck, Shield, Share2, CircleUser } from 'lucide-react';

interface ClientStakeholdersTabProps {
  client: Client;
}

export const ClientStakeholdersTab: React.FC<ClientStakeholdersTabProps> = ({ client }) => {
  const getStakeholderIcon = (role: StakeholderRole) => {
    switch (role) {
      case 'CHAMPION':
        return <Crown size={16} className="text-[color:var(--os-accent)]" />;
      case 'DECISION_MAKER':
        return <UserCheck size={16} className="text-blue-500" />;
      case 'BLOCKER':
        return <Shield size={16} className="text-red-500" />;
      case 'INFLUENCER':
        return <Share2 size={16} className="text-purple-500" />;
      default:
        return <CircleUser size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={20} className="text-nexus-accent" /> מי נגד מי (אנשי קשר)
          </h3>
          <p className="text-sm text-gray-500">מי קובע, מי מפריע ומי בעדנו.</p>
        </div>
        <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:border-nexus-primary hover:text-nexus-primary transition-colors">
          + הוסף איש קשר
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {client.stakeholders?.map((sh) => (
          <div key={sh.id} className="glass-card p-0 rounded-xl border border-gray-200 overflow-hidden group hover:shadow-lg transition-all">
            <div className="h-20 bg-gradient-to-r from-gray-100 to-gray-50 relative">
              <div className="absolute top-3 right-3">
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded-full border bg-white flex items-center gap-1 ${
                    sh.nexusRole === 'CHAMPION'
                      ? 'text-green-600 border-green-200'
                      : sh.nexusRole === 'BLOCKER'
                        ? 'text-red-600 border-red-200'
                        : sh.nexusRole === 'DECISION_MAKER'
                          ? 'text-blue-600 border-blue-200'
                          : 'text-gray-500 border-gray-200'
                  }`}
                >
                  {getStakeholderIcon(sh.nexusRole)} {sh.nexusRole}
                </span>
              </div>
            </div>
            <div className="px-6 pb-6 relative">
              <div className="w-16 h-16 rounded-full border-4 border-white bg-white shadow-sm -mt-8 mb-3 overflow-hidden">
                <img src={sh.avatarUrl || `https://ui-avatars.com/api/?name=${sh.name}`} alt={sh.name} className="w-full h-full object-cover" />
              </div>

              <h4 className="font-bold text-gray-900 text-lg">{sh.name}</h4>
              <p className="text-sm text-gray-500 mb-4">{sh.jobTitle}</p>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">השפעה</span>
                    <span className="font-bold">{sh.influence}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-nexus-primary h-full rounded-full" style={{ width: `${sh.influence}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">כמה הוא אוהב אותנו</span>
                    <span className="font-bold">{sh.sentiment}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        sh.sentiment > 70 ? 'bg-green-500' : sh.sentiment < 40 ? 'bg-red-500' : 'bg-[color:var(--os-accent)]'
                      }`}
                      style={{ width: `${sh.sentiment}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 italic">"{sh.notes}"</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
