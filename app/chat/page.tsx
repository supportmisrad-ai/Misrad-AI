'use client';

import ChatInterface from '@/components/ChatInterface';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ChatPage() {
  const router = useRouter();

  return (
    <div className="h-screen flex flex-col">
      {/* Header with back button */}
      <div className="flex items-center gap-4 p-4 border-b bg-white dark:bg-gray-800">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="חזור"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Nexus Brain Chat</h1>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 min-h-0">
        <ChatInterface className="h-full" />
      </div>
    </div>
  );
}

