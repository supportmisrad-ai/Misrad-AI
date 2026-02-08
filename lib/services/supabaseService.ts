import type { Campaign, Client, SocialPost, SocialTask, TeamMember, ClientRequest, ManagerRequest, Conversation, Idea } from '@/types/social';

// ============================================
// CLIENTS
// ============================================

export async function fetchClients(userId?: string): Promise<Client[]> {
  return [];
}

export async function fetchActivePlatforms(clientId: string): Promise<string[]> {
  return [];
}

// ============================================
// CAMPAIGNS
// ============================================

export async function fetchCampaigns(clientId?: string): Promise<Campaign[]> {
  return [];
}

// ============================================
// POSTS
// ============================================

export async function fetchPosts(clientId?: string): Promise<SocialPost[]> {
  return [];
}

// ============================================
// TASKS
// ============================================

export async function fetchTasks(clientId?: string): Promise<SocialTask[]> {
  return [];
}

// ============================================
// CONVERSATIONS
// ============================================

export async function fetchConversations(clientId?: string): Promise<Conversation[]> {
  return [];
}

// ============================================
// IDEAS
// ============================================

export async function fetchIdeas(clientId: string): Promise<Idea[]> {
  return [];
}

// ============================================
// REQUESTS
// ============================================

export async function fetchClientRequests(clientId?: string): Promise<ClientRequest[]> {
  return [];
}

export async function fetchManagerRequests(clientId?: string): Promise<ManagerRequest[]> {
  return [];
}

// ============================================
// TEAM MEMBERS
// ============================================

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  return [];
}

