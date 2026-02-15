import { usePathname, useRouter } from 'next/navigation';
import { SocialPost, AIOpportunity, Client, ClientRequest, ManagerRequest } from '@/types/social';
import { getSocialBasePath, joinPath } from '@/lib/os/social-routing';
import { openComingSoon } from '@/components/shared/coming-soon';
import { deletePost } from '@/app/actions/posts';
import { deleteIdea, createIdea } from '@/app/actions/ideas';
import { approveClientRequest, createManagerRequest, rejectClientRequest } from '@/app/actions/requests';

interface UseClientWorkspaceHandlersProps {
  activeClient: Client;
  orgSlug: string | null;
  setActiveDraft: (draft: unknown) => void;
  setPosts: React.Dispatch<React.SetStateAction<SocialPost[]>>;
  setIdeas: React.Dispatch<React.SetStateAction<any[]>>;
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  setClientRequests: React.Dispatch<React.SetStateAction<ClientRequest[]>>;
  setManagerRequests: React.Dispatch<React.SetStateAction<ManagerRequest[]>>;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useClientWorkspaceHandlers({
  activeClient,
  orgSlug,
  setActiveDraft,
  setPosts,
  setIdeas,
  setClients,
  setClientRequests,
  setManagerRequests,
  addToast
}: UseClientWorkspaceHandlersProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleNewPost = () => {
    setActiveDraft({ id: `draft-${Date.now()}`, clientId: activeClient.id, title: '', description: '', type: 'gap' });
    const basePath = getSocialBasePath(pathname);
    router.push(joinPath(basePath, '/machine'));
  };

  const handleEditPost = (post: SocialPost) => {
    setActiveDraft({ 
      id: post.id, 
      clientId: post.clientId, 
      title: 'עריכה', 
      description: post.content, 
      type: 'gap', 
      draftContent: post.content 
    });
    const basePath = getSocialBasePath(pathname);
    router.push(joinPath(basePath, '/machine'));
  };

  const handleDeletePost = (postId: string) => {
    void (async () => {
      const resolvedOrgSlug = String(orgSlug || '').trim();
      if (!resolvedOrgSlug) {
        addToast('חסר ארגון פעיל', 'error');
        return;
      }

      const res = await deletePost(postId, resolvedOrgSlug);
      if (!res.success) {
        addToast(res.error || 'שגיאה במחיקת פוסט', 'error');
        return;
      }

      setPosts((prev) => prev.filter((p) => p.id !== postId));
      addToast('פוסט נמחק');
    })();
  };

  const handleDeleteIdea = (ideaId: string) => {
    void (async () => {
      const resolvedOrgSlug = String(orgSlug || '').trim();
      if (!resolvedOrgSlug) {
        addToast('חסר ארגון פעיל', 'error');
        return;
      }

      const res = await deleteIdea(ideaId, resolvedOrgSlug);
      if (!res.success) {
        addToast(res.error || 'שגיאה במחיקת רעיון', 'error');
        return;
      }

      setIdeas((prev) => prev.filter((i: unknown) => (i as Record<string, unknown>).id !== ideaId));
      addToast('רעיון נמחק');
    })();
  };

  const handleAddIdea = (text: string, clientId: string) => {
    void (async () => {
      const resolvedOrgSlug = String(orgSlug || '').trim();
      if (!resolvedOrgSlug) {
        addToast('חסר ארגון פעיל', 'error');
        return;
      }

      const res = await createIdea({
        orgSlug: resolvedOrgSlug,
        clientId,
        title: text,
        description: '',
        category: 'bank',
      });

      if (!res.success) {
        addToast(res.error || 'שגיאה בהוספת רעיון', 'error');
        return;
      }

      if (res.data) {
        setIdeas((prev) => [res.data as unknown, ...prev]);
      }
      addToast('רעיון נוסף לבנק! 💡');
    })();
  };

  const handleUpdateDNA = (clientId: string, dna: Client['dna']['voice']) => {
    setClients(prev => prev.map(c => c.id === clientId ? {...c, dna: {...c.dna, voice: dna}} : c));
    addToast('זהות המותג עודכנה!');
  };

  const handleSendMessage = async (convId: string, text: string) => {
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          module: 'social',
          featureKey: 'social.sales_advisor',
          context: {
            clientId: activeClient.id,
            clientName: activeClient.name,
            conversationId: convId
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      addToast('יועץ המכירות ענה!', 'success');
      
      // TODO: Add the AI response to the conversation
      console.log('AI Response:', data.text);
    } catch (error) {
      console.error('Error sending message:', error);
      addToast('שגיאה בשליחת הודעה', 'error');
    }
  };

  const handleNewPostFromContext = (context?: Partial<AIOpportunity>) => {
    setActiveDraft(context as unknown);
    const basePath = getSocialBasePath(pathname);
    router.push(joinPath(basePath, '/machine'));
  };

  const handleSendManagerRequest = (clientId: string, title: string, description: string, type: ManagerRequest['type']) => {
    void (async () => {
      const resolvedOrgSlug = String(orgSlug || '').trim();
      if (!resolvedOrgSlug) {
        addToast('חסר ארגון פעיל', 'error');
        return;
      }

      const actionType: 'media' | 'text' | 'approval' = type === 'media' ? 'media' : 'text';

      const res = await createManagerRequest({
        orgSlug: resolvedOrgSlug,
        clientId,
        title,
        description,
        type: actionType,
      });

      if (!res.success) {
        addToast(res.error || 'שגיאה ביצירת בקשה', 'error');
        return;
      }

      if (res.data) {
        setManagerRequests((prev) => [res.data, ...(Array.isArray(prev) ? prev : [])] as ManagerRequest[]);
      }
      addToast('הבקשה נשלחה ללקוח');
    })();
  };

  const handleUpdateRequestStatus = (reqId: string, status: ClientRequest['status'], comment?: string) => {
    void (async () => {
      const resolvedOrgSlug = String(orgSlug || '').trim();
      if (!resolvedOrgSlug) {
        addToast('חסר ארגון פעיל', 'error');
        return;
      }

      if (status === 'processed') {
        const res = await approveClientRequest(reqId, resolvedOrgSlug);
        if (!res.success) {
          addToast(res.error || 'שגיאה בעדכון סטטוס', 'error');
          return;
        }

        setClientRequests((prev) =>
          (Array.isArray(prev) ? prev : []).map((r) =>
            String(r.id) === String(reqId)
              ? {
                  ...r,
                  status: 'processed',
                }
              : r
          )
        );
        addToast('עודכן כבוצע');
        return;
      }

      if (status === 'needs_fix') {
        const res = await rejectClientRequest(reqId, resolvedOrgSlug, comment);
        if (!res.success) {
          addToast(res.error || 'שגיאה בעדכון סטטוס', 'error');
          return;
        }

        setClientRequests((prev) =>
          (Array.isArray(prev) ? prev : []).map((r) =>
            String(r.id) === String(reqId)
              ? {
                  ...r,
                  status: 'needs_fix',
                  managerComment: comment || r.managerComment,
                }
              : r
          )
        );
        addToast('נשלחה הערה ללקוח');
        return;
      }

      addToast('סטטוס לא נתמך', 'error');
    })();
  };

  return {
    handleNewPost,
    handleEditPost,
    handleDeletePost,
    handleDeleteIdea,
    handleAddIdea,
    handleUpdateDNA,
    handleSendMessage,
    handleNewPostFromContext,
    handleSendManagerRequest,
    handleUpdateRequestStatus
  };
}

