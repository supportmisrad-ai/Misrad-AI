import { usePathname, useRouter } from 'next/navigation';
import { SocialPost, AIOpportunity, Client, ClientRequest, ManagerRequest } from '@/types/social';
import { getSocialBasePath, joinPath } from '@/lib/os/social-routing';
import { openComingSoon } from '@/components/shared/ComingSoonPortal';

interface UseClientWorkspaceHandlersProps {
  activeClient: Client;
  setActiveDraft: (draft: any) => void;
  setPosts: React.Dispatch<React.SetStateAction<SocialPost[]>>;
  setIdeas: React.Dispatch<React.SetStateAction<any[]>>;
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useClientWorkspaceHandlers({
  activeClient,
  setActiveDraft,
  setPosts,
  setIdeas,
  setClients,
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
    setPosts(prev => prev.filter(p => p.id !== postId));
    addToast('פוסט נמחק');
  };

  const handleDeleteIdea = (ideaId: string) => {
    setIdeas(prev => prev.filter(i => i.id !== ideaId));
    addToast('רעיון נמחק');
  };

  const handleAddIdea = (text: string, clientId: string) => {
    setIdeas(prev => [{id: `i-${Date.now()}`, clientId, text, createdAt: 'היום'}, ...prev]);
    addToast('רעיון נוסף לבנק! 💡');
  };

  const handleUpdateDNA = (clientId: string, dna: Client['dna']['voice']) => {
    setClients(prev => prev.map(c => c.id === clientId ? {...c, dna: {...c.dna, voice: dna}} : c));
    addToast('זהות המותג עודכנה!');
  };

  const handleSendMessage = (convId: string, text: string) => {
    openComingSoon();
  };

  const handleNewPostFromContext = (context?: Partial<AIOpportunity>) => {
    setActiveDraft(context as any);
    const basePath = getSocialBasePath(pathname);
    router.push(joinPath(basePath, '/machine'));
  };

  const handleSendManagerRequest = (clientId: string, title: string, description: string, type: ManagerRequest['type']) => {
    openComingSoon();
  };

  const handleUpdateRequestStatus = (reqId: string, status: ClientRequest['status'], comment?: string) => {
    openComingSoon();
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

