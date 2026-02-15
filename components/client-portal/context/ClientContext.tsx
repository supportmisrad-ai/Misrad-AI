import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

function asObj(v: unknown): Record<string, unknown> | undefined {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return undefined;
}
import { useParams } from 'next/navigation';
import {
  Client,
  Meeting,
  Email,
  Notification,
  ClientStatus,
  SuccessGoal,
  ClientAction,
  ClientAsset,
  ModuleSettings,
} from '../types';
import {
  getClientIdByClerkEmail,
  getClientOSClients,
  getClientOSTasks,
  getClientOSSessions,
  updateTaskStatus,
} from '@/app/actions/client-portal-clinic';

interface ClientContextType {
  clients: Client[];
  meetings: Meeting[];
  emails: Email[];
  notifications: Notification[];
  modules: ModuleSettings;
  archiveClient: (id: string) => void;
  restoreClient: (id: string) => void;
  updateClientHealth: (id: string, score: number) => void;
  addMeeting: (meeting: Meeting) => void;
  markEmailAsRead: (id: string) => void;
  completeClientAction: (clientId: string, actionId: string) => Promise<void>;
  updateFormStatus: (clientId: string, formId: string, status: 'IN_PROGRESS' | 'COMPLETED', progress: number) => void;
  updateClientGoal: (clientId: string, goalId: string, updates: Partial<SuccessGoal>) => void;
  addClientTask: (clientId: string, task: Omit<ClientAction, 'id' | 'status'>) => void;
  removeClientTask: (clientId: string, taskId: string) => void;
  addClientAsset: (clientId: string, asset: Omit<ClientAsset, 'id' | 'date'>) => void;
  syncPortal: (clientId: string) => void;
  toggleModule: (moduleId: keyof ModuleSettings) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [notifications] = useState<Notification[]>([]);

  const params = useParams() as { orgSlug?: string | string[] };
  const orgId = useMemo(() => {
    const raw = params?.orgSlug;
    if (!raw) return null;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params?.orgSlug]);

  useEffect(() => {
    let mounted = true;

    const loadRealClient = async () => {
      try {
        if (!orgId) {
          console.debug('[ClientPortal] no orgId provided');
          return;
        }

        console.debug('[ClientPortal] loading client for orgId', { orgId });
        
        // First, load all clients for the organization
        const list = await getClientOSClients(orgId);
        console.debug('[ClientPortal] client list loaded', {
          count: Array.isArray(list) ? list.length : 0,
          ids: Array.isArray(list) ? (list as unknown[]).map((c: unknown) => (c as Record<string, unknown>)?.id).slice(0, 10) : [],
          clients: Array.isArray(list) ? (list as unknown[]).slice(0, 3).map((c: unknown) => { const o = c as Record<string, unknown>; return { id: o?.id, name: o?.name || o?.fullName }; }) : [],
        });

        if (!Array.isArray(list) || list.length === 0) {
          console.warn('[ClientPortal] no clients found for organization', { orgId });
          if (mounted) setClients([]);
          return;
        }

        // Try to find client by email mapping
        let targetClient: unknown = null;
        try {
          const mapping = await getClientIdByClerkEmail({ orgId });
          console.debug('[ClientPortal] client mapping resolved', { 
            clientId: mapping?.clientId,
            clientIdType: typeof mapping?.clientId,
            mappingExists: !!mapping,
          });
          
          if (mapping?.clientId) {
            targetClient = list.find((c: unknown) => String(asObj(c)?.id) === String(mapping.clientId));
            console.debug('[ClientPortal] found client by mapping', {
              found: !!targetClient,
              searchedId: mapping.clientId,
              foundId: asObj(targetClient)?.id,
              foundName: asObj(targetClient)?.name || asObj(targetClient)?.fullName,
            });
          } else {
            console.debug('[ClientPortal] no mapping found, will use first client');
          }
        } catch (mappingError: unknown) {
          console.warn('[ClientPortal] failed to get client by email mapping, will use first client', {
            error: (mappingError instanceof Error ? mappingError.message : String(mappingError)),
          });
        }

        // If no match found by email, use the first client in the list
        if (!targetClient && list.length > 0) {
          targetClient = list[0];
          console.debug('[ClientPortal] using first client from list', {
            clientId: asObj(targetClient)?.id,
            clientName: asObj(targetClient)?.name || asObj(targetClient)?.fullName,
          });
        }

        if (!targetClient) {
          console.warn('[ClientPortal] no client available to display', { orgId });
          if (mounted) setClients([]);
          return;
        }

        // Load tasks and sessions for this client
        const tc = asObj(targetClient);
        const tcId = String(tc?.id ?? '');
        console.debug('[ClientPortal] loading tasks and sessions', {
          clientId: tcId,
        });

        const [tasks, sessions] = await Promise.all([
          getClientOSTasks(orgId, tcId),
          getClientOSSessions(orgId, tcId),
        ]);

        console.debug('[ClientPortal] tasks and sessions loaded', {
          tasksCount: tasks.length,
          sessionsCount: sessions.length,
        });

        // Update client with real tasks
        const clientWithTasks = {
          ...targetClient,
          pendingActions: tasks.filter((t) => t.status !== 'COMPLETED'),
        };

        // IMPORTANT: keep shape compatible with existing UI by only swapping the client object.
        const cwt = asObj(clientWithTasks);
        console.debug('[ClientPortal] setting client with tasks and sessions', {
          clientId: cwt?.id,
          clientName: cwt?.name || cwt?.fullName,
          tasksCount: clientWithTasks.pendingActions.length,
        });

        if (mounted) {
          setClients([clientWithTasks as Client]);
          setMeetings(sessions);
        }
      } catch (error: unknown) {
        console.error('[ClientPortal] error loading client', {
          error: (error instanceof Error ? error.message : String(error)),
          stack: (error instanceof Error ? error.stack : undefined),
        });
        if (mounted) {
          setClients([]);
          setMeetings([]);
          setEmails([]);
        }
      }
    };

    void loadRealClient();
    return () => {
      mounted = false;
    };
  }, [orgId]);

  const [modules, setModules] = useState<ModuleSettings>({
    cycles: false,
    intelligence: false,
    portals: false,
    workflows: false,
    feedback: false,
  });

  const archiveClient = (id: string) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, status: ClientStatus.ARCHIVED } : c)));
  };

  const restoreClient = (id: string) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, status: ClientStatus.ACTIVE } : c)));
  };

  const updateClientHealth = (id: string, score: number) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, healthScore: score } : c)));
  };

  const addMeeting = (meeting: Meeting) => {
    setMeetings((prev) => [meeting, ...prev]);
  };

  const markEmailAsRead = (id: string) => {
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, isRead: true } : e)));
  };

  const completeClientAction = async (clientId: string, actionId: string) => {
    if (!orgId) {
      console.warn('[ClientPortal] cannot complete action: no orgId');
      return;
    }

    try {
      // Update task status in Supabase
      await updateTaskStatus({
        scope: 'client_action',
        orgId,
        taskId: actionId,
        status: 'COMPLETED',
      });

      // Update local state
      setClients((prev) =>
        prev.map((c) => {
          if (c.id === clientId) {
            return {
              ...c,
              pendingActions: c.pendingActions.map((a) => (a.id === actionId ? { ...a, status: 'COMPLETED' as const } : a)),
            };
          }
          return c;
        })
      );

      console.debug('[ClientPortal] task completed', { clientId, actionId });
    } catch (error: unknown) {
      console.error('[ClientPortal] error completing task', {
        error: (error instanceof Error ? error.message : String(error)),
        clientId,
        actionId,
      });
      // Still update UI optimistically
      setClients((prev) =>
        prev.map((c) => {
          if (c.id === clientId) {
            return {
              ...c,
              pendingActions: c.pendingActions.map((a) => (a.id === actionId ? { ...a, status: 'COMPLETED' as const } : a)),
            };
          }
          return c;
        })
      );
    }
  };

  const updateFormStatus = (clientId: string, formId: string, status: 'IN_PROGRESS' | 'COMPLETED', progress: number) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id === clientId) {
          return {
            ...c,
            assignedForms: c.assignedForms.map((f) => (f.id === formId ? { ...f, status, progress } : f)),
          };
        }
        return c;
      })
    );
  };

  const updateClientGoal = (clientId: string, goalId: string, updates: Partial<SuccessGoal>) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? {
              ...c,
              successGoals: c.successGoals.map((g) => (g.id === goalId ? { ...g, ...updates, lastUpdated: 'הרגע' } : g)),
            }
          : c
      )
    );
  };

  const addClientTask = (clientId: string, task: Omit<ClientAction, 'id' | 'status'>) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? { ...c, pendingActions: [{ ...task, id: `task-${Date.now()}`, status: 'PENDING' }, ...c.pendingActions] }
          : c
      )
    );
  };

  const removeClientTask = (clientId: string, taskId: string) => {
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, pendingActions: c.pendingActions.filter((a) => a.id !== taskId) } : c)));
  };

  const addClientAsset = (clientId: string, asset: Omit<ClientAsset, 'id' | 'date'>) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? {
              ...c,
              assets: [{ ...asset, id: `asset-${Date.now()}`, date: new Date().toLocaleDateString('he-IL') }, ...(c.assets || [])],
            }
          : c
      )
    );
  };

  const syncPortal = (clientId: string) => {
    console.log(`Syncing portal for client ${clientId}...`);
  };

  const toggleModule = (moduleId: keyof ModuleSettings) => {
    setModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  return (
    <ClientContext.Provider
      value={{
        clients,
        meetings,
        emails,
        notifications,
        modules,
        archiveClient,
        restoreClient,
        updateClientHealth,
        addMeeting,
        markEmailAsRead,
        completeClientAction,
        updateFormStatus,
        updateClientGoal,
        addClientTask,
        removeClientTask,
        addClientAsset,
        syncPortal,
        toggleModule,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
};

export const useNexus = () => {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useNexus must be used within a ClientProvider');
  }
  return context;
};
