import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { FileTree } from '@/components/repos/FileTree';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Terminal } from 'lucide-react';

export default function Dashboard() {
  const [activeRepoId, setActiveRepoId] = useState<string>('');

  // Resizing file tree panel
  const [fileTreeWidth, setFileTreeWidth] = useState(() => {
    const saved = localStorage.getItem('file-tree-width');
    return saved ? parseInt(saved, 10) : 320;
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isResizing = useRef(false);

  useEffect(() => {
    localStorage.setItem('file-tree-width', fileTreeWidth.toString());
  }, [fileTreeWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const maxW = Math.max(200, Math.min(600, window.innerWidth * 0.6));
      const newWidth = Math.max(200, Math.min(maxW, e.clientX - rect.left));
      setFileTreeWidth(newWidth);
    };

    const onMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

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
        <div className="h-full flex flex-col items-center justify-center p-8 bg-zinc-950 relative overflow-hidden">
          {/* Volumetric background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="max-w-md w-full flex flex-col items-center text-center space-y-6 relative z-10">
            <div className="relative w-20 h-20 mb-2 flex items-center justify-center">
              {/* Pulsing visual feedback */}
              <div className="absolute inset-0 rounded-full border border-indigo-500/10 animate-ping [animation-duration:3s]" />
              <div className="absolute inset-2 rounded-full border border-indigo-500/20 animate-pulse [animation-duration:4s]" />
              <div className="absolute inset-4 rounded-full border border-indigo-500/30" />
              <div className="relative w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl">
                <Terminal className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
            
            <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Welcome to CodeBase</h2>
            
            <p className="text-zinc-400 text-sm leading-relaxed max-w-sm mx-auto">
              Select a repository from the sidebar to map and explore its structure, or click <span className="text-indigo-400 font-semibold">Add Repository</span> to index a new one.
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
          <div 
            ref={containerRef}
            style={{ width: `${fileTreeWidth}px` }}
            className="hidden lg:block border-r border-zinc-800 bg-zinc-950/50 flex flex-col h-full shrink-0 relative"
          >
            <div className="p-4 border-b border-zinc-800">
              <h3 className="font-semibold text-zinc-200 truncate" title={activeRepo.repoName}>
                {activeRepo.repoName}
              </h3>
              <p className="text-xs text-zinc-500 mt-1">Project Files</p>
            </div>
            <ScrollArea className="flex-1">
              <div className="min-w-max">
                <FileTree repoId={activeRepoId} />
              </div>
            </ScrollArea>

            {/* Drag Resize Handle */}
            <div
              onMouseDown={startResizing}
              className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500 transition-colors z-50 group flex items-center justify-center"
            >
              <div className="w-[2px] h-8 bg-zinc-700 group-hover:bg-indigo-400 group-active:bg-indigo-300 rounded opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
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
