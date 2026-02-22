
import React from 'react';
import { Task, User, ContentItem, PlatformDefinition } from '../types';
import { Play, Eye, ThumbsUp, Calendar, Clock, MonitorPlay, Film } from 'lucide-react';
import { motion } from 'framer-motion';

interface ContentTaskCardProps {
    task: Task;
    users: User[];
    onClick?: () => void;
    platforms: PlatformDefinition[];
    relatedContent?: ContentItem;
}

export const ContentTaskCard: React.FC<ContentTaskCardProps> = ({ task, users, onClick, platforms, relatedContent }) => {
    const assignedUser = users.find(u => task.assigneeIds?.includes(u.id));
    
    // Simulate finding platforms from tags if not directly linked
    const activePlatforms = platforms.filter(p => task.tags.some(t => t.toLowerCase() === p.id.toLowerCase() || t.toLowerCase() === p.label.toLowerCase()));

    // Use related content data if available, otherwise mock based on task
    const thumbnail = relatedContent?.thumbnailUrl; 
    const views = relatedContent?.performance?.views;
    const likes = relatedContent?.performance?.likes;

    return (
        <motion.div 
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={onClick}
            className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden flex flex-col h-full"
        >
            {/* Visual Header / Thumbnail */}
            <div className="h-28 bg-gray-900 relative overflow-hidden flex items-center justify-center">
                {thumbnail ? (
                    <img src={thumbnail} alt={task.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                    <div className="text-gray-600">
                        <Film size={32} className="opacity-20" />
                    </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                    <span className="bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider">
                       {task.status}
                    </span>
                </div>

                {/* Duration Badge if video */}
                {task.tags.includes('Video') && (
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                        <Play size={8} fill="currentColor" /> 00:59
                    </div>
                )}
            </div>

            {/* Content Body */}
            <div className="p-3 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 group-hover:text-indigo-600 transition-colors">
                        {task.title}
                    </h4>
                </div>

                {/* Platforms Row */}
                <div className="flex gap-1.5 mb-3 flex-wrap">
                    {activePlatforms.length > 0 ? activePlatforms.map(p => (
                        <div key={p.id} className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-gray-100 ${p.color}`} title={p.label}>
                            <div className="scale-75">{/* Icon placeholder logic or import icons */}</div>
                        </div>
                    )) : (
                        <span className="text-[10px] text-gray-400">לא הוגדרו ערוצים</span>
                    )}
                </div>

                <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                        {assignedUser ? (
                            <img src={assignedUser.avatar} className="w-5 h-5 rounded-full object-cover border border-gray-200" title={assignedUser.name} />
                        ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200" />
                        )}
                        <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) : '-'}</span>
                    </div>

                    {/* Show stats if published */}
                    {views !== undefined && (
                        <div className="flex items-center gap-2 font-mono text-[10px] font-bold">
                            <span className="flex items-center gap-0.5 text-gray-600"><Eye size={10} /> {views > 1000 ? (views/1000).toFixed(1) + 'k' : views}</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
