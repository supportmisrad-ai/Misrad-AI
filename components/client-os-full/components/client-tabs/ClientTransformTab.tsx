
import React from 'react';
import { Client } from '../../types';
import { Split, ArrowLeft, Image, Star } from 'lucide-react';

interface ClientTransformTabProps {
  client: Client;
}

export const ClientTransformTab: React.FC<ClientTransformTabProps> = ({ client }) => {
  return (
    <div className="space-y-8 animate-slide-up">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Split size={20} className="text-nexus-accent"/> לפני ואחרי
                </h3>
                <p className="text-sm text-gray-500">השינוי שעבר הלקוח.</p>
            </div>
        </div>

        {client.transformations?.map(trans => (
            <div key={trans.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h4 className="text-lg font-bold text-gray-900">{trans.title}</h4>
                        <span className="text-nexus-accent font-bold text-sm">{trans.metrics}</span>
                    </div>
                    {trans.isPublished && (
                        <span className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded font-bold uppercase tracking-wide">
                            פורסם
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                    {/* Arrow */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 border border-gray-200 shadow-lg text-nexus-primary hidden md:block">
                        <ArrowLeft size={24} />
                    </div>

                    {/* Before State */}
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-3">לפני ({trans.before.date})</span>
                        <div className="mb-4 h-40 bg-gray-200 rounded-lg overflow-hidden relative">
                            {trans.before.mediaUrl ? (
                                <img src={trans.before.mediaUrl} className="w-full h-full object-cover opacity-50 grayscale" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-300"><Image size={32}/></div>
                            )}
                            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">
                                {trans.before.emotionalState}
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 italic">"{trans.before.quote}"</p>
                        <p className="text-xs text-gray-500 mt-2">{trans.before.description}</p>
                    </div>

                    {/* After State */}
                    <div className="bg-nexus-primary/5 rounded-xl p-5 border border-nexus-primary/10">
                        <span className="text-xs font-bold text-nexus-primary uppercase tracking-widest block mb-3">אחרי ({trans.after.date})</span>
                        <div className="mb-4 h-40 bg-gray-200 rounded-lg overflow-hidden relative shadow-lg">
                            {trans.after.mediaUrl ? (
                                <img src={trans.after.mediaUrl} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white bg-nexus-accent"><Star size={32}/></div>
                            )}
                            <div className="absolute bottom-2 right-2 bg-nexus-primary text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm font-bold shadow-glow-gold">
                                {trans.after.emotionalState}
                            </div>
                        </div>
                        <p className="text-sm text-gray-800 font-medium italic">"{trans.after.quote}"</p>
                        <p className="text-xs text-gray-600 mt-2">{trans.after.description}</p>
                    </div>
                </div>
            </div>
        ))}
        {client.transformations.length === 0 && (
            <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                <Split size={48} className="mx-auto mb-2 opacity-20" />
                <p>עוד לא תיעדנו שינוי</p>
            </div>
        )}
    </div>
  );
};
