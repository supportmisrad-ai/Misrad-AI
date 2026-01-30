import { Facebook, Instagram, Linkedin, Video, Globe, MessageCircle, Twitter, Share2, PinIcon, MessageSquare } from 'lucide-react';
import { SocialPlatform } from '@/types/social';

export const PLATFORM_ICONS: Record<SocialPlatform, any> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  tiktok: Video,
  twitter: Twitter,
  google: Globe,
  whatsapp: MessageCircle,
  threads: Share2,
  youtube: Video,
  pinterest: PinIcon,
  portal: MessageSquare
};

export const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  facebook: 'text-blue-600',
  instagram: 'text-purple-600',
  linkedin: 'text-blue-800',
  tiktok: 'text-black',
  twitter: 'text-slate-900',
  google: 'text-slate-700',
  whatsapp: 'text-green-500',
  threads: 'text-slate-900',
  youtube: 'text-red-600',
  pinterest: 'text-red-700',
  portal: 'text-blue-500'
};

export const PLATFORM_BG_COLORS: Record<SocialPlatform, string> = {
  facebook: 'bg-blue-600',
  instagram: 'bg-gradient-to-tr from-yellow-400 to-purple-600',
  tiktok: 'bg-black',
  linkedin: 'bg-blue-800',
  twitter: 'bg-slate-900',
  google: 'bg-white text-slate-900 border',
  whatsapp: 'bg-green-500',
  threads: 'bg-slate-900',
  youtube: 'bg-red-600',
  pinterest: 'bg-red-700',
  portal: 'bg-blue-400'
};

