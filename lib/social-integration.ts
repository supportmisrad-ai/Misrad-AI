/**
 * Social OS Integration Utilities
 * 
 * Helper functions for integrating Social OS with external services
 * and managing social media content and campaigns.
 */

import { Campaign, ContentItem, Strategy, Trend } from '../types/social';

/**
 * Format content for specific platform
 */
export const formatContentForPlatform = (
  content: ContentItem,
  platform: 'instagram' | 'facebook' | 'linkedin' | 'tiktok'
): string => {
  // Platform-specific formatting logic
  const baseContent = content.caption;
  const hashtags = content.hashtags.join(' ');

  switch (platform) {
    case 'instagram':
      return `${baseContent}\n\n${hashtags}`;
    case 'facebook':
      return `${baseContent}\n\n${hashtags}`;
    case 'linkedin':
      return `${baseContent}\n\n${hashtags}`;
    case 'tiktok':
      return `${baseContent} ${hashtags}`;
    default:
      return baseContent;
  }
};

/**
 * Calculate engagement rate
 */
export const calculateEngagementRate = (
  likes: number,
  comments: number,
  shares: number,
  impressions: number
): number => {
  if (impressions === 0) return 0;
  const totalEngagement = likes + comments + shares;
  return (totalEngagement / impressions) * 100;
};

/**
 * Generate hashtags from content
 */
export const generateHashtags = (content: string, count: number = 5): string[] => {
  // Simple hashtag extraction (in production, use NLP)
  const words = content.toLowerCase().split(/\s+/);
  const commonWords = ['את', 'של', 'על', 'אל', 'ב', 'ל', 'ה', 'ו', 'כי', 'אם'];
  const relevantWords = words
    .filter(word => word.length > 3 && !commonWords.includes(word))
    .slice(0, count);
  
  return relevantWords.map(word => `#${word}`);
};

/**
 * Validate campaign data
 */
export const validateCampaign = (campaign: Partial<Campaign>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!campaign.name || campaign.name.trim().length === 0) {
    errors.push('שם הקמפיין חובה');
  }

  if (!campaign.platform) {
    errors.push('פלטפורמה חובה');
  }

  if (!campaign.startDate) {
    errors.push('תאריך התחלה חובה');
  }

  if (campaign.endDate && campaign.startDate && campaign.endDate < campaign.startDate) {
    errors.push('תאריך סיום חייב להיות אחרי תאריך התחלה');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Schedule content for posting
 */
export const scheduleContent = async (
  contentId: string,
  scheduledDate: Date,
  platform: string
): Promise<boolean> => {
  // TODO: Implement actual scheduling logic with API
  try {
    // Mock implementation
    console.log(`Scheduling content ${contentId} for ${scheduledDate} on ${platform}`);
    return true;
  } catch (error) {
    console.error('Error scheduling content:', error);
    return false;
  }
};

/**
 * Get platform-specific character limits
 */
export const getPlatformLimits = (platform: 'instagram' | 'facebook' | 'linkedin' | 'tiktok') => {
  const limits = {
    instagram: {
      caption: 2200,
      hashtags: 30,
      imageSize: { width: 1080, height: 1080 }
    },
    facebook: {
      caption: 63206,
      hashtags: 0, // Not commonly used
      imageSize: { width: 1200, height: 630 }
    },
    linkedin: {
      caption: 3000,
      hashtags: 0, // Not commonly used
      imageSize: { width: 1200, height: 627 }
    },
    tiktok: {
      caption: 150,
      hashtags: 100,
      videoLength: 60 // seconds
    }
  };

  return limits[platform];
};

