
import React, { useState, useEffect } from 'react';
import { Lead, CalendarEvent, Task, SquareActivity, Campaign, Student, ContentItem } from '../types';
import SystemCommandCenter from '../../SystemCommandCenter';
import MorningBriefingView from './MorningBriefingView';

interface WorkspaceHubProps {
  leads: Lead[];
  content: ContentItem[];
  students: Student[];
  campaigns: Campaign[];
  tasks: Task[];
  events: CalendarEvent[];
  onLeadClick: (lead: Lead) => void;
  onNavigate: (tabId: string) => void;
  onQuickAction: (action: 'lead' | 'meeting' | 'task') => void;
  onAddEvent: (event: CalendarEvent) => void;
  onNewMeetingClick: () => void;
  onAddActivity: (leadId: string, SquareActivity: SquareActivity) => void;
  onAddContact?: (lead: Lead) => void;
  onUpdateTask: (task: Task) => void;
  onAddTask: (task: Task) => void;
  initialTab?: 'overview' | 'briefing';
}

const WorkspaceHub: React.FC<WorkspaceHubProps> = ({ 
    leads, content, students, campaigns, tasks, events,
    onLeadClick, onNavigate, onQuickAction, onAddEvent, onNewMeetingClick,
    onAddActivity, onAddContact, onUpdateTask, onAddTask,
    initialTab = 'overview'
}) => {
  const [currentView, setCurrentView] = useState<'overview' | 'briefing'>(initialTab);

  // סנכרון במידה והטאב משתנה מבחוץ
  useEffect(() => {
    if (initialTab) setCurrentView(initialTab);
  }, [initialTab]);

  const handleInternalNavigate = (target: string) => {
      if (target === 'briefing') {
          setCurrentView('briefing');
      } else if (target === 'overview' || target === 'workspace') {
          setCurrentView('overview');
      } else {
          // אם זה ניווט לעמוד אחר לגמרי (כמו 'finance'), נשתמש בפונקציה הראשית
          onNavigate(target);
      }
  };

  return (
    <div className="h-full flex flex-col">
        <div className="flex-1 overflow-hidden relative">
            <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
                {currentView === 'overview' ? (
                    <SystemCommandCenter 
                        leads={leads} 
                        content={content}
                        students={students}
                        campaigns={campaigns}
                        tasks={tasks}
                        events={events}
                        onLeadClick={onLeadClick}
                        onNavigate={handleInternalNavigate}
                        onQuickAction={onQuickAction}
                    />
                ) : (
                    <MorningBriefingView 
                        leads={leads}
                        events={events}
                        tasks={tasks}
                        onLeadClick={onLeadClick}
                        onNavigate={onNavigate}
                        onUpdateTask={onUpdateTask}
                        onStartShift={() => setCurrentView('overview')}
                    />
                )}
            </div>
        </div>
    </div>
  );
};

export default WorkspaceHub;
