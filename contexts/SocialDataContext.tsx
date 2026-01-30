'use client';

import React, { createContext, useContext, useMemo } from 'react';
import type {
  Client,
  SocialPost,
  SocialTask,
  TeamMember,
  AIOpportunity,
  ClientRequest,
  ManagerRequest,
  PaymentOrder,
  Conversation,
  Idea,
} from '@/types/social';
import { useApp } from '@/contexts/AppContext';

export type SocialDataContextValue = {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  pinnedClientIds: string[];
  setPinnedClientIds: React.Dispatch<React.SetStateAction<string[]>>;
  posts: SocialPost[];
  setPosts: React.Dispatch<React.SetStateAction<SocialPost[]>>;
  tasks: SocialTask[];
  setTasks: React.Dispatch<React.SetStateAction<SocialTask[]>>;
  team: TeamMember[];
  setTeam: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  clientRequests: ClientRequest[];
  setClientRequests: React.Dispatch<React.SetStateAction<ClientRequest[]>>;
  managerRequests: ManagerRequest[];
  setManagerRequests: React.Dispatch<React.SetStateAction<ManagerRequest[]>>;
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  ideas: Idea[];
  setIdeas: React.Dispatch<React.SetStateAction<Idea[]>>;
  activeDraft: AIOpportunity | null;
  setActiveDraft: React.Dispatch<React.SetStateAction<AIOpportunity | null>>;
  activeClientId: string | null;
  setActiveClientId: React.Dispatch<React.SetStateAction<string | null>>;
  activeClient: Client | undefined;
  activeCheckout: { order: PaymentOrder; client: Client } | null;
  setActiveCheckout: React.Dispatch<React.SetStateAction<{ order: PaymentOrder; client: Client } | null>>;
  editingTask: SocialTask | null;
  setEditingTask: React.Dispatch<React.SetStateAction<SocialTask | null>>;
  handleToggleTask: (id: string) => void;
  handleDeleteTask: (id: string) => void;
};

const SocialDataContext = createContext<SocialDataContextValue | undefined>(undefined);

export function SocialDataProvider({ children }: { children: React.ReactNode }) {
  const app = useApp();

  const value = useMemo<SocialDataContextValue>(
    () => ({
      clients: app.clients,
      setClients: app.setClients,
      pinnedClientIds: app.pinnedClientIds,
      setPinnedClientIds: app.setPinnedClientIds,
      posts: app.posts,
      setPosts: app.setPosts,
      tasks: app.tasks,
      setTasks: app.setTasks,
      team: app.team,
      setTeam: app.setTeam,
      clientRequests: app.clientRequests,
      setClientRequests: app.setClientRequests,
      managerRequests: app.managerRequests,
      setManagerRequests: app.setManagerRequests,
      conversations: app.conversations,
      setConversations: app.setConversations,
      ideas: app.ideas,
      setIdeas: app.setIdeas,
      activeDraft: app.activeDraft,
      setActiveDraft: app.setActiveDraft,
      activeClientId: app.activeClientId,
      setActiveClientId: app.setActiveClientId,
      activeClient: app.activeClient,
      activeCheckout: app.activeCheckout,
      setActiveCheckout: app.setActiveCheckout,
      editingTask: app.editingTask,
      setEditingTask: app.setEditingTask,
      handleToggleTask: app.handleToggleTask,
      handleDeleteTask: app.handleDeleteTask,
    }),
    [
      app.activeCheckout,
      app.activeClient,
      app.activeClientId,
      app.activeDraft,
      app.clients,
      app.conversations,
      app.editingTask,
      app.ideas,
      app.managerRequests,
      app.pinnedClientIds,
      app.posts,
      app.tasks,
      app.team,
      app.clientRequests,
      app.setActiveCheckout,
      app.setActiveClientId,
      app.setActiveDraft,
      app.setClients,
      app.setConversations,
      app.setEditingTask,
      app.setIdeas,
      app.setManagerRequests,
      app.setPinnedClientIds,
      app.setPosts,
      app.setTasks,
      app.setTeam,
      app.setClientRequests,
      app.handleDeleteTask,
      app.handleToggleTask,
    ]
  );

  return <SocialDataContext.Provider value={value}>{children}</SocialDataContext.Provider>;
}

export function useSocialData() {
  const ctx = useContext(SocialDataContext);
  if (!ctx) throw new Error('useSocialData must be used within SocialDataProvider');
  return ctx;
}
