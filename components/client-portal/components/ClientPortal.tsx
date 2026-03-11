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
  clientId?: string;
}

type PortalScreen = 'dashboard' | 'vault' | 'journey' | 'metrics' | 'concierge' | 'finance';

type MoodOption = {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  hover?: string;
};

export default function ClientPortal({ clientId }: ClientPortalProps) {
  const { clients, meetings, completeClientAction, updateFormStatus } = useNexus();
  const client = clientId ? clients.find((c) => c.id === clientId) : clients[0];
  const clientMeetings = meetings
    .filter((m) => (client?.id ? m.clientId === client.id : false))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const [activeScreen, setActiveScreen] = useState<PortalScreen>('dashboard');
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [showTestimonialCard, setShowTestimonialCard] = useState(true);

  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);
  const [moodComment, setMoodComment] = useState('');
  const [isSubmittingMood, setIsSubmittingMood] = useState(false);
  const [moodSubmitted, setMoodSubmitted] = useState(false);

  const [showFrictionModal, setShowFrictionModal] = useState(false);
  const [frictionText, setFrictionText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const [celebratingStage, setCelebratingStage] = useState<JourneyStage | null>(null);
  const [testimonialInput, setTestimonialInput] = useState('');
  const [generatedTestimonial, setGeneratedTestimonial] = useState<{ quote: string; linkedinPost: string } | null>(null);
  const [isGeneratingTestimonial, setIsGeneratingTestimonial] = useState(false);

  const [aiProgressSummary, setAiProgressSummary] = useState<Record<string, { summary: string; forecast: string }>>({});
  const [isAnalyzingMetrics, setIsAnalyzingMetrics] = useState(false);

  const [activeFormToFill, setActiveFormToFill] = useState<AssignedForm | null>(null);

  const [isPaying, setIsPaying] = useState(false);

  const journey = client?.journey || [];
  const pendingTasks = client?.pendingActions ? client.pendingActions.filter((a) => a.status !== 'COMPLETED') : [];
  const approvals = pendingTasks.filter((a) => a.type === 'APPROVAL' || a.type === 'SIGNATURE');
  const northStarGoal = client?.successGoals?.[0];

  const [showNextActionCard, setShowNextActionCard] = useState(false);

  const nextActionStorageKey = client?.id ? `client_portal_first_action_done_${client.id}` : null;

  useEffect(() => {
    if (!client?.id) {
      setShowNextActionCard(false);
      return;
    }
    if (typeof window === 'undefined') return;

    const alreadyDone = localStorage.getItem(nextActionStorageKey || '') === 'true';
    const hasAnyPending = (approvals?.length || 0) > 0 || (pendingTasks?.length || 0) > 0;
    setShowNextActionCard(!alreadyDone && hasAnyPending);
  }, [client?.id, nextActionStorageKey, approvals?.length, pendingTasks?.length]);

  const markFirstActionDone = () => {
    try {
      if (typeof window !== 'undefined' && nextActionStorageKey) {
        localStorage.setItem(nextActionStorageKey, 'true');
      }
    } catch {
      // ignore
    }
    setShowNextActionCard(false);
  };

  const performanceHistory: Array<{ name: string; value: number; baseline?: number }> = [];

  useEffect(() => {
    const lastCompleted = [...journey].reverse().find((s) => s.status === 'COMPLETED');
    if (lastCompleted && !localStorage.getItem(`celebrated_${lastCompleted.id}`)) {
      setCelebratingStage(lastCompleted);
      localStorage.setItem(`celebrated_${lastCompleted.id}`, 'true');
    }
  }, [journey]);

  const handleAnalyzeGoal = async (goal: SuccessGoal) => {
    if (aiProgressSummary[goal.id]) return;
    setIsAnalyzingMetrics(true);
    try {
      const result = await generateProgressSummary(goal.title, goal.metricCurrent, goal.metricTarget, goal.unit);
      setAiProgressSummary((prev) => ({ ...prev, [goal.id]: result }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingMetrics(false);
    }
  };

  const handleActionComplete = (actionId: string, title: string) => {
    if (!client?.id) return;
    completeClientAction(client.id, actionId);
    markFirstActionDone();
    window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: `פעולה "${title}" אושרה בהצלחה!`, type: 'success' } }));
  };

  const handleUploadSim = (actionId: string, title: string) => {
    if (!client?.id) return;
    setIsUploading(actionId);
    setTimeout(() => {
      setIsUploading(null);
      completeClientAction(client.id, actionId);
      markFirstActionDone();
      window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: `הקובץ עבור "${title}" הועלה בהצלחה!`, type: 'success' } }));
    }, 2000);
  };

  const handleSubmitPulse = () => {
    setIsSubmittingMood(true);
    setTimeout(() => {
      setIsSubmittingMood(false);
      setMoodSubmitted(true);
      window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'תודה על השיתוף! הפידבק שלך הגיע אלינו.', type: 'success' } }));
    }, 1000);
  };

  const handleSubmitFriction = () => {
    if (!frictionText.trim()) return;
    setIsSubmittingFeedback(true);
    setTimeout(() => {
      setIsSubmittingFeedback(false);
      setShowFrictionModal(false);
      setFrictionText('');
      window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'הפידבק התקבל. מנהל התיק שלך עודכן וחוזר אלייך.', type: 'info' } }));
    }, 1200);
  };

  const handleGenerateTestimonial = async () => {
    if (!client?.name) return;
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
    if (!client) return;
    const form =
      client.assignedForms.find((f) => f.title === formTask.title) ||
      ({ id: formTask.id, title: formTask.title, status: 'SENT', progress: 0, dateSent: 'היום' } as unknown);
    setActiveFormToFill(form as AssignedForm);
  };

  const handleSubmitForm = () => {
    if (!client?.id) return;
    if (!activeFormToFill) return;
    updateFormStatus(client.id, activeFormToFill.id, 'COMPLETED', 100);
    const task = client.pendingActions.find((a) => a.title === activeFormToFill.title);
    if (task) completeClientAction(client.id, task.id);
    markFirstActionDone();
    window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: `הטופס "${activeFormToFill.title}" נשלח בהצלחה!`, type: 'success' } }));
    setActiveFormToFill(null);
  };

  const nextActionCard = (() => {
    if (!showNextActionCard || !client) return null;
    if ((approvals?.length || 0) > 0) {
      return {
        title: 'הצעד הבא שלך: אישור ראשון',
        description: 'יש מסמך אחד שמחכה לאישור/חתימה. זה פותח לנו אפשרות להתקדם מיד.',
        ctaLabel: 'פתח אישורים',
        onCta: () => setActiveScreen('dashboard'),
        onDismiss: markFirstActionDone,
      };
    }

    if ((pendingTasks?.length || 0) > 0) {
      return {
        title: 'הצעד הבא שלך: העלאה/משימה ראשונה',
        description: 'יש לנו משהו קטן שצריך ממך כדי להתקדם — העלאה או פעולה קצרה.',
        ctaLabel: 'פתח משימות וקבצים',
        onCta: () => setActiveScreen('vault'),
        onDismiss: markFirstActionDone,
      };
    }

    return null;
  })();

  const handleSimulatePayment = () => {
    setIsPaying(true);
    setTimeout(() => {
      setIsPaying(false);
      window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'התשלום בוצע בהצלחה! תודה רבה.', type: 'success' } }));
    }, 2000);
  };

  const renderActiveScreen = () => {
    if (!client) {
      return (
        <div className="flex-1 flex items-center justify-center p-4 md:p-8">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">אין עדיין נתונים להצגה</h2>
            <p className="text-slate-600 text-sm md:text-base">
              ברגע שייווצרו משימות/פגישות/קבצים ללקוח, הם יופיעו כאן.
            </p>
          </div>
        </div>
      );
    }

    switch (activeScreen) {
      case 'dashboard':
        return (
          <PortalDashboard
            client={client}
            pendingTasks={pendingTasks}
            approvals={approvals}
            northStarGoal={northStarGoal || null}
            nextActionCard={nextActionCard}
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

      {activeFormToFill && <PortalFormFiller activeForm={activeFormToFill} onClose={() => setActiveFormToFill(null)} onSubmit={handleSubmitForm} />}

      <div className="flex flex-col md:flex-row w-full h-screen overflow-hidden pt-14 lg:pt-0 pb-16 lg:pb-0">
        <PortalSidebar
          activeScreen={activeScreen}
          setActiveScreen={(screen: unknown) => setActiveScreen(screen as PortalScreen)}
          onShowFriction={() => setShowFrictionModal(true)}
          client={client}
        />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full">
          <div className="p-4 md:p-6 lg:p-8 min-h-full">
            {renderActiveScreen()}
          </div>
        </main>
      </div>
    </div>
  );
}
