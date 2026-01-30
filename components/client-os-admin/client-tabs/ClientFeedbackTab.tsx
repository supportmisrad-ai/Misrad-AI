import React from 'react';
import { FeedbackItem } from '@/components/client-portal/types';
import { MessageCircleHeart, MessageSquare } from 'lucide-react';

interface ClientFeedbackTabProps {
  feedback: FeedbackItem[];
}

export const ClientFeedbackTab: React.FC<ClientFeedbackTabProps> = ({ feedback }) => {
  return (
    <div className="space-y-6 animate-slide-up">
      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
        <MessageCircleHeart size={20} className="text-nexus-primary" /> משובים (מה הם חושבים)
      </h3>
      <div className="grid grid-cols-1 gap-4">
        {feedback?.map((fb) => (
          <div key={fb.id} className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white ${
                    fb.score >= 9 ? 'bg-green-500' : fb.score <= 6 ? 'bg-red-500' : 'bg-[color:var(--os-accent)]'
                  }`}
                >
                  {fb.score}
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">{fb.date}</span>
                  <span className="font-bold text-sm text-gray-900">{fb.source}</span>
                </div>
              </div>
              <div className="flex gap-1">{fb.keywords.map((k) => <span key={k} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">#{k}</span>)}</div>
            </div>
            <p className="text-gray-700 italic text-sm border-r-2 border-gray-200 pr-3">"{fb.comment}"</p>
          </div>
        ))}
        {feedback.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
            <p>אין משובים</p>
          </div>
        )}
      </div>
    </div>
  );
};
