import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useGuestStore } from '@/store/guestStore';
import { FileTree } from '@/components/repos/FileTree';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowLeft, Terminal, UserPlus } from 'lucide-react';

export default function GuestRepoPage() {
  const { repoSlug } = useParams<{ repoSlug: string }>();
  const navigate = useNavigate();
  const { repos, getRemainingMessages } = useGuestStore();

  const repo = repos.find(r => r.repoSlug === repoSlug);

  // Resizing file tree panel
  const [fileTreeWidth, setFileTreeWidth] = useState(() => {
    const saved = localStorage.getItem('guest-file-tree-width');
    return saved ? parseInt(saved, 10) : 280;
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isResizing = useRef(false);

  useEffect(() => {
    if (!repoSlug || !repo) {
      navigate('/', { replace: true });
    }
  }, [repoSlug, repo, navigate]);

  useEffect(() => {
    localStorage.setItem('guest-file-tree-width', fileTreeWidth.toString());
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

  if (!repoSlug || !repo) {
    return null;
  }

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const remainingMessages = getRemainingMessages(repoSlug);
  const progressPercent = (remainingMessages / 5) * 100;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Premium Glassmorphism Floating Top Header */}
      <header className="z-20 h-16 shrink-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/60 px-4 md:px-6 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        {/* Left Side: Logo & Repo name */}
        <div className="flex items-center space-x-4 min-w-0">
          <Link 
            to="/" 
            className="flex items-center text-zinc-400 hover:text-white transition-colors gap-1 text-xs md:text-sm font-medium mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg">
              <Terminal className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs md:text-sm font-semibold text-zinc-200 truncate flex items-center gap-1.5" title={repo.repoName}>
                {repo.repoName}
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Indexed & Live" />
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono hidden md:block">GUEST WORKSPACE</p>
            </div>
          </div>
        </div>

        {/* Middle/Right: Credit Meter & Signup Call to Action */}
        <div className="flex items-center space-x-3 md:space-x-6">
          {/* Messages Credit Progress Meter */}
          <div className="hidden sm:flex items-center gap-3 bg-zinc-900/50 border border-zinc-800/40 px-3.5 py-1.5 rounded-full select-none">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <div className="text-right">
              <div className="text-[10px] font-semibold text-zinc-300">
                {remainingMessages} of 5 messages left
              </div>
              <div className="w-24 h-1 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    remainingMessages <= 1 ? 'bg-red-500' : remainingMessages <= 3 ? 'bg-amber-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Create Free Account shiny call to action */}
          <Button 
            asChild
            size="sm" 
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white border-none rounded-full text-xs font-semibold shadow-lg shadow-indigo-900/20 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Link to="/register">
              <UserPlus className="h-3.5 w-3.5" />
              <span>Sign Up Free</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Workspace Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Resizable File Tree */}
        <div 
          ref={containerRef}
          style={{ width: `${fileTreeWidth}px` }}
          className="hidden lg:block border-r border-zinc-800 bg-zinc-950/30 flex flex-col h-full shrink-0 relative"
        >
          <div className="p-4 border-b border-zinc-800/60 bg-zinc-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 font-mono tracking-wider uppercase">Project Explorer</span>
              <span className="text-[9px] bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-800/80 font-mono uppercase">
                {repo.fileCount} files
              </span>
            </div>
          </div>
          <ScrollArea className="flex-1 bg-zinc-950/10">
            <div className="min-w-max">
              <FileTree repoId={repoSlug} isGuest={true} />
            </div>
          </ScrollArea>

          {/* Resize Drag Bar */}
          <div
            onMouseDown={startResizing}
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500 transition-colors z-50 group flex items-center justify-center"
          >
            <div className="w-[2px] h-8 bg-zinc-700 group-hover:bg-indigo-400 group-active:bg-indigo-300 rounded opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Right Panel: Chat Interface */}
        <div className="flex-1 h-full min-w-0 bg-zinc-950">
          <ChatInterface repoId={repoSlug} isGuest={true} />
        </div>
      </div>
    </div>
  );
}
