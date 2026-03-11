'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { SocialPost } from '@/types/social';
import OverviewTab from './workspace/OverviewTab';
import ContentTab from './workspace/ContentTab';
import RequestsTab from './workspace/RequestsTab';
import VaultTab from './workspace/VaultTab';
import BankTab from './workspace/BankTab';
import DNATab from './workspace/DNATab';
import MessagesTab from './workspace/MessagesTab';
import StrategyTab from './workspace/StrategyTab';
import { ClientWorkspaceHeader } from './workspace/ClientWorkspaceHeader';
import { ClientWorkspaceTabs } from './workspace/ClientWorkspaceTabs';
import { useClientWorkspaceHandlers } from './workspace/useClientWorkspaceHandlers';

export default function ClientWorkspace() {
  const { 
    activeClient, 
    pinnedClientIds,
    posts,
    clientRequests,
    managerRequests,
    ideas,
    conversations,
    setActiveDraft,
    setPinnedClientIds,
    setPosts,
    setClientRequests,
    setManagerRequests,
    setIsPaymentModalOpen,
    setIsClientMode,
    setIsOnboardingMode,
    addToast,
    setIdeas,
    setClients,
    orgSlug
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'requests' | 'bank' | 'dna' | 'messages' | 'vault' | 'strategy'>('overview');
  const [isCopyingLink, setIsCopyingLink] = useState(false);

  if (!activeClient) {
    return (
      <div className="max-w-7xl mx-auto text-center py-20">
        <p className="text-xl font-black text-slate-400">לא נבחר לקוח</p>
      </div>
    );
  }

  const isPinned = pinnedClientIds.includes(activeClient.id);
  const clientPosts = posts.filter(p => p.clientId === activeClient.id);
  const clientRequestsList = clientRequests.filter(r => r.clientId === activeClient.id);
  const clientManagerRequests = managerRequests.filter(r => r.clientId === activeClient.id);
  const clientIdeas = ideas.filter(i => i.clientId === activeClient.id);
  const clientConversations = conversations.filter(c => c.clientId === activeClient.id);
  
  const portalLink = activeClient.portalToken
    ? `https://misrad-ai.com/w/${orgSlug}/client/portal?token=${activeClient.portalToken}`
    : '';

  const handleCopyLink = () => {
    if (!portalLink) {
      addToast('לא נוצר טוקן פורטל ללקוח זה', 'error');
      return;
    }
    setIsCopyingLink(true);
    navigator.clipboard.writeText(portalLink);
    setTimeout(() => setIsCopyingLink(false), 2000);
    addToast('הקישור הועתק!');
  };

  const handleTogglePin = () => {
    setPinnedClientIds(prev => 
      prev.includes(activeClient.id) 
        ? prev.filter(id => id !== activeClient.id) 
        : [...prev, activeClient.id]
    );
    addToast(isPinned ? 'הלקוח הוסר מהגישה המהירה' : 'הלקוח נוסף לגישה המהירה');
  };

  const handlers = useClientWorkspaceHandlers({
    activeClient,
    orgSlug,
    setActiveDraft: setActiveDraft as unknown as (draft: unknown) => void,
    setPosts,
    setIdeas,
    setClients,
    setClientRequests,
    setManagerRequests,
    addToast
  });

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab client={activeClient} posts={clientPosts} requests={clientRequestsList} onEditPost={handlers.handleEditPost} onEnterPortal={() => setIsClientMode(true)} setActiveTab={setActiveTab as unknown as (tab: unknown) => void} />;
      case 'content':
        return <ContentTab client={activeClient} posts={clientPosts} onNewPost={handlers.handleNewPostFromContext} onEditPost={handlers.handleEditPost} onDeletePost={handlers.handleDeletePost} />;
      case 'requests':
        return <RequestsTab client={activeClient} requests={clientRequestsList} managerRequests={clientManagerRequests} onNewPost={handlers.handleNewPostFromContext} onSendManagerRequest={handlers.handleSendManagerRequest} onUpdateRequestStatus={handlers.handleUpdateRequestStatus} />;
      case 'vault':
        return <VaultTab client={activeClient} />;
      case 'bank':
        return <BankTab client={activeClient} ideas={clientIdeas} onDeleteIdea={handlers.handleDeleteIdea} onAddIdea={handlers.handleAddIdea} onNewPost={handlers.handleNewPostFromContext} />;
      case 'dna':
        return <DNATab client={activeClient} onUpdateDNA={handlers.handleUpdateDNA} />;
      case 'strategy':
        return <StrategyTab client={activeClient} orgSlug={orgSlug || ''} />;
      case 'messages':
        return <MessagesTab conversations={clientConversations} onSendMessage={handlers.handleSendMessage} />;
      default:
        return <OverviewTab client={activeClient} posts={clientPosts} requests={clientRequestsList} onEditPost={handlers.handleEditPost} onEnterPortal={() => setIsClientMode(true)} setActiveTab={setActiveTab as unknown as (tab: unknown) => void} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 md:gap-8 pb-32" dir="rtl">
      <ClientWorkspaceHeader
        activeClient={activeClient}
        isPinned={isPinned}
        isCopyingLink={isCopyingLink}
        onTogglePin={handleTogglePin}
        onCopyLink={handleCopyLink}
        onPaymentClick={() => setIsPaymentModalOpen(true)}
        onEditClient={() => setIsOnboardingMode(true)}
        onNewPost={handlers.handleNewPost}
      />

      <ClientWorkspaceTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <AnimatePresence mode="sync">
        <motion.div 
          key={activeTab} 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -10 }}
          className="w-full"
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

