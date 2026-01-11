'use client';

import React from 'react';
import { Lead, PipelineStage } from './types';
import PipelineBoard from './PipelineBoard';
import ContactsView from './ContactsView';
import SystemTargetsView from './SystemTargetsView';

interface LeadsHubProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: PipelineStage) => void;
  initialTab?: 'pipeline' | 'list' | 'targets';
}

const LeadsHub: React.FC<LeadsHubProps> = ({ leads, onLeadClick, onStatusChange, initialTab = 'pipeline' }) => {
  return (
    <div className="h-full flex flex-col">
        {/* Content Area - No internal navigation, controlled by Sidebar/App.tsx */}
        <div className="flex-1 overflow-hidden relative">
            {initialTab === 'pipeline' && (
                <div className="h-full p-4 md:p-8 animate-fade-in">
                    <PipelineBoard 
                        leads={leads} 
                        onLeadClick={onLeadClick} 
                        onStatusChange={onStatusChange} 
                    />
                </div>
            )}

            {initialTab === 'list' && (
                <ContactsView leads={leads} viewMode="all" onLeadClick={onLeadClick} />
            )}

            {initialTab === 'targets' && (
                <SystemTargetsView leads={leads} />
            )}
        </div>
    </div>
  );
};

export default LeadsHub;

