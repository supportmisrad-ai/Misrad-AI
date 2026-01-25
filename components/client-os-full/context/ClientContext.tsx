
import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Client, Meeting, Email, Notification, ClientStatus, SuccessGoal, ClientAction, ClientAsset } from '../types';
import {
  createDeliverable,
  getClientOSClients,
  getClientOSTasks,
  getClientOSSessions,
  updateTaskStatus,
} from '@/app/actions/client-portal-clinic';
import { createClinicTask } from '@/app/actions/client-clinic';

interface ClientContextType {
  clients: Client[];
  meetings: Meeting[];
  emails: Email[];
  notifications: Notification[];
  refreshClients: () => Promise<void>;
  createDeliverableForClient: (params: {
    clientId: string;
    title: string;
    description: string;
    type: 'CAMPAIGN' | 'REPORT' | 'DESIGN' | 'STRATEGY' | 'DEV';
    thumbnailUrl?: string | null;
    tags?: string[];
  }) => Promise<void>;
  archiveClient: (id: string) => void;
  restoreClient: (id: string) => void;
  updateClientHealth: (id: string, score: number) => void;
  addMeeting: (meeting: Meeting) => void;
  markEmailAsRead: (id: string) => void;
  completeClientAction: (clientId: string, actionId: string) => void;
  updateFormStatus: (clientId: string, formId: string, status: 'IN_PROGRESS' | 'COMPLETED', progress: number) => void;
  // New Management Functions
  updateClientGoal: (clientId: string, goalId: string, updates: Partial<SuccessGoal>) => void;
  addClientTask: (clientId: string, task: Omit<ClientAction, 'id' | 'status'>) => Promise<void>;
  removeClientTask: (clientId: string, taskId: string) => void;
  addClientAsset: (clientId: string, asset: Omit<ClientAsset, 'id' | 'date'>) => void;
  syncPortal: (clientId: string) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

type ClientProviderProps = {
  children: ReactNode;
  initialOrgId?: string | null;
  initialClients?: Client[];
  initialMeetings?: Meeting[];
};

export const ClientProvider: React.FC<ClientProviderProps> = ({
  children,
  initialOrgId,
  initialClients,
  initialMeetings,
}) => {
  const hasInitialData = Array.isArray(initialClients) || Array.isArray(initialMeetings);

  const [clients, setClients] = useState<Client[]>(Array.isArray(initialClients) ? initialClients : []);
  const [meetings, setMeetings] = useState<Meeting[]>(Array.isArray(initialMeetings) ? initialMeetings : []);
  const [emails, setEmails] = useState<Email[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(!hasInitialData);

  const [orgId, setOrgId] = useState<string | null>(initialOrgId ? String(initialOrgId) : null);
  const [hasHydratedInitialData] = useState<boolean>(Boolean(initialOrgId));

  useEffect(() => {
    if (hasHydratedInitialData) return;
    if (typeof window === 'undefined') return;

    const readOrgId = (payload?: any) => {
      const userData = payload ?? ((window as any).__CLIENT_OS_USER__ as any);
      const nextOrgId = userData?.organizationId ?? null;
      setOrgId(nextOrgId ? String(nextOrgId) : null);
    };

    const onUserUpdated = (e: any) => readOrgId(e?.detail);

    readOrgId();
    window.addEventListener('client-os-user-updated', onUserUpdated);
    return () => window.removeEventListener('client-os-user-updated', onUserUpdated);
  }, [hasHydratedInitialData]);

  const refreshClients = async () => {
    if (!orgId) {
      console.warn('[ClientOS] refreshClients: no orgId');
      return;
    }

    try {
      console.debug('[ClientOS] refreshing clients', { orgId });
      const realClients = await getClientOSClients(orgId);
      if (Array.isArray(realClients)) {
        console.debug('[ClientOS] clients refreshed', { count: realClients.length });

        // Load tasks and sessions for all clients
        const clientsWithData = await Promise.all(
          realClients.map(async (client) => {
            const [tasks, sessions] = await Promise.all([
              getClientOSTasks(orgId, client.id),
              getClientOSSessions(orgId, client.id),
            ]);

            return {
              ...client,
              pendingActions: tasks.filter((t) => t.status !== 'COMPLETED'),
            };
          })
        );

        setClients(clientsWithData);

        // Aggregate all sessions
        const allSessions = await Promise.all(
          realClients.map((client) => getClientOSSessions(orgId, client.id))
        );
        setMeetings(allSessions.flat());
      }
    } catch (error: any) {
      console.error('[ClientOS] error refreshing clients', {
        error: error?.message || String(error),
      });
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadRealData = async () => {
      try {
        if (hasInitialData) {
          if (isMounted) setIsLoading(false);
          return;
        }

        if (!orgId) {
          console.debug('[ClientOS] no orgId, skipping data load');
          if (isMounted) setIsLoading(false);
          return;
        }

        console.debug('[ClientOS] loading real data', { orgId });
        setIsLoading(true);

        const realClients = await getClientOSClients(orgId);
        console.debug('[ClientOS] clients loaded', {
          count: Array.isArray(realClients) ? realClients.length : 0,
        });

        if (isMounted && Array.isArray(realClients)) {
          if (realClients.length > 0) {
            // Load tasks and sessions for all clients
            const clientsWithData = await Promise.all(
              realClients.map(async (client) => {
                const [tasks, sessions] = await Promise.all([
                  getClientOSTasks(orgId, client.id),
                  getClientOSSessions(orgId, client.id),
                ]);

                return {
                  ...client,
                  pendingActions: tasks.filter((t) => t.status !== 'COMPLETED'),
                };
              })
            );

            setClients(clientsWithData);

            // Aggregate all sessions from all clients
            const allSessions = await Promise.all(
              realClients.map((client) => getClientOSSessions(orgId, client.id))
            );
            setMeetings(allSessions.flat());

            console.debug('[ClientOS] data loaded successfully', {
              clientsCount: clientsWithData.length,
              meetingsCount: allSessions.flat().length,
            });
          } else {
            console.debug('[ClientOS] no clients found');
            setClients([]);
            setMeetings([]);
          }
        }
      } catch (error: any) {
        console.error('[ClientOS] error loading data', {
          error: error?.message || String(error),
          stack: error?.stack,
        });
        if (isMounted) {
          setClients([]);
          setMeetings([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadRealData();
    return () => {
      isMounted = false;
    };
  }, [hasInitialData, orgId]);

  const archiveClient = (id: string) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, status: ClientStatus.ARCHIVED } : c));
  };

  const restoreClient = (id: string) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, status: ClientStatus.ACTIVE } : c));
  };

  const updateClientHealth = (id: string, score: number) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, healthScore: score } : c));
  };

  const addMeeting = (meeting: Meeting) => {
    setMeetings(prev => [meeting, ...prev]);
  };

  const markEmailAsRead = (id: string) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: true } : e));
  };

  const completeClientAction = (clientId: string, actionId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        return {
          ...c,
          pendingActions: c.pendingActions.map(a => a.id === actionId ? { ...a, status: 'COMPLETED' as const } : a)
        };
      }
      return c;
    }));

    if (!orgId) return;

    void (async () => {
      try {
        await updateTaskStatus({ scope: 'client_action', orgId, taskId: actionId, status: 'COMPLETED' });
        await refreshClients();
      } catch {
        // keep optimistic UI
      }
    })();
  };

  const createDeliverableForClient: ClientContextType['createDeliverableForClient'] = async ({
    clientId,
    title,
    description,
    type,
    thumbnailUrl,
    tags,
  }) => {
    if (!orgId) return;

    await createDeliverable({
      orgId,
      clientId,
      title,
      description,
      type,
      thumbnailUrl: thumbnailUrl ?? null,
      tags,
    });

    await refreshClients();
  };

  const updateFormStatus = (clientId: string, formId: string, status: 'IN_PROGRESS' | 'COMPLETED', progress: number) => {
    setClients(prev => prev.map(c => {
        if (c.id === clientId) {
            return {
                ...c,
                assignedForms: c.assignedForms.map(f => f.id === formId ? { ...f, status, progress } : f)
            };
        }
        return c;
    }));
  };

  const updateClientGoal = (clientId: string, goalId: string, updates: Partial<SuccessGoal>) => {
      setClients(prev => prev.map(c => c.id === clientId ? {
          ...c,
          successGoals: c.successGoals.map(g => g.id === goalId ? { ...g, ...updates, lastUpdated: 'הרגע' } : g)
      } : c));
  };

  const addClientTask = async (clientId: string, task: Omit<ClientAction, 'id' | 'status'>) => {
    if (!orgId) {
      console.warn('[ClientOS] cannot add task: no orgId');
      return;
    }

    try {
      // Map ClientAction type to task priority
      let priority = 'medium';
      if (task.isBlocking) priority = 'high';
      if (task.type === 'APPROVAL' || task.type === 'SIGNATURE') priority = 'high';

      // Create task in Supabase
      const created = await createClinicTask({
        orgId,
        clientId,
        title: task.title,
        description: task.description || null,
        status: 'todo',
        priority,
        dueAt: task.dueDate ? new Date(task.dueDate).toISOString() : null,
        assignedTo: null,
        createdBy: null,
        metadata: { type: task.type, isBlocking: task.isBlocking },
      });

      // Update local state
      setClients((prev) =>
        prev.map((c) =>
          c.id === clientId
            ? {
                ...c,
                pendingActions: [
                  { ...task, id: created.id, status: 'PENDING' as const },
                  ...c.pendingActions,
                ],
              }
            : c
        )
      );

      // Refresh to get the full task data
      await refreshClients();

      console.debug('[ClientOS] task created', { clientId, taskId: created.id });
    } catch (error: any) {
      console.error('[ClientOS] error creating task', {
        error: error?.message || String(error),
        clientId,
      });
      // Still update UI optimistically
      setClients((prev) =>
        prev.map((c) =>
          c.id === clientId
            ? {
                ...c,
                pendingActions: [{ ...task, id: `task-${Date.now()}`, status: 'PENDING' as const }, ...c.pendingActions],
              }
            : c
        )
      );
    }
  };

  const removeClientTask = (clientId: string, taskId: string) => {
      setClients(prev => prev.map(c => c.id === clientId ? {
          ...c,
          pendingActions: c.pendingActions.filter(a => a.id !== taskId)
      } : c));
  };

  const addClientAsset = (clientId: string, asset: Omit<ClientAsset, 'id' | 'date'>) => {
      setClients(prev => prev.map(c => c.id === clientId ? {
          ...c,
          assets: [{ ...asset, id: `asset-${Date.now()}`, date: new Date().toLocaleDateString('he-IL') }, ...(c.assets || [])]
      } : c));
  };

  const syncPortal = (clientId: string) => {
      console.log(`Syncing portal for client ${clientId}...`);
      // Simulated sync logic
  };

  return (
    <ClientContext.Provider value={{ 
        clients, meetings, emails, notifications, 
        refreshClients,
        createDeliverableForClient,
        archiveClient, restoreClient, updateClientHealth, 
        addMeeting, markEmailAsRead, completeClientAction, updateFormStatus,
        updateClientGoal, addClientTask, removeClientTask, addClientAsset, syncPortal
    }}>
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
