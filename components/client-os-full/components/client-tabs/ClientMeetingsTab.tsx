
import React from 'react';
import { Meeting } from '../../types';
import { Calendar, Video, Users, ChevronUp, ChevronDown, Brain, ShieldAlert, PlayCircle, FileText, Download, ListTodo, Check, Edit2, Save, FolderOpen } from 'lucide-react';
import { AudioPlayer } from '../ui/AudioPlayer';

interface ClientMeetingsTabProps {
  meetings: Meeting[];
  expandedMeetingId: string | null;
  onToggleExpand: (id: string) => void;
  meetingNotes: Record<string, string>;
  onNoteChange: (id: string, val: string) => void;
  onSaveNote: (id: string) => void;
  onToggleTask: (meetingId: string, type: 'agency' | 'client', taskId: string) => void;
}

export const ClientMeetingsTab: React.FC<ClientMeetingsTabProps> = ({ 
  meetings, 
  expandedMeetingId, 
  onToggleExpand, 
  meetingNotes, 
  onNoteChange, 
  onSaveNote, 
  onToggleTask 
}) => {
  return (
    <div className="space-y-6 animate-slide-up">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Calendar size={20} className="text-nexus-primary"/> הקלטות וניתוחים
        </h3>
        <div className="space-y-4">
            {meetings.length > 0 ? meetings.map(meeting => (
                <div 
                    key={meeting.id} 
                    className={`bg-white border rounded-xl transition-all overflow-hidden ${expandedMeetingId === meeting.id ? 'border-nexus-primary shadow-lg ring-1 ring-nexus-primary/20' : 'border-gray-200 hover:border-nexus-primary/30'}`}
                >
                    {/* Collapsed Header */}
                    <div 
                        className="p-5 cursor-pointer flex justify-between items-start"
                        onClick={() => onToggleExpand(meeting.id)}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl flex flex-col items-center justify-center w-14 h-14 ${expandedMeetingId === meeting.id ? 'bg-nexus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
                                <span className="font-bold text-lg leading-none">{meeting.date.split('/')[0]}</span>
                                <span className="text-[10px] font-medium uppercase">{meeting.date.split('/')[1]}</span>
                            </div>
                            <div>
                                <h4 className={`font-bold text-lg ${expandedMeetingId === meeting.id ? 'text-nexus-primary' : 'text-gray-900'}`}>{meeting.title}</h4>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                    <span className="flex items-center gap-1">{meeting.location === 'ZOOM' ? <Video size={12} /> : <Users size={12} />} {meeting.location}</span>
                                    <span>•</span>
                                    <span>{meeting.attendees.length} משתתפים</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {meeting.aiAnalysis && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                    meeting.aiAnalysis.sentimentScore > 70 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                }`}>
                                    ציון AI: {meeting.aiAnalysis.sentimentScore}
                                </span>
                            )}
                            {expandedMeetingId === meeting.id ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                        </div>
                    </div>

                    {/* Expanded Content */}
                    {expandedMeetingId === meeting.id && meeting.aiAnalysis && (
                        <div className="border-t border-gray-100 bg-gray-50/30 animate-fade-in">
                            
                            {/* Top: AI Summary & Media */}
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Col: Player & Summary */}
                                <div className="space-y-4">
                                    <AudioPlayer src={meeting.recordingUrl} />

                                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Brain size={12}/> תקציר מנהלים</h5>
                                        <p className="text-sm text-gray-700 leading-relaxed">{meeting.aiAnalysis.summary}</p>
                                    </div>

                                    {/* Risks */}
                                    {meeting.aiAnalysis.liabilityRisks.length > 0 && (
                                        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                            <h5 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-2 flex items-center gap-1"><ShieldAlert size={12}/> סיכונים והבטחות</h5>
                                            <ul className="space-y-2">
                                                {meeting.aiAnalysis.liabilityRisks.map((risk, idx) => (
                                                    <li key={idx} className="text-xs text-gray-700 flex gap-2 items-start">
                                                        <div className="w-1 h-1 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                                        <span>
                                                            <span className="font-bold">"{risk.quote}"</span>
                                                            <span className="block text-gray-500 mt-0.5">{risk.context}</span>
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* Right Col: Artifacts & Stats */}
                                <div className="space-y-4">
                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-3 rounded-xl border border-gray-200 text-center">
                                            <span className="block text-2xl font-bold text-nexus-primary">{meeting.aiAnalysis.rating?.professionalism || '-'}</span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase">מקצועיות</span>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-gray-200 text-center">
                                            <span className="block text-2xl font-bold text-nexus-accent">{meeting.aiAnalysis.rating?.warmth || '-'}</span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase">חמימות</span>
                                        </div>
                                    </div>
                                    
                                    {/* Files / Worksheets */}
                                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1"><FolderOpen size={12}/> חומרי פגישה וסיכומים</h5>
                                        <div className="space-y-2">
                                            {meeting.recordingUrl && (
                                                <a href={meeting.recordingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 bg-nexus-primary/5 rounded-lg hover:bg-nexus-primary/10 transition-colors group">
                                                    <div className="p-1.5 bg-white rounded shadow-sm text-nexus-primary group-hover:text-nexus-accent"><PlayCircle size={16}/></div>
                                                    <div>
                                                        <span className="text-xs font-bold text-gray-800 block">הקלטת המפגש המלאה</span>
                                                        <span className="text-[10px] text-gray-400">לחץ לצפייה</span>
                                                    </div>
                                                </a>
                                            )}
                                            {meeting.files?.map((file, idx) => (
                                                <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group">
                                                    <div className="p-1.5 bg-white rounded shadow-sm text-gray-500 group-hover:text-nexus-primary"><FileText size={16}/></div>
                                                    <div className="flex-1">
                                                        <span className="text-xs font-bold text-gray-800 block">{file.name}</span>
                                                        <span className="text-[10px] text-gray-400">{file.type}</span>
                                                    </div>
                                                    <Download size={14} className="text-gray-300 group-hover:text-nexus-primary transition-colors"/>
                                                </div>
                                            ))}
                                            {(!meeting.files || meeting.files.length === 0) && !meeting.recordingUrl && (
                                                <div className="text-center py-2 text-xs text-gray-400 italic">אין קבצים מצורפים</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Middle: Interactive Task Tracker */}
                            <div className="p-6 border-t border-gray-200 bg-white">
                                <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <ListTodo size={16} className="text-nexus-accent"/> מעקב משימות וביצוע
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Agency Tasks */}
                                    <div>
                                        <span className="text-xs font-bold text-nexus-primary uppercase tracking-widest block mb-2">אנחנו (Agency)</span>
                                        <div className="space-y-2">
                                            {meeting.aiAnalysis.agencyTasks.map((task) => (
                                                <button 
                                                    key={task.id} 
                                                    onClick={() => onToggleTask(meeting.id, 'agency', task.id)}
                                                    className={`w-full text-right flex items-start gap-3 p-3 rounded-xl border transition-all ${
                                                        task.status === 'COMPLETED' ? 'bg-green-50 border-green-100 opacity-60' : 'bg-white border-gray-200 hover:border-nexus-primary/30'
                                                    }`}
                                                >
                                                    <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                                        task.status === 'COMPLETED' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent hover:border-nexus-primary'
                                                    }`}>
                                                        <Check size={14} />
                                                    </div>
                                                    <div>
                                                        <span className={`text-sm font-medium block ${task.status === 'COMPLETED' ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                                            {task.task}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400">{task.deadline} • {task.priority}</span>
                                                    </div>
                                                </button>
                                            ))}
                                            {meeting.aiAnalysis.agencyTasks.length === 0 && <span className="text-xs text-gray-400 italic">אין משימות לנו</span>}
                                        </div>
                                    </div>

                                    {/* Client Tasks */}
                                    <div>
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">הם (Client)</span>
                                        <div className="space-y-2">
                                            {meeting.aiAnalysis.clientTasks.map((task) => (
                                                <button 
                                                    key={task.id} 
                                                    onClick={() => onToggleTask(meeting.id, 'client', task.id)}
                                                    className={`w-full text-right flex items-start gap-3 p-3 rounded-xl border transition-all ${
                                                        task.status === 'COMPLETED' ? 'bg-gray-100 border-gray-200 opacity-60' : 'bg-white border-gray-200 hover:border-gray-300'
                                                    }`}
                                                >
                                                    <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                                        task.status === 'COMPLETED' ? 'bg-gray-400 border-gray-400 text-white' : 'border-gray-300 text-transparent'
                                                    }`}>
                                                        <Check size={14} />
                                                    </div>
                                                    <div>
                                                        <span className={`text-sm font-medium block ${task.status === 'COMPLETED' ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                                            {task.task}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400">{task.deadline}</span>
                                                    </div>
                                                </button>
                                            ))}
                                            {meeting.aiAnalysis.clientTasks.length === 0 && <span className="text-xs text-gray-400 italic">אין משימות להם</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom: Manual Notes Section */}
                            <div className="p-6 bg-gray-50 border-t border-gray-200">
                                <h5 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Edit2 size={14} className="text-nexus-accent"/> הערות צוות (ידני)
                                </h5>
                                <div className="relative">
                                    <textarea
                                        className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-800 outline-none focus:border-nexus-primary transition-all min-h-[80px] resize-none"
                                        placeholder="הוסף הערות, סיכומים ידניים או דגשים חשובים לפגישה זו..."
                                        value={meetingNotes[meeting.id] || meeting.manualNotes || ''}
                                        onChange={(e) => onNoteChange(meeting.id, e.target.value)}
                                    ></textarea>
                                    <button 
                                        onClick={() => onSaveNote(meeting.id)}
                                        className="absolute bottom-3 left-3 bg-nexus-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-nexus-accent transition-colors flex items-center gap-1 shadow-sm"
                                    >
                                        <Save size={12}/> שמור הערה
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )) : (
                <div className="text-center py-10 text-gray-400">
                    <Calendar size={32} className="mx-auto mb-2 opacity-20" />
                    <p>לא היו פגישות לאחרונה</p>
                </div>
            )}
        </div>
    </div>
  );
};
