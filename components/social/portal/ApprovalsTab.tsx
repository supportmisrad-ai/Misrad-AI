'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CircleCheckBig, X, Image } from 'lucide-react';
import { SocialPost } from '@/types/social';

interface ApprovalsTabProps {
  posts: SocialPost[];
  onApprove: (postId: string) => void;
  onReject: (postId: string, note: string) => void;
}

const ApprovalsTab: React.FC<ApprovalsTabProps> = ({ posts, onApprove, onReject }) => {
  const pendingPosts = posts.filter(p => p.status === 'pending_approval');

  return (
    <motion.div key="approvals" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {pendingPosts.length > 0 ? pendingPosts.map(post => (
        <div key={post.id} className="bg-white rounded-[48px] border border-slate-200 shadow-xl overflow-hidden flex flex-col">
          <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative group">
            {post.mediaUrl && <img src={post.mediaUrl} className="w-full h-full object-cover" />}
            {!post.mediaUrl && <div className="w-full h-full flex items-center justify-center text-slate-300"><Image size={48}/></div>}
          </div>
          <div className="p-10 flex flex-col gap-6">
            <p className="font-bold text-slate-700 italic text-lg leading-relaxed">"{post.content}"</p>
            <div className="flex gap-4">
              <button onClick={() => onApprove(post.id)} className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2"><CircleCheckBig size={20}/> אשר</button>
              <button onClick={() => onReject(post.id, 'תיקון')} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black flex items-center justify-center gap-2"><X size={20}/> תיקון</button>
            </div>
          </div>
        </div>
      )) : (
        <div className="col-span-full py-20 bg-white rounded-[56px] border-2 border-dashed flex flex-col items-center justify-center gap-6 text-center">
          <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center"><CircleCheckBig size={48}/></div>
          <h3 className="text-2xl font-black text-slate-800">הכל מעודכן!</h3>
          <p className="text-slate-400 font-bold max-w-sm">אין פוסטים שמחכים לאישור כרגע.</p>
        </div>
      )}
    </motion.div>
  );
};

export default ApprovalsTab;

