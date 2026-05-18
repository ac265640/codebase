import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { FileTree } from '@/components/repos/FileTree';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [activeRepoId, setActiveRepoId] = useState<string>('');

  // Fetch the active repo to check its status
  const { data: activeRepo, isLoading } = useQuery({
    queryKey: ['repos', activeRepoId],
    queryFn: async () => {
      if (!activeRepoId) return null;
      const res = await api.get(`/repos/${activeRepoId}`);
      return res.data;
    },
    enabled: !!activeRepoId,
  });

  return (
    <AppLayout activeRepoId={activeRepoId} onSelectRepo={setActiveRepoId}>
      {!activeRepoId ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-zinc-950">
          <div className="w-20 h-20 bg-indigo-900/20 rounded-full flex items-center justify-center mb-6 border border-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.1)]">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
              <div className="w-5 h-5 bg-indigo-400 rounded-full" />
            </div>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-3">Welcome to CodexAI</h2>
          <p className="text-lg text-zinc-400 max-w-md">
            Select a repository from the sidebar or add a new one to start asking questions about your codebase.
          </p>
        </div>
      ) : isLoading ? (
        <div className="h-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : activeRepo?.embeddingStatus !== 'done' ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-zinc-950">
          <Loader2 className="h-10 w-10 animate-spin text-zinc-500 mb-6" />
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Repository is processing</h2>
          <p className="text-zinc-400">
            We are currently cloning and embedding the codebase. <br/>
            Check the sidebar for real-time progress.
          </p>
        </div>
      ) : (
        <div className="flex h-full overflow-hidden">
          {/* Left Panel: File Tree (hidden on mobile by default unless we add a toggle) */}
          <div className="hidden lg:block w-72 lg:w-80 border-r border-zinc-800 bg-zinc-950/50 flex-col h-full shrink-0">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="font-semibold text-zinc-200 truncate" title={activeRepo.repoName}>
                {activeRepo.repoName}
              </h3>
              <p className="text-xs text-zinc-500 mt-1">Project Files</p>
            </div>
            <ScrollArea className="flex-1">
              <FileTree repoId={activeRepoId} />
            </ScrollArea>
          </div>

          {/* Right Panel: Chat Interface */}
          <div className="flex-1 h-full min-w-0 bg-zinc-950">
            <ChatInterface repoId={activeRepoId} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}
