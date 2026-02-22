
import React, { useState, useEffect } from 'react';
import { useNexus } from '../context/ClientContext';
import { JourneyStage, AssignedForm, SuccessGoal, ClientAction } from '../types';
import { generateTestimonial, generateProgressSummary } from '../services/geminiService';
import { PortalSidebar } from './portal/PortalSidebar';
import { PortalDashboard } from './portal/PortalDashboard';
import { PortalVault } from './portal/PortalVault';
import { PortalJourney } from './portal/PortalJourney';
import { PortalMetrics } from './portal/PortalMetrics';
import { PortalFinance } from './portal/PortalFinance';
import { PortalConcierge } from './portal/PortalConcierge';
import { PortalModals } from './portal/PortalModals';
import { PortalFormFiller } from './portal/PortalFormFiller';

interface ClientPortalProps {
  clientId: string;
  onBack: () => void;
}

type PortalScreen = 'dashboard' | 'vault' | 'journey' | 'metrics' | 'concierge' | 'finance';

type MoodOption = {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  hover?: string;
};

const ClientPortal: React.FC<ClientPortalProps> = ({ clientId, onBack }) => {
  const { clients, meetings, completeClientAction, updateFormStatus } = useNexus();
  const client = clients.find(c => c.id === clientId) || clients[0];
  const clientMeetings = meetings.filter(m => m.clientId === client.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Navigation & UI State
  const [activeScreen, setActiveScreen] = useState<PortalScreen>('dashboard');
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [showTestimonialCard, setShowTestimonialCard] = useState(true);
  
  // Pulse Check State
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);
  const [moodComment, setMoodComment] = useState('');
  const [isSubmittingMood, setIsSubmittingMood] = useState(false);
  const [moodSubmitted, setMoodSubmitted] = useState(false);

  // Feedback State
  const [showFrictionModal, setShowFrictionModal] = useState(false);
  const [frictionText, setFrictionText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  
  // Celebration State
  const [celebratingStage, setCelebratingStage] = useState<JourneyStage | null>(null);
  const [testimonialInput, setTestimonialInput] = useState('');
  const [generatedTestimonial, setGeneratedTestimonial] = useState<{quote: string, linkedinPost: string} | null>(null);
  const [isGeneratingTestimonial, setIsGeneratingTestimonial] = useState(false);

  // Metrics State
  const [aiProgressSummary, setAiProgressSummary] = useState<Record<string, {summary: string, forecast: string}>>({});
  const [isAnalyzingMetrics, setIsAnalyzingMetrics] = useState(false);

  // Form Filling State
  const [activeFormToFill, setActiveFormToFill] = useState<AssignedForm | null>(null);

  // Finance State
  const [isPaying, setIsPaying] = useState(false);

  const journey = client.journey || [];
  const pendingTasks = client.pendingActions.filter(a => a.status !== 'COMPLETED');
  const approvals = pendingTasks.filter(a => a.type === 'APPROVAL' || a.type === 'SIGNATURE');
  const northStarGoal = client.successGoals[0];

  const performanceHistory: Array<{ name: string; value: number; baseline?: number }> = [];

  // Trigger celebration simulation
  useEffect(() => {
    const lastCompleted = [...journey].reverse().find(s => s.status === 'COMPLETED');
    if (lastCompleted && !localStorage.getItem(`celebrated_${lastCompleted.id}`)) {
      setCelebratingStage(lastCompleted);
      localStorage.setItem(`celebrated_${lastCompleted.id}`, 'true');
    }
  }, [journey]);

  // Handlers
  const handleAnalyzeGoal = async (goal: SuccessGoal) => {
    if (aiProgressSummary[goal.id]) return;
    setIsAnalyzingMetrics(true);
    try {
      const result = await generateProgressSummary(goal.title, goal.metricCurrent, goal.metricTarget, goal.unit);
      setAiProgressSummary(prev => ({ ...prev, [goal.id]: result }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingMetrics(false);
    }
  };

  const handleActionComplete = (actionId: string, title: string) => {
    completeClientAction(client.id, actionId);
    window.dispatchEvent(new CustomEvent('nexus-toast', { 
      detail: { message: `פעולה "${title}" אושרה בהצלחה!`, type: 'success' } 
    }));
  };

  const handleUploadSim = (actionId: string, title: string) => {
    setIsUploading(actionId);
    setTimeout(() => {
      setIsUploading(null);
      completeClientAction(client.id, actionId);
      window.dispatchEvent(new CustomEvent('nexus-toast', { 
        detail: { message: `הקובץ עבור "${title}" הועלה בהצלחה!`, type: 'success' } 
      }));
    }, 2000);
  };

  const handleSubmitPulse = () => {
    setIsSubmittingMood(true);
    setTimeout(() => {
      setIsSubmittingMood(false);
      setMoodSubmitted(true);
      window.dispatchEvent(new CustomEvent('nexus-toast', { 
        detail: { message: 'תודה על השיתוף! העדכון שלך נרשם.', type: 'success' } 
      }));
    }, 1000);
  };

  const handleSubmitFriction = () => {
    if (!frictionText.trim()) return;
    setIsSubmittingFeedback(true);
    setTimeout(() => {
      setIsSubmittingFeedback(false);
      setShowFrictionModal(false);
      setFrictionText('');
      window.dispatchEvent(new CustomEvent('nexus-toast', { 
        detail: { message: 'הפידבק התקבל. מנהל התיק שלך עודכן וחוזר אלייך.', type: 'info' } 
      }));
    }, 1200);
  };

  const handleGenerateTestimonial = async () => {
    if (!testimonialInput.trim()) return;
    setIsGeneratingTestimonial(true);
    try {
      const result = await generateTestimonial(client.name, testimonialInput);
      setGeneratedTestimonial(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingTestimonial(false);
    }
  };

  const handleOpenForm = (formTask: ClientAction) => {
    const form = client.assignedForms.find(f => f.title === formTask.title) || {
      id: formTask.id,
      title: formTask.title,
      status: 'SENT',
      progress: 0,
      dateSent: 'היום'
    };
    setActiveFormToFill(form as AssignedForm);
  };

  const handleSubmitForm = () => {
    if (!activeFormToFill) return;
    updateFormStatus(client.id, activeFormToFill.id, 'COMPLETED', 100);
    const task = client.pendingActions.find(a => a.title === activeFormToFill.title);
    if (task) completeClientAction(client.id, task.id);
    window.dispatchEvent(new CustomEvent('nexus-toast', { 
      detail: { message: `הטופס "${activeFormToFill.title}" נשלח בהצלחה!`, type: 'success' } 
    }));
    setActiveFormToFill(null);
  };
  
  const handleSimulatePayment = () => {
    window.dispatchEvent(new CustomEvent('nexus-toast', { 
      detail: { message: 'תשלום מקוון טרם חובר. פנה למנהל החשבון שלך לביצוע תשלום.', type: 'info' } 
    }));
  };

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return (
          <PortalDashboard 
            client={client}
            pendingTasks={pendingTasks}
            approvals={approvals}
            northStarGoal={northStarGoal}
            showTestimonialCard={showTestimonialCard}
            onCloseTestimonial={() => setShowTestimonialCard(false)}
            onActionComplete={handleActionComplete}
            onNavigate={(screen: unknown) => setActiveScreen(screen as PortalScreen)}
            selectedMood={selectedMood}
            setSelectedMood={setSelectedMood}
            moodComment={moodComment}
            setMoodComment={setMoodComment}
            isSubmittingMood={isSubmittingMood}
            moodSubmitted={moodSubmitted}
            onSubmitPulse={handleSubmitPulse}
          />
        );
      case 'vault':
        return (
          <PortalVault 
            pendingTasks={pendingTasks}
            clientAssets={client.assets}
            isUploading={isUploading}
            onUpload={handleUploadSim}
            onOpenForm={handleOpenForm}
            onActionComplete={handleActionComplete}
          />
        );
      case 'journey':
        return <PortalJourney journey={journey} />;
      case 'metrics':
        return (
          <PortalMetrics 
            performanceHistory={performanceHistory as unknown as { date: string; value: number }[]}
            client={client}
            aiProgressSummary={aiProgressSummary}
            isAnalyzingMetrics={isAnalyzingMetrics}
            onAnalyzeGoal={handleAnalyzeGoal}
          />
        );
      case 'finance':
        return <PortalFinance client={client} isPaying={isPaying} onSimulatePayment={handleSimulatePayment} />;
      case 'concierge':
        return <PortalConcierge client={client} clientMeetings={clientMeetings} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans dir-rtl selection:bg-nexus-accent selection:text-white overflow-hidden">
      
      <PortalModals 
        showFrictionModal={showFrictionModal}
        setShowFrictionModal={setShowFrictionModal}
        frictionText={frictionText}
        setFrictionText={setFrictionText}
        isSubmittingFeedback={isSubmittingFeedback}
        onSubmitFriction={handleSubmitFriction}
        celebratingStage={celebratingStage}
        setCelebratingStage={setCelebratingStage}
        testimonialInput={testimonialInput}
        setTestimonialInput={setTestimonialInput}
        generatedTestimonial={generatedTestimonial}
        isGeneratingTestimonial={isGeneratingTestimonial}
        onGenerateTestimonial={handleGenerateTestimonial}
      />

      {activeFormToFill && (
        <PortalFormFiller 
          activeForm={activeFormToFill}
          onClose={() => setActiveFormToFill(null)}
          onSubmit={handleSubmitForm}
        />
      )}

      <PortalSidebar 
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen as (screen: unknown) => void}
        onShowFriction={() => setShowFrictionModal(true)}
        onBack={onBack}
        client={client}
      />

      <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10 p-6 lg:p-12 pb-32">
        {renderActiveScreen()}
      </main>
    </div>
  );
};

export default ClientPortal;
