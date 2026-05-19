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
        <div className="h-full flex flex-col items-center justify-center p-8 bg-[#2d2d2d] sm:bg-zinc-950">
          <div className="max-w-2xl w-full flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-[#e9e8e5] dark:bg-zinc-800 rounded-2xl flex items-center justify-center shadow-sm mb-2 transform rotate-3">
              <span className="text-3xl">✨</span>
            </div>
            <h2 className="text-4xl font-semibold tracking-tight text-zinc-100 font-serif">Good to see you</h2>
            <p className="text-lg text-zinc-400 max-w-md mx-auto">
              Select a repository from the sidebar to begin exploring your codebase, or click "Add Repository" to index a new one.
            </p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="h-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : activeRepo?.embeddingStatus !== 'done' ? (
        <div className="h-full flex flex-col items-center justify-center p-8 bg-[#2d2d2d] sm:bg-zinc-950">
          <div className="max-w-md w-full flex flex-col items-center text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mb-2" />
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-100 font-serif">Reading repository...</h2>
            <p className="text-zinc-400">
              We are currently parsing and indexing the codebase. <br/>
              Check the sidebar for real-time progress.
            </p>
          </div>
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
